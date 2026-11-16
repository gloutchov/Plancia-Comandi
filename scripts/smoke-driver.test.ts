import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { assertLoopbackListener, listenAddressEscapesLoopback, mainInspectorUrl, parseListenAddresses, smokeEnvironment, windowsProfileVars } from './smoke-driver.mjs'

describe('native package smoke isolation', () => {
  it.each(['darwin', 'win32'])('drops inherited secrets, auth and profile flags on %s', platform => {
    const root = path.resolve('synthetic-profile')
    const source = { PATH: '/runtime', HOME: '/private', APPDATA: '/private', USERPROFILE: '/private', OPENAI_API_KEY: 'SYNTHETIC_SECRET', NODE_OPTIONS: '--require private.js', ELECTRON_RUN_AS_NODE: '1', PLANCIA_DEMO: '1', VITE_DEV_SERVER_URL: 'https://untrusted.test/' }
    const env = smokeEnvironment(root, source, platform)
    expect(env.PATH).toBe('/runtime')
    for (const key of ['OPENAI_API_KEY', 'NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE', 'PLANCIA_DEMO', 'VITE_DEV_SERVER_URL']) expect(env[key]).toBeUndefined()
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
      HOMEDRIVE: 'C:',
      HOMEPATH: '\\Users\\runner',
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
