export const MAC_APP_NAME = 'Plancia Comandi.app'
export const MAC_EXECUTABLE_NAME = 'plancia-comandi'

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

export function macUnpackedLayout(pathModule, releaseDir = 'release') {
  const app = pathModule.join(releaseDir, 'mac-arm64', MAC_APP_NAME)
  return {
    app,
    executable: pathModule.join(app, 'Contents', 'MacOS', MAC_EXECUTABLE_NAME),
    resources: pathModule.join(app, 'Contents', 'Resources'),
  }
}
