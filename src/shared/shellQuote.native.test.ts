import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDroppedPaths, quoteShellArg } from './shellQuote'
import { capturePowerShellImagePaste, powerShellQuotingCases } from '../test/powershellQuoting'
import { decodeNativeReport, encodeNativeCases, type NativeCase } from '../test/powershellNativeTransport'

const windows = process.platform === 'win32'
const engines = [
  {
    name: 'Windows PowerShell 5.1',
    executable: path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    enabled: windows,
    version: /^5\.1\./,
    shellId: 'powershell',
  },
  {
    name: 'PowerShell 7',
    executable: process.env.PLANCIA_TEST_PWSH || 'pwsh.exe',
    enabled: windows || Boolean(process.env.PLANCIA_TEST_PWSH),
    version: /^7\./,
    shellId: 'pwsh',
  },
]

// All data fields are UTF-8/base64, with a fixed ASCII wire format. No cmdlets
// are needed: PowerShell 5.1 must not autoload modules before checking quoting.
const launcher = `
$ErrorActionPreference = 'Stop'
$PSModuleAutoLoadingPreference = 'None'
[IO.File]::WriteAllText($env:PLANCIA_QUOTE_PROGRESS, 'started')
$env:PSModulePath = [IO.Path]::Combine($PSHOME, 'Modules')
$rows = [IO.File]::ReadAllLines($env:PLANCIA_QUOTE_INPUT, [Text.Encoding]::UTF8)
[IO.File]::WriteAllText($env:PLANCIA_QUOTE_PROGRESS, 'loaded')
function Get-Decoded([string]$value) { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($value)) }
function Get-Encoded([string]$value) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($value)) }
function Get-CapturedArgs { [pscustomobject]@{ count = $args.Count; values = @($args) } }
$results = [Collections.Generic.List[string]]::new()
$index = 0
foreach ($row in $rows) {
  [IO.File]::WriteAllText($env:PLANCIA_QUOTE_PROGRESS, ('case:' + $index))
  $fields = $row.Split([char]9)
  $name = Get-Decoded ($fields[0])
  $code = Get-Decoded ($fields[1])
  $values = @(for ($j = 2; $j -lt $fields.Length; $j++) { Get-Decoded ($fields[$j]) })
  $reference = @(foreach ($value in $values) { "'" + [System.Management.Automation.Language.CodeGeneration]::EscapeSingleQuotedStringContent([string]$value) + "'" }) -join ' '
  $captured = @(& ([scriptblock]::Create('Get-CapturedArgs ' + $code)))
  $records = [Collections.Generic.List[string]]::new()
  foreach ($item in $captured) {
    if ($item -isnot [pscustomobject] -or -not $item.PSObject.Properties['values'] -or -not $item.PSObject.Properties['count']) {
      $records.Add('{"unexpectedOutput":true}')
    } else {
      $encodedValues = @(foreach ($value in $item.values) { '"' + (Get-Encoded ([string]$value)) + '"' })
      $records.Add('{"count":' + [int]$item.count + ',"values":[' + ($encodedValues -join ',') + ']}')
    }
  }
  $results.Add('{"name":"' + (Get-Encoded $name) + '","reference":"' + (Get-Encoded $reference) + '","captured":[' + ($records -join ',') + ']}')
  $index++
}
[IO.File]::WriteAllText($env:PLANCIA_QUOTE_PROGRESS, 'report')
$json = '{"version":"' + $PSVersionTable.PSVersion.ToString() + '","edition":"' + $PSVersionTable.PSEdition + '","results":[' + ($results -join ',') + ']}'
[IO.File]::WriteAllText($env:PLANCIA_QUOTE_REPORT, $json, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($env:PLANCIA_QUOTE_PROGRESS, 'complete')
`

for (const engine of engines) {
  describe.skipIf(!engine.enabled)(engine.name, () => {
    it('matches the native escaping API and round-trips every insertion route without extra output', async () => {
      const cases: NativeCase[] = []
      for (const item of powerShellQuotingCases) {
        const image = await capturePowerShellImagePaste(item.value, engine.shellId)
        expect(image.textReads).toBe(0)
        expect(image.pasted).toHaveLength(1)
        cases.push(
          { name: `${item.name}: argument`, values: [item.value], code: quoteShellArg(item.value, 'powershell')! },
          { name: `${item.name}: dropped path`, values: [item.value], code: formatDroppedPaths([item.value], 'powershell', 2000)! },
          { name: `${item.name}: pasted image`, values: [item.value], code: image.pasted[0] },
        )
      }
      const values = ['C:\\Users\\O\u2019Brien\\img.png', 'C:\\second\u201a path\\img.png']
      cases.push({ name: 'multiple dropped paths', values, code: formatDroppedPaths(values, 'powershell', 2000)! })

      const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-powershell-quote-'))
      for (const dir of ['home', 'app-data', 'local-app-data', 'config', 'data']) mkdirSync(path.join(root, dir))
      const inputFile = path.join(root, 'cases.tsv')
      const reportFile = path.join(root, 'report.json')
      const progressFile = path.join(root, 'progress.txt')
      writeFileSync(inputFile, encodeNativeCases(cases), { encoding: 'utf8', mode: 0o600 })
      writeFileSync(reportFile, '', { mode: 0o600 })
      writeFileSync(progressFile, 'not-started', { mode: 0o600 })
      const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
        /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR)$/i.test(key)))
      Object.assign(env, {
        HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home'),
        APPDATA: path.join(root, 'app-data'), LOCALAPPDATA: path.join(root, 'local-app-data'),
        XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'),
        DOTNET_CLI_HOME: root, DOTNET_CLI_TELEMETRY_OPTOUT: '1',
        POWERSHELL_TELEMETRY_OPTOUT: '1', POWERSHELL_UPDATECHECK: 'Off', POWERSHELL_DIAGNOSTICS_OPTOUT: '1',
        PLANCIA_QUOTE_SENTINEL: 'EXPANDED',
        PLANCIA_QUOTE_INPUT: inputFile, PLANCIA_QUOTE_REPORT: reportFile, PLANCIA_QUOTE_PROGRESS: progressFile,
      })
      let output: string
      try {
        output = execFileSync(engine.executable,
          ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(launcher, 'utf16le').toString('base64')],
          { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 })
      } catch (error) {
        const failure = error as NodeJS.ErrnoException
        const value = readFileSync(progressFile, 'utf8').trim()
        const stage = /^(not-started|started|loaded|case:\d+|report|complete)$/.test(value) ? value : 'unknown'
        throw new Error(`${engine.name} fixture runner failed (${failure.code ?? failure.name}); stage=${stage}; temporaryRoot=${root}`)
      }
      expect(output).toBe('')
      expect(readFileSync(progressFile, 'utf8').trim()).toBe('complete')
      const report = decodeNativeReport(readFileSync(reportFile, 'utf8'))
      expect(report.version).toMatch(engine.version)
      expect(report.edition).toBe(engine.shellId === 'powershell' ? 'Desktop' : 'Core')
      expect(report.results).toHaveLength(cases.length)
      for (const [index, item] of report.results.entries()) {
        const expected = cases[index]
        expect(item.name).toBe(expected.name)
        expect(item.reference).toBe(expected.code.trimEnd())
        expect(item.captured, expected.name).toEqual([{ count: expected.values.length, values: expected.values }])
      }
      console.info(JSON.stringify({ powershellQuoting: 'passed', engine: engine.name, version: report.version, cases: cases.length, temporaryRoot: root }))
    }, 30000)
  })
}
