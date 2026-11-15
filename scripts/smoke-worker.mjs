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

/** Real shared-memory handshake, independent of the parent's event loop.
 * This models ConPTY's output worker while the main waits synchronously.
 */
export function smokeWorkerHandshake(options = {}) {
  const { Worker } = process.getBuiltinModule('worker_threads')
  const shared = new SharedArrayBuffer(4)
  const state = new Int32Array(shared)
  const worker = new Worker(`const {workerData}=require('node:worker_threads');
    const state=new Int32Array(workerData);Atomics.store(state,0,1);Atomics.notify(state,0);`,
  { eval: true, workerData: shared, ...options })
  const wait = Atomics.wait(state, 0, 0, 1000)
  const started = Atomics.load(state, 0) === 1
  void worker.terminate()
  return { started, wait }
}
