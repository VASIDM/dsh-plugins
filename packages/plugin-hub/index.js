/**
 * Plugin Hub — the Host half.
 *
 * Owns everything the right-sidebar panel cannot do from the page:
 *   GET  /api/plugin-hub/state    installed packages, profile wiring, repo facts
 *   POST /api/plugin-hub/enable   enable or disable one bundle by its package name
 *   POST /api/plugin-hub/token    store a GitHub personal access token
 *   POST /api/plugin-hub/backup   push every package to the configured GitHub repo
 *   POST /api/plugin-hub/restore  pull the repo back onto this machine and re-wire the profile
 *   POST /api/plugin-hub/chat     one turn against the dedicated "hub" agent Session
 *
 * No git binary and no extra npm dependency is required: backups use the GitHub
 * Git Data API over fetch, and the profile is re-wired with the bundled pnpm.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import zlib from 'node:zlib';

const name = 'plugin-hub';
const inject = ['webServer', 'credentials', 'pluginManager', 'sessionController'];

const API = '/api/plugin-hub';
const SKIP_DIRS = new Set(['_backup', '_recovery', 'node_modules', '.git']);
const MAX_FILE = 2 * 1024 * 1024;
const MAX_BODY = 1024 * 1024;
const RAW = 'https://raw.githubusercontent.com';
const GH = 'https://api.github.com';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apply(ctx) {
  const log = (message) => ctx.logger?.info?.(`plugin-hub: ${message}`);
  const warn = (message) => ctx.logger?.warn?.(`plugin-hub: ${message}`);

  const home = process.env.DSH_HOME || 'C:\\Users\\' + (process.env.USERNAME || 'user') + '\\.dsh';
  const profileDir = process.env.DSH_PROFILE_DIR || path.join(home, 'profiles', 'desktop');
  const profileFile = path.join(profileDir, 'package.json');
  const configFile = path.join(home, 'plugin-hub.json');
  const sessionFile = path.join(home, 'plugin-hub-session.json');

  const DEFAULTS = {
    root: 'F:/DSH-Plugins',
    owner: 'VASIDM',
    repo: 'dsh-plugins',
    branch: 'main',
  };

  async function readJson(file, fallback) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  async function writeJson(file, value) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
  }

  async function config() {
    const saved = await readJson(configFile, {});
    return { ...DEFAULTS, ...saved };
  }

  // ---------------------------------------------------------------- credentials
  async function tokenInfo() {
    for (const key of ['plugin-hub/token', 'github-vault/token']) {
      try {
        const record = await ctx.credentials.readRecord(key);
        if (record && record.kind === 'api-key' && record.key) return { token: record.key, key };
      } catch (error) {
        warn(`credential read failed for ${key}: ${String(error)}`);
      }
    }
    return { token: null, key: null };
  }

  async function saveToken(token) {
    await ctx.credentials.modifyRecord('plugin-hub/token', async () => ({ kind: 'api-key', key: token }));
  }

  // ---------------------------------------------------------------- filesystem
  function normalizeRoot(root) {
    return String(root || DEFAULTS.root).replace(/\\/g, '/').replace(/\/+$/, '');
  }

  async function listPackages(root) {
    const dirs = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    const out = [];
    for (const entry of dirs) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const dir = path.join(root, entry.name);
      const manifest = await readJson(path.join(dir, 'package.json'), null);
      if (!manifest || !manifest.name) continue;
      let bytes = 0;
      try {
        const entries = [];
        await walkRelative(dir, '', entries);
        bytes = entries.reduce((sum, file) => sum + file.size, 0);
      } catch {
        bytes = 0;
      }
      const locale = await readJson(path.join(dir, 'locale', 'zh.json'), null);
      out.push({
        dir: entry.name,
        name: manifest.name,
        version: manifest.version || '',
        title: locale?.meta?.title || manifest.description || entry.name,
        description: locale?.meta?.description || manifest.description || '',
        hasBundle: Boolean(manifest.dsh?.bundle?.patch),
        hasClient: Boolean(manifest.dsh?.client),
        bytes,
      });
    }
    out.sort((a, b) => a.dir.localeCompare(b.dir));
    return out;
  }

  // ---------------------------------------------------------------- profile
  async function readProfile() {
    return readJson(profileFile, { name: 'dsh-profile-desktop', private: true, dsh: { profile: { bundles: [] } }, dependencies: {} });
  }

  async function statePayload() {
    const conf = await config();
    const root = normalizeRoot(conf.root);
    const profile = await readProfile();
    const bundles = profile.dsh?.profile?.bundles || [];
    const deps = profile.dependencies || {};
    const packages = await listPackages(root);
    const { token, key } = await tokenInfo();
    return {
      ok: true,
      root,
      profile: profileDir,
      repo: { owner: conf.owner, repo: conf.repo, branch: conf.branch, private: Boolean(conf.private) },
      hasToken: Boolean(token),
      tokenSource: key,
      bundles,
      packages: packages.map((item) => ({
        ...item,
        inProfile: Boolean(deps[item.name]),
        enabled: bundles.includes(item.name),
      })),
    };
  }

  async function setEnabled(packageName, enabled) {
    if (typeof packageName !== 'string' || !packageName) throw new AppError(400, 'bad-name', '缺少插件包名。');
    const manager = ctx.pluginManager;
    if (manager && typeof manager.setBundleEnabled === 'function') {
      const result = await manager.setBundleEnabled(packageName, Boolean(enabled));
      return { ok: true, live: true, result };
    }
    // The profile manager is unavailable: write the bundle list ourselves. The
    // loader only re-composes on start, so this path needs a restart.
    const profile = await readProfile();
    profile.dsh = profile.dsh || {};
    profile.dsh.profile = profile.dsh.profile || {};
    const bundles = new Set(profile.dsh.profile.bundles || []);
    if (enabled) bundles.add(packageName);
    else bundles.delete(packageName);
    profile.dsh.profile.bundles = [...bundles];
    await writeJson(profileFile, profile);
    return { ok: true, live: false, needRestart: true };
  }

  // ---------------------------------------------------------------- GitHub
  async function github(token) {
    const send = async (method, url, body) => {
      const response = await fetch(url.startsWith('http') ? url : GH + url, {
        method,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'user-agent': 'dsh-plugin-hub',
          'x-github-api-version': '2022-11-28',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!response.ok) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const message = json?.message || text.slice(0, 200) || response.statusText;
        throw new AppError(response.status, 'github', `GitHub ${method} ${url} 失败 (${response.status})${remaining === '0' ? '，已触发限流' : ''}：${message}`);
      }
      return json;
    };
    return { send };
  }

  async function ensureRepo(gh, repo) {
    const me = await gh.send('GET', '/user');
    const owner = repo.owner || me.login;
    let info = null;
    try {
      info = await gh.send('GET', `/repos/${owner}/${repo.repo}`);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    if (!info) {
      const created = await gh.send('POST', '/user/repos', {
        name: repo.repo,
        private: Boolean(repo.private),
        auto_init: false,
        description: 'DeepSeek Harness plugin sources, synced by plugin-hub',
      });
      info = created;
    }
    return { owner, info };
  }

  async function headRef(gh, owner, repo, branch) {
    try {
      const ref = await gh.send('GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      return ref.object.sha;
    } catch (error) {
      if (error.status === 404 || error.status === 409) return null;
      throw error;
    }
  }

  async function collect(root) {
    const packages = await listPackages(root);
    const files = [];
    for (const item of packages) {
      const dir = path.join(root, item.dir);
      const entries = [];
      await walkRelative(dir, '', entries);
      for (const entry of entries) {
        files.push({ rel: `packages/${item.dir}/${entry.rel}`, abs: entry.abs, size: entry.size });
      }
    }
    return { packages, files };
  }

  async function walkRelative(dir, prefix, acc) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walkRelative(full, rel, acc);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(full);
      if (stat.size > MAX_FILE) continue;
      acc.push({ abs: full, rel, size: stat.size });
    }
    return acc;
  }

  async function pushAll(root, repo, token) {
    const gh = await github(token);
    const { owner, info } = await ensureRepo(gh, repo);
    const branch = repo.branch || 'main';
    const head = await headRef(gh, owner, repo.repo, branch);
    const { packages, files } = await collect(root);

    const { createHash } = await import('node:crypto');
    const blobSha = (bytes) =>
      createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, 'utf8'), bytes])).digest('hex');
    const source = await readProfile();
    const fileShas = new Map();
    for (const file of files) fileShas.set(file.rel, blobSha(await fs.readFile(file.abs)));

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      host: name,
      bundles: packages.filter((item) => item.hasBundle).map((item) => item.name),
      profile: {
        bundles: source.dsh?.profile?.bundles || [],
        dependencies: Object.fromEntries(
          Object.entries(source.dependencies || {}).filter(([, spec]) => String(spec).startsWith('link:')),
        ),
      },
      packages: packages.map((item) => ({
        dir: item.dir,
        name: item.name,
        version: item.version,
        title: item.title,
        hasBundle: item.hasBundle,
        files: files
          .filter((file) => file.rel.startsWith(`packages/${item.dir}/`))
          .map((file) => ({
            rel: file.rel,
            path: file.rel.slice(`packages/${item.dir}/`.length),
            size: file.size,
            sha: fileShas.get(file.rel),
          })),
      })),
    };

    const uploads = files.map((file) => ({ rel: file.rel, abs: file.abs }));
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 1), 'utf8');
    const manifestPath = path.join(root, '.plugin-hub-manifest.json');
    await fs.writeFile(manifestPath, manifestBuffer);
    uploads.push({ rel: 'manifest.json', abs: manifestPath });

    const existing = new Map();
    if (head) {
      const commit = await gh.send('GET', `/repos/${owner}/${repo.repo}/git/commits/${head}`);
      const tree = await gh.send('GET', `/repos/${owner}/${repo.repo}/git/trees/${commit.tree.sha}?recursive=1`);
      for (const node of tree.tree || []) if (node.type === 'blob') existing.set(node.path, node.sha);
    }

    const entries = [];
    const blobs = new Map();
    let uploaded = 0;
    let skipped = 0;
    for (const file of uploads) {
      const bytes = await fs.readFile(file.abs);
      const sha = file.rel === 'manifest.json' ? blobSha(bytes) : fileShas.get(file.rel) || blobSha(bytes);
      if (existing.get(file.rel) === sha) {
        skipped += 1;
        entries.push({ path: file.rel, mode: '100644', type: 'blob', sha });
        continue;
      }
      if (blobs.has(sha)) {
        entries.push({ path: file.rel, mode: '100644', type: 'blob', sha });
        continue;
      }
      const blob = await gh.send('POST', `/repos/${owner}/${repo.repo}/git/blobs`, {
        content: bytes.toString('base64'),
        encoding: 'base64',
      });
      blobs.set(sha, blob.sha);
      entries.push({ path: file.rel, mode: '100644', type: 'blob', sha: blob.sha });
      uploaded += 1;
    }

    const tree = await gh.send('POST', `/repos/${owner}/${repo.repo}/git/trees`, {
      ...(head ? { base_tree: (await gh.send('GET', `/repos/${owner}/${repo.repo}/git/commits/${head}`)).tree.sha } : {}),
      tree: entries,
    });
    const commit = await gh.send('POST', `/repos/${owner}/${repo.repo}/git/commits`, {
      message: `plugin-hub backup ${new Date().toISOString()}`,
      tree: tree.sha,
      parents: head ? [head] : [],
    });
    if (head) {
      await gh.send('PATCH', `/repos/${owner}/${repo.repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
    } else {
      await gh.send('POST', `/repos/${owner}/${repo.repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
    }
    await fs.rm(manifestPath, { force: true });
    return {
      ok: true,
      owner,
      repo: repo.repo,
      branch,
      commit: commit.sha,
      files: entries.length,
      uploaded,
      skipped,
      private: Boolean(info.private),
      url: info.html_url,
    };
  }

  async function fetchManifest(repo, token) {
    // raw.githubusercontent.com caches for minutes, which silently returns a
    // stale manifest right after a push. Prefer the API, which never caches.
    if (token) {
      const response = await fetch(`${GH}/repos/${repo.owner}/${repo.repo}/contents/manifest.json?ref=${repo.branch || 'main'}`, {
        headers: {
          accept: 'application/vnd.github.raw',
          authorization: `Bearer ${token}`,
          'user-agent': 'dsh-plugin-hub',
        },
      });
      if (response.ok) return response.json();
    }
    const url = `${RAW}/${repo.owner}/${repo.repo}/${repo.branch || 'main'}/manifest.json?t=${Date.now()}`;
    const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new AppError(502, 'manifest', `读取 manifest.json 失败 (${response.status})。请先在旧机器上执行一次“备份到 GitHub”。`);
    return response.json();
  }

  async function restoreFromRepo(root, repo, token) {
    const manifest = await fetchManifest(repo, token);
    if (!manifest || !Array.isArray(manifest.packages)) throw new AppError(502, 'manifest-shape', 'manifest.json 结构不正确。');

    await fs.mkdir(root, { recursive: true });
    const written = [];
    for (const pkg of manifest.packages) {
      if (!pkg.dir || !Array.isArray(pkg.files)) continue;
      for (const file of pkg.files) {
        const rel = `packages/${pkg.dir}/${file.path}`;
        if (token && file.sha) {
          const response = await fetch(`${GH}/repos/${repo.owner}/${repo.repo}/git/blobs/${file.sha}`, {
            headers: {
              accept: 'application/vnd.github.raw',
              authorization: `Bearer ${token}`,
              'user-agent': 'dsh-plugin-hub',
            },
          });
          if (!response.ok) throw new AppError(502, 'download', `下载 ${rel} 失败 (${response.status})。`);
          const buffer = Buffer.from(await response.arrayBuffer());
          const target = path.join(root, pkg.dir, file.path);
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, buffer);
          written.push(target);
          continue;
        }
        const encoded = rel.split('/').map(encodeURIComponent).join('/');
        const url = `${RAW}/${repo.owner}/${repo.repo}/${repo.branch || 'main'}/${encoded}?t=${encodeURIComponent(manifest.generatedAt || '')}`;
        const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
        if (!response.ok) throw new AppError(502, 'download', `下载 ${rel} 失败 (${response.status})。`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const target = path.join(root, pkg.dir, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buffer);
        written.push(target);
      }
    }

    const profile = await readProfile();
    profile.dsh = profile.dsh || {};
    profile.dsh.profile = profile.dsh.profile || {};
    profile.dsh.profile.bundles = profile.dsh.profile.bundles || [];
    profile.dependencies = profile.dependencies || {};
    const localNames = new Set(manifest.packages.map((pkg) => pkg.name).filter(Boolean));
    const savedDeps = manifest.profile?.dependencies || null;
    for (const pkg of manifest.packages) {
      if (!pkg.name || !pkg.dir) continue;
      profile.dependencies[pkg.name] = savedDeps?.[pkg.name] || `link:${root.replace(/\\/g, '/')}/${pkg.dir}`;
    }
    // Reproduce the source profile's exact working set: a bundle the source kept
    // off stays off here, and DSH built-ins are preserved as they are.
    let bundles;
    if (Array.isArray(manifest.profile?.bundles) && manifest.profile.bundles.length) {
      bundles = manifest.profile.bundles.filter((item) => !String(item).startsWith('@local/') || localNames.has(item));
    } else {
      const kept = profile.dsh.profile.bundles.filter((item) => !String(item).startsWith('@local/'));
      bundles = [...kept, ...manifest.packages.filter((pkg) => pkg.hasBundle && pkg.name).map((pkg) => pkg.name)];
    }
    profile.dsh.profile.bundles = [...new Set(bundles)];
    await writeJson(profileFile, profile);

    const install = await runPnpmInstall();
    return {
      ok: true,
      files: written.length,
      packages: manifest.packages.length,
      bundles: profile.dsh.profile.bundles.filter((item) => String(item).startsWith('@local/')).length,
      install,
      needRestart: true,
    };
  }

  async function runPnpmInstall() {
    const runtime = path.join(home, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies');
    const node = path.join(runtime, 'node', 'bin', 'node.exe');
    const pnpm = path.join(runtime, 'pnpm', 'bin', 'pnpm.mjs');
    if (!existsSync(node) || !existsSync(pnpm)) {
      return { ok: false, message: '未找到随附的 Node/pnpm 运行时，请重启 DSH 让它在启动时自行安装依赖。' };
    }
    return new Promise((resolve) => {
      const child = spawn(node, [pnpm, 'install', '--no-frozen-lockfile', '--reporter=append-only'], {
        cwd: profileDir,
        windowsHide: true,
        env: { ...process.env, CI: '1' },
      });
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.on('error', (error) => resolve({ ok: false, message: String(error) }));
      child.on('close', (code) => {
        resolve({ ok: code === 0, code, message: output.slice(-4000) });
      });
    });
  }

  // ---------------------------------------------------------------- hub session
  async function readSessionId() {
    const saved = await readJson(sessionFile, null);
    return saved?.sessionId || null;
  }

  async function ensureSession(root) {
    const existing = await readSessionId();
    if (existing) return existing;
    const created = await ctx.sessionController.create({ cwd: root });
    await writeJson(sessionFile, { sessionId: created.sessionId, createdAt: new Date().toISOString() });
    return created.sessionId;
  }

  function sessionLogDir(root, sessionId) {
    const cwdKey = `--${root.replace(/[:\\/]+/g, '-').replace(/^-+|-+$/g, '')}--`;
    return path.join(home, 'sessions', cwdKey, `session-${sessionId}`);
  }

  async function findSessionLog(sessionId) {
    const dirName = String(sessionId).startsWith('session-') ? String(sessionId) : `session-${sessionId}`;
    const sessions = path.join(home, 'sessions');
    const dirs = await fs.readdir(sessions, { withFileTypes: true }).catch(() => []);
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const candidate = path.join(sessions, dir.name, dirName, 'session.v4.jsonl.zstd');
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  function decodeZstdFrames(buffer) {
    const parts = [];
    let offset = 0;
    while (offset < buffer.length) {
      const result = zlib.zstdDecompressSync(buffer.subarray(offset), { info: true });
      parts.push(result.buffer);
      offset += result.engine.bytesWritten;
    }
    return Buffer.concat(parts).toString('utf8');
  }

  function textOfAssistant(record) {
    const content = record?.data?.message?.content;
    if (Array.isArray(content)) {
      const text = content
        .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')
        .trim();
      if (text) return text;
    }
    const data = record?.data || {};
    for (const candidate of [data.message?.text, data.text]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return '';
  }

  async function lastAssistantReply(sessionId, sinceSeq) {
    const file = await findSessionLog(sessionId);
    if (!file) return { reply: '', reason: 'no-log' };
    let text = '';
    try {
      text = decodeZstdFrames(await fs.readFile(file));
    } catch (error) {
      return { reply: '', reason: `decode:${String(error)}` };
    }
    let reply = '';
    for (const line of text.split('\n')) {
      if (!line) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record.type !== 'assistant/message') continue;
      if (typeof sinceSeq === 'number' && typeof record.seq === 'number' && record.seq < sinceSeq) continue;
      const value = textOfAssistant(record);
      if (value) reply = value;
    }
    return { reply, reason: 'ok' };
  }

  async function readTail(sessionId) {
    const file = await findSessionLog(sessionId);
    if (!file) return { records: [], maxSeq: 0, reason: 'no-log' };
    let text = '';
    try {
      text = decodeZstdFrames(await fs.readFile(file));
    } catch (error) {
      return { records: [], maxSeq: 0, reason: `decode:${String(error)}` };
    }
    const records = [];
    let maxSeq = 0;
    for (const line of text.split('\n')) {
      if (!line) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      records.push(record);
      if (typeof record.seq === 'number' && record.seq > maxSeq) maxSeq = record.seq;
    }
    return { records, maxSeq, reason: 'ok' };
  }

  async function chat(root, message) {
    if (typeof message !== 'string' || !message.trim()) throw new AppError(400, 'bad-message', '消息为空。');
    const controller = ctx.sessionController;
    if (!controller || typeof controller.create !== 'function' || typeof controller.prompt !== 'function') {
      throw new AppError(503, 'no-session-api', '当前 DSH 版本未提供会话接口，无法在面板内对话；请改用主对话。');
    }
    let sessionId = await ensureSession(root);
    const requestId = randomUUID();
    const deliver = (sid) =>
      ctx.sessionController.prompt(
        {
          requestId,
          sessionId: sid,
          mode: 'queue',
          content: [{ type: 'text', text: message }],
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
        AbortSignal.timeout(30000),
      );
    const before = await readTail(sessionId);
    try {
      await deliver(sessionId);
    } catch (error) {
      // A stored Session may have been purged: start one fresh and retry once.
      warn(`prompt to stored hub session failed (${String(error)}); creating a new one`);
      const created = await ctx.sessionController.create({ cwd: root });
      sessionId = created.sessionId;
      await writeJson(sessionFile, { sessionId, createdAt: new Date().toISOString() });
      await deliver(sessionId);
    }

    // Poll the Session log by sequence so a reply is never confused with an
    // earlier turn: accept only assistant records written after the baseline.
    const deadline = Date.now() + 240000;
    let reply = '';
    let settled = false;
    let last = { reason: before.reason };
    while (Date.now() < deadline) {
      last = await readTail(sessionId);
      const fresh = last.records.filter((record) => typeof record.seq === 'number' && record.seq > before.maxSeq);
      const assistant = fresh.filter((record) => record.type === 'assistant/message').pop();
      if (assistant) {
        const text = textOfAssistant(assistant);
        if (text) reply = text;
      }
      if (reply && fresh.some((record) => record.type === 'turn/end')) {
        settled = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return { ok: true, sessionId, settled, reason: settled ? 'idle' : 'timeout', reply, logReason: last.reason };
  }

  // ---------------------------------------------------------------- HTTP
  const send = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  };

  async function readBody(req) {
    const type = String(req.headers['content-type'] || '');
    if (!type.toLowerCase().startsWith('application/json')) throw new AppError(415, 'content-type', '请求须为 application/json。');
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new AppError(413, 'body-large', '请求体过大。');
      chunks.push(chunk);
    }
    if (!size) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  const handler = async (req, res) => {
    const url = new URL(req.url || API, 'http://localhost');
    const action = url.pathname.slice(API.length).replace(/^\//, '') || 'state';
    try {
      const conf = await config();
      const root = normalizeRoot(conf.root);
      if (req.method === 'GET') {
        if (action === 'state') {
          send(res, 200, await statePayload());
          return;
        }
        throw new AppError(404, 'unknown-action', `未知接口：${action}`);
      }
      if (req.method !== 'POST') throw new AppError(405, 'method', '只支持 GET/POST。');
      const body = await readBody(req);
      if (action === 'enable') {
        const target = (await listPackages(root)).find((item) => item.dir === body.dir || item.name === body.name);
        if (!target) throw new AppError(404, 'not-found', `找不到插件 ${body.dir || body.name}`);
        send(res, 200, await setEnabled(target.name, body.enabled));
        return;
      }
      if (action === 'token') {
        const token = String(body.token || '').trim();
        if (token.length < 20) throw new AppError(400, 'token-shape', 'Token 格式不正确。');
        const gh = await github(token);
        const me = await gh.send('GET', '/user');
        await saveToken(token);
        send(res, 200, { ok: true, login: me.login, scopes: [] });
        return;
      }
      if (action === 'backup') {
        const { token } = await tokenInfo();
        if (!token) throw new AppError(401, 'no-token', '尚未配置 GitHub Token。');
        send(res, 200, await pushAll(root, conf, token));
        return;
      }
      if (action === 'restore') {
        const { token } = await tokenInfo();
        send(res, 200, await restoreFromRepo(root, conf, token));
        return;
      }
      if (action === 'chat') {
        send(res, 200, await chat(root, body.message));
        return;
      }
      throw new AppError(404, 'unknown-action', `未知接口：${action}`);
    } catch (error) {
      if (error instanceof AppError) {
        send(res, error.status, { ok: false, code: error.code, message: error.message, details: error.details ?? null });
        return;
      }
      warn(`api failed: ${String(error?.stack || error)}`);
      send(res, 500, { ok: false, code: 'internal', message: String(error?.message || error) });
    }
  };

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: API, handler }), 'plugin-hub: api route');
  log(`mounted at ${API}`);
}

export default { name, inject, apply };
