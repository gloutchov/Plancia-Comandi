export function windowsAppUserModelId(isPackaged: boolean): string {
  return isPackaged ? 'it.plancia.comandi.Desktop' : 'it.plancia.comandi.Dev'
}
