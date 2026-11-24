/* Render smoke test for the client half, without a browser or React DOM. */

import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8');

let captured = null;
const element = (type, props, ...children) => {
  if (type === undefined || type === null) throw new Error('createElement received an empty type');
  return {
    type,
    props: { ...(props || {}), children: children.flat(Infinity).filter((child) => child !== undefined && child !== null) },
  };
};

function makeReact(scenario) {
  let index = 0;
  return {
    createElement: element,
    useState(initial) {
      const slot = index;
      index += 1;
      const value = slot in scenario.states ? scenario.states[slot] : (typeof initial === 'function' ? initial() : initial);
      return [value, () => {}];
    },
    useEffect() {},
    useMemo(factory) {
      return factory();
    },
  };
}

function walk(node, path = 'root') {
  if (node === null || node === undefined || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`));
    return;
  }
  if (typeof node.type === 'string') {
    walk(node.props.children, `${path}.${node.type}`);
    return;
  }
  if (typeof node.type === 'function') {
    walk(node.type(node.props), `${path}.<${node.type.name || 'component'}>`);
    return;
  }
  throw new Error(`Invalid element type at ${path}: ${String(node.type)}`);
}

globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      const module = spec.factory((name) => {
        if (name === 'react') return React;
        throw new Error(`unexpected require: ${name}`);
      });
      captured = module;
    },
  },
  addEventListener() {},
  removeEventListener() {},
  open() {},
};

let React = makeReact({ states: {} });

function basePlugin(id, title) {
  return {
    id,
    name: `@local/${id}`,
    version: '1.0.0',
    title,
    intro: `${title} 的一句话说明。`,
    forms: ['Web 界面', 'Host 插件'],
    files: [
      { path: 'package.json', size: 120, sha: 'a'.repeat(40) },
      { path: 'index.js', size: 900, sha: 'b'.repeat(40) },
      { path: 'client.js', size: 1900, sha: 'c'.repeat(40) },
      { path: 'cordis.patch.yml', size: 80, sha: 'd'.repeat(40) },
    ],
    warnings: [],
  };
}

const plugins = [basePlugin('alpha', '甲'), basePlugin('beta', '乙')];

const statusConnected = {
  auth: { connected: true, login: 'octocat', name: 'Octo', scopes: 'repo' },
  repo: { exists: true, fullName: 'octocat/插件', private: false, defaultBranch: 'main', htmlUrl: 'https://github.com/octocat/x', canPush: true },
  config: { owner: 'octocat', repo: '插件', branch: 'main', root: 'C:/work', private: false },
  workspaces: [],
};

const remote = {
  exists: true,
  empty: false,
  branchExists: true,
  head: { sha: 'e'.repeat(40) },
  files: {
    'plugins/alpha/package.json': { sha: 'a'.repeat(40), size: 120 },
    'plugins/alpha/index.js': { sha: 'f'.repeat(40), size: 900 },
    'plugins/beta/package.json': { sha: 'a'.repeat(40), size: 120 },
    'plugins/beta/old.js': { sha: '0'.repeat(40), size: 10 },
  },
  repo: { exists: true, canPush: true },
};

const plan = {
  docs: {
    readme: '# 插件\n\n正文。\n',
    perPlugin: [{ id: 'alpha', path: 'plugins/alpha/README.md', content: '# 甲\n' }],
  },
  desired: [
    { path: 'README.md', status: 'changed', size: 20, virtual: true },
    { path: 'plugins/alpha/index.js', status: 'changed', size: 900, virtual: false },
  ],
  deleted: [{ path: 'plugins/beta/old.js', pluginId: 'beta' }],
  counts: { added: 0, changed: 2, deleted: 1, unchanged: 3, total: 7 },
  preservedDirs: ['beta'],
  warnings: ['示例警告'],
  mode: 'sync',
  remote: { exists: true, empty: false },
};

const selection = {
  alpha: { 'package.json': true, 'index.js': true, 'client.js': true, 'cordis.patch.yml': true },
  beta: { 'package.json': true, 'index.js': true, 'client.js': true, 'cordis.patch.yml': true },
};

const scenarios = [
  {
    name: 'login',
    states: { 6: false },
  },
  {
    name: 'connected',
    states: {
      0: statusConnected,
      1: { root: 'C:/work', plugins },
      2: remote,
      6: false,
      14: statusConnected.config,
      15: [],
      16: selection,
      17: { alpha: true },
      18: 'sync',
      19: '',
      20: plan,
      21: 'root',
      22: { kind: 'ok', text: 'ok', url: 'https://example.com' },
      23: { counts: { deleted: 1 } },
    },
  },
  {
    name: 'repo-missing',
    states: {
      0: { ...statusConnected, repo: { exists: false, owner: 'octocat', name: '插件' } },
      1: { root: 'C:/work', plugins },
      2: null,
      6: false,
      14: statusConnected.config,
      15: [],
      16: selection,
      17: {},
      18: 'replace',
      19: 'msg',
      20: null,
      21: 'root',
      22: null,
      23: null,
    },
  },
  {
    name: 'fatal',
    states: { 0: null, 4: '读取出错', 6: false },
  },
];

for (const scenario of scenarios) {
  React = makeReact({ states: scenario.states });
  captured = null;
  const factory = new Function('window', 'document', source);
  factory(globalThis.window, { createElement: () => ({ setAttribute() {}, textContent: '' }), head: { appendChild() {} } });
  if (!captured) throw new Error('module did not register');
  const ctx = {
    effect() {},
    slots: {
      inject(_name, callback) { callback(); },
      register(options, component) {
        if (options.name === 'main') captured.main = component;
        if (options.name === 'sidebar.panellist') captured.icon = component;
        return () => {};
      },
    },
    locale: { register: () => () => {}, bind: () => (key) => key },
    theme: { getTheme: () => ({ active: { colorScheme: 'light' } }) },
  };
  captured.apply(ctx);
  if (!captured.main) throw new Error('main component not registered');
  const tree = captured.main({});
  walk(tree);
  console.log(`scenario ${scenario.name}: rendered`);
}
