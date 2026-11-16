import { spawn } from 'node:child_process'
import { appBundlePath, assertDefaultFuses, assertReleaseFuses, readFuseStates } from './electron-fuses.mjs'

const releaseExecutable = process.argv[2]
const twinExecutable = process.argv[3]
if (!releaseExecutable || !twinExecutable) {
  console.error('Usage: node scripts/check-mac-bundles.mjs <release-executable> <open-fuse-executable>')
  process.exit(1)
}

function verifySignature(bundle) {
  return new Promise((resolve) => {
    const child = spawn('codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundle], { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.once('error', (error) => resolve({ ok: false, output: String(error) }))
    child.once('exit', (code) => resolve({ ok: code === 0, code, output: output.slice(-1500) }))
  })
}

const releaseStates = await readFuseStates(releaseExecutable)
const twinStates = await readFuseStates(twinExecutable)
assertReleaseFuses(releaseStates)
assertDefaultFuses(twinStates)
const bundles = [appBundlePath(releaseExecutable), appBundlePath(twinExecutable)]
const signatures = []
for (const bundle of bundles) {
  if (!bundle) throw new Error('Expected a .app bundle path')
  const result = await verifySignature(bundle)
  signatures.push({ bundle: bundle.split(/[\\/]/).pop(), ok: result.ok, code: result.code, output: result.output })
  if (!result.ok) {
    console.error(JSON.stringify({ bundle, codesign: result.output }))
    process.exit(1)
  }
}
console.log(JSON.stringify({ bundles: 'checked', release: releaseStates, twin: twinStates, signatures }))
