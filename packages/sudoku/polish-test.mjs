import http from 'node:http';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

mkdirSync('verify', { recursive: true });
const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;height:100%;background:#e9edf1;font-family:system-ui}
#mount{position:absolute;inset:0}
:root{
 --dsw-alias-bg-base:#f7f6f3;--dsw-alias-bg-layer-1:#ffffff;--dsw-alias-bg-layer-2:#eef1f4;
 --dsw-alias-border-l1:#e6e8eb;--dsw-alias-border-l2:#d5dade;
 --dsw-alias-label-primary:#202733;--dsw-alias-label-secondary:#6b7480;
 --dsw-alias-brand-primary:#3b6ea5;--dsw-alias-state-error-primary:#c0504d;--dsw-alias-state-success-primary:#3f8f6b;
 --dsh-font-family-text-default:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
 --dsh-font-family-brand:"Noto Serif SC","Songti SC",Georgia,serif;
}
</style>
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
const prof = mkdtempSync(join(tmpdir(), 'sdk-polish-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--remote-debugging-port=9362', '--user-data-dir=' + prof, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class C { constructor(u) { this.s = new WebSocket(u); this.i = 1; this.p = new Map(); this.r = new Promise((res) => this.s.addEventListener('open', res)); this.s.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); } async send(method, params = {}) { await this.r; const id = this.i++; const pr = new Promise((res, rej) => this.p.set(id, { res, rej })); this.s.send(JSON.stringify({ id, method, params })); return pr; } }
const ev = async (cdp, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
};
try {
  let target = null;
  for (let i = 0; i < 90 && !target; i += 1) { try { target = await (await fetch('http://127.0.0.1:9362/json/new?' + encodeURIComponent(origin + '/'), { method: 'PUT' })).json(); } catch { await sleep(250); } }
  const cdp = new C(target.webSocketDebuggerUrl);
  const errors = [];
  cdp.s.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200));
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: origin + '/' });
  await sleep(1500);
  await ev(cdp, `document.querySelector('.sdk-launcher').click()`);
  await sleep(3200);

  const metrics = await ev(cdp, `(() => {
    const win=document.querySelector('.sdk-win'); const r=win.getBoundingClientRect();
    const cells=[...document.querySelectorAll('.sdk-cell')].map(c=>c.getBoundingClientRect());
    const ws=cells.map(c=>Math.round(c.width*100)/100), hs=cells.map(c=>Math.round(c.height*100)/100);
    const tools=[...document.querySelectorAll('.sdk-tool')].map(b=>({label:b.childNodes[0] && b.childNodes[0].textContent, key:b.querySelector('small') && b.querySelector('small').textContent}));
    return { win:[Math.round(r.width),Math.round(r.height)], ratio: +(r.width/r.height).toFixed(3),
      cells:{n:cells.length, w:[Math.min(...ws),Math.max(...ws)], h:[Math.min(...hs),Math.max(...hs)]},
      tools, footer: Boolean(document.querySelector('.sdk-foot')), walkButton: tools.some(t=>t.label==='完整解答') };
  })()`);
  console.log('metrics', JSON.stringify(metrics));

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/light.png', Buffer.from(shot.data, 'base64'));

  // dark theme
  await ev(cdp, `(() => { const s=document.documentElement.style; s.setProperty('--dsw-alias-bg-base','#0f1319'); s.setProperty('--dsw-alias-bg-layer-1','#171c24'); s.setProperty('--dsw-alias-bg-layer-2','#202733'); s.setProperty('--dsw-alias-border-l1','#2a3240'); s.setProperty('--dsw-alias-border-l2','#3a4556'); s.setProperty('--dsw-alias-label-primary','#e8edf4'); s.setProperty('--dsw-alias-label-secondary','#93a0b2'); s.setProperty('--dsw-alias-brand-primary','#6f9fd8'); s.setProperty('--dsw-alias-state-error-primary','#e07a76'); s.setProperty('--dsw-alias-state-success-primary','#6fbf9b'); document.body.style.background='#0b0f14'; })()`);
  await sleep(500);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/dark.png', Buffer.from(shot.data, 'base64'));

  // back to light, ratio resize
  await ev(cdp, `(() => { const s=document.documentElement.style; s.setProperty('--dsw-alias-bg-base','#f7f6f3'); s.setProperty('--dsw-alias-bg-layer-1','#ffffff'); s.setProperty('--dsw-alias-bg-layer-2','#eef1f4'); s.setProperty('--dsw-alias-border-l1','#e6e8eb'); s.setProperty('--dsw-alias-border-l2','#d5dade'); s.setProperty('--dsw-alias-label-primary','#202733'); s.setProperty('--dsw-alias-label-secondary','#6b7480'); s.setProperty('--dsw-alias-brand-primary','#3b6ea5'); document.body.style.background='#e9edf1'; })()`);
  const before = await ev(cdp, `(() => { const r=document.querySelector('.sdk-win').getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; })()`);
  await ev(cdp, `(() => { const h=document.querySelector('.sdk-resize'); const r=h.getBoundingClientRect(); h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:r.left+8,clientY:r.top+8})); })()`);
  await sleep(150);
  await ev(cdp, `window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:window.__rx||0,clientY:0}))`.replace('window.__rx||0', String(0)));
  await ev(cdp, `(() => { const evt=new PointerEvent('pointermove',{bubbles:true,clientX:800,clientY:700}); window.dispatchEvent(evt); })()`);
  await ev(cdp, `window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))`);
  await sleep(300);
  const after = await ev(cdp, `(() => { const r=document.querySelector('.sdk-win').getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height),+(r.width/r.height).toFixed(3)]; })()`);
  console.log('resize', before, '->', after);

  // walkthrough
  await ev(cdp, `(() => { const b=[...document.querySelectorAll('.sdk-tool')].find(x=>(x.childNodes[0]||{}).textContent==='完整解答'); b.click(); return true; })()`);
  await sleep(700);
  const walk1 = await ev(cdp, `(() => { const p=document.querySelector('.sdk-walk'); if(!p) return null; return { head:p.querySelector('.sdk-walk-head').textContent, text:p.querySelector('.sdk-walk-text').textContent.slice(0,90), nav:[...p.querySelectorAll('.sdk-walk-nav button')].map(b=>b.textContent) }; })()`);
  console.log('walk', JSON.stringify(walk1));
  await ev(cdp, `(() => { const b=[...document.querySelectorAll('.sdk-walk-nav button')].find(x=>x.textContent==='下一步'); b.click(); })()`);
  await sleep(300);
  const walk2 = await ev(cdp, `document.querySelector('.sdk-walk-head').textContent`);
  console.log('walk next', JSON.stringify(walk2));
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/walk.png', Buffer.from(shot.data, 'base64'));
  console.log('errors', JSON.stringify(errors.slice(0, 5)));
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally { chrome.kill(); srv.close(); }
