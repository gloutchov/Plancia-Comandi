import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
if(process.platform!=='darwin'){console.log(JSON.stringify({smoke:'macos-prebuild-skipped',platform:process.platform}));process.exit(0)}
const project=path.resolve(process.argv[2]??'.')
const require=createRequire(path.join(project,'package.json'))
const electron=require('electron')
const root=await fs.mkdtemp(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'plancia-macos-prebuild-'))
const moduleRoot=path.join(root,'node_modules/node-pty')
try {
  await fs.mkdir(path.join(root,'scripts'),{recursive:true})
  await fs.mkdir(moduleRoot,{recursive:true})
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify({private:true,type:'module'}))
  for(const name of ['install-native.mjs','macos-prebuild.mjs'])await fs.copyFile(path.join(project,'scripts',name),path.join(root,'scripts',name))
  await fs.copyFile(path.join(project,'node_modules/node-pty/package.json'),path.join(moduleRoot,'package.json'))
  await fs.cp(path.join(project,'node_modules/node-pty/lib'),path.join(moduleRoot,'lib'),{recursive:true})
  const prebuild=path.join('prebuilds',`darwin-${process.arch}`)
  await fs.cp(path.join(project,'node_modules/node-pty',prebuild),path.join(moduleRoot,prebuild),{recursive:true})
  const helper=path.join(moduleRoot,prebuild,'spawn-helper')
  await fs.chmod(helper,0o644) // Reproduce the pinned npm payload in this owned fixture only.
  await fs.mkdir(path.join(root,'node_modules/electron'))
  await fs.writeFile(path.join(root,'node_modules/electron/package.json'),JSON.stringify({main:'index.cjs'}))
  await fs.writeFile(path.join(root,'node_modules/electron/index.cjs'),'module.exports='+JSON.stringify(electron))
  await fs.mkdir(path.join(root,'home'))
  const env={PATH:process.env.PATH,HOME:path.join(root,'home'),TMPDIR:root}
  const install=spawnSync(process.execPath,[path.join(root,'scripts/install-native.mjs')],{env,cwd:root,encoding:'utf8',timeout:10_000,maxBuffer:8192})
  assert.equal(install.status,0,'Fresh prebuild install failed')
  assert(install.stdout.includes('skipping the Electron rebuild'),'Install did not skip compilation')
  assert.equal((await fs.stat(helper)).mode&0o100,0o100)
  const probe=`const assert=require('node:assert/strict');
    const root=process.argv[1];const pty=require(root);
    const source=require(root+'/lib/utils').loadNativeModule('pty').dir;
    assert(source.includes('/prebuilds/darwin-'+process.arch));
    const terminal=pty.spawn(process.execPath,['-e',"process.stdout.write('PLANCIA_M37_NATIVE_OK');process.exit(0)"],{cols:80,rows:24,cwd:process.cwd(),env:process.env});
    let text='';const deadline=setTimeout(()=>{terminal.kill();process.exit(1)},5000);
    terminal.onData(chunk=>{text=(text+chunk).slice(-8192)});
    terminal.onExit(event=>{clearTimeout(deadline);assert.equal(event.exitCode,0);assert(text.includes('PLANCIA_M37_NATIVE_OK'));console.log(JSON.stringify({source,PTY:'passed',electron:process.versions.electron,arch:process.arch}))});`
  const native=spawnSync(electron,['-e',probe,moduleRoot],{env:{...env,ELECTRON_RUN_AS_NODE:'1'},cwd:root,encoding:'utf8',timeout:10_000,maxBuffer:8192})
  assert.equal(native.status,0,'Real Electron prebuild PTY failed')
  const evidence=JSON.parse(native.stdout.trim())
  const result={smoke:'macos-prebuild-passed',root,freshDependency:true,compileToolsRequired:false,helperExecutable:true,...evidence}
  await fs.writeFile(path.join(root,'report.json'),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
} catch(error){await fs.writeFile(path.join(root,'report.json'),JSON.stringify({error:String(error)},null,2));console.error('Prebuild evidence retained at '+root);throw error}
