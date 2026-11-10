import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { clampStatusConfig } from '../src/shared/status'
import type { AppSettings, LayoutMode, Locale, SettingsPatch, ThemeSetting } from '../src/shared/types'

const THEMES: ThemeSetting[] = ['system', 'light', 'dark']
const LOCALES: Locale[] = ['it', 'en']
const LAYOUTS: LayoutMode[] = ['single', 'split']

export function defaultSettings(home: string): AppSettings {
  return {
    theme: 'system',
    locale: 'it',
    layout: 'single',
    fontSize: 14,
    notifyDesktop: true,
    notifyBadge: true,
    showReasons: false,
    lastShellId: '',
    lastCwd: home,
    status: clampStatusConfig(null),
  }
}

function asTheme(value: unknown, fallback: ThemeSetting): ThemeSetting {
  return THEMES.includes(value as ThemeSetting) ? (value as ThemeSetting) : fallback
}

function asLocale(value: unknown, fallback: Locale): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : fallback
}

function asLayout(value: unknown, fallback: LayoutMode): LayoutMode {
  return LAYOUTS.includes(value as LayoutMode) ? (value as LayoutMode) : fallback
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asFont(value: unknown): number {
  const size = Number(value)
  if (!Number.isFinite(size)) return 14
  return Math.min(22, Math.max(11, Math.round(size)))
}

export function sanitizeSettings(input: Partial<AppSettings> | null | undefined, home: string): AppSettings {
  const base = defaultSettings(home)
  const source = input ?? {}
  let lastCwd = typeof source.lastCwd === 'string' && source.lastCwd.trim() ? source.lastCwd.trim() : base.lastCwd
  try {
    if (!fs.existsSync(lastCwd) || !fs.statSync(lastCwd).isDirectory()) lastCwd = home
  } catch {
    lastCwd = home
  }
  return {
    theme: asTheme(source.theme, base.theme),
    locale: asLocale(source.locale, base.locale),
    layout: asLayout(source.layout, base.layout),
    fontSize: asFont(source.fontSize),
    notifyDesktop: asBool(source.notifyDesktop, base.notifyDesktop),
    notifyBadge: asBool(source.notifyBadge, base.notifyBadge),
    showReasons: asBool(source.showReasons, base.showReasons),
    lastShellId: typeof source.lastShellId === 'string' ? source.lastShellId.slice(0, 40) : '',
    lastCwd,
    status: clampStatusConfig(source.status),
  }
}

export class SettingsStore {
  readonly file: string
  data: AppSettings
  private home: string

  constructor(home: string) {
    this.home = home
    this.file = path.join(app.getPath('userData'), 'settings.json')
    this.data = this.read()
  }

  private read(): AppSettings {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<AppSettings>
      return sanitizeSettings(parsed, this.home)
    } catch {
      return defaultSettings(this.home)
    }
  }

  update(patch: SettingsPatch): AppSettings {
    this.data = sanitizeSettings(
      {
        ...this.data,
        ...patch,
        status: { ...this.data.status, ...(patch.status ?? {}) },
      },
      this.home,
    )
    this.save()
    return this.data
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const body = {
      _comment:
        'Molo settings. Timings are milliseconds. extraIdlePatterns, extraBusyPatterns and extraAttentionPatterns are JavaScript regex sources.',
      ...this.data,
    }
    fs.writeFileSync(this.file, JSON.stringify(body, null, 2))
  }
}
