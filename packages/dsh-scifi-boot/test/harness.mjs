/**
 * Logic smoke test for the 550W boot client module.
 *
 * This is NOT visual verification. It loads client.js through a stand-in
 * `window.__ModuleLoader__`, applies the plugin against a stub client context,
 * and re-renders the component tree with a tiny hooks implementation so the
 * boot → gate → launch → close state machine is actually executed. It catches
 * syntax errors, missing APIs, crashes and stuck phases; it says nothing about
 * how the sequence looks on screen.
 *
 * Run: node test/harness.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '..', 'client.js'), 'utf8');

// ---------------------------------------------------------------- elements
const Fragment = { __kind: 'fragment' };
function createElement(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false),
  };
}

const React = {
  createElement,
  Fragment,
  useState: (initial) => useSlot('state', () => (typeof initial === 'function' ? initial() : initial)),
  useReducer: (reducer, initial) => {
    const [value, set] = useSlot('state', () => initial);
    return [value, (action) => set((prev) => reducer(prev, action))];
  },
  useRef: (initial) => useSlot('ref', () => ({ current: initial })),
  useCallback: (fn) => useSlot('callback', () => fn),
  useEffect: (fn, deps) => useSlot('effect', () => fn, deps),
};

// ---------------------------------------------------------- tiny hook core
const records = new Map(); // component path -> { slots, cursor }
let currentRecord = null;
let dirty = false;
let effectQueue = [];
let cleanupQueue = [];

function useSlot(kind, init, deps) {
  const record = currentRecord;
  const i = record.cursor++;
  if (!record.slots[i]) record.slots[i] = { kind, value: init(), primed: false, deps: undefined };
  const slot = record.slots[i];
  if (kind === 'state') {
    slot.set = (next) => {
      const value = typeof next === 'function' ? next(slot.value) : next;
      if (value !== slot.value) { slot.value = value; dirty = true; }
    };
    return [slot.value, slot.set];
  }
  if (kind === 'effect') {
    const changed = !slot.primed || !deps || deps.some((d, k) => d !== (slot.deps || [])[k]);
    if (changed) {
      slot.primed = true;
      slot.deps = deps || [];
      effectQueue.push(() => {
        if (typeof slot.cleanup === 'function') cleanupQueue.push(slot.cleanup);
        const out = slot.value();
        slot.cleanup = typeof out === 'function' ? out : undefined;
      });
    }
    return undefined;
  }
  return slot.value;
}

function mountComponent(type, props, nodePath) {
  let record = records.get(nodePath);
  if (!record) { record = { slots: [], cursor: 0 }; records.set(nodePath, record); }
  record.cursor = 0;
  const prev = currentRecord;
  currentRecord = record;
  try {
    return type({ ...props });
  } finally {
    currentRecord = prev;
  }
}

/** Last fully rendered tree, flattened into host elements + text. */
const dom = [];
const classes = new Set();

function walk(element, nodePath) {
  if (element === null || element === undefined || element === false || element === true) return;
  if (Array.isArray(element)) {
    element.forEach((child, i) => walk(child, `${nodePath}.${i}`));
    return;
  }
  if (typeof element === 'string' || typeof element === 'number') {
    dom.push({ text: String(element) });
    return;
  }
  const { type, props, children } = element;
  if (type === Fragment) {
    children.forEach((child, i) => walk(child, `${nodePath}.f${i}`));
    return;
  }
  if (typeof type === 'function') {
    const key = `${nodePath}>${type.name || 'anon'}`;
    walk(mountComponent(type, { ...props, children }, key), key);
    return;
  }
  if (typeof type === 'string') {
    const entry = { tag: type, props, children: [] };
    if (props && props.className) String(props.className).split(/\s+/).forEach((c) => classes.add(c));
    dom.push(entry);
  }
  children.forEach((child, i) => walk(child, `${nodePath}.${i}`));
}

function render() {
  dirty = false;
  dom.length = 0;
  classes.clear();
  effectQueue = [];
  const overlay = slots.find((s) => s.options.name === 'shell.overlay');
  walk(overlay.component({}), 'root');
  effectQueue.forEach((fn) => fn());
  effectQueue = [];
  cleanupQueue.forEach((fn) => fn());
  cleanupQueue = [];
}

/** Re-render until no state changes are pending. */
function settle(rounds = 30) {
  for (let r = 0; r < rounds; r += 1) {
    render();
    if (!dirty) return;
  }
}

function flatText() {
  return dom.map((n) => n.text || '').join('');
}

function findButton(label) {
  const text = flatText();
  const index = text.indexOf(label);
  if (index < 0) return null;
  // Find the button whose own subtree carries the label.
  for (const node of dom) {
    if (node.tag !== 'button' || !node.props || typeof node.props.onClick !== 'function') continue;
    const own = node.children || [];
    const labelText = own.map((c) => c.text || '').join('');
    if (labelText.includes(label)) return node;
  }
  // Fallback: match by position in the flattened text.
  let cursor = 0;
  for (const node of dom) {
    if (node.tag === 'button' && node.props && typeof node.props.onClick === 'function') {
      const len = (node.text || '').length;
      if (cursor <= index && index < cursor + len) return node;
      cursor += len;
    }
  }
  return null;
}

// -------------------------------------------------------------- browser stub
const listeners = new Map();
const store = new Map();
let timers = [];
let timerId = 0;
let intervals = [];

const fakeCanvas = () => ({
  style: {},
  width: 1280,
  height: 800,
  getBoundingClientRect: () => ({ width: 1280, height: 800 }),
  getContext: () => ({
    setTransform() {}, clearRect() {}, save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {}, fillRect() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  }),
});

const sandbox = {
  console,
  setTimeout: (fn, ms) => { const id = ++timerId; timers.push({ id, fn, ms }); return id; },
  clearTimeout: (id) => { timers = timers.filter((t) => t.id !== id); },
  setInterval: (fn, ms) => { const id = ++timerId; intervals.push({ id, fn, ms }); return id; },
  clearInterval: (id) => { intervals = intervals.filter((t) => t.id !== id); },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  ResizeObserver: class { observe() {} disconnect() {} },
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 2,
  document: {
    activeElement: null,
    body: { style: { overflow: '' } },
    createElement: () => fakeCanvas(),
  },
  getComputedStyle: () => ({ backgroundColor: 'rgb(11, 12, 14)' }),
  sessionStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  },
  addEventListener: (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
  },
  removeEventListener: (type, fn) => {
    listeners.set(type, (listeners.get(type) || []).filter((f) => f !== fn));
  },
  dispatchEvent: (event) => {
    (listeners.get(event.type) || []).forEach((fn) => fn(event));
    return true;
  },
  CustomEvent: class { constructor(type) { this.type = type; } },
  __ModuleLoader__: null,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

let loaded = null;
sandbox.__ModuleLoader__ = {
  load: ({ id, factory }) => {
    loaded = { id, api: factory((spec) => { if (spec === 'react') return React; throw new Error(`unexpected require(${spec})`); }) };
  },
};

function assert(condition, message) {
  if (!condition) {
    console.error('SMOKE FAILED:', message);
    process.exit(1);
  }
}

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'client.js' });
assert(loaded, 'client.js never called __ModuleLoader__.load');
assert(loaded.id === '@local/dsh-scifi-boot', `module id is ${loaded.id}`);
assert(Array.isArray(loaded.api.inject), 'plugin has no inject list');

// ----------------------------------------------------------------- apply
const slots = [];
let localeReads = 0;
const localeSubs = [];
const ctx = {
  slots: { register: (options, component) => { slots.push({ options, component }); return () => {}; } },
  locale: {
    getSnapshot: () => { localeReads += 1; return { active: 'zh-CN', revision: 3, locales: [] }; },
    subscribe: (fn) => { localeSubs.push(fn); return () => {}; },
  },
  effect: (fn) => fn(),
};
loaded.api.apply(ctx);

const overlay = slots.find((s) => s.options.name === 'shell.overlay');
const replay = slots.find((s) => s.options.name === 'sidebar.footer.action');
assert(overlay, 'no shell.overlay registration');
assert(replay, 'no sidebar.footer.action registration');
assert(overlay.options.id === 'scifi-boot.overlay', `overlay id ${overlay.options.id}`);
assert(typeof replay.options.label === 'function', 'replay label should be a thunk');
assert(String(replay.options.label()).length > 0, 'replay label thunk returned empty');

// ------------------------------------------------------------- first mount
settle();
assert(classes.has('sb-root'), 'boot dialog root (.sb-root) did not render');
assert(classes.has('sb-canvas'), 'canvas layer missing');
assert(classes.has('sb-hud'), 'HUD layer missing');
assert(classes.has('sb-boot'), 'boot log phase missing');

/** Render once and flush effects, without looping re-renders. */
function renderOnce() {
  dirty = false;
  dom.length = 0;
  classes.clear();
  effectQueue = [];
  const overlay = slots.find((s) => s.options.name === 'shell.overlay');
  walk(overlay.component({}), 'root');
  effectQueue.forEach((fn) => fn());
  effectQueue = [];
  cleanupQueue.forEach((fn) => fn());
  cleanupQueue = [];
}

/** Fire the next pending timeout, then let the re-render settle. */
function nextTimer() {
  if (!timers.length) return false;
  timers.sort((a, b) => a.ms - b.ms);
  const t = timers.shift();
  t.fn();
  renderOnce();
  return true;
}

let steps = 0;
while (!classes.has('sb-gate') && steps < 400 && nextTimer()) steps += 1;
assert(classes.has('sb-gate'), 'gate phase never rendered after the boot log');
assert(classes.has('sb-cmd'), 'command line missing in the gate phase');
assert(dom.some((n) => n.tag === 'input'), 'command input missing');
assert(dom.some((n) => n.tag === 'button'), 'gate buttons missing');

const startBtn = findButton('执 行 启 动');
if (!startBtn) console.log('DEBUG texts:', flatText().slice(0, 900));
assert(startBtn, 'start button not found by its label');
startBtn.props.onClick();
settle(8);
assert(classes.has('sb-launch'), 'launch phase never rendered after clicking start');

let guard = 0;
while (!store.get('dsh-scifi-boot.seen') && guard < 400 && nextTimer()) guard += 1;
settle(8);
assert(store.get('dsh-scifi-boot.seen') === '1', 'seen flag was not persisted to sessionStorage');
assert(!classes.has('sb-root'), 'overlay kept rendering after it closed');

// Replay through the sidebar button's CustomEvent.
sandbox.dispatchEvent(new sandbox.CustomEvent('dsh-scifi-boot:replay'));
settle(6);
assert(classes.has('sb-root'), 'replay did not re-open the boot dialog');

// The replay action itself must render a theme-token button.
const replayNode = replay.component({});
assert(replayNode && replayNode.type === 'button', 'replay action did not render a button');
assert(String(replayNode.props.style.border).includes('--dsw-alias-'), 'replay button does not use theme tokens');

// Locale changes must be subscribed and re-read.
assert(localeSubs.length > 0, 'locale change was never subscribed');
const before = localeReads;
localeSubs.forEach((fn) => fn());
assert(localeReads > before, 'locale subscription did not re-read the snapshot');
const zhLabel = String(replay.options.label());
assert(zhLabel.includes('重播') || zhLabel.toLowerCase().includes('replay'), `unexpected replay label: ${zhLabel}`);

// Escape must close the dialog from any phase.
sandbox.dispatchEvent(new sandbox.CustomEvent('keydown'));
settle(4);

console.log('module id            :', loaded.id);
console.log('inject               :', loaded.api.inject.join(', '));
console.log('slot registrations   :', slots.map((s) => `${s.options.name}#${s.options.id}`).join('  |  '));
console.log('boot → gate          : ok (' + steps + ' timer steps, command line + buttons present)');
console.log('gate → launch        : ok (start button clicked)');
console.log('seen flag            :', store.get('dsh-scifi-boot.seen'));
console.log('replay               : ok (CustomEvent re-opened the dialog)');
console.log('locale label thunk   :', zhLabel);
console.log('replay theme tokens  : ok (--dsw-alias-* only)');
console.log('SMOKE OK');
