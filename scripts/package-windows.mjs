import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The Windows workflow calls this file with Node. Options stay a JavaScript
// object: PowerShell never sees -c.* or --config.* arguments. npmRebuild must
// be the boolean false, because electron-builder skips the native rebuild only
// when config.npmRebuild === false. The CLI string "false" does not match.
export function windowsPackageOptions() {
  return {
    win: ['nsis', 'portable'],
    x64: true,
    publish: 'never',
    config: {
      npmRebuild: false,
      nsis: {
        runAfterFinish: false,
        artifactName: 'PlanciaComandi-win-${version}-${arch}-setup.${ext}',
      },
      portable: {
        artifactName: 'PlanciaComandi-win-${version}-${arch}-portable.${ext}',
      },
    },
  }
}

function isDirectRun() {
  const entry = process.argv[1]
  if (!entry) return false
  const invoked = path.resolve(entry)
  const self = fileURLToPath(import.meta.url)
  return process.platform === 'win32' ? invoked.toLowerCase() === self.toLowerCase() : invoked === self
}

async function packageWindows() {
  const require = createRequire(path.join(process.cwd(), 'package.json'))
  let build
  try {
    ;({ build } = require('electron-builder'))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`electron-builder is not installed in ${process.cwd()}: ${detail}`)
  }
  await build(windowsPackageOptions())
}

if (isDirectRun()) {
  packageWindows()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error))
      process.exit(1)
    })
}
