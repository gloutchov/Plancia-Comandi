import { readdir } from 'node:fs/promises'
import { applyReleaseFuses, copyOpenFuseTwin, fuseTarget } from './electron-fuses.mjs'

// electron-builder 26.18.0 flips only the eight fuses in its schema and does
// not pass strictlyRequireAllFuses. This hook copies the open-fuse twin first,
// then flips all nine fuses on the directory that becomes the release package.
export async function afterPack(context) {
  await copyOpenFuseTwin(context.appOutDir)
  const entries = await readdir(context.appOutDir)
  const target = fuseTarget(context.appOutDir, context.electronPlatformName, entries)
  await applyReleaseFuses(target)
}

export default afterPack
