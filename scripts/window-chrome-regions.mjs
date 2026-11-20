import assert from 'node:assert/strict'

/** CSS-region checks only; these do not establish native window movement. */
export function assertWindowChromeRegions(regions, platform) {
  const darwin = platform === 'darwin'
  const evidence = JSON.stringify(regions)
  assert.equal(regions.platform, platform, evidence)
  assert.equal(regions.toolbar, darwin ? 'drag' : 'none', evidence)
  assert.equal(regions.title, darwin ? 'drag' : 'none', evidence)
  assert(regions.buttons.length >= 4, evidence)
  if (darwin) {
    assert.equal(regions.group, 'no-drag', evidence)
    assert(regions.buttons.every(region => region === 'no-drag'), evidence)
  } else {
    // Windows retains the native frame. Its toolbar has no drag region,
    // so both default `none` and explicit `no-drag` controls are valid.
    assert.notEqual(regions.group, 'drag', evidence)
    assert(regions.buttons.every(region => region !== 'drag'), evidence)
  }
  assert(regions.terminals.every(region => region !== 'drag'), evidence)
  assert(regions.sessions.every(region => region !== 'drag'), evidence)
}
