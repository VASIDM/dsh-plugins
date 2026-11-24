import http from 'node:http';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

mkdirSync('verify', { recursive: true });
const page = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#0b0f16;font-family:system-ui,"Segoe UI",sans-serif}
#mount{position:absolute;inset:0}
:root{--dsw-alias-bg-base:#0d1117;--dsw-alias-bg-layer-1:#141b24;--dsw-alias-bg-layer-2:#1d2733;--dsw-alias-border-l1:#243040;--dsw-alias-border-l2:#33445a;--dsw-alias-label-primary:#e8eef6;--dsw-alias-label-secondary:#94a3b8;--dsw-alias-brand-primary:#a63a2e;--dsw-alias-state-error-primary:#e8595b}</style>
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
</head><body><div id="mount"></div><script>
window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));
window.__parts={};window.__ModuleLoader__={load({factory}){const mod=factory((n)=>n==='react'?window.React:undefined);const ctx={effect:(fn)=>{const d=fn();return typeof d==='function'?d:()=>{}},get:()=>undefined,on:()=>()=>{},slots:{inject:(k,cb)=>{cb();return()=>{}},register:(o,c)=>{window.__parts[o.id]=c;return()=>{}}},locale:{bind:()=>(k)=>k,register:()=>()=>{}}};mod.apply(ctx);
 const Footer=window.__parts['sudoku']; const Overlay=window.__parts['sudoku.window'];
 function Harness(){return React.createElement('div',null,React.createElement('div',{style:{padding:16,width:220}},React.createElement(Footer,{wide:true})),React.createElement(Overlay));}
 ReactDOM.createRoot(document.getElementById('mount')).render(React.createElement(Harness));}};
</script><script src="/client.js"></script></body></html>`;
const srv = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page); return; }
  if (req.url === '/client.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(readFileSync('client.js')); return; }
  res.writeHead(404); res.end();
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + srv.address().port;
const prof = mkdtempSync(join(tmpdir(), 'sdk2-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--remote-debugging-port=9358', '--user-data-dir=' + prof, '--window-size=1280,860', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class C { constructor(u) { this.s = new WebSocket(u); this.i = 1; this.p = new Map(); this.r = new Promise((res) => this.s.addEventListener('open', res)); this.s.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); } async send(method, params = {}) { await this.r; const id = this.i++; const pr = new Promise((res, rej) => this.p.set(id, { res, rej })); this.s.send(JSON.stringify({ id, method, params })); return pr; } }
const ev = async (cdp, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
};
try {
  let target = null;
  for (let i = 0; i < 90 && !target; i += 1) { try { target = await (await fetch('http://127.0.0.1:9358/json/new?' + encodeURIComponent(origin + '/'), { method: 'PUT' })).json(); } catch { await sleep(250); } }
  const cdp = new C(target.webSocketDebuggerUrl);
  const errors = [];
  cdp.s.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200));
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: origin + '/' });
  await sleep(2000);
  await ev(cdp, `document.querySelector('.sdk-launcher').click()`);
  await sleep(5000);
  console.log('tools', JSON.stringify(await ev(cdp, `[...document.querySelectorAll('.sdk-tool')].map(b=>b.textContent)`)));
  console.log('size', JSON.stringify(await ev(cdp, `(() => { const r=document.querySelector('.sdk-win').getBoundingClientRect(); return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]; })()`)));
  // click an empty cell
  const cell = await ev(cdp, `(() => { const cells=[...document.querySelectorAll('.sdk-cell')]; const i=cells.findIndex(c=>!c.textContent.trim()); cells[i].click(); return i; })()`);
  await sleep(300);
  await ev(cdp, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'4',bubbles:true}))`);
  await sleep(400);
  console.log('cell', cell, 'entered', await ev(cdp, `document.querySelectorAll('.sdk-cell.entered').length`));
  // hint
  await ev(cdp, `[...document.querySelectorAll('.sdk-tool')].find(x=>x.textContent==='提示').click()`);
  await sleep(400);
  console.log('after hint entered', await ev(cdp, `document.querySelectorAll('.sdk-cell.entered').length`), 'hints', await ev(cdp, `document.querySelectorAll('.sdk-meta b')[4] ? document.querySelectorAll('.sdk-meta b')[4].textContent : null`));
  // undo
  await ev(cdp, `[...document.querySelectorAll('.sdk-tool')].find(x=>x.textContent==='撤销').click()`);
  await sleep(400);
  console.log('after undo entered', await ev(cdp, `document.querySelectorAll('.sdk-cell.entered').length`));
  // notes
  await ev(cdp, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'n',bubbles:true}))`);
  await sleep(300);
  await ev(cdp, `(() => { const cells=[...document.querySelectorAll('.sdk-cell')]; const i=cells.findIndex(c=>!c.textContent.trim()); cells[i].click(); })()`);
  await sleep(300);
  await ev(cdp, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'7',bubbles:true}))`);
  await sleep(400);
  console.log('notes rendered', await ev(cdp, `document.querySelectorAll('.sdk-notes').length`));
  // drag
  const before = await ev(cdp, `Math.round(document.querySelector('.sdk-win').getBoundingClientRect().left)`);
  await ev(cdp, `(() => { const h=document.querySelector('.sdk-head'); const r=h.getBoundingClientRect(); h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:r.left+30,clientY:r.top+10})); })()`);
  await sleep(150);
  await ev(cdp, `window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:640,clientY:260}))`);
  await sleep(150);
  await ev(cdp, `window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))`);
  await sleep(300);
  const after = await ev(cdp, `Math.round(document.querySelector('.sdk-win').getBoundingClientRect().left)`);
  console.log('drag', before, '->', after);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/sudoku2.png', Buffer.from(shot.data, 'base64'));
  console.log('errors', JSON.stringify(errors.slice(0, 5)));
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally { chrome.kill(); srv.close(); }
