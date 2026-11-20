// Keep historical release readers compatible with the pre-M33 names.
export const APP_NAME = 'Plancia Comandi'
export const WINDOWS_APP_EXE = `${APP_NAME}.exe`
export const MAC_APP_NAME = `${APP_NAME}.app`
export const LEGACY_MAC_APP_NAME = 'plancia-comandi.app'

export function isWindowsAppExe(name) {
  return [WINDOWS_APP_EXE.toLowerCase(), 'plancia-comandi.exe'].includes(String(name).toLowerCase())
}
