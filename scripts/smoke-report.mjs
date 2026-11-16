const stages = new Set([
  'launch', 'isolated before main', 'boot metadata', 'native PTY command', 'native worker readiness',
  'custom pattern regression', 'settings failure regression', 'IPC CSP and permissions', 'session close',
  'ConPTY child', 'ConPTY close', 'loopback debugging port',
  ...['it/dark', 'en/light'].flatMap(value => ['update', 'reload', 'render'].map(action => `preferences ${value} ${action}`)),
  ...[1, 2, 3].map(index => `native PTY ${index} create`),
  ...['split', 'stack', 'grid', 'single'].map(value => `layout ${value}`),
])
const methods = new Set(['Runtime.evaluate', 'Page.reload', 'Page.captureScreenshot', 'Emulation.setDeviceMetricsOverride'])
const statuses = new Set(['pending', 'resolved', 'rejected', 'timeout'])
const stageName = value => stages.has(value) ? value : 'unknown'

/** Public failure artifact contains only allowlisted bounded metadata. */
export function smokeFailureMetadata(stage, requests, runtime = {}) {
  const signal = typeof runtime.exitSignal === 'string' && /^[A-Za-z0-9]+$/.test(runtime.exitSignal) ? runtime.exitSignal : null
  return {
    stage: stageName(stage),
    exitCode: Number.isInteger(runtime.exitCode) ? runtime.exitCode : null,
    exitSignal: signal,
    outputTail: typeof runtime.output === 'string' ? runtime.output.slice(-2000) : '',
    requests: requests.slice(-32).map(entry => ({
      id: Number.isSafeInteger(entry.id) && entry.id >= 0 ? entry.id : null,
      method: methods.has(entry.method) ? entry.method : 'unknown',
      stage: stageName(entry.stage),
      status: statuses.has(entry.status) ? entry.status : 'unknown',
    })),
  }
}
