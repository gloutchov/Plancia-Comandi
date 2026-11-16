// A negative ELECTRON_RUN_AS_NODE result is 'blocked' only while the app is
// still running. An early exit is a separate outcome: the marker check alone
// would hide a crash or a Windows process that already quit.
export function runAsNodeOutcome({ shouldRun, written, alive }) {
  if (written !== shouldRun) return null
  if (shouldRun) return 'ran'
  return alive ? 'blocked' : null
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
