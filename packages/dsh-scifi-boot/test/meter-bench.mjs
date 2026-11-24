/**
 * Meter 逻辑验证：受控 rAF 时间轴，量每帧位移是否恒定。
 * 用法: node test/meter-bench.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '..', 'client.js'), 'utf8');

function extractFn(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let depth = 0;
  let opened = false;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') {
      depth += 1;
      opened = true;
    } else if (source[i] === '}') {
      depth -= 1;
      if (opened && depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

const fnSource = extractFn('Meter');
if (!fnSource) {
  console.error('FAIL: Meter not found');
  process.exit(1);
}

const FRAME = 16.6667;
let now = 0;
let queue = [];
let effects = [];
const fillNode = { style: { transform: '' } };

const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useRef: (init) => ({ current: init }),
  useEffect: (fn) => { effects.push(fn); },
};

const Meter = new Function(
  'React', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'h',
  `${fnSource}; return Meter;`,
)(
  React,
  (cb) => { queue.push(cb); return queue.length; },
  () => {},
  { now: () => now },
  React.createElement,
);

let tree = Meter({ label: 'Ordo', value: 0, text: '0%' });
effects.forEach((e) => e());
effects = [];

const bar = tree.children[1];
const fillEl = bar.children[0];
if (!fillEl || !fillEl.props || !fillEl.props.ref) {
  console.error('FAIL: 返回树里找不到 ref');
  process.exit(1);
}
fillEl.props.ref.current = fillNode;

const samples = [];
function pump(frames) {
  for (let i = 0; i < frames; i += 1) {
    now += FRAME;
    const cb = queue.shift();
    if (!cb) return;
    cb(now);
    const m = /translateX\((-?[\d.]+)%\)/.exec(fillNode.style.transform || '');
    if (m) samples.push(parseFloat(m[1]));
  }
}

for (const t of [0.2, 0.4, 0.6, 0.8, 1]) {
  tree = Meter({ label: 'Ordo', value: t, text: 'x' });
  effects.forEach((e) => e());
  effects = [];
  pump(60);
}

const deltas = [];
for (let i = 1; i < samples.length; i += 1) {
  const d = samples[i] - samples[i - 1];
  if (d > 1e-9) deltas.push(d);
}
const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
const max = Math.max(...deltas);
const min = Math.min(...deltas);
const spread = max / min;

console.log('frames sampled   :', samples.length);
console.log('moving frames    :', deltas.length);
console.log('delta avg/min/max:', avg.toFixed(3), min.toFixed(3), max.toFixed(3));
console.log('spread           :', spread.toFixed(4), '(1.0000 = 完全匀速)');
console.log('final translate  :', samples.at(-1).toFixed(2), '%');
console.log('VERDICT          :', spread < 1.01 ? 'PASS 匀速' : 'FAIL 仍有变速');
