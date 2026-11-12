import { describe, expect, it } from 'vitest'
import { LEGACY_CHANNELS, dispatchLegacyIpc, type LegacyChannel, type LegacyEffects } from './legacyIpc'

const ID = '11111111-1111-4111-8111-111111111111'
const LIMITS = { maxWriteChars: 20 }

const app = { role: 'app' }
const other = { role: 'other' }

function effects(): { calls: string[]; api: LegacyEffects } {
  const calls: string[] = []
  const api: LegacyEffects = {
    boot: () => {
      calls.push('boot')
      return { version: '0.3.0' }
    },
    create: (input) => {
      calls.push(`create:${input.name ?? ''}:${input.shellId ?? ''}:${input.cwd ?? ''}`)
      return { ok: true }
    },
    close: (id) => calls.push(`close:${id}`),
    rename: (id, name) => calls.push(`rename:${id}:${name}`),
    subscribe: (id) => {
      calls.push(`subscribe:${id}`)
      return { seq: 4, data: 'secret' }
    },
    updateSettings: (patch) => {
      calls.push(`settings:${JSON.stringify(patch)}`)
      return { theme: patch.theme ?? 'system' }
    },
    revealSettings: () => calls.push('reveal'),
    currentSettings: () => {
      calls.push('current-settings')
      return { theme: 'system', locale: 'it' }
    },
    pickDirectory: (defaultPath) => {
      calls.push(`directory:${defaultPath}`)
      return '/picked'
    },
    write: (id, data) => calls.push(`write:${id}:${data}`),
    resize: (id, cols, rows) => calls.push(`resize:${id}:${cols}x${rows}`),
    watch: (id, focused) => calls.push(`watch:${id}:${focused}`),
    openExternal: (url) => calls.push(`open:${url}`),
  }
  return { calls, api }
}

const valid: Record<LegacyChannel, readonly unknown[]> = {
  'app:boot': [],
  'sessions:create': [{ name: 'Progetto', shellId: 'login', cwd: '/tmp/work' }],
  'sessions:close': [ID],
  'sessions:rename': [ID, 'Nome'],
  'sessions:subscribe': [ID],
  'settings:update': [{ theme: 'dark', locale: 'en', status: { quietTimeoutMs: 900 } }],
  'settings:reveal': [],
  'dialog:directory': ['/home/user'],
  'terminal:write': [ID, 'ls\n'],
  'terminal:resize': [ID, 80, 24],
  'terminal:watch': [null, true],
  'shell:openExternal': ['https://example.test/docs'],
}

const invalid: Record<LegacyChannel, readonly unknown[]> = {
  'app:boot': ['extra'],
  'sessions:create': [{ name: 'ok', command: 'rm -rf /' }],
  'sessions:close': ['not-a-uuid'],
  'sessions:rename': [ID, 12],
  'sessions:subscribe': [ID, 'extra'],
  'settings:update': [{ theme: 'blue' }],
  'settings:reveal': [true],
  'dialog:directory': [12],
  'terminal:write': [ID, 9],
  'terminal:resize': [ID, 1.5, 24],
  'terminal:watch': ['session', true],
  'shell:openExternal': ['javascript:alert(1)'],
}

describe('legacy IPC channels', () => {
  it('covers every pre-M1 handle and on channel and no M1 channel', () => {
    const channels = LEGACY_CHANNELS.map((entry) => entry.channel)
    expect(new Set(channels).size).toBe(channels.length)
    expect(channels).toEqual(Object.keys(valid))
    expect(LEGACY_CHANNELS.filter((entry) => entry.kind === 'handle').map((entry) => entry.channel)).toEqual([
      'app:boot',
      'sessions:create',
      'sessions:close',
      'sessions:rename',
      'sessions:subscribe',
      'settings:update',
      'settings:reveal',
      'dialog:directory',
    ])
    expect(LEGACY_CHANNELS.filter((entry) => entry.kind === 'on').map((entry) => entry.channel)).toEqual([
      'terminal:write',
      'terminal:resize',
      'terminal:watch',
      'shell:openExternal',
    ])
  })

  it.each(LEGACY_CHANNELS.map((entry) => entry.channel))('rejects a foreign sender on %s', (channel) => {
    const harness = effects()
    const result = dispatchLegacyIpc(channel, { sender: other }, valid[channel], app, harness.api, LIMITS)
    expect(harness.calls).toEqual([])
    if (channel === 'sessions:subscribe') expect(result).toEqual({ seq: 0, data: '' })
    if (channel === 'sessions:create') expect(result).toEqual({ ok: false, error: 'rejected' })
    if (channel === 'app:boot' || channel === 'settings:update' || channel === 'dialog:directory') expect(result).toBeNull()
  })

  it('rejects every channel when the app window is gone', () => {
    for (const entry of LEGACY_CHANNELS) {
      const harness = effects()
      dispatchLegacyIpc(entry.channel, { sender: app }, valid[entry.channel], null, harness.api, LIMITS)
      expect(harness.calls).toEqual([])
    }
  })

  it.each(LEGACY_CHANNELS.map((entry) => entry.channel))('rejects an invalid payload on %s', (channel) => {
    const harness = effects()
    const result = dispatchLegacyIpc(channel, { sender: app }, invalid[channel], app, harness.api, LIMITS)
    if (channel === 'settings:update') {
      expect(result).toEqual({ theme: 'system', locale: 'it' })
      expect(harness.calls).toEqual(['current-settings'])
      return
    }
    expect(harness.calls).toEqual([])
  })

  it('accepts a valid payload from the app window and passes the parsed value', () => {
    const harness = effects()
    expect(dispatchLegacyIpc('app:boot', { sender: app }, [], app, harness.api, LIMITS)).toEqual({ version: '0.3.0' })
    expect(dispatchLegacyIpc('sessions:create', { sender: app }, valid['sessions:create'], app, harness.api, LIMITS)).toEqual({
      ok: true,
    })
    dispatchLegacyIpc('sessions:close', { sender: app }, [ID], app, harness.api, LIMITS)
    dispatchLegacyIpc('sessions:rename', { sender: app }, [ID, 'Nome'], app, harness.api, LIMITS)
    expect(dispatchLegacyIpc('sessions:subscribe', { sender: app }, [ID], app, harness.api, LIMITS)).toEqual({
      seq: 4,
      data: 'secret',
    })
    dispatchLegacyIpc('settings:update', { sender: app }, valid['settings:update'], app, harness.api, LIMITS)
    dispatchLegacyIpc('settings:reveal', { sender: app }, [], app, harness.api, LIMITS)
    expect(dispatchLegacyIpc('dialog:directory', { sender: app }, ['/home/user'], app, harness.api, LIMITS)).toBe('/picked')
    dispatchLegacyIpc('terminal:write', { sender: app }, [ID, 'ls\n'], app, harness.api, LIMITS)
    dispatchLegacyIpc('terminal:resize', { sender: app }, [ID, 80, 24], app, harness.api, LIMITS)
    dispatchLegacyIpc('terminal:watch', { sender: app }, [ID, false], app, harness.api, LIMITS)
    dispatchLegacyIpc('shell:openExternal', { sender: app }, ['http://127.0.0.1:9/a'], app, harness.api, LIMITS)
    expect(harness.calls).toEqual([
      'boot',
      'create:Progetto:login:/tmp/work',
      `close:${ID}`,
      `rename:${ID}:Nome`,
      `subscribe:${ID}`,
      'settings:{"theme":"dark","locale":"en","status":{"quietTimeoutMs":900}}',
      'reveal',
      'directory:/home/user',
      `write:${ID}:ls\n`,
      `resize:${ID}:80x24`,
      `watch:${ID}:false`,
      'open:http://127.0.0.1:9/a',
    ])
  })

  it('truncates a terminal write at maxWriteChars, including the bracketed-paste margin', () => {
    const harness = effects()
    const limit = 20
    const limits = { maxWriteChars: limit }
    dispatchLegacyIpc('terminal:write', { sender: app }, [ID, 'x'.repeat(limit)], app, harness.api, limits)
    dispatchLegacyIpc('terminal:write', { sender: app }, [ID, 'y'.repeat(limit + 12)], app, harness.api, limits)
    expect(harness.calls).toEqual([`write:${ID}:${'x'.repeat(limit)}`, `write:${ID}:${'y'.repeat(limit)}`])
  })

  it('does not leave a high surrogate when an emoji straddles the write limit', () => {
    const harness = effects()
    const emoji = '😀'
    const text = `${'x'.repeat(4)}${emoji}`
    dispatchLegacyIpc('terminal:write', { sender: app }, [ID, text], app, harness.api, { maxWriteChars: 5 })
    expect(harness.calls).toEqual([`write:${ID}:${'x'.repeat(4)}`])
  })

  it('returns the current settings when a numeric field is not finite', () => {
    const harness = effects()
    const result = dispatchLegacyIpc(
      'settings:update',
      { sender: app },
      [{ status: { quietTimeoutMs: Number.POSITIVE_INFINITY } }],
      app,
      harness.api,
      LIMITS,
    )
    expect(result).toEqual({ theme: 'system', locale: 'it' })
    expect(harness.calls).toEqual(['current-settings'])
  })

  it('rejects non-http links and out-of-range terminal sizes', () => {
    const harness = effects()
    for (const args of [['file:///tmp/x'], ['ftp://example.test/'], [''], ['not a url']]) {
      dispatchLegacyIpc('shell:openExternal', { sender: app }, args, app, harness.api, LIMITS)
    }
    dispatchLegacyIpc('terminal:resize', { sender: app }, [ID, 1, 24], app, harness.api, LIMITS)
    dispatchLegacyIpc('terminal:resize', { sender: app }, [ID, 80, 201], app, harness.api, LIMITS)
    dispatchLegacyIpc('terminal:write', { sender: app }, ['../etc', 'ls'], app, harness.api, LIMITS)
    const kept = dispatchLegacyIpc('settings:update', { sender: app }, [{ fontSize: Number.NaN }], app, harness.api, LIMITS)
    dispatchLegacyIpc('sessions:create', { sender: app }, [null], app, harness.api, LIMITS)
    expect(kept).toEqual({ theme: 'system', locale: 'it' })
    expect(harness.calls).toEqual(['current-settings'])
  })
})
