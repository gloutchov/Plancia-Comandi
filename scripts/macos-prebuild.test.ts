import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasMachOArchitecture, prepareMacNodePtyPrebuild } from './macos-prebuild.mjs'
import { shouldRebuildForElectron } from './install-native.mjs'
let root: string
let native: string
let helper: string
function header(cpu = 0x0100000c) { const b=Buffer.alloc(32);b.writeUInt32BE(0xcffaedfe);b.writeUInt32LE(cpu,4);return b }
beforeEach(() => {
  root=fs.mkdtempSync(path.join(os.tmpdir(),'plancia-m37-native-'))
  const dir=path.join(root,'prebuilds/darwin-arm64');fs.mkdirSync(dir,{recursive:true})
  native=path.join(dir,'pty.node');helper=path.join(dir,'spawn-helper')
  fs.writeFileSync(native,header());fs.writeFileSync(helper,header(),{mode:0o644})
})
afterEach(()=>{vi.unstubAllEnvs();fs.rmSync(root,{recursive:true,force:true})})
const ok = () => ({status:0,stdout:'plancia-pty-compatible',signal:null})

describe('macOS prebuild compatibility',()=>{
  it('checks thin and bounded universal Mach-O architecture',()=>{
    expect(hasMachOArchitecture(header(),'arm64')).toBe(true)
    expect(hasMachOArchitecture(header(),'x64')).toBe(false)
    expect(hasMachOArchitecture(Buffer.alloc(3),'arm64')).toBe(false)
    const fat=Buffer.alloc(48);fat.writeUInt32BE(0xcafebabe);fat.writeUInt32BE(2,4);fat.writeUInt32BE(0x01000007,8);fat.writeUInt32BE(0x0100000c,28)
    expect(hasMachOArchitecture(fat,'x64')).toBe(true)
    expect(hasMachOArchitecture(fat,'arm64')).toBe(true)
    expect(hasMachOArchitecture(fat.subarray(0,12),'arm64')).toBe(false)
  })
  it('requires an actual Electron load before enabling the matching regular helper',()=>{
    vi.stubEnv('NODE_OPTIONS','SYNTHETIC_DO_NOT_FORWARD')
    vi.stubEnv('DYLD_INSERT_LIBRARIES','SYNTHETIC_DO_NOT_FORWARD')
    const run=vi.fn(ok)
    expect(prepareMacNodePtyPrebuild(root,'arm64','/synthetic/Electron',run)).toBe(true)
    if (process.platform !== 'win32') expect(fs.statSync(helper).mode & 0o100).toBe(0o100)
    const [exe,args,options]=run.mock.calls[0] as unknown as [string,string[],{env:Record<string,string>;timeout:number;maxBuffer:number}]
    expect(exe).toBe('/synthetic/Electron');expect(args.slice(-2)).toEqual([native,'arm64'])
    expect(args[1]).not.toContain(native)
    expect(options).toMatchObject({timeout:5000,maxBuffer:4096,env:{ELECTRON_RUN_AS_NODE:'1'}})
    expect(options.env).not.toHaveProperty('NODE_OPTIONS');expect(options.env).not.toHaveProperty('DYLD_INSERT_LIBRARIES')
  })
  it.each(['missing-native','missing-helper','wrong-native-arch','wrong-helper-arch'])('rebuilds when %s without probing',kind=>{
    if(kind==='missing-native')fs.unlinkSync(native)
    if(kind==='missing-helper')fs.unlinkSync(helper)
    if(kind==='wrong-native-arch')fs.writeFileSync(native,header(0x01000007))
    if(kind==='wrong-helper-arch')fs.writeFileSync(helper,header(0x01000007))
    const run=vi.fn(ok);expect(prepareMacNodePtyPrebuild(root,'arm64','/synthetic/Electron',run)).toBe(false);expect(run).not.toHaveBeenCalled()
  })
  it.each([{status:1,stdout:''},{status:null,signal:'SIGTERM',stdout:''},{status:0,stdout:'wrong runtime'},{status:null,error:new Error('synthetic spawn failure')}])('rejects ABI/load errors, timeout and unexpected output',result=>{
    expect(prepareMacNodePtyPrebuild(root,'arm64','/synthetic/Electron',()=>result)).toBe(false)
    expect(fs.statSync(helper).mode & 0o111).toBe(0)
  })
  it.skipIf(process.platform==='win32')('rejects a symlink helper without changing its destination',()=>{
    const destination=path.join(root,'outside-helper');fs.writeFileSync(destination,header(),{mode:0o644});fs.unlinkSync(helper);fs.symlinkSync(destination,helper)
    const run=vi.fn(ok);expect(prepareMacNodePtyPrebuild(root,'arm64','/synthetic/Electron',run)).toBe(false)
    expect(run).not.toHaveBeenCalled();expect(fs.statSync(destination).mode & 0o111).toBe(0)
  })
  it('falls back when helper permission preparation is denied',()=>{
    const change=vi.spyOn(fs,'fchmodSync').mockImplementation(()=>{throw new Error('synthetic denial')})
    try {expect(prepareMacNodePtyPrebuild(root,'arm64','/synthetic/Electron',ok)).toBe(false)} finally {change.mockRestore()}
  })
  it('uses the Darwin probe only and preserves Windows/Linux decisions',()=>{
    const probe=vi.fn(()=>true)
    expect(shouldRebuildForElectron('darwin',root,'arm64',()=>false,probe)).toBe(false)
    expect(shouldRebuildForElectron('darwin',root,'arm64',()=>false,()=>false)).toBe(true)
    probe.mockClear()
    expect(shouldRebuildForElectron('win32',root,'x64',()=>true,probe)).toBe(false)
    expect(shouldRebuildForElectron('win32',root,'x64',()=>false,probe)).toBe(true)
    expect(shouldRebuildForElectron('linux',root,'arm64',()=>true,probe)).toBe(true)
    expect(probe).not.toHaveBeenCalled()
  })
})
