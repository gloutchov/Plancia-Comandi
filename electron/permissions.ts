/** No browser permission is needed by the terminal UI. Native main-process
 * clipboard and notifications continue through their existing validated APIs.
 * Install before creating the first renderer, for both checks and requests.
 */
export function denyRendererPermissions(target: Pick<Electron.Session, 'setPermissionCheckHandler' | 'setPermissionRequestHandler'>): void {
  target.setPermissionCheckHandler(() => false)
  target.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
}
