import type { CreateSessionInput, SettingsPatch, StatusConfig } from './types'

/**
 * IPC channels that existed before M1. M1 clipboard and edit channels stay in
 * their own modules and already check the sender. Every channel here, both
 * invoke (`handle`) and send (`on`), must come from the app window and carry
 * a payload this module accepts. A foreign sender or a bad payload does not
 * reach the session manager, the dialog, or the shell.
 */

export type LegacyChannel =
  | 'app:boot'
  | 'sessions:create'
  | 'sessions:close'
  | 'sessions:rename'
  | 'sessions:subscribe'
  | 'settings:update'
  | 'settings:reveal'
  | 'dialog:directory'
  | 'terminal:write'
  | 'terminal:resize'
  | 'terminal:watch'
  | 'shell:openExternal'

export type LegacyKind = 'handle' | 'on'

export const LEGACY_CHANNELS: readonly { channel: LegacyChannel; kind: LegacyKind }[] = [
  { channel: 'app:boot', kind: 'handle' },
  { channel: 'sessions:create', kind: 'handle' },
  { channel: 'sessions:close', kind: 'handle' },
  { channel: 'sessions:rename', kind: 'handle' },
  { channel: 'sessions:subscribe', kind: 'handle' },
  { channel: 'settings:update', kind: 'handle' },
  { channel: 'settings:reveal', kind: 'handle' },
  { channel: 'dialog:directory', kind: 'handle' },
  { channel: 'terminal:write', kind: 'on' },
  { channel: 'terminal:resize', kind: 'on' },
  { channel: 'terminal:watch', kind: 'on' },
  { channel: 'shell:openExternal', kind: 'on' },
]

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NAME_MAX = 80
const SHELL_ID_MAX = 40
const PATH_MAX = 32_768
const URL_MAX = 4096
const THEMES = ['system', 'light', 'dark'] as const
const LOCALES = ['it', 'en'] as const
const LAYOUTS = ['single', 'split', 'stack', 'grid'] as const
const STATUS_NUMBERS = [
  'quietTimeoutMs',
  'promptIdleTimeoutMs',
  'busyMarkerQuietMs',
  'childQuietTimeoutMs',
  'startupGraceMs',
  'titleBusyMaxMs',
  'burstBytes',
  'burstCount',
  'burstWindowMs',
  'minBusyForNotifyMs',
  'attentionHoldMs',
] as const
const STATUS_LISTS = ['extraIdlePatterns', 'extraBusyPatterns', 'extraAttentionPatterns'] as const
const CREATE_KEYS = new Set(['name', 'shellId', 'cwd'])
const SETTINGS_KEYS = new Set([
  'theme',
  'locale',
  'layout',
  'fontSize',
  'notifyDesktop',
  'notifyBadge',
  'showReasons',
  'lastShellId',
  'lastCwd',
  'status',
])

export interface LegacyEffects {
  boot: () => unknown
  create: (input: CreateSessionInput) => unknown
  close: (id: string) => void
  rename: (id: string, name: string) => void
  subscribe: (id: string) => unknown
  updateSettings: (patch: SettingsPatch) => unknown
  /** Returned when the app sender's settings payload is rejected, so the UI does not clear its state. */
  currentSettings: () => unknown
  revealSettings: () => void
  pickDirectory: (defaultPath: string) => unknown
  write: (id: string, data: string) => void
  resize: (id: string, cols: number, rows: number) => void
  watch: (id: string | null, focused: boolean) => void
  openExternal: (url: string) => void
}

export interface LegacyLimits {
  maxWriteChars: number
}

export function isAppSender(event: { sender: object }, appContents: object | null): boolean {
  return appContents != null && event.sender === appContents
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function sessionId(value: unknown): string | null {
  return typeof value === 'string' && SESSION_ID.test(value) ? value : null
}

function boundedString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length <= max ? value : null
}

function optionalString(source: Record<string, unknown>, key: string, max: number): string | undefined | null {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined
  const value = source[key]
  if (typeof value !== 'string' || value.length > max) return null
  return value
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > URL_MAX) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function patternList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 40) return null
  const list: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length < 1 || item.length > 299) return null
    list.push(item)
  }
  return list
}

function statusPatch(value: unknown): Partial<StatusConfig> | null {
  if (!plainObject(value)) return null
  const patch: Partial<StatusConfig> = {}
  for (const key of Object.keys(value)) {
    const numberKey = STATUS_NUMBERS.find((name) => name === key)
    const listKey = STATUS_LISTS.find((name) => name === key)
    if (numberKey) {
      const number = value[key]
      if (typeof number !== 'number' || !Number.isFinite(number)) return null
      patch[numberKey] = number
    } else if (listKey) {
      const list = patternList(value[key])
      if (!list) return null
      patch[listKey] = list
    } else {
      return null
    }
  }
  return patch
}

function createInput(value: unknown): CreateSessionInput | null {
  if (!plainObject(value)) return null
  for (const key of Object.keys(value)) {
    if (!CREATE_KEYS.has(key)) return null
  }
  const name = optionalString(value, 'name', NAME_MAX)
  const shellId = optionalString(value, 'shellId', SHELL_ID_MAX)
  const cwd = optionalString(value, 'cwd', PATH_MAX)
  if (name === null || shellId === null || cwd === null) return null
  return { name, shellId, cwd }
}

function settingsPatch(value: unknown): SettingsPatch | null {
  if (!plainObject(value)) return null
  const patch: SettingsPatch = {}
  for (const key of Object.keys(value)) {
    if (!SETTINGS_KEYS.has(key)) return null
  }
  if ('theme' in value) {
    if (!THEMES.includes(value.theme as (typeof THEMES)[number])) return null
    patch.theme = value.theme as SettingsPatch['theme']
  }
  if ('locale' in value) {
    if (!LOCALES.includes(value.locale as (typeof LOCALES)[number])) return null
    patch.locale = value.locale as SettingsPatch['locale']
  }
  if ('layout' in value) {
    if (!LAYOUTS.includes(value.layout as (typeof LAYOUTS)[number])) return null
    patch.layout = value.layout as SettingsPatch['layout']
  }
  if ('fontSize' in value) {
    if (typeof value.fontSize !== 'number' || !Number.isFinite(value.fontSize)) return null
    patch.fontSize = value.fontSize
  }
  if ('notifyDesktop' in value) {
    if (typeof value.notifyDesktop !== 'boolean') return null
    patch.notifyDesktop = value.notifyDesktop
  }
  if ('notifyBadge' in value) {
    if (typeof value.notifyBadge !== 'boolean') return null
    patch.notifyBadge = value.notifyBadge
  }
  if ('showReasons' in value) {
    if (typeof value.showReasons !== 'boolean') return null
    patch.showReasons = value.showReasons
  }
  if ('lastShellId' in value) {
    const shellId = boundedString(value.lastShellId, SHELL_ID_MAX)
    if (shellId === null) return null
    patch.lastShellId = shellId
  }
  if ('lastCwd' in value) {
    const cwd = boundedString(value.lastCwd, PATH_MAX)
    if (cwd === null) return null
    patch.lastCwd = cwd
  }
  if ('status' in value) {
    const status = statusPatch(value.status)
    if (!status) return null
    patch.status = status
  }
  return patch
}

type Parsed =
  | { channel: 'app:boot' }
  | { channel: 'sessions:create'; input: CreateSessionInput }
  | { channel: 'sessions:close'; id: string }
  | { channel: 'sessions:rename'; id: string; name: string }
  | { channel: 'sessions:subscribe'; id: string }
  | { channel: 'settings:update'; patch: SettingsPatch }
  | { channel: 'settings:reveal' }
  | { channel: 'dialog:directory'; defaultPath: string }
  | { channel: 'terminal:write'; id: string; data: string }
  | { channel: 'terminal:resize'; id: string; cols: number; rows: number }
  | { channel: 'terminal:watch'; id: string | null; focused: boolean }
  | { channel: 'shell:openExternal'; url: string }

function parse(channel: LegacyChannel, args: readonly unknown[], limits: LegacyLimits): Parsed | null {
  switch (channel) {
    case 'app:boot':
    case 'settings:reveal':
      return args.length === 0 ? { channel } : null
    case 'sessions:create': {
      if (args.length !== 1) return null
      const input = createInput(args[0])
      return input ? { channel, input } : null
    }
    case 'sessions:close':
    case 'sessions:subscribe': {
      if (args.length !== 1) return null
      const id = sessionId(args[0])
      return id ? { channel, id } : null
    }
    case 'sessions:rename': {
      if (args.length !== 2) return null
      const id = sessionId(args[0])
      const name = boundedString(args[1], NAME_MAX)
      return id && name !== null ? { channel, id, name } : null
    }
    case 'settings:update': {
      if (args.length !== 1) return null
      const patch = settingsPatch(args[0])
      return patch ? { channel, patch } : null
    }
    case 'dialog:directory': {
      if (args.length !== 1) return null
      const defaultPath = boundedString(args[0], PATH_MAX)
      return defaultPath !== null ? { channel, defaultPath } : null
    }
    case 'terminal:write': {
      if (args.length !== 2) return null
      const id = sessionId(args[0])
      const data = args[1]
      if (!id || typeof data !== 'string') return null
      const text = data.length > limits.maxWriteChars ? data.slice(0, limits.maxWriteChars) : data
      return { channel, id, data: text }
    }
    case 'terminal:resize': {
      if (args.length !== 3) return null
      const id = sessionId(args[0])
      const cols = args[1]
      const rows = args[2]
      if (!id || !Number.isInteger(cols) || !Number.isInteger(rows)) return null
      if ((cols as number) < 2 || (cols as number) > 500 || (rows as number) < 2 || (rows as number) > 200) return null
      return { channel, id, cols: cols as number, rows: rows as number }
    }
    case 'terminal:watch': {
      if (args.length !== 2) return null
      const id = args[0] === null ? null : sessionId(args[0])
      if (args[0] !== null && !id) return null
      if (typeof args[1] !== 'boolean') return null
      return { channel, id, focused: args[1] }
    }
    case 'shell:openExternal': {
      if (args.length !== 1) return null
      const url = httpUrl(args[0])
      return url ? { channel, url } : null
    }
    default: {
      const unreachable: never = channel
      return unreachable
    }
  }
}

function refused(channel: LegacyChannel): unknown {
  if (channel === 'app:boot' || channel === 'settings:update' || channel === 'dialog:directory') return null
  if (channel === 'sessions:create') return { ok: false, error: 'rejected' }
  if (channel === 'sessions:subscribe') return { seq: 0, data: '' }
  return undefined
}

function run(parsed: Parsed, effects: LegacyEffects): unknown {
  switch (parsed.channel) {
    case 'app:boot':
      return effects.boot()
    case 'sessions:create':
      return effects.create(parsed.input)
    case 'sessions:close':
      effects.close(parsed.id)
      return undefined
    case 'sessions:rename':
      effects.rename(parsed.id, parsed.name)
      return undefined
    case 'sessions:subscribe':
      return effects.subscribe(parsed.id)
    case 'settings:update':
      return effects.updateSettings(parsed.patch)
    case 'settings:reveal':
      effects.revealSettings()
      return undefined
    case 'dialog:directory':
      return effects.pickDirectory(parsed.defaultPath)
    case 'terminal:write':
      effects.write(parsed.id, parsed.data)
      return undefined
    case 'terminal:resize':
      effects.resize(parsed.id, parsed.cols, parsed.rows)
      return undefined
    case 'terminal:watch':
      effects.watch(parsed.id, parsed.focused)
      return undefined
    case 'shell:openExternal':
      effects.openExternal(parsed.url)
      return undefined
    default: {
      const unreachable: never = parsed
      return unreachable
    }
  }
}

export function dispatchLegacyIpc(
  channel: LegacyChannel,
  event: { sender: object },
  args: readonly unknown[],
  appContents: object | null,
  effects: LegacyEffects,
  limits: LegacyLimits,
): unknown {
  if (!isAppSender(event, appContents)) return refused(channel)
  const parsed = parse(channel, args, limits)
  if (!parsed) {
    if (channel === 'settings:update') return effects.currentSettings()
    return refused(channel)
  }
  return run(parsed, effects)
}
