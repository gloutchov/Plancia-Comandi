import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'

if (process.platform !== 'darwin') {
  throw new Error('This prototype requires macOS Seatbelt and system Git.')
}

const root = realpathSync(mkdtempSync('/private/tmp/plancia-m44-git.'))
const project = path.join(root, 'project with spaces')
const preferences = path.join(root, 'synthetic home')
mkdirSync(project, { mode: 0o700 })
mkdirSync(preferences, { mode: 0o700 })
const env = {
  PATH: '/usr/bin:/bin',
  HOME: preferences,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  LC_ALL: 'C',
}

const policy = `(version 1)
(allow default)
(deny file-write*)
(allow file-write* (subpath (param "PROJECT")) (literal "/dev/null"))`

function run(command, args, cwd = project) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384 })
  if (result.error) throw result.error
  return result
}

function checked(result) {
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function restricted(command, args, directory = project) {
  return run('/usr/bin/sandbox-exec', ['-p', policy, `-DPROJECT=${directory}`, command, ...args], directory)
}

function git(...args) {
  return checked(restricted('/usr/bin/git', args))
}

function hasExternalHardLink(directory) {
  const links = new Map()
  const pending = [directory]
  while (pending.length) {
    for (const entry of readdirSync(pending.pop(), { withFileTypes: true })) {
      const file = path.join(entry.parentPath, entry.name)
      const stat = lstatSync(file, { bigint: true })
      if (stat.isDirectory()) pending.push(file)
      if (!stat.isFile() || stat.nlink < 2n) continue
      const key = `${stat.dev}/${stat.ino}`
      const link = links.get(key) ?? { expected: stat.nlink, found: 0n }
      link.found++
      links.set(key, link)
    }
  }
  return [...links.values()].some(({ expected, found }) => expected !== found)
}

git('init', '-b', 'main')
git('config', '--local', 'user.name', 'M44 synthetic')
git('config', '--local', 'user.email', 'm44@example.invalid')
const tracked = path.join(project, 'tracked.txt')
const outside = path.join(root, 'outside.txt')
writeFileSync(outside, 'external fixture\n')
writeFileSync(tracked, 'main\n')
git('add', 'tracked.txt')
git('commit', '-m', 'Synthetic baseline')
const main = git('rev-parse', 'HEAD')
git('switch', '-c', 'fixture/m44')
checked(restricted('/bin/sh', ['-c', 'printf "%s\\n" "$2" > "$1"', 'probe', tracked, 'branch']))
git('add', 'tracked.txt')
git('commit', '-m', 'Synthetic branch edit')
assert.equal(git('show', 'HEAD:tracked.txt'), 'branch')
checked(restricted('/bin/sh', ['-c', 'printf "%s\\n" "$2" > "$1"', 'probe', tracked, 'uncommitted']))
const switchWithEdits = restricted('/usr/bin/git', ['switch', 'main'])
assert.equal(switchWithEdits.status, 1, 'Git must protect conflicting edits')
assert.match(switchWithEdits.stderr, /would be overwritten/)
assert.equal(readFileSync(tracked, 'utf8'), 'uncommitted\n')
git('add', 'tracked.txt')
git('commit', '-m', 'Preserve synthetic uncommitted edit')
git('switch', 'main')
assert.equal(git('rev-parse', 'HEAD'), main)
assert.equal(git('status', '--porcelain'), '')
assert.equal(readFileSync(tracked, 'utf8'), 'main\n')

const linkedWorktree = path.join(root, 'linked worktree')
checked(run('/usr/bin/git', ['worktree', 'add', '--detach', linkedWorktree, main]))
const commonDirectory = checked(run('/usr/bin/git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], linkedWorktree))
assert.equal(commonDirectory, path.join(project, '.git'))
const externalGit = restricted('/usr/bin/git', ['switch', '-c', 'fixture/external-metadata'], linkedWorktree)
assert.notEqual(externalGit.status, 0)
assert.equal(git('branch', '--list', 'fixture/external-metadata'), '')

const alias = path.join(project, 'internal-alias.txt')
linkSync(tracked, alias)
assert.equal(hasExternalHardLink(project), false)
const externalAlias = path.join(project, 'external-alias.txt')
const denied = restricted('/bin/ln', [outside, externalAlias])
assert.equal(denied.status, 1)
assert.match(denied.stderr, /[Oo]peration not permitted/)
linkSync(outside, externalAlias)
assert.equal(hasExternalHardLink(project), true)

const copy = path.join(project, 'independent copy')
git('clone', '--no-local', '--no-hardlinks', '--', project, copy)
assert.equal(hasExternalHardLink(copy), false)
assert.equal(checked(run('/usr/bin/git', ['rev-parse', 'HEAD'], copy)), main)
assert.equal(readFileSync(path.join(copy, 'tracked.txt'), 'utf8'), 'main\n')
assert.equal(readFileSync(outside, 'utf8'), 'external fixture\n')

console.log('M44: Git branch and return to main, external Git metadata, hard links and independent copy passed.')
console.log(`Synthetic fixtures: ${root}`)
