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
  it.each(['darwin', 'win32', 'linux'] as const)('localizes all built-in commands on %s when the app language changes', platform => {
    Object.defineProperty(process, 'platform', { ...platformDescriptor, value: platform })
    const flatten = (items: Electron.MenuItemConstructorOptions[]): Electron.MenuItemConstructorOptions[] =>
      items.flatMap(item => [item, ...(Array.isArray(item.submenu) ? flatten(item.submenu) : [])])
    for (const locale of ['it', 'en', 'it'] as const) {
      installApplicationMenu(locale, () => null)
      const items = flatten(mock.build.mock.lastCall![0])
      const roles = new Map(items.filter(item => item.role).map(item => [item.role?.toLowerCase(), item.label]))
      const labels = locale === 'it' ? {
        viewmenu: 'Vista', resetzoom: 'Dimensioni reali', zoomin: 'Ingrandisci', zoomout: 'Riduci',
        togglefullscreen: 'Attiva/disattiva schermo intero', windowmenu: 'Finestra', minimize: 'Riduci a icona',
      } : {
        viewmenu: 'View', resetzoom: 'Actual Size', zoomin: 'Zoom In', zoomout: 'Zoom Out',
        togglefullscreen: 'Toggle Full Screen', windowmenu: 'Window', minimize: 'Minimize',
      }
      for (const [role, label] of Object.entries(labels)) expect(roles.get(role)).toBe(label)
      if (platform === 'darwin') {
        const macLabels = locale === 'it' ? {
          appmenu: 'Plancia Comandi', about: 'Informazioni su Plancia Comandi', services: 'Servizi',
          hide: 'Nascondi Plancia Comandi', hideothers: 'Nascondi altre', unhide: 'Mostra tutte',
          quit: 'Esci da Plancia Comandi', zoom: 'Ingrandisci finestra', front: 'Porta tutto in primo piano',
        } : {
          appmenu: 'Plancia Comandi', about: 'About Plancia Comandi', services: 'Services',
          hide: 'Hide Plancia Comandi', hideothers: 'Hide Others', unhide: 'Show All',
          quit: 'Quit Plancia Comandi', zoom: 'Zoom', front: 'Bring All to Front',
        }
        for (const [role, label] of Object.entries(macLabels)) expect(roles.get(role)).toBe(label)
        expect(roles.has('close')).toBe(false)
      } else {
        expect(roles.get('close')).toBe(locale === 'it' ? 'Chiudi finestra' : 'Close Window')
        expect(roles.has('appmenu')).toBe(false)
      }
      for (const item of items.filter(item => item.type !== 'separator')) {
        expect(item.label).toBeTruthy()
        expect(item.label).not.toContain('{app}')
      }
    }
  })

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
