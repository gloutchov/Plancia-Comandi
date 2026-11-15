import { describe, expect, it, vi } from 'vitest'
import { denyRendererPermissions } from '../../electron/permissions'

describe('browser permissions default deny', () => {
  it('installs both handlers and rejects every permission, including unknown future types', () => {
    const target = { setPermissionCheckHandler: vi.fn(), setPermissionRequestHandler: vi.fn() }
    denyRendererPermissions(target)
    const check = target.setPermissionCheckHandler.mock.calls[0][0]
    const request = target.setPermissionRequestHandler.mock.calls[0][0]
    for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'display-capture', 'fileSystem', 'openExternal', 'unknown-future-permission', '']) {
      for (const contents of [null, {}]) {
        expect(check(contents, permission, 'file://', {})).toBe(false)
        const callback = vi.fn()
        request(contents, permission, callback, {})
        expect(callback).toHaveBeenCalledExactlyOnceWith(false)
      }
    }
  })
})
