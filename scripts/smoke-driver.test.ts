import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { smokeEnvironment } from './smoke-driver.mjs'

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
