const stages = new Set([
  'launch', 'isolated before main', 'boot metadata', 'native PTY command', 'native worker readiness',
  'custom pattern regression', 'settings failure regression', 'IPC CSP and permissions', 'session close',
  ...['it/dark', 'en/light'].flatMap(value => ['update', 'reload', 'render'].map(action => `preferences ${value} ${action}`)),
  ...[1, 2, 3].map(index => `native PTY ${index} create`),
  ...['split', 'stack', 'grid', 'single'].map(value => `layout ${value}`),
])
const methods = new Set(['Runtime.evaluate', 'Page.reload', 'Page.captureScreenshot', 'Emulation.setDeviceMetricsOverride'])
const statuses = new Set(['pending', 'resolved', 'rejected', 'timeout'])
const stageName = value => stages.has(value) ? value : 'unknown'

/** Public failure artifact contains only allowlisted bounded metadata. */
export function smokeFailureMetadata(stage, requests) {
  return {
    stage: stageName(stage),
    requests: requests.slice(-32).map(entry => ({
      id: Number.isSafeInteger(entry.id) && entry.id >= 0 ? entry.id : null,
      method: methods.has(entry.method) ? entry.method : 'unknown',
      stage: stageName(entry.stage),
      status: statuses.has(entry.status) ? entry.status : 'unknown',
    })),
  }
}
