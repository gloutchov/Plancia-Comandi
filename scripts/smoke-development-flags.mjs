import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'

export function hasDevelopmentSmoke(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return false
  const [major, minor, patch] = match.slice(1).map(Number)
  return major > 0 || minor > 3 || (minor === 3 && patch >= 9)
}

export function hasRestrictedViewMenu(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return false
  const [major, minor, patch] = match.slice(1).map(Number)
  return major > 0 || minor > 3 || (minor === 3 && patch >= 12)
}

/** Only the disposable test process receives these flags. There is no app bypass. */
export function developmentSmokeEnvironment(root) {
  return {
    PLANCIA_DEMO: '1', MOLO_DEMO: '1', PLANCIA_DEVTOOLS: '1', MOLO_DEVTOOLS: '1',
    PLANCIA_SHOT_EXIT: '1', MOLO_SHOT_EXIT: '1',
    PLANCIA_SHOT_DIR: path.join(root, 'forbidden-shots'), MOLO_SHOT_DIR: path.join(root, 'forbidden-legacy-shots'),
    PLANCIA_DIAG_STARTUP: '1', PLANCIA_DIAG_DIR: path.join(root, 'forbidden-trace'),
  }
}

export function assertNoDevelopmentFiles(root) {
  for (const name of ['forbidden-shots', 'forbidden-legacy-shots', 'forbidden-trace', 'startup.jsonl']) {
    assert.equal(existsSync(path.join(root, name)), false, `Packaged development output exists: ${name}`)
  }
}
