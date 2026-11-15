import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function hasSecuritySmoke(version) {
  const [major, minor, patch] = version.split(/[.-]/).map(Number)
  return major > 0 || minor > 3 || (minor === 3 && patch >= 7)
}

/** Instrument only this disposable process through its loopback main debugger.
 * No probe, raw IPC bridge or test flag is added to application source/bundles.
 * Clipboard, dialogs and external programs are stubbed BEFORE application main.
 */
export async function installSecurityProbes(main, root) {
  const preload = path.join(root, 'probe.cjs')
  await writeFile(preload, `const {contextBridge,ipcRenderer}=require('electron');
    contextBridge.exposeInMainWorld('__packageProbe', {
      invoke:(channel,...args)=>ipcRenderer.invoke(channel,...args),
      send:(channel,...args)=>ipcRenderer.send(channel,...args)
    });`)
  await writeFile(path.join(root, 'foreign.html'), '<!doctype html><title>Synthetic foreign document</title>')
  await main.evaluate(`(() => {
    const e = __smokeElectron;
    globalThis.__securitySmoke = { effects: 0, permissions: {}, headers: [], messages: [] };
    for (const [object, name, value] of [
      [e.clipboard, 'writeText', undefined], [e.clipboard, 'readText', 'SYNTHETIC'], [e.clipboard, 'read', []],
      [e.shell, 'openExternal', Promise.resolve()], [e.shell, 'showItemInFolder', undefined],
      [e.dialog, 'showOpenDialog', Promise.resolve({canceled:true,filePaths:[]})]
    ]) object[name] = () => { __securitySmoke.effects++; return value };
    e.app.whenReady().then(() => {
      const s = e.session.defaultSession;
      s.registerPreloadScript({type:'frame',filePath:${JSON.stringify(preload)}});
      for (const [method, key] of [['setPermissionCheckHandler','check'],['setPermissionRequestHandler','request']]) {
        const original = s[method].bind(s);
        s[method] = handler => { __securitySmoke.permissions[key] = handler; return original(handler) };
      }
      const original = s.webRequest.onHeadersReceived.bind(s.webRequest);
      s.webRequest.onHeadersReceived = listener => original((details, callback) => listener(details, response => {
        if (details.resourceType === 'mainFrame') __securitySmoke.headers.push(response.responseHeaders);
        callback(response);
      }));
    });
    return true;
  })()`, false)
}

const CASES = [
  ['app:boot', 'invoke', [], ['extra']],
  ['sessions:create', 'invoke', [{}], [{ command: 'untrusted' }]],
  ['sessions:close', 'invoke', ['ID'], ['invalid']],
  ['sessions:rename', 'invoke', ['ID', 'untrusted'], ['ID', 42]],
  ['sessions:subscribe', 'invoke', ['ID'], ['invalid']],
  ['settings:update', 'invoke', [{ locale: 'it' }], [{ theme: 'invalid' }]],
  ['settings:reveal', 'invoke', [], ['extra']],
  ['dialog:directory', 'invoke', ['ROOT'], [42]],
  ['terminal:write', 'send', ['ID', 'echo SYNTHETIC_UNTRUSTED\r'], ['ID', 42]],
  ['terminal:resize', 'send', ['ID', 100, 30], ['ID', -1, 24]],
  ['terminal:watch', 'send', ['ID', true], ['ID', 'invalid']],
  ['shell:openExternal', 'send', ['https://example.invalid/'], ['file:///synthetic']],
  ['clipboard:writeText', 'invoke', ['SYNTHETIC'], [42]],
  ['clipboard:readText', 'invoke', [], ['extra']],
  ['clipboard:readImage', 'invoke', [], ['extra']],
  ['edit:result', 'send', [{ id: '0123456789abcdef', handled: true }], [{ id: 'invalid', handled: true }]],
]

export async function smokeSecurity({ main, evaluate, until, root, userData, sessions }) {
  const file = path.join(userData, 'settings.json')
  const beforeFile = await readFile(file)
  const before = await evaluate('window.plancia.boot().then(b => b.sessions)')
  const initial = await main.evaluate(`(() => {
    const win = __smokeElectron.BrowserWindow.getAllWindows()[0];
    __securitySmoke.window = win; __securitySmoke.url = win.webContents.getURL();
    const p = win.webContents.getLastWebPreferences();
    return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration,headers:__securitySmoke.headers};
  })()`)
  assert.equal(initial.sandbox, true); assert.equal(initial.contextIsolation, true); assert.equal(initial.nodeIntegration, false)
  assert.deepEqual(await evaluate('({require:typeof window.require,process:typeof window.process,ipcRenderer:typeof window.ipcRenderer})'), {require:'undefined',process:'undefined',ipcRenderer:'undefined'})
  const headers = initial.headers.flatMap(h => Object.entries(h ?? {}).filter(([key]) => key.toLowerCase() === 'content-security-policy').flatMap(([, value]) => value))
  assert(headers.some(value => value.includes("frame-ancestors 'none'") && value.includes("connect-src 'none'")), 'Packaged file: CSP response header missing')
  // These execute inside the page. CDP does not bypass CSP for eval(), DOM
  // scripts, event attributes or fetch unless Page.setBypassCSP is requested.
  const csp = await evaluate(`(async () => {
    window.__violations=[];window.__inlineRan=false;window.__handlerRan=false;
    document.addEventListener('securitypolicyviolation',e=>__violations.push(e.violatedDirective));
    let evalBlocked=false;try{eval('1+1')}catch{evalBlocked=true}
    const script=document.createElement('script');script.textContent='window.__inlineRan=true';document.body.append(script);script.remove();
    const button=document.createElement('button');button.setAttribute('onclick','window.__handlerRan=true');document.body.append(button);button.click();button.remove();
    let fetchBlocked=false;try{await fetch('http://127.0.0.1:9/SYNTHETIC_CSP')}catch{fetchBlocked=true}
    await new Promise(resolve=>setTimeout(resolve,100));
    return {evalBlocked,inlineBlocked:!__inlineRan,eventBlocked:!__handlerRan,fetchBlocked,violations:__violations};
  })()`)
  for (const key of ['evalBlocked', 'inlineBlocked', 'eventBlocked', 'fetchBlocked']) assert.equal(csp[key], true, key)
  assert(csp.violations.some(value => value.startsWith('script-src')))
  assert(csp.violations.includes('connect-src'))
  const permissions = await main.evaluate(`(() => {
    const p=__securitySmoke.permissions;
    if(!p.check || !p.request) return false;
    for(const name of ['media','geolocation','notifications','clipboard-read','display-capture','fileSystem','openExternal','unknown-future']) {
      if(p.check(null,name,'file://',{})!==false) return false;
      let result;let count=0;p.request(null,name,v=>{result=v;count++},{});
      if(result!==false || count!==1) return false;
    }
    return true;
  })()`)
  assert.equal(permissions, true, 'Installed permission handlers must deny checks and requests')
  assert.equal(await evaluate('Notification.requestPermission()'), 'denied')
  assert.equal(await evaluate(`window.open('data:text/html,SYNTHETIC_POPUP') === null`), true)
  await main.evaluate(`__securitySmoke.navigationBlocked=false;__securitySmoke.window.webContents.on('will-navigate', event => {__securitySmoke.navigationBlocked=event.defaultPrevented});true`)
  await evaluate(`location.href=${JSON.stringify(pathToFileURL(path.join(root, 'foreign.html')).href)}; true`)
  await until(() => main.evaluate('__securitySmoke.navigationBlocked'), 'Navigation guard did not reject another document')
  assert.equal(await main.evaluate('__securitySmoke.window.webContents.getURL() === __securitySmoke.url'), true)
  const cases = CASES.map(([channel, kind, valid, invalid]) => [channel, kind, valid.map(v => v === 'ID' ? sessions[0] : v === 'ROOT' ? root : v), invalid.map(v => v === 'ID' ? sessions[0] : v)])
  const expression = (invalid) => `(async () => {
    const results=[];
    for(const [channel,kind,valid,bad] of ${JSON.stringify(cases)}) {
      const result=await __packageProbe[kind](channel,...(${invalid} ? bad : valid));
      results.push({channel, result:result===undefined?'undefined':result});
    }
    await __packageProbe.invoke('app:boot');return results;
  })()`
  const malformed = await evaluate(expression(true))
  assert.equal(malformed.length, 16)
  assert.equal(await main.evaluate('__securitySmoke.effects'), 0)
  // A debugger-created foreign window and forced top-level navigation exercise
  // real IPC with valid payloads. They cannot be created through the app bridge.
  await main.evaluate(`(async () => {
    const foreign = new __smokeElectron.BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,nodeIntegrationInSubFrames:true}});
    __securitySmoke.foreign=foreign;await foreign.loadFile(${JSON.stringify(path.join(root, 'foreign.html'))});return true;
  })()`)
  const checkForeign = async (target) => {
    const results = await main.evaluate(`${target}.executeJavaScript(${JSON.stringify(expression(false))})`)
    assert.equal(results.find(r => r.channel === 'app:boot').result, null)
    assert.equal(results.find(r => r.channel === 'sessions:create').result.ok, false)
    assert.equal(results.find(r => r.channel === 'settings:update').result, null)
    assert.equal(results.find(r => r.channel === 'clipboard:readText').result, '')
    assert.equal(results.find(r => r.channel === 'clipboard:readImage').result, null)
  }
  try {
    await checkForeign('__securitySmoke.foreign.webContents')
    // Production CSP forbids frame documents. A separate synthetic window
    // opts into child preloads to generate real subframe IPC without weakening
    // the application window. Same-window/same-URL frame identity has unit and
    // registered-handler coverage; production does not preload child frames.
    await evaluate(`(() => {window.__frameBlocked=false;document.addEventListener('securitypolicyviolation',e=>{if(e.violatedDirective==='frame-src')__frameBlocked=true});const f=document.createElement('iframe');f.src=${JSON.stringify(pathToFileURL(path.join(root, 'foreign.html')).href)};document.body.append(f);return true})()`)
    await until(() => evaluate('window.__frameBlocked'), 'CSP did not reject a child frame')
    await evaluate('document.querySelectorAll("iframe").forEach(f=>f.remove());true')
    await main.evaluate(`__securitySmoke.foreign.loadURL('data:text/html,<iframe srcdoc="SYNTHETIC"></iframe>').then(()=>true)`)
    await until(async () => {
      try { return await main.evaluate('__securitySmoke.foreign.webContents.mainFrame.frames[0]?.executeJavaScript("Boolean(window.__packageProbe)")') }
      catch { return false }
    }, 'Synthetic child frame preload did not load')
    await checkForeign('__securitySmoke.foreign.webContents.mainFrame.frames[0]')
  } finally {
    await evaluate('document.querySelectorAll("iframe").forEach(f=>f.remove());true')
    await main.evaluate('__securitySmoke.foreign.destroy();true')
  }
  assert.equal(await main.evaluate('__securitySmoke.effects'), 0, 'Rejected IPC reached clipboard, shell or dialog')
  assert.deepEqual(await readFile(file), beforeFile)
  assert.deepEqual(await evaluate('window.plancia.boot().then(b => b.sessions.map(s=>({id:s.id,name:s.name})))'), before.map(s => ({ id: s.id, name: s.name })))
  await main.evaluate(`__securitySmoke.window.loadFile(${JSON.stringify(path.join(root, 'foreign.html'))}).then(()=>true)`)
  try { await checkForeign('__securitySmoke.window.webContents') }
  finally { await main.evaluate('__securitySmoke.window.loadURL(__securitySmoke.url).then(()=>true)') }
  await until(() => evaluate('Boolean(window.plancia && document.querySelector(".app"))'), 'App did not recover after foreign document test')
  assert.equal(await main.evaluate('__securitySmoke.effects'), 0)
  assert.deepEqual(await readFile(file), beforeFile)
  return { channels: 16, contexts: ['malformed main payload', 'foreign window', 'foreign child frame with test preload', 'foreign top document'], csp, permissionChecksAndRequests: 'denied', nativeEffects: 0 }
}
