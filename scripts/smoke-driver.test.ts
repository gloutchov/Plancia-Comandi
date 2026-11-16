import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { assertLoopbackListener, listenAddressEscapesLoopback, mainInspectorUrl, nodeInspectorWebSocket, parseListenAddresses, parseNetstatListeners, smokeEnvironment, windowsProfileVars } from './smoke-driver.mjs'

describe('native package smoke isolation', () => {
  it.each(['darwin', 'win32'])('drops inherited secrets, auth and profile flags on %s', platform => {
    const root = path.resolve('synthetic-profile')
    const source = { PATH: '/runtime', HOME: '/private', APPDATA: '/private', USERPROFILE: '/private', USER: 'runner', LOGNAME: 'runner', SHELL: '/bin/bash', OPENAI_API_KEY: 'SYNTHETIC_SECRET', NODE_OPTIONS: '--require private.js', ELECTRON_RUN_AS_NODE: '1', PLANCIA_DEMO: '1', VITE_DEV_SERVER_URL: 'https://untrusted.test/', SSH_AUTH_SOCK: '/tmp/agent.sock', AWS_ACCESS_KEY_ID: 'AKIA', AWS_SECRET_ACCESS_KEY: 'secret', PLANCIA_DEVTOOLS: '1', PLANCIA_DIAG_STARTUP: '1', PLANCIA_DIAG_DIR: '/tmp/diag', CUSTOM_KEY: 'value' }
    const env = smokeEnvironment(root, source, platform)
    expect(env.PATH).toBe('/runtime')
    expect(env.USER).toBe('runner')
    expect(env.LOGNAME).toBe('runner')
    expect(env.SHELL).toBe('/bin/bash')
    for (const key of ['OPENAI_API_KEY', 'NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE', 'PLANCIA_DEMO', 'VITE_DEV_SERVER_URL', 'SSH_AUTH_SOCK', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'PLANCIA_DEVTOOLS', 'PLANCIA_DIAG_STARTUP', 'PLANCIA_DIAG_DIR', 'CUSTOM_KEY']) expect(env[key]).toBeUndefined()
    for (const key of ['HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'ZDOTDIR']) expect(env[key].startsWith(root + path.sep)).toBe(true)
    expect(JSON.stringify(env)).not.toContain('SYNTHETIC_SECRET')
  })

  it('keeps the Windows system variables and rewrites the isolated profile drive', () => {
    const root = 'D:\\a\\_temp\\plancia'
    const source = {
      Path: 'C:\\Windows\\System32',
      SystemRoot: 'C:\\Windows',
      windir: 'C:\\Windows',
      TEMP: 'C:\\Windows\\Temp',
      TMP: 'C:\\Windows\\Temp',
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      PATHEXT: '.COM;.EXE',
      SystemDrive: 'C:',
      ProgramData: 'C:\\ProgramData',
      ProgramFiles: 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      CommonProgramFiles: 'C:\\Program Files\\Common Files',
      PROCESSOR_ARCHITECTURE: 'AMD64',
      NUMBER_OF_PROCESSORS: '2',
      OS: 'Windows_NT',
      USERNAME: 'runner',
      USERDOMAIN: 'WORKGROUP',
      USER: 'runner',
      LOGNAME: 'runner',
      SHELL: 'C:\\Windows\\System32\\cmd.exe',
      HOMEDRIVE: 'C:',
      HOMEPATH: '\\Users\\runner',
      SSH_AUTH_SOCK: '/tmp/agent.sock',
      AWS_PROFILE: 'private',
      PLANCIA_DEVTOOLS: '1',
      PLANCIA_DIAG_STARTUP: '1',
      USERPROFILE: 'C:\\Users\\runner',
      APPDATA: 'C:\\Users\\runner\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\runner\\AppData\\Local',
      OPENAI_API_KEY: 'SYNTHETIC_SECRET',
      NODE_OPTIONS: '--require private.js',
      ELECTRON_RUN_AS_NODE: '1',
    }
    const env = smokeEnvironment(root, source, 'win32')
    expect(env.Path).toBe('C:\\Windows\\System32')
    expect(env.SystemRoot).toBe('C:\\Windows')
    expect(env.windir).toBe('C:\\Windows')
    expect(env.TEMP).toBe('C:\\Windows\\Temp')
    expect(env.TMP).toBe('C:\\Windows\\Temp')
    expect(env.ComSpec).toBe('C:\\Windows\\System32\\cmd.exe')
    expect(env.PATHEXT).toBe('.COM;.EXE')
    expect(env.SystemDrive).toBe('C:')
    expect(env.ProgramData).toBe('C:\\ProgramData')
    expect(env.ProgramFiles).toBe('C:\\Program Files')
    expect(env['ProgramFiles(x86)']).toBe('C:\\Program Files (x86)')
    expect(env.CommonProgramFiles).toBe('C:\\Program Files\\Common Files')
    expect(env.PROCESSOR_ARCHITECTURE).toBe('AMD64')
    expect(env.NUMBER_OF_PROCESSORS).toBe('2')
    expect(env.OS).toBe('Windows_NT')
    expect(env.USERNAME).toBe('runner')
    expect(env.USERDOMAIN).toBe('WORKGROUP')
    expect(env.USER).toBe('runner')
    expect(env.LOGNAME).toBe('runner')
    expect(env.SHELL).toBe('C:\\Windows\\System32\\cmd.exe')
    expect(env.SSH_AUTH_SOCK).toBeUndefined()
    expect(env.AWS_PROFILE).toBeUndefined()
    expect(env.PLANCIA_DEVTOOLS).toBeUndefined()
    expect(env.PLANCIA_DIAG_STARTUP).toBeUndefined()
    expect(env.USERPROFILE.endsWith(`${path.sep}home`) || env.USERPROFILE.endsWith('\\home')).toBe(true)
    expect(env.APPDATA.endsWith(`${path.sep}app-data`) || env.APPDATA.endsWith('\\app-data')).toBe(true)
    expect(env.LOCALAPPDATA.endsWith(`${path.sep}local-app-data`) || env.LOCALAPPDATA.endsWith('\\local-app-data')).toBe(true)
    expect(env.HOMEDRIVE).toBe('D:')
    expect(env.HOMEPATH.toLowerCase()).toContain('plancia')
    expect(env.OPENAI_API_KEY).toBeUndefined()
    expect(env.NODE_OPTIONS).toBeUndefined()
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(windowsProfileVars('D:\\a\\_temp\\plancia\\home')).toEqual({ HOMEDRIVE: 'D:', HOMEPATH: '\\a\\_temp\\plancia\\home' })
  })
})

it('uses one node inspector websocket on the requested loopback port', () => {
  const port = 49284
  const node = `ws://127.0.0.1:${port}/8164f734-b88a-4505-a77c-d9d0ae7cfe11`
  const entries = [
    { type: 'page', webSocketDebuggerUrl: `ws://127.0.0.1:${port}/page` },
    { type: 'node', webSocketDebuggerUrl: node },
    { type: 'node', webSocketDebuggerUrl: `ws://127.0.0.1:${port}/child` },
  ]
  expect(nodeInspectorWebSocket(entries, port)).toBe(node)
  expect(nodeInspectorWebSocket([{ type: 'node', webSocketDebuggerUrl: 'ws://0.0.0.0:1/x' }], port)).toBeNull()
})

it('reads the Windows netstat row owned by one process', () => {
  const text = [
    '  TCP    0.0.0.0:135    0.0.0.0:0    LISTENING    4',
    '  TCP    127.0.0.1:9222    0.0.0.0:0    LISTENING    4242',
    '  TCP    [::1]:9222    [::]:0    LISTENING    4242',
  ].join('\n')
  expect(parseNetstatListeners(text, 4242)).toEqual(['127.0.0.1', '::1'])
  expect(parseNetstatListeners(text, 4)).toEqual(['0.0.0.0'])
})

it('reads loopback and wildcard listen addresses', () => {
  expect(parseListenAddresses('127.0.0.1\n0.0.0.0\nnode 1 user TCP 127.0.0.1:9229 (LISTEN)\n')).toEqual(['127.0.0.1', '0.0.0.0', '127.0.0.1'])
  expect(listenAddressEscapesLoopback('0.0.0.0')).toBe(true)
  expect(listenAddressEscapesLoopback('::')).toBe(true)
  expect(listenAddressEscapesLoopback('127.0.0.1')).toBe(false)
})

it('accepts a listener on 127.0.0.1 and refuses another local address', async () => {
  const server = net.createServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as net.AddressInfo).port
  try {
    const result = await assertLoopbackListener(port)
    expect(result.refused === true || result.nonLoopback === 'absent').toBe(true)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

it('discovers a paused inner Node process without inherited stdout or stderr', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-inspector-discovery-'))
  const server = net.createServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as net.AddressInfo).port
  await new Promise<void>(resolve => server.close(() => resolve()))
  const child = spawn(process.execPath, [`--inspect-brk=127.0.0.1:${port}`, '-e', 'setInterval(()=>{},1000)'], {
    cwd: root, env: smokeEnvironment(root), stdio: 'ignore',
  })
  const exit = new Promise<void>(resolve => { child.once('exit', () => resolve()); child.once('error', () => resolve()) })
  try {
    const deadline = Date.now() + 5000
    let url: string | null = null
    do {
      url = await mainInspectorUrl(port)
      if (url) break
      await delay(20)
    } while (Date.now() < deadline)
    assert(url?.startsWith(`ws://127.0.0.1:${port}/`), 'Inspector unavailable without stderr forwarding')
  } finally {
    child.kill('SIGTERM'); await exit; rmSync(root, { recursive: true, force: true })
  }
}, 10000)
