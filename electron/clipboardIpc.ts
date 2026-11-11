import { clipboard, ipcMain, nativeImage } from 'electron'
import { saveClipboardImage } from '../src/shared/clipboardImages'
import type { AppConfig } from '../src/shared/appConfig'

type IpcEvent = { sender: Electron.WebContents }

function imageMime(types: readonly string[]): string | null {
  const images = types.filter((type) => type.startsWith('image/'))
  return images.find((type) => type === 'image/png') ?? images.find((type) => type === 'image/jpeg') ?? images[0] ?? null
}

export function registerClipboardIpc(options: {
  isSender: (event: IpcEvent) => boolean
  getConfig: () => AppConfig
  userDataDir: string
}): void {
  ipcMain.handle('clipboard:writeText', async (event, text: unknown) => {
    if (!options.isSender(event)) return false
    if (typeof text !== 'string' || text.length === 0) return false
    const max = options.getConfig().terminal.maxWriteChars
    try {
      await clipboard.writeText(text.length > max ? text.slice(0, max) : text)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('clipboard:readText', async (event) => {
    if (!options.isSender(event)) return ''
    try {
      const text = await clipboard.readText()
      if (!text) return ''
      const max = options.getConfig().terminal.maxWriteChars
      return text.length > max ? text.slice(0, max) : text
    } catch {
      return ''
    }
  })

  ipcMain.handle('clipboard:readImage', async (event) => {
    if (!options.isSender(event)) return null
    try {
      const items = await clipboard.read()
      const config = options.getConfig().clipboardImages
      for (const item of items) {
        const mime = imageMime(item.types)
        if (!mime) continue
        const payload = await item.getType(mime)
        if (!(payload instanceof Blob) || payload.size < 1 || payload.size > config.maxBytes) continue
        const image = nativeImage.createFromBuffer(Buffer.from(await payload.arrayBuffer()))
        if (image.isEmpty()) continue
        const size = image.getSize()
        if (size.width < 1 || size.height < 1 || size.width > config.maxEdgePx || size.height > config.maxEdgePx) continue
        const saved = saveClipboardImage({
          png: image.toPNG(),
          width: size.width,
          height: size.height,
          config,
          userDataDir: options.userDataDir,
        })
        if (saved) return saved
      }
      return null
    } catch {
      return null
    }
  })
}
