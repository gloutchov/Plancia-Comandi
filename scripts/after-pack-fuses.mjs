import { readdir } from 'node:fs/promises'
import { applyReleaseFuses, copyOpenFuseTwin, fuseTarget } from './electron-fuses.mjs'

// electron-builder 26.18.0 flips only the eight fuses in its schema and does
// not pass strictlyRequireAllFuses. This hook copies the open-fuse twin first,
// then flips all nine fuses on the directory that becomes the release package.
export async function afterPack(context) {
  const twin = await copyOpenFuseTwin(context.appOutDir)
  console.log(JSON.stringify({ afterPack: 'open-fuse-twin', copy: process.platform === 'darwin' ? 'ditto' : 'verbatim-symlinks', twin: pathBasename(twin) }))
  const entries = await readdir(context.appOutDir)
  const target = fuseTarget(context.appOutDir, context.electronPlatformName, entries)
  const states = await applyReleaseFuses(target)
  console.log(JSON.stringify({ afterPack: 'release-fuses', states }))
}

function pathBasename(value) {
  const parts = String(value).split(/[\\/]/)
  return parts[parts.length - 1] || value
}

export default afterPack
