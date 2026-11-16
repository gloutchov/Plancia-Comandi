import { readdir } from 'node:fs/promises'
import { applyReleaseFuses, fuseTarget } from './electron-fuses.mjs'

// electron-builder edits the Windows executable with rcedit after this hook.
// The open-fuse twin is therefore made from the finished unpacked directory,
// not from this copy. See scripts/prepare-open-fuse-twin.mjs.
export async function afterPack(context) {
  const entries = await readdir(context.appOutDir)
  const target = fuseTarget(context.appOutDir, context.electronPlatformName, entries)
  const states = await applyReleaseFuses(target)
  console.log(JSON.stringify({ afterPack: 'release-fuses', states }))
}

export default afterPack
