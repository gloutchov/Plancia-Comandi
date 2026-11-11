export const WINDOWS_NODE_PTY_FILES: readonly ['pty.node', 'conpty.node', 'conpty_console_list.node']

export function windowsPrebuildDir(ptyRoot: string, arch: string): string

export function hasWindowsNodePtyPrebuild(
  ptyRoot: string,
  arch: string,
  existsSync?: (file: string) => boolean,
): boolean

export function shouldRebuildForElectron(
  platform: string,
  ptyRoot: string,
  arch: string,
  existsSync?: (file: string) => boolean,
): boolean
