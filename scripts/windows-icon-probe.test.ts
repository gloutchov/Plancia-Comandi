import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('native Windows icon probe module isolation', () => {
  it.skipIf(process.platform !== 'win32')('ignores an external module that intercepts its cmdlets', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-icon-modules-'))
    for (const name of ['home', 'app-data', 'local-app-data']) mkdirSync(path.join(root, name))
    const modules = path.join(root, 'modules')
    const module = path.join(modules, 'Microsoft.PowerShell.Utility')
    mkdirSync(module, { recursive: true })
    const marker = path.join(root, 'external-module.txt')
    writeFileSync(path.join(module, 'Microsoft.PowerShell.Utility.psd1'), `@{
RootModule = 'poison.psm1'
ModuleVersion = '99.0.0'
GUID = '00000000-0000-4000-8000-000000000019'
FunctionsToExport = @('ConvertTo-Json', 'Add-Type')
CmdletsToExport = @()
AliasesToExport = @()
}`)
    writeFileSync(path.join(module, 'poison.psm1'), `
function ConvertTo-Json { [IO.File]::AppendAllText($env:PLANCIA_ICON_MODULE_MARKER, 'selected'); throw 'Synthetic external module selected' }
function Add-Type { [IO.File]::AppendAllText($env:PLANCIA_ICON_MODULE_MARKER, 'selected'); throw 'Synthetic external module selected' }
Export-ModuleMember -Function ConvertTo-Json, Add-Type
`)
    const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR)$/i.test(key)))
    Object.assign(env, {
      HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home'),
      APPDATA: path.join(root, 'app-data'), LOCALAPPDATA: path.join(root, 'local-app-data'),
      PSModulePath: modules, PLANCIA_ICON_MODULE_MARKER: marker,
    })
    const powershell = path.join(env.SystemRoot ?? env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    const options = { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'], encoding: 'utf8' as const, timeout: 20000, maxBuffer: 8192 }
    // Prove the synthetic module is discoverable before testing the boundary.
    expect(() => execFileSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference = 'Stop'; ConvertTo-Json 1"], options)).toThrow()
    expect(existsSync(marker)).toBe(true)
    const selected = readFileSync(marker, 'utf8')
    const input = path.join(root, 'input.json')
    // No real window is read: the native API must reject the null HWND.
    writeFileSync(input, JSON.stringify({ handle: '0', reference: path.join(root, 'unused.ico') }))
    writeFileSync(path.join(root, 'input.progress.json'), JSON.stringify({ stage: 'not-started', elapsedMs: 0 }))
    const script = fileURLToPath(new URL('./windows-icon-probe.ps1', import.meta.url))
    expect(() => execFileSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script, '-InputFile', input], options)).toThrow()
    expect(readFileSync(marker, 'utf8')).toBe(selected)
    const progress = JSON.parse(readFileSync(path.join(root, 'input.progress.json'), 'utf8'))
    expect(progress.stage).toBe('app-id')
    expect(progress.elapsedMs).toBeGreaterThanOrEqual(0)
  }, 45000)
})
