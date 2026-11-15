import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { mainInspectorUrl, smokeEnvironment } from './smoke-driver.mjs'

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
