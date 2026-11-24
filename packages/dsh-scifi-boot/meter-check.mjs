/**
 * 用受控时间轴跑新的 Meter：常驻 rAF、恒定速度、只进不退。
 * 用法: node meter-check.mjs
 */
import { readFileSync } from 'node:fs';

const fnSource = readFileSync('test_meter_src.js', 'utf8');

const FRAME = 16.6667;
let now = 0;
let queue = [];
let effects = [];
const node = { style: { transform: '' } };

// 模拟 React：ref 按稳定顺序分配
const refs = [];
let hookIndex = 0;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useRef: (init) => {
    const i = hookIndex++;
    if (!refs[i]) refs[i] = { current: init };
    return refs[i];
  },
  useEffect: (fn) => { effects.push(fn); },
};

const h = React.createElement;
const Meter = new Function(
  'React', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'h',
  `${fnSource}; return Meter;`,
)(
  React,
  (cb) => { queue.push(cb); return queue.length; },
  () => {},
  { now: () => now },
  h,
);

// 挂载：value = 0
hookIndex = 0;
let tree = Meter({ label: 'Ordo', value: 0, rate: 0.4, text: '0%' });
effects.forEach((e) => e());
effects = [];
// 把 fillRef 指向假节点
const fillEl = tree.children[1].children[0];
fillEl.props.ref.current = node;
node.style.transform = 'translateX(-100%)';

const samples = [];
function pump(frames) {
  for (let i = 0; i < frames; i++) {
    now += FRAME;
    const cb = queue.shift();
    if (!cb) return;
    cb(now);
    const m = /translateX\((-?[\d.]+)%\)/.exec(node.style.transform || '');
    if (m) samples.push(parseFloat(m[1]));
  }
}

// 模拟 5 次目标变化，每次间隔 600ms（约 36 帧）
let target = 0;
for (const t of [0.2, 0.4, 0.6, 0.8, 1]) {
  target = t;
  hookIndex = 0;
  tree = Meter({ label: 'Ordo', value: t, rate: 0.4, text: 'x' });
  effects.forEach((e) => e());
  effects = [];
  pump(36);
}
// 再空转 20 帧确认停在 0%
pump(20);

const deltas = [];
for (let i = 1; i < samples.length; i++) {
  const d = samples[i] - samples[i - 1];
  if (Math.abs(d) > 1e-9) deltas.push(d);
}
const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
const max = Math.max(...deltas);
const min = Math.min(...deltas);
const regress = deltas.some((d) => d < 0);

console.log('frames           :', samples.length);
console.log('moving frames    :', deltas.length);
console.log('delta avg/min/max:', avg.toFixed(4), min.toFixed(4), max.toFixed(4));
console.log('spread           :', (max / min).toFixed(4));
console.log('any regression   :', regress ? 'YES(反弹!)' : 'no');
console.log('final translate  :', samples.at(-1).toFixed(2), '%  (target 0%)');
console.log('VERDICT          :', !regress && max / min < 1.02 && Math.abs(samples.at(-1)) < 0.01 ? 'PASS' : 'FAIL');
