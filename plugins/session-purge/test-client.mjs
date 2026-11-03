import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8');

let captured = null;
const element = (type, props, ...children) => ({
  type,
  props: {
    ...(props || {}),
    children: children.length > 0
      ? children.flat(Infinity).filter((child) => child !== undefined && child !== null)
      : (props && props.children) || [],
  },
});

let states = {};
let hookIndex = 0;
const React = {
  Fragment: Symbol('Fragment'),
  createElement: element,
  useState(initial) {
    const index = hookIndex;
    hookIndex += 1;
    const value = index in states ? states[index] : typeof initial === 'function' ? initial() : initial;
    return [value, () => {}];
  },
  useEffect() {},
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot();
  },
};

const primitives = {
  MenuItemButton: (props) => element('menuitem', props),
  Modal: (props) => element('modal', props),
  Button: (props) => element('button', props),
  IconTrashOutlineRegular: () => null,
};

globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      captured = spec.factory((name) => {
        if (name === 'react') return React;
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives;
        throw new Error(`unexpected require: ${name}`);
      });
    },
  },
  location: { reload() {} },
  setTimeout,
};
globalThis.document = {
  querySelector: () => ({}),
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { appendChild() {} },
};

const factory = new Function('window', 'document', source);
factory(globalThis.window, globalThis.document);
assert.ok(captured, 'client bundle registered');
assert.deepEqual(captured.inject, ['slots', 'locale']);

const dictionaries = {
  'menu.label': '彻底删除对话…',
  'dialog.title': '彻底删除这个对话？',
  'dialog.desc': '“{title}”及其全部本地记录会被永久抹除，无法撤销、没有回收站。',
  'dialog.scope.logs': '会话日志',
  'dialog.scope.logs.value': '{files} 个文件 · {size}',
  'dialog.scope.children': '子会话',
  'dialog.scope.children.value': '{n} 个，会一并删除',
  'dialog.scope.cache': '投影缓存与工作区记录',
  'dialog.scope.attachments': '附件与文件缓存',
  'dialog.scope.workspace': '工作区文件',
  'dialog.scope.cache.value': '标题、统计、排序、归档与置顶状态',
  'dialog.scope.attachments.value': '仅删除不再被其他对话引用的对象',
  'dialog.scope.workspace.value': '不会删除；只清除 DSH 的对话记录',
  'dialog.ack': '我已了解：删除后无法恢复，也不会进入回收站。',
  'dialog.cancel': '取消',
  'dialog.confirm': '永久删除',
  'dialog.live': '这个对话仍在内存中。删除会先停止它正在进行的工作。',
  'dialog.close': '关闭',
};
const translate = (key, vars) => {
  let text = dictionaries[key] ?? key;
  for (const [name, value] of Object.entries(vars ?? {})) text = text.replaceAll(`{${name}}`, String(value));
  return text;
};

const registrations = [];
const ctx = {
  effect(fn) {
    const dispose = fn();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  slots: {
    inject(_name, callback) {
      return callback();
    },
    register(options, component) {
      registrations.push({ options, component });
      return () => {};
    },
  },
  locale: {
    register: () => () => {},
    bind: () => translate,
  },
};

captured.apply(ctx);
const menuEntry = registrations.find((entry) => entry.options.name === 'sidebar.workspaces.session.menu.item');
const overlayEntry = registrations.find((entry) => entry.options.name === 'shell.overlay');
assert.ok(menuEntry, 'session menu entry registered');
assert.ok(overlayEntry, 'shell overlay entry registered');
assert.equal(menuEntry.options.id, 'session-purge');
assert.equal(menuEntry.options.order, 500);

const bridge = captured.__test.bridge;
const menuTree = captured.__test.PurgeMenuItem({
  sessionId: 'session-demo',
  displayTitle: '测试对话',
  useMenuOpenState: () => [false, () => {}],
});
assert.equal(menuTree.type, primitives.MenuItemButton);
const label = menuTree.props.children[0];
assert.equal(label.props.children[0], '彻底删除对话…');
assert.equal(label.props.className, 'sp-danger-text');

let menuClosed = false;
const menuTree2 = captured.__test.PurgeMenuItem({
  sessionId: 'session-demo',
  displayTitle: '测试对话',
  useMenuOpenState: () => [true, (value) => { menuClosed = value === false; }],
});
menuTree2.props.onSelect();
assert.equal(menuClosed, true, 'menu closes on select');
assert.equal(bridge.get().sessionId, 'session-demo');
assert.equal(bridge.get().title, '测试对话');

bridge.set(null);
assert.equal(overlayEntry.component({}), null);

hookIndex = 0;
states = {
  0: 'ready',
  1: { files: 3, bytes: 4096, descendants: 2, live: true },
  2: null,
  3: false,
  4: false,
  5: false,
  6: null,
};
const dialog = captured.__test.PurgeDialog({ request: { sessionId: 'session-demo', title: '测试对话', nonce: 1 } });
assert.equal(dialog.type, primitives.Modal);
assert.equal(dialog.props.title, '彻底删除这个对话？');

const texts = [];
const walk = (node) => {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    texts.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(walk);
    return;
  }
  if (typeof node !== 'object') return;
  if (node.type === React.Fragment) return walk(node.props.children);
  if (typeof node.type === 'function') return walk(node.type(node.props));
  if (typeof node.type === 'string') walk(node.props.children);
};
walk(dialog);
const joined = texts.join('|');
assert.ok(joined.includes('会话日志'), joined);
assert.ok(joined.includes('子会话'), joined);
assert.ok(joined.includes('3 个文件 · 4.0 KB'), joined);
assert.ok(joined.includes('这个对话仍在内存中'), joined);
assert.ok(joined.includes('我已了解'), joined);
assert.equal(dialog.props.footer.props.children.length, 2);
const confirmButton = dialog.props.footer.props.children[1];
assert.equal(confirmButton.props.disabled, true, 'confirm disabled before acknowledgement');
assert.equal(confirmButton.props.className, 'sp-purge-danger');

console.log('all client tests passed');
