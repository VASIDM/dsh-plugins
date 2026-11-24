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
:root{--dsw-alias-bg-base:#f7f6f3;--dsw-alias-bg-layer-1:#ffffff;--dsw-alias-bg-layer-2:#eef1f4;--dsw-alias-border-l1:#e6e8eb;--dsw-alias-border-l2:#d5dade;--dsw-alias-label-primary:#202733;--dsw-alias-label-secondary:#6b7480;--dsw-alias-brand-primary:#3b6ea5;--dsw-alias-state-error-primary:#c0504d;--dsh-font-family-text-default:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;--dsh-font-family-brand:"Noto Serif SC","Songti SC",Georgia,serif}
</style>
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
</head><body><div id="mount"></div><script>
window.__parts={};window.__ModuleLoader__={load({factory}){const mod=factory((n)=>n==='react'?window.React:undefined);const ctx={effect:(fn)=>{const d=fn();return typeof d==='function'?d:()=>{}},get:()=>undefined,on:()=>()=>{},slots:{inject:(k,cb)=>{cb();return()=>{}},register:(o,c)=>{window.__parts[o.id]=c;return()=>{}}},locale:{bind:()=>(k)=>k,register:()=>()=>{}}};mod.apply(ctx);
 const Footer=window.__parts['poetry']; const Overlay=window.__parts['poetry.window'];
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
const prof = mkdtempSync(join(tmpdir(), 'poetry-cover-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--remote-debugging-port=9371', '--user-data-dir=' + prof, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class C { constructor(u) { this.s = new WebSocket(u); this.i = 1; this.p = new Map(); this.r = new Promise((res) => this.s.addEventListener('open', res)); this.s.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); } async send(method, params = {}) { await this.r; const id = this.i++; const pr = new Promise((res, rej) => this.p.set(id, { res, rej })); this.s.send(JSON.stringify({ id, method, params })); return pr; } }
const ev = async (cdp, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
try {
  let target = null;
  for (let i = 0; i < 90 && !target; i += 1) { try { target = await (await fetch('http://127.0.0.1:9371/json/new?' + encodeURIComponent(origin + '/'), { method: 'PUT' })).json(); } catch { await sleep(250); } }
  const cdp = new C(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: origin + '/' });
  for (let i = 0; i < 25; i += 1) { await sleep(1000); if (await ev(cdp, `Boolean(document.querySelector('.pt-launcher'))`)) break; }
  await ev(cdp, `document.querySelector('.pt-launcher').click()`);
  await sleep(900);
  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/cover-light.png', Buffer.from(shot.data, 'base64'));
  await ev(cdp, `(() => { const s=document.documentElement.style;
    s.setProperty('--dsw-alias-bg-base','#0b0f15'); s.setProperty('--dsw-alias-bg-layer-1','#141a22'); s.setProperty('--dsw-alias-bg-layer-2','#1c2430');
    s.setProperty('--dsw-alias-border-l1','#27313d'); s.setProperty('--dsw-alias-border-l2','#3a4655');
    s.setProperty('--dsw-alias-label-primary','#dfe6ef'); s.setProperty('--dsw-alias-label-secondary','#93a0b2');
    s.setProperty('--dsw-alias-brand-primary','#6f9fd8'); document.body.style.background='#0b0f14'; })()`);
  await sleep(600);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('verify/cover-dark.png', Buffer.from(shot.data, 'base64'));
  console.log('title', await ev(cdp, `document.querySelector('.pt-h1').textContent`));
} finally { chrome.kill(); srv.close(); }
