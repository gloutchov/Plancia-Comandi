import fs from 'node:fs'
import path from 'node:path'

// electron-builder 26.18.0 sets productFilename from executableName
// (app-builder-lib appInfo.js) and names the bundle `${productFilename}.app`.
export const MAC_APP_NAME = 'plancia-comandi.app'

// electron-builder.json5 already asks for dmg and zip with identity null.
// arm64 matches the pinned macos-15 runner, which is Apple Silicon.
// npmRebuild must be the boolean false. The CLI string "false" does not match.
export function macPackageOptions() {
  return {
    mac: ['dmg', 'zip'],
    arm64: true,
    publish: 'never',
    config: {
      npmRebuild: false,
      mac: {
        identity: null,
      },
    },
  }
}

export function appBundleNames(names) {
  return names.filter((name) => name.endsWith('.app'))
}

export function requireSingleAppBundle(names) {
  const apps = appBundleNames(names)
  if (apps.length !== 1) {
    const listed = apps.length === 0 ? '' : `: ${apps.join(', ')}`
    throw new Error(`Expected exactly one .app bundle, found ${apps.length}${listed}`)
  }
  return apps[0]
}

export function assertConfiguredMacAppName(appName) {
  if (appName !== MAC_APP_NAME) {
    throw new Error(`Found ${appName}, expected ${MAC_APP_NAME}`)
  }
  return appName
}

export function readCfBundleExecutable(plistText) {
  const match = plistText.match(/<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/)
  if (!match?.[1]) throw new Error('Info.plist is missing CFBundleExecutable')
  return match[1]
}

export function macBundlePaths(pathModule, unpackedDir, appName, executableName) {
  const app = pathModule.join(unpackedDir, appName)
  return {
    app,
    executable: pathModule.join(app, 'Contents', 'MacOS', executableName),
    resources: pathModule.join(app, 'Contents', 'Resources'),
  }
}

export function discoverMacApp(unpackedDir, fsImpl = fs, pathModule = path) {
  const appName = assertConfiguredMacAppName(requireSingleAppBundle(fsImpl.readdirSync(unpackedDir)))
  const plistPath = pathModule.join(unpackedDir, appName, 'Contents', 'Info.plist')
  const executableName = readCfBundleExecutable(fsImpl.readFileSync(plistPath, 'utf8'))
  return macBundlePaths(pathModule, unpackedDir, appName, executableName)
}
