/* End-to-end Host test with an in-memory GitHub API. */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'github-vault-test-'));
process.env.DSH_HOME = path.join(root, 'home');
const workspace = path.join(root, 'workspace');

function hash(text) {
  return createHash('sha1').update(text).digest('hex');
}

function blobSha(buffer) {
  return createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}

async function write(relative, content) {
  const file = path.join(workspace, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

await write('alpha/package.json', JSON.stringify({
  name: '@local/alpha',
  version: '1.0.0',
  description: 'Alpha package.',
  type: 'module',
  exports: { '.': './index.js', './client': './client.js' },
  dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web' } },
}, null, 2));
await write('alpha/index.js', 'export function apply() {}\n');
await write('alpha/client.js', 'window.__ModuleLoader__.load({ id: "alpha", factory() { return {}; } });\n');
await write('alpha/cordis.patch.yml', "- insert:\n    - id: alpha\n      name: '@local/alpha'\n");
await write('alpha/locale/zh.json', JSON.stringify({ meta: { title: '甲', description: '甲包，做甲事。' } }, null, 2));
await write('alpha/README.md', '# 甲\n\n原有说明。\n');
await write('alpha/.env', 'SECRET=do-not-upload\n');
await write('alpha/node_modules/dep/index.js', 'nope\n');

await write('beta/package.json', JSON.stringify({
  name: '@local/beta',
  version: '2.0.0',
  description: 'Beta package.',
  type: 'module',
  exports: { '.': './index.js' },
  dsh: { bundle: { patch: './cordis.patch.yml' } },
}, null, 2));
await write('beta/index.js', 'export function apply() {}\n');
await write('beta/cordis.patch.yml', "- insert:\n    - id: beta\n      name: '@local/beta'\n");
await write('beta/locale/zh.json', JSON.stringify({ meta: { title: '乙', description: '乙包，做乙事。' } }, null, 2));

/* ---- in-memory GitHub -------------------------------------------------- */

const repoName = '插件';
const owner = 'tester';
const state = {
  repo: null,
  refs: new Map(),
  blobs: new Map(),
  trees: new Map(),
  commits: new Map(),
  meta: [],
  topics: [],
};

function repoJson() {
  return {
    id: 1,
    owner: { login: owner },
    name: repoName,
    full_name: `${owner}/${repoName}`,
    private: false,
    default_branch: 'main',
    html_url: `https://github.com/${owner}/${repoName}`,
    size: 0,
    permissions: { push: true, admin: true },
  };
}

function response(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function treeOf(ref) {
  if (state.trees.has(ref)) return ref;
  if (state.refs.has(ref)) {
    const commit = state.commits.get(state.refs.get(ref));
    if (commit) return commit.tree.sha;
  }
  if (state.commits.has(ref)) return state.commits.get(ref).tree.sha;
  return null;
}

function makeTree(baseTree, entries) {
  const map = new Map();
  if (baseTree && state.trees.has(baseTree)) {
    for (const entry of state.trees.get(baseTree)) map.set(entry.path, entry);
  }
  for (const entry of entries) {
    if (entry.sha === null) map.delete(entry.path);
    else map.set(entry.path, { path: entry.path, mode: entry.mode || '100644', type: entry.type || 'blob', sha: entry.sha });
  }
  const sorted = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
  const sha = hash(JSON.stringify(sorted));
  state.trees.set(sha, sorted);
  return sha;
}

globalThis.fetch = async (url, init = {}) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  console.log(method, parts.join('/'));

  if (parts[0] === 'user' && parts.length === 1 && method === 'GET') {
    return response(200, { login: owner, name: 'Tester', avatar_url: 'https://example.com/a.png', html_url: `https://github.com/${owner}`, type: 'User' });
  }
  if (parts[0] === 'user' && parts[1] === 'repos' && method === 'POST') {
    state.repo = repoJson();
    state.repo.name = body.name;
    state.repo.full_name = `${owner}/${body.name}`;
    state.repo.private = Boolean(body.private);
    state.repo.size = 0;
    state.repo.html_url = `https://github.com/${owner}/${body.name}`;
    return response(201, state.repo);
  }
  if (parts[0] === 'repos' && parts[1] === owner && parts[2] === repoName) {
    if (parts.length === 3 && method === 'GET') {
      if (!state.repo) return response(404, { message: 'Not Found' });
      return response(200, state.repo);
    }
    if (parts.length === 3 && method === 'PATCH') {
      state.meta.push(body);
      return response(200, { ...state.repo, description: body.description });
    }
    if (parts[3] === 'topics' && method === 'PUT') {
      state.topics = body.names;
      return response(200, { names: state.topics });
    }
    if (parts[3] === 'git' && parts[4] === 'ref' && parts[5] === 'heads' && parts.length === 7) {
      const branch = parts[6];
      if (method === 'GET') {
        if (!state.refs.has(branch)) return response(404, { message: 'Not Found' });
        return response(200, { ref: `refs/heads/${branch}`, object: { sha: state.refs.get(branch), type: 'commit' } });
      }
    }
    if (parts[3] === 'git' && parts[4] === 'refs' && method === 'POST') {
      const branch = String(body.ref).replace(/^refs\/heads\//, '');
      state.refs.set(branch, body.sha);
      return response(201, { ref: body.ref, object: { sha: body.sha } });
    }
    if (parts[3] === 'git' && parts[4] === 'refs' && parts[5] === 'heads' && method === 'PATCH') {
      state.refs.set(parts[6], body.sha);
      return response(200, { ref: `refs/heads/${parts[6]}`, object: { sha: body.sha } });
    }
    if (parts[3] === 'git' && parts[4] === 'trees' && parts.length === 6 && method === 'GET') {
      const treeSha = treeOf(parts[5]);
      if (!treeSha) return response(404, { message: 'Not Found' });
      const entries = state.trees.get(treeSha) || [];
      return response(200, { sha: treeSha, tree: entries.map((entry) => ({ ...entry, size: 0 })), truncated: false });
    }
    if (parts[3] === 'git' && parts[4] === 'trees' && method === 'POST') {
      console.log('CREATE TREE base', body.base_tree, 'known', state.trees.has(body.base_tree), 'entries', (body.tree || []).length);
      const sha = makeTree(body.base_tree, body.tree || []);
      console.log('CREATE TREE result entries', state.trees.get(sha).length);
      return response(201, { sha, tree: state.trees.get(sha) });
    }
    if (parts[3] === 'git' && parts[4] === 'blobs' && method === 'POST') {
      const buffer = Buffer.from(body.content, 'base64');
      const sha = blobSha(buffer);
      state.blobs.set(sha, buffer);
      return response(201, { sha });
    }
    if (parts[3] === 'git' && parts[4] === 'commits' && method === 'POST') {
      const sha = hash(JSON.stringify([body.message, body.tree, body.parents]));
      const commit = {
        sha,
        message: body.message,
        tree: { sha: body.tree },
        parents: (body.parents || []).map((parent) => ({ sha: parent })),
      };
      state.commits.set(sha, commit);
      return response(201, commit);
    }
    if (parts[3] === 'git' && parts[4] === 'commits' && parts.length === 6 && method === 'GET') {
      const commit = state.commits.get(parts[5]);
      if (!commit) return response(404, { message: 'Not Found' });
      return response(200, commit);
    }
  }
  return response(404, { message: `Unhandled ${method} ${parts.join('/')}` });
};

/* ---- plugin host ------------------------------------------------------- */

const { apply } = await import('./index.js');

const routes = [];
let record = { kind: 'api-key', key: 'test-token-1234567890' };
const ctx = {
  effect(fn) {
    return fn();
  },
  webServer: {
    register(route) {
      routes.push(route);
      return () => {};
    },
    getOrigin: () => 'http://127.0.0.1:60055',
  },
  credentials: {
    async readRecord() { return record; },
    async modifyRecord(_key, mutate) { record = await mutate(record); return record; },
    async deleteRecord() { record = null; },
  },
  get(name) {
    if (name === 'workspaceRegistry') {
      return { list: () => [{ id: 'ws-1', title: 'test', path: workspace }] };
    }
    return undefined;
  },
};

apply(ctx);
const route = routes.find((entry) => entry.path === '/api/github-vault');
if (!route) throw new Error('route not registered');

function makeReq(method, action, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url: `/api/github-vault/${action}`,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

async function call(method, action, body) {
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });
  const response = {
    status: 0,
    headers: null,
    body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(data) {
      this.text = data;
      try { this.body = JSON.parse(data); } catch { this.body = null; }
      finish(this);
    },
  };
  await route.handler(makeReq(method, action, body), response);
  await done;
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

const stateRes = await call('GET', 'state');
assert(stateRes.status === 200, 'state status');
assert(stateRes.body.auth.connected === true, 'authenticated');
assert(stateRes.body.repo.exists === false, 'repo missing');
assert(stateRes.body.root === workspace, 'root from workspace registry');

const pluginsRes = await call('GET', 'plugins');
assert(pluginsRes.status === 200, 'plugins status');
const plugins = pluginsRes.body.plugins;
assert(plugins.length === 2, `two plugins, got ${plugins.length}`);
const alpha = plugins.find((plugin) => plugin.id === 'alpha');
const beta = plugins.find((plugin) => plugin.id === 'beta');
assert(alpha && beta, 'alpha and beta found');
assert(!alpha.files.some((file) => file.path === '.env'), '.env excluded');
assert(!alpha.files.some((file) => file.path.startsWith('node_modules/')), 'node_modules excluded');
assert(alpha.readme && alpha.readme.exists, 'alpha README kept');
assert(!beta.readme, 'beta has no README');

const selection = plugins.map((plugin) => ({ id: plugin.id, files: plugin.files.map((file) => file.path) }));
const previewRes = await call('POST', 'preview', { selection, mode: 'sync' });
assert(previewRes.status === 200, `preview status ${previewRes.status} ${previewRes.text}`);
const preview = previewRes.body.plan;
assert(preview.counts.added > 0, 'preview added');
assert(preview.docs.readme.includes('## 甲'), 'README has alpha section');
assert(preview.docs.readme.includes('## 乙'), 'README has beta section');
assert(preview.docs.perPlugin.some((doc) => doc.id === 'beta'), 'beta virtual README');

const uploadRes = await call('POST', 'upload', { selection, mode: 'sync' });
assert(uploadRes.status === 200, `upload status ${uploadRes.status} ${uploadRes.text}`);
assert(uploadRes.body.ok && uploadRes.body.commit, 'commit returned');
assert(state.repo, 'repo created');
assert(state.refs.has('main'), 'main ref created');

const remoteRes = await call('GET', 'remote');
assert(remoteRes.status === 200, 'remote status');
const remote = remoteRes.body.remote;
assert(remote.exists && !remote.empty, 'remote exists');
assert(remote.files['plugins/alpha/README.md'], 'alpha README remote');
assert(remote.files['plugins/beta/README.md'], 'beta README remote');
assert(remote.files['README.md'], 'root README remote');
assert(remote.repo.canPush === true, 'push permission');

const betaReadme = state.blobs.get(remote.files['plugins/beta/README.md'].sha).toString('utf8');
assert(betaReadme.includes('# 乙'), 'beta virtual README content');

const firstCommit = uploadRes.body.commit.sha;
await write('alpha/index.js', 'export function apply() { console.log("changed"); }\n');
const changedPreview = await call('POST', 'preview', { selection, mode: 'sync' });
assert(changedPreview.body.plan.counts.changed === 1, `changed count 1, got ${changedPreview.body.plan.counts.changed}`);
const secondUpload = await call('POST', 'upload', { selection, mode: 'sync' });
assert(secondUpload.status === 200, 'second upload');
assert(secondUpload.body.commit.sha !== firstCommit, 'new commit');
assert(state.commits.get(secondUpload.body.commit.sha).parents[0].sha === firstCommit, 'parent is first commit');

const beforeReplace = await call('GET', 'remote');
console.log('BEFORE REPLACE FILES', Object.keys(beforeReplace.body.remote.files));
const replaceSelection = [{ id: 'alpha', files: alpha.files.map((file) => file.path) }];
const replacePreview = await call('POST', 'preview', { selection: replaceSelection, mode: 'replace' });
console.log('REPLACE PREVIEW', JSON.stringify({ counts: replacePreview.body.plan.counts, preserved: replacePreview.body.plan.preservedDirs, remote: replacePreview.body.plan.remote, deleted: replacePreview.body.plan.deleted }));
assert(replacePreview.body.plan.counts.deleted >= 3, `replace deletes beta files, got ${replacePreview.body.plan.counts.deleted}`);
assert(replacePreview.body.plan.preservedDirs.length === 0, 'replace has no preserved dirs');
const replaceUpload = await call('POST', 'upload', { selection: replaceSelection, mode: 'replace' });
assert(replaceUpload.status === 200, 'replace upload');
const afterReplace = await call('GET', 'remote');
assert(!Object.keys(afterReplace.body.remote.files).some((pathName) => pathName.startsWith('plugins/beta/')), 'beta removed');

const noChange = await call('POST', 'upload', { selection: replaceSelection, mode: 'replace' });
assert(noChange.status === 200, 'no-change upload status');
assert(noChange.body.noChanges === true, 'no-change detected');

assert(state.meta.length >= 1, 'repo description patched');
assert(state.topics.includes('dsh-plugin'), 'topics set');

console.log('HOST TEST PASSED');
await rm(root, { recursive: true, force: true });
