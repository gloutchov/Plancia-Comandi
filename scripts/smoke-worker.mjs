/** Serialized into the disposable main process before application startup.
 * --inspect-brk also pauses workers that inherit the main's native debug
 * options, even when Electron's process.execArgv is empty. ConPTY waits
 * synchronously for its output worker, so that inherited pause deadlocks it.
 * Restore ordinary (non-debug) worker defaults in the harness only; preserve
 * every explicit execArgv and all other worker options supplied by callers.
 */
export function restoreSmokeWorkerStartup() {
  const threads = process.getBuiltinModule('worker_threads')
  const NativeWorker = threads.Worker
  threads.Worker = class SmokeWorker extends NativeWorker {
    constructor(filename, options = {}) {
      super(filename, options.execArgv === undefined ? { ...options, execArgv: [] } : options)
    }
  }
  process.getBuiltinModule('module').syncBuiltinESMExports()
}

/** Real shared-memory handshake. Self-contained so the smoke can serialize it.
 * Windows ConPTY waits synchronously, so that mode stays blocking.
 * On macOS the main thread is the run loop that has to schedule the new
 * worker; blocking it makes a healthy worker look suspended.
 */
export function smokeWorkerHandshake(options = {}, mode = process.platform === 'darwin' ? 'yield' : 'block') {
  const threads = process.getBuiltinModule('worker_threads')
  const shared = new SharedArrayBuffer(4)
  const state = new Int32Array(shared)
  let error = ''
  const worker = new threads.Worker(`const {workerData}=require('node:worker_threads');
    const state=new Int32Array(workerData);Atomics.store(state,0,1);Atomics.notify(state,0);`,
  { eval: true, workerData: shared, ...options })
  worker.on('error', (err) => { error = String(err && err.message || err).slice(0, 200) })
  const finish = (wait) => {
    const started = Atomics.load(state, 0) === 1
    void worker.terminate()
    return { started, wait, error, worker: threads.Worker.name }
  }
  if (mode === 'yield') {
    return new Promise((resolve) => {
      const deadline = Date.now() + 1000
      const tick = () => {
        if (Atomics.load(state, 0) === 1) resolve(finish('ok'))
        else if (Date.now() >= deadline) resolve(finish('timed-out'))
        else setTimeout(tick, 10)
      }
      tick()
    })
  }
  return finish(Atomics.wait(state, 0, 0, 1000))
}

/** In-process helper. The packaged smoke inlines the two serialized functions. */
export function smokeWorkerReadiness() {
  restoreSmokeWorkerStartup()
  return smokeWorkerHandshake()
}
