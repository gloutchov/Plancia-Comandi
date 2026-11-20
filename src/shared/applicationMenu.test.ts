import { afterEach, describe, expect, it, vi } from 'vitest'
import { installApplicationMenu } from '../../electron/editMenu'
import { translate } from './i18n'

const mock = vi.hoisted(() => ({
  app: { isPackaged: false },
  build: vi.fn((template: Electron.MenuItemConstructorOptions[]) => template),
  install: vi.fn(),
}))
vi.mock('electron', () => ({
  app: mock.app,
  Menu: { buildFromTemplate: mock.build, setApplicationMenu: mock.install },
}))

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')!
afterEach(() => {
  Object.defineProperty(process, 'platform', platformDescriptor)
  vi.clearAllMocks()
})

describe('application menu', () => {
  it.each(['darwin', 'win32', 'linux'] as const)('excludes reload and DevTools on %s after installation and language changes', platform => {
    Object.defineProperty(process, 'platform', { value: platform })
    for (const packaged of [false, true]) {
      mock.app.isPackaged = packaged
      for (const locale of ['it', 'en', 'it'] as const) {
        installApplicationMenu(locale, () => null)
        const template = mock.build.mock.lastCall![0]
        expect(mock.install).toHaveBeenLastCalledWith(template)
        const view = template.find(item => item.role === 'viewMenu')!
        // An explicit submenu is essential: an omitted submenu restores
        // Electron's default reload and DevTools roles and accelerators.
        expect(Array.isArray(view.submenu)).toBe(true)
        const items = view.submenu as Electron.MenuItemConstructorOptions[]
        expect(items.filter(item => item.type !== 'separator').map(item => item.role))
          .toEqual(['resetZoom', 'zoomIn', 'zoomOut', 'togglefullscreen'])
        const edit = template.find(item => item.label === translate(locale, 'menuEdit'))!
        const editItems = edit.submenu as Electron.MenuItemConstructorOptions[]
        expect(editItems.find(item => item.label === translate(locale, 'menuCopy'))?.accelerator)
          .toBe(platform === 'darwin' ? 'Command+C' : 'Ctrl+Shift+C')
        expect(editItems.find(item => item.label === translate(locale, 'menuPaste'))?.accelerator)
          .toBe(platform === 'darwin' ? 'Command+V' : 'Ctrl+Shift+V')
        const serialized = JSON.stringify(template).toLowerCase()
        for (const role of ['reload', 'forcereload', 'toggledevtools']) expect(serialized).not.toContain(role)
      }
    }
  })
})
