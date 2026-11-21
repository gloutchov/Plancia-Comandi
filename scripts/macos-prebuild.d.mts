import type { SpawnSyncOptionsWithStringEncoding } from 'node:child_process'
export function hasMachOArchitecture(header: Buffer, arch: string): boolean
export function prepareMacNodePtyPrebuild(
  ptyRoot: string,
  arch: string,
  electronPath: string,
  run?: (command: string, args: string[], options: SpawnSyncOptionsWithStringEncoding) => {
    status: number | null
    stdout?: string | Buffer | null
    signal?: NodeJS.Signals | null
    error?: Error
  },
): boolean
