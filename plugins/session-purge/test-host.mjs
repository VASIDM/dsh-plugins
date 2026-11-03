import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from './index.js';

const root = mkdtempSync(join(tmpdir(), 'session-purge-test-'));
const home = join(root, 'dsh');
const sessionsRoot = join(home, 'sessions');
const project = '--C-Users-Test-Workspace--';
const projectDir = join(sessionsRoot, project);

const headers = new Map();
const events = new Map();
const cacheDeletes = [];

function addSession(id, header, eventList, fileName = 'session.v4.jsonl.zstd') {
  const dir = join(projectDir, id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, fileName);
  writeFileSync(file, JSON.stringify({ type: 'session', ...header }) + '\n');
  headers.set(id, { id, ...header });
  events.set(id, eventList ?? []);
  return dir;
}

const shared = 'ab'.repeat(32);
const unique = 'cd'.repeat(32);
const childOnly = 'ef'.repeat(32);

const targetDir = addSession(
  'session-demo',
  { version: 4, createdAt: 1, cwd: 'C:\\Users\\Test\\Workspace', isSeeded: false },
  [
    { type: 'user/message', data: { content: [{ type: 'image', attachment: { attachmentId: `sha256:${shared}`, variantId: `sha256:${unique}` } }] } },
    { type: 'user/message', data: { content: [{ type: 'image', attachment: { attachmentId: `sha256:${unique}` } }] } },
  ],
);
const childDir = addSession(
  'session-child',
  { version: 4, createdAt: 2, cwd: 'C:\\Users\\Test\\Workspace', isSeeded: false, origin: 'subagent', parentSession: 'session-demo' },
  [{ type: 'user/message', data: { content: [{ type: 'image', attachment: { attachmentId: `sha256:${childOnly}` } }] } }],
);
const keepDir = addSession(
  'session-keep',
  { version: 4, createdAt: 3, cwd: 'C:\\Users\\Test\\Workspace', isSeeded: false },
  [{ type: 'user/message', data: { content: [{ type: 'image', attachment: { attachmentId: `sha256:${shared}` } }] } }],
);

function addAttachment(hash) {
  const dir = join(home, 'attachments', 'v1', 'objects', hash.slice(0, 2));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, hash);
  writeFileSync(file, Buffer.alloc(4096, 7));
  return file;
}
const sharedObject = addAttachment(shared);
const uniqueObject = addAttachment(unique);
const childObject = addAttachment(childOnly);

const filesCache = join(home, 'llm-deepseek', 'files-v3.json');
mkdirSync(join(home, 'llm-deepseek'), { recursive: true });
writeFileSync(
  filesCache,
  JSON.stringify({
    formatVersion: 3,
    records: [
      { attachmentId: `sha256:${shared}`, variantId: `sha256:${shared}`, fileId: 'file-shared' },
      { attachmentId: `sha256:${unique}`, variantId: `sha256:${unique}`, fileId: 'file-unique' },
    ],
  }),
);

const archiveCalls = [];
let archived = new Set(['session-demo']);
let pinned = new Set(['session-demo']);
const detached = [];

const workspaceEntity = {
  title: 'Test Workspace',
  path: 'C:\\Users\\Test\\Workspace',
  get sessionIds() {
    return ['session-demo', 'session-child', 'session-keep'];
  },
  async detachSession(id) {
    detached.push(id);
  },
};

const registry = {
  get archivedSessionIds() {
    return [...archived];
  },
  get pinnedSessionIds() {
    return [...pinned];
  },
  list: () => [workspaceEntity],
  async archiveSession(id) {
    archiveCalls.push(id);
    archived.add(id);
  },
  async unarchiveSession(id) {
    archived.delete(id);
  },
  async unpinSession(id) {
    pinned.delete(id);
  },
};

const persistence = {
  root: sessionsRoot,
  async list() {
    return [...headers.values()].map((header) => ({ header }));
  },
  async resolveCurrentLog(id) {
    const file = join(projectDir, id, 'session.v4.jsonl.zstd');
    return existsSync(file) ? file : undefined;
  },
  async open(id) {
    return {
      async read() {
        return { events: events.get(id) ?? [] };
      },
      async close() {},
    };
  },
};

const liveSessions = new Map([['session-demo', { header: headers.get('session-demo') }]]);

const ctx = {
  logger: { warn() {}, info() {} },
  get(key) {
    if (key === 'sessions') return { get: (id) => liveSessions.get(id), list: () => [...liveSessions.values()] };
    if (key === 'sessionPersistence') return persistence;
    if (key === 'workspaceRegistry') return registry;
    if (key === 'sessionProjectionCache') return { table: { async delete(id) { cacheDeletes.push(id); } } };
    return undefined;
  },
  effect(fn) {
    const dispose = fn();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  on() {
    return () => {};
  },
  webServer: {
    register({ path, handler }) {
      routes.set(path, handler);
      return () => {};
    },
  },
};

const routes = new Map();
apply(ctx);
assert.ok(routes.has('/api/session-purge/info'), 'info route registered');
assert.ok(routes.has('/api/session-purge/purge'), 'purge route registered');

function request(body, path = '/api/session-purge/purge', extra = {}) {
  const req = Readable.from([Buffer.from(body === undefined ? '' : JSON.stringify(body))]);
  req.method = 'POST';
  req.url = path;
  req.headers = {
    'content-type': 'application/json',
    'x-dsh-session-purge': '1',
    origin: 'http://127.0.0.1:60055',
    host: '127.0.0.1:60055',
    ...extra,
  };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function response() {
  const out = { status: 0, body: null };
  return {
    out,
    writeHead(status) {
      out.status = status;
    },
    end(payload) {
      out.body = JSON.parse(payload);
    },
  };
}

async function call(handler, body, extra) {
  const res = response();
  await handler(request(body, '/api/session-purge/purge', extra), res);
  return { status: res.out.status, body: res.out.body };
}

// Info first.
{
  const req = Readable.from([]);
  req.method = 'GET';
  req.url = '/api/session-purge/info?sessionId=session-demo';
  req.headers = { host: '127.0.0.1:60055' };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = response();
  await routes.get('/api/session-purge/info')(req, res);
  assert.equal(res.out.status, 200);
  assert.equal(res.out.body.ok, true);
  assert.equal(res.out.body.info.descendants, 1);
  assert.equal(res.out.body.info.live, true);
  assert.ok(res.out.body.info.bytes > 0);
  console.log('info: ok');
}

// CSRF checks.
{
  const denied = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-demo', confirm: true }, { origin: 'https://evil.example' });
  assert.equal(denied.status, 403);
  const missing = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-demo', confirm: true }, { 'x-dsh-session-purge': '' });
  assert.equal(missing.status, 403);
  const noConfirm = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-demo' });
  assert.equal(noConfirm.status, 400);
  console.log('security gates: ok');
}

// Busy target: an open handle must survive untouched and report session-busy.
{
  const busyDir = addSession('session-busy', { version: 4, createdAt: 9, cwd: 'C:\\Users\\Test\\Workspace', isSeeded: false }, []);
  const busyFile = join(busyDir, 'session.v4.jsonl.zstd');
  const handle = await fs.open(busyFile, 'r+');
  try {
    const result = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-busy', confirm: true });
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.error, 'session-busy');
    assert.ok(existsSync(busyFile), 'busy session file kept');
    assert.equal(await fs.readFile(busyFile, 'utf8'), JSON.stringify({ type: 'session', version: 4, createdAt: 9, cwd: 'C:\\Users\\Test\\Workspace', isSeeded: false }) + '\n');
    console.log('busy path: ok');
  } finally {
    await handle.close();
    await fs.rm(join(projectDir, 'session-busy'), { recursive: true, force: true });
    events.delete('session-busy');
    headers.delete('session-busy');
  }
}

// Real purge.
{
  const result = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-demo', confirm: true });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.ok, true, JSON.stringify(result.body));
  assert.deepEqual(result.body.pending, []);
  assert.equal(archiveCalls[0], 'session-demo', 'archive-admission stop was used');
  assert.ok(!existsSync(targetDir), 'target log directory removed');
  assert.ok(!existsSync(childDir), 'subagent log directory removed');
  assert.ok(existsSync(keepDir), 'unrelated session kept');
  assert.ok(!existsSync(uniqueObject), 'exclusive attachment object removed');
  assert.ok(existsSync(sharedObject), 'shared attachment object kept');
  assert.ok(!existsSync(childObject), 'child-only attachment object removed');
  assert.deepEqual(cacheDeletes.sort(), ['session-child', 'session-demo']);
  assert.deepEqual(detached.sort(), ['session-child', 'session-demo']);
  assert.ok(!archived.has('session-demo'), 'archive flag cleared');
  assert.ok(!pinned.has('session-demo'), 'pin flag cleared');
  const records = JSON.parse(await fs.readFile(filesCache, 'utf8')).records;
  assert.equal(records.length, 1);
  assert.equal(records[0].fileId, 'file-shared');
  console.log('purge: ok');
}

// Unknown session.
{
  const result = await call(routes.get('/api/session-purge/purge'), { sessionId: 'session-missing', confirm: true });
  assert.equal(result.status, 404);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error, 'session-not-found');
  console.log('missing session: ok');
}

await fs.rm(root, { recursive: true, force: true });
console.log('all host tests passed');
