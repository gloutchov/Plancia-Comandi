import assert from 'node:assert/strict'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'

/** Real PTY query/reply regression, external to the packaged product. */
export async function smokeTerminalProtocol({ main, evaluate, until, root, sessions, expectedVersion }) {
  const version = /^(\d+)\.(\d+)\.(\d+)$/.exec(expectedVersion)
  if (!version || (Number(version[1]) === 0 && (Number(version[2]) < 3 || (Number(version[2]) === 3 && Number(version[3]) < 10)))) return false
  const id = sessions[0]
  const probe = path.join(root, 'terminal-protocol-probe.cjs')
  await writeFile(probe, `
const queries = '\\x1b[c\\x1b]10;?\\x07\\x1b]11;?\\x07';
let received = '';
const timer = setTimeout(() => process.exit(2), 10000);
process.stdin.setRawMode(true);
process.stdin.on('data', data => {
  received += data.toString();
  if (received.includes('\\x1b[?1;2c') && received.includes(']10;rgb:') && received.includes(']11;rgb:')) {
    clearTimeout(timer);
    process.stdin.setRawMode(false);
    console.log('PLANCIA_PROTOCOL_DONE');
    process.exit(0);
  }
});
process.stdout.write(queries);
`, { flag: 'wx' })
  await main.evaluate(`(() => {
    globalThis.__m28Writes = [];
    globalThis.__m28Listener = (_event, id, data) => { if (id === ${JSON.stringify(id)}) __m28Writes.push(data); };
    __smokeElectron.ipcMain.on('terminal:write', __m28Listener);
  })()`)
  try {
    await evaluate('document.querySelectorAll(".session")[0].click()')
    await until(() => evaluate('Boolean(document.querySelector(".tile:not([hidden]) .xterm"))'), 'M28 terminal not visible')
    await evaluate('globalThis.__m28Terminal = document.querySelector(".tile:not([hidden]) .xterm")')
    const quote = value => process.platform === 'win32' ? `"${value}"` : `'${value.replaceAll("'", "'\\''")}'`
    const command = `${quote(process.execPath)} ${quote(probe)}\r`
    await evaluate(`plancia.write(${JSON.stringify(id)}, ${JSON.stringify(command)})`)
    await until(() => evaluate(`plancia.subscribe(${JSON.stringify(id)}).then(s => s.data.includes('PLANCIA_PROTOCOL_DONE'))`), 'M28 native query probe did not finish')
    // ConPTY can independently request cursor position. Count only the three
    // queries emitted by this probe; fresh cursor reports remain legitimate.
    const replies = () => main.evaluate(`__m28Writes.filter(data => data === '\\x1b[?1;2c' || data.startsWith('\\x1b]10;rgb:') || data.startsWith('\\x1b]11;rgb:'))`)
    assert.equal((await replies()).length, 3, 'Native queries must receive exactly three replies')
    await evaluate('document.querySelectorAll(".session")[1].click()')
    await until(() => evaluate('!__m28Terminal.closest(".tile") || __m28Terminal.closest(".tile").hidden'), 'M28 first session not hidden')
    await evaluate('document.querySelectorAll(".session")[0].click()')
    for (const layout of ['split', 'stack', 'grid', 'single']) {
      await evaluate(`document.querySelector('[data-testid="layout-${layout}"]').click()`)
      await until(() => evaluate(`document.querySelector('.tiles').dataset.layout === '${layout}'`), 'M28 layout did not change')
    }
    // A final PTY command gives parser writes and replay replies time to reach
    // the shell after the probe exits. Do not read a personal shell history.
    const after = process.platform === 'win32' ? 'echo PLANCIA_AFTER_PROTOCOL_%PLANCIA_SMOKE_VALUE%\r' : "printf 'PLANCIA_AFTER_PROTOCOL_%s\\n' \"$PLANCIA_SMOKE_VALUE\"\r"
    await evaluate(`plancia.write(${JSON.stringify(id)}, ${JSON.stringify(after)})`)
    await until(() => evaluate(`plancia.subscribe(${JSON.stringify(id)}).then(s => s.data.includes('PLANCIA_AFTER_PROTOCOL_OK'))`), 'M28 shell input polluted after returning')
    assert.equal((await replies()).length, 3, 'Returning to the prompt replayed DA/OSC replies')
    assert(await evaluate('__m28Terminal === document.querySelector(".tile:not([hidden]) .xterm")'), 'M28 terminal remounted')
    return true
  } finally {
    await main.evaluate('__smokeElectron.ipcMain.removeListener("terminal:write", __m28Listener); delete globalThis.__m28Listener; delete globalThis.__m28Writes;')
  }
}
