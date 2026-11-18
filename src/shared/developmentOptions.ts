/** Development controls never take effect in a distributed application. */
export function developmentOptions(isPackaged: boolean, env: NodeJS.ProcessEnv) {
  if (isPackaged) return { demo: false, devtools: false, shotExit: false, shotDir: undefined,
    startupTrace: false, startupTraceDir: undefined }
  const flag = (name: string, legacy: string) => env[name] === '1' || env[legacy] === '1'
  const text = (name: string, legacy: string) => env[name] || env[legacy]
  const startupTrace = env.PLANCIA_DIAG_STARTUP === '1'
  return {
    demo: flag('PLANCIA_DEMO', 'MOLO_DEMO'),
    devtools: flag('PLANCIA_DEVTOOLS', 'MOLO_DEVTOOLS'),
    shotExit: flag('PLANCIA_SHOT_EXIT', 'MOLO_SHOT_EXIT'),
    shotDir: text('PLANCIA_SHOT_DIR', 'MOLO_SHOT_DIR'),
    startupTrace,
    startupTraceDir: startupTrace ? env.PLANCIA_DIAG_DIR : undefined,
  }
}
