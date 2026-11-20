param(
  [Parameter(Mandatory = $true)][string]$Setup,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion
)
$ErrorActionPreference = 'Stop'
# Only the disposable GitHub-hosted runner: never use a personal installation,
# registry or preference file for this destructive installer/uninstaller probe.
if ($env:GITHUB_ACTIONS -ne 'true' -or -not $env:RUNNER_TEMP -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
  throw 'This upgrade probe requires a disposable GitHub-hosted Windows runner'
}
$root = Join-Path $env:RUNNER_TEMP ('plancia-name-upgrade-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$destination = Join-Path $root 'Installation With Spaces'
$legacy = Join-Path $root 'legacy-0.3.1-setup.exe'
$uri = 'https://github.com/gloutchov/Plancia-Comandi/releases/download/v0.3.1/PlanciaComandi-win-0.3.1-x64-setup.exe'
Invoke-WebRequest -Uri $uri -OutFile $legacy -TimeoutSec 180 -MaximumRedirection 5
if ((Get-FileHash $legacy -Algorithm SHA256).Hash.ToLower() -ne '7721a355424572419423b33e0e7077dadcca480f03d1dfc053b08dd9adf2c84e') {
  throw 'Legacy installer SHA-256 differs from the verified public release'
}
function Install-App([string]$file) {
  # NSIS /D is the last argument and accepts the remainder, including spaces.
  $process = Start-Process -Wait -PassThru -FilePath $file -ArgumentList '/S', "/D=$destination"
  if ($process.ExitCode) { throw "Installer failed: $($process.ExitCode)" }
}
function Installed-Records {
  @(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -eq 'Plancia Comandi' })
}
function Shortcut-Targets {
  $shell = New-Object -ComObject WScript.Shell
  $targets = @()
  foreach ($folder in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('DesktopDirectory'))) {
    if ($folder -and (Test-Path $folder)) {
      foreach ($link in @(Get-ChildItem $folder -Recurse -Filter 'Plancia Comandi.lnk' -ErrorAction SilentlyContinue)) {
        $targets += $shell.CreateShortcut($link.FullName).TargetPath
      }
    }
  }
  return $targets
}
if ((Installed-Records).Count) { throw 'An app installation already exists; refusing to replace it' }
$preferencesDirectory = Join-Path $env:APPDATA 'Plancia Comandi'
$settings = Join-Path $preferencesDirectory 'settings.json'
if (Test-Path $settings) { throw 'A preference file already exists; refusing to replace it' }
New-Item -ItemType Directory -Force -Path $preferencesDirectory | Out-Null
[IO.File]::WriteAllText($settings, '{"locale":"en","theme":"dark","fontSize":17,"layout":"split"}', [Text.UTF8Encoding]::new($false))
$settingsHash = (Get-FileHash $settings -Algorithm SHA256).Hash
Install-App $legacy
if (-not (Test-Path (Join-Path $destination 'plancia-comandi.exe'))) { throw 'Missing legacy executable' }
$before = @(Installed-Records)
if ($before.Count -ne 1 -or $before[0].DisplayVersion -ne '0.3.1') { throw 'Legacy registration differs' }
$registryKey = $before[0].PSChildName
Install-App (Resolve-Path $Setup).Path
$exe = Join-Path $destination 'Plancia Comandi.exe'
if (-not (Test-Path $exe) -or (Test-Path (Join-Path $destination 'plancia-comandi.exe'))) { throw 'Duplicate or missing app executable after upgrade' }
$after = @(Installed-Records)
if ($after.Count -ne 1 -or $after[0].PSChildName -ne $registryKey -or $after[0].DisplayVersion -ne $ExpectedVersion) { throw 'Upgrade changed registration identity or left duplicates' }
$metadata = (Get-Item $exe).VersionInfo
if ($metadata.ProductName -ne 'Plancia Comandi' -or $metadata.FileDescription -ne 'Plancia Comandi') { throw 'Windows product metadata differs' }
$targets = @(Shortcut-Targets)
if (-not $targets.Count -or @($targets | Where-Object { $_ -ne $exe }).Count) { throw 'Shortcut still points to an obsolete executable' }
if ((Get-FileHash $settings -Algorithm SHA256).Hash -ne $settingsHash) { throw 'Upgrade changed saved preferences' }
$uninstallers = @(Get-ChildItem $destination -Filter 'Uninstall*.exe')
if ($uninstallers.Count -ne 1) { throw 'Expected one uninstaller' }
$uninstall = Start-Process -Wait -PassThru -FilePath $uninstallers[0].FullName -ArgumentList '/S'
if ($uninstall.ExitCode) { throw 'Uninstallation failed' }
$deadline = [DateTime]::UtcNow.AddSeconds(30)
while (((Test-Path $exe) -or (Installed-Records).Count) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 200 }
if ((Test-Path $exe) -or (Installed-Records).Count) { throw 'Uninstallation left app files or registration' }
if ((Get-FileHash $settings -Algorithm SHA256).Hash -ne $settingsHash) { throw 'Uninstallation changed saved preferences' }
$report = @{ probe = 'windows-name-upgrade'; from = '0.3.1'; to = $ExpectedVersion; spacedPath = $true; sameRegistryIdentity = $true; shortcuts = $targets.Count; preferencesPreserved = $true; uninstall = 'passed' }
$report | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $root 'report.json')
$report | ConvertTo-Json -Compress
