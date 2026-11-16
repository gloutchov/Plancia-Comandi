import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { it } from 'vitest'
import { connectProtocol, smokeEnvironment } from './smoke-driver.mjs'
import { restoreSmokeWorkerStartup, smokeWorkerHandshake, smokeWorkerReadiness } from './smoke-worker.mjs'

it('starts an implicit worker under an attached startup debugger without changing explicit worker options', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-smoke-worker-'))
  mkdirSync(path.join(root, 'home'))
  const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', '-e', 'setInterval(()=>{},1000)'], {
    cwd: root, env: smokeEnvironment(root), stdio: ['ignore', 'pipe', 'pipe'],
  })
  let diagnostics = ''
  let launchFailed = false
  child.on('error', () => { launchFailed = true })
  const exit = new Promise<void>(resolve => { child.once('exit', () => resolve()); child.once('error', () => resolve()) })
  child.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-8000) })
  let driver: Awaited<ReturnType<typeof connectProtocol>> | undefined
  let paused = false
  async function until(task: () => unknown) {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      assert(!launchFailed && child.exitCode === null, 'Inspector fixture could not start')
      const result = task(); if (result) return result; await delay(20)
    }
    throw new Error('Synthetic debugger did not become ready')
  }
  try {
    const url = await until(() => diagnostics.match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1]) as string
    driver = await connectProtocol(url, method => { if (method === 'Debugger.paused') paused = true })
    await driver.request('Debugger.enable')
    await driver.request('Runtime.runIfWaitingForDebugger')
    await until(() => paused)
    await driver.request('Debugger.resume')
    await driver.request('Debugger.disable')
    assert.equal((await driver.evaluate(`(${smokeWorkerHandshake.toString()})({execArgv:[]})`)).started, true)
    await driver.evaluate(`(${restoreSmokeWorkerStartup.toString()})()`)
    assert.equal((await driver.evaluate(`(${smokeWorkerHandshake.toString()})()`)).started, true)
    // An explicit debug flag still pauses: the harness must not silently
    // rewrite options intentionally supplied by the caller (M7 uses []).
    assert.equal((await driver.evaluate(`(${smokeWorkerHandshake.toString()})({execArgv:['--inspect-brk=127.0.0.1:0']}, 'yield')`)).started, false)
  } finally {
    driver?.close()
    child.kill('SIGTERM')
    await exit
    rmSync(root, { recursive: true, force: true })
  }
}, 15000)

it('reinstalls the worker patch and can wait without blocking the run loop', async () => {
  const threads = process.getBuiltinModule('worker_threads')
  const original = threads.Worker
  threads.Worker = original
  try {
    const yielded = await smokeWorkerHandshake({}, 'yield')
    assert.equal(yielded.started, true)
    threads.Worker = original
    const readiness = await smokeWorkerReadiness()
    assert.equal(readiness.started, true)
    assert.equal(threads.Worker.name, 'SmokeWorker')
  } finally {
    threads.Worker = original
  }
})
