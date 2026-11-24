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
const prof = mkdtempSync(join(tmpdir(), 'sdk-design-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--remote-debugging-port=9366', '--user-data-dir=' + prof, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class C { constructor(u) { this.s = new WebSocket(u); this.i = 1; this.p = new Map(); this.r = new Promise((res) => this.s.addEventListener('open', res)); this.s.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); } async send(method, params = {}) { await this.r; const id = this.i++; const pr = new Promise((res, rej) => this.p.set(id, { res, rej })); this.s.send(JSON.stringify({ id, method, params })); return pr; } }
const ev = async (cdp, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
};
const setDark = `(() => { const s=document.documentElement.style;
 s.setProperty('--dsw-alias-bg-base','#0b0f15'); s.setProperty('--dsw-alias-bg-layer-1','#141a22'); s.setProperty('--dsw-alias-bg-layer-2','#1c2430');
 s.setProperty('--dsw-alias-border-l1','#27313d'); s.setProperty('--dsw-alias-border-l2','#3a4655');
 s.setProperty('--dsw-alias-label-primary','#dfe6ef'); s.setProperty('--dsw-alias-label-secondary','#93a0b2');
 s.setProperty('--dsw-alias-brand-primary','#6f9fd8'); s.setProperty('--dsw-alias-state-error-primary','#e07a76');
 document.body.style.background='#0b0f14'; })()`;
const setLight = `(() => { const s=document.documentElement.style;
 s.setProperty('--dsw-alias-bg-base','#f7f6f3'); s.setProperty('--dsw-alias-bg-layer-1','#ffffff'); s.setProperty('--dsw-alias-bg-layer-2','#eef1f4');
 s.setProperty('--dsw-alias-border-l1','#e6e8eb'); s.setProperty('--dsw-alias-border-l2','#d5dade');
 s.setProperty('--dsw-alias-label-primary','#202733'); s.setProperty('--dsw-alias-label-secondary','#6b7480');
 s.setProperty('--dsw-alias-brand-primary','#3b6ea5'); s.setProperty('--dsw-alias-state-error-primary','#c0504d');
 document.body.style.background='#e9edf1'; })()`;
try {
  let target = null;
  for (let i = 0; i < 90 && !target; i += 1) { try { target = await (await fetch('http://127.0.0.1:9366/json/new?' + encodeURIComponent(origin + '/'), { method: 'PUT' })).json(); } catch { await sleep(250); } }
  const cdp = new C(target.webSocketDebuggerUrl);
  const errors = [];
  cdp.s.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200));
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: origin + '/' });
  for (let i = 0; i < 25; i += 1) { await sleep(1000); if (await ev(cdp, `Boolean(document.querySelector('.sdk-launcher'))`)) break; }
  await ev(cdp, `document.querySelector('.sdk-launcher').click()`);
  await sleep(2800);

  const metrics = () => ev(cdp, `(() => {
    const win=document.querySelector('.sdk-win'); const r=win.getBoundingClientRect();
    const cells=[...document.querySelectorAll('.sdk-cell')].map(c=>c.getBoundingClientRect());
    const body=document.querySelector('.sdk-body');
    return { theme: win.getAttribute('data-theme'), ratio: +(r.width/r.height).toFixed(3), cells: [Math.round(cells[0].width*100)/100, Math.round(cells[0].height*100)/100], fit: [body.scrollHeight, body.clientHeight] };
  })()`);
  console.log('light', JSON.stringify(await metrics()));
  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/design-light.png', Buffer.from(shot.data, 'base64'));

  await ev(cdp, setDark);
  await sleep(700);
  console.log('dark', JSON.stringify(await metrics()));
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/design-dark.png', Buffer.from(shot.data, 'base64'));

  // walkthrough in dark
  await ev(cdp, `(() => { const b=[...document.querySelectorAll('.sdk-tool')].find(x=>(x.childNodes[0]||{}).textContent==='完整解答'); b.click(); })()`);
  await sleep(700);
  const walk = await ev(cdp, `(() => { const w=document.querySelector('.sdk-walk'); const b=document.querySelector('.sdk-body'); return w ? { head:w.querySelector('.sdk-walk-head').textContent, fit:[b.scrollHeight,b.clientHeight] } : null; })()`);
  console.log('walk', JSON.stringify(walk));
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/design-walk.png', Buffer.from(shot.data, 'base64'));

  await ev(cdp, setLight);
  await sleep(600);
  console.log('back light theme', await ev(cdp, `document.querySelector('.sdk-win').getAttribute('data-theme')`));
  console.log('errors', JSON.stringify(errors.slice(0, 4)));
} catch (e) { console.error('FAILED', e.message); process.exitCode = 1; } finally { chrome.kill(); srv.close(); }
