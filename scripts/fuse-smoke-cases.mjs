// A negative ELECTRON_RUN_AS_NODE result is 'blocked' only while the app is
// still running. An early exit is a separate outcome: the marker check alone
// would hide a crash or a Windows process that already quit.
export function runAsNodeOutcome({ shouldRun, written, alive }) {
  if (written !== shouldRun) return null
  if (shouldRun) return 'ran'
  return alive ? 'blocked' : null
}

// Packaged Electron keeps only --http-parser and --max-http-header-size in
// NODE_OPTIONS. --inspect and --require are removed even when the fuse is on.
export const NODE_OPTIONS_PROBE = '--max-http-header-size=8192'
export const NODE_OPTIONS_HEADER_SIZE = 8192
export const NODE_OPTIONS_IGNORED = 'NODE_OPTIONS ignored due to disabled nodeOptions fuse.'
// The inspector global of the Electron main process has process, not require.
// getBuiltinModule is on process since Node 22.3. Electron 45.4.1 here is Node 24.22.3.
export const HEADER_SIZE_READ = `(() => {
  const notes = []
  try {
    if (typeof process.getBuiltinModule === 'function') {
      const http = process.getBuiltinModule('node:http')
      if (http && typeof http.maxHeaderSize === 'number') return { size: http.maxHeaderSize, via: 'getBuiltinModule' }
      notes.push('getBuiltinModule returned no size')
    } else notes.push('getBuiltinModule missing')
  } catch (error) { notes.push('getBuiltinModule: ' + (error && error.message)) }
  try {
    const main = process.mainModule
    if (main && typeof main.require === 'function') {
      const http = main.require('http')
      if (http && typeof http.maxHeaderSize === 'number') return { size: http.maxHeaderSize, via: 'mainModule' }
      notes.push('mainModule returned no size')
    } else notes.push('mainModule missing')
  } catch (error) { notes.push('mainModule: ' + (error && error.message)) }
  try {
    const http = require('node:http')
    if (http && typeof http.maxHeaderSize === 'number') return { size: http.maxHeaderSize, via: 'require' }
    notes.push('require returned no size')
  } catch (error) { notes.push('require: ' + (error && error.message)) }
  return { size: null, error: notes.join('; ') }
})()`

export function headerSizeFromEvaluation(result) {
  const details = result?.exceptionDetails
  if (details) {
    const description = details.exception?.description
    const error = typeof description === 'string' && description ? description : JSON.stringify(details)
    return { headerSize: null, error, description: typeof description === 'string' ? description : null }
  }
  const value = result?.result?.value
  if (typeof value === 'number') return { headerSize: value, error: null, description: null }
  if (value && typeof value.size === 'number') return { headerSize: value.size, error: null, description: null }
  if (value && typeof value.error === 'string') return { headerSize: null, error: value.error, description: null }
  return { headerSize: null, error: 'non-number', description: null }
}

export function startupDiagnostic(alive, failure, startup) {
  if (alive) return null
  return { case: failure, alive, startup }
}

export function nodeOptionsOutcome({ shouldApply, headerSize = null, output = '', alive = true }) {
  const ignored = String(output).includes(NODE_OPTIONS_IGNORED)
  if (shouldApply) return headerSize === NODE_OPTIONS_HEADER_SIZE && !ignored ? `applied:${headerSize}` : null
  if (!alive) return null
  return ignored && headerSize == null ? 'ignored' : null
}

export function reportNodeOptionsMiss(detail) {
  console.log(JSON.stringify({
    case: 'NODE_OPTIONS',
    headerSize: detail.headerSize ?? null,
    readError: detail.readError ?? null,
    port: detail.port,
    exitCode: detail.exitCode ?? null,
    signal: detail.signal ?? null,
    elapsedMs: detail.elapsedMs,
  }))
  return formatNodeOptionsMiss(detail)
}

export function formatNodeOptionsMiss({ shouldApply, headerSize, readError, port, exitCode, signal, elapsedMs, timeoutMs, expected = NODE_OPTIONS_HEADER_SIZE }) {
  const exit = signal ? `signal ${signal}` : `exit ${exitCode ?? 'null'}`
  if (!shouldApply) return `NODE_OPTIONS was not ignored within ${elapsedMs}ms (limit ${timeoutMs}ms), ${exit}`
  const size = headerSize ?? 'missing'
  const reason = readError ? ` (${readError})` : ''
  return `NODE_OPTIONS header size ${size}${reason} on 127.0.0.1:${port} was not ${expected} within ${elapsedMs}ms (limit ${timeoutMs}ms), ${exit}`
}

export function processExitDetail(state, outputLimit = 2000) {
  const output = String(state?.output || '')
  return {
    pid: Number.isInteger(state?.pid) ? state.pid : null,
    exitCode: Number.isInteger(state?.code) ? state.code : null,
    signal: typeof state?.signal === 'string' && state.signal ? state.signal : null,
    spawnError: state?.error ? String(state.error).slice(0, 300) : null,
    outputTail: output.slice(-outputLimit),
  }
}
