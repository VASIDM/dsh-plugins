/**
 * 插件改名 — Host half.
 *
 * 只改 profile 里以 `link:` 安装的本地插件：把显示名写回该包
 * `locale/zh.json` 与 `locale/en.json` 的 `meta.title`。内置插件在 asar
 * 里只读，因此不出现在列表里。写入用临时文件 + rename，保持原子性。
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const API = '/api/plugin-names';

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function clean(value, limit = 40) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

async function localBundles() {
  const dir = process.env.DSH_PROFILE_DIR;
  if (!dir) return { ok: false, reason: 'no-profile', entries: [] };
  const manifest = await readJson(join(dir, 'package.json'));
  const deps = manifest && manifest.dependencies ? manifest.dependencies : {};
  const selected =
    manifest && manifest.dsh && manifest.dsh.profile && Array.isArray(manifest.dsh.profile.bundles)
      ? manifest.dsh.profile.bundles
      : [];
  const entries = [];
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string' || !spec.startsWith('link:')) continue;
    const pkgDir = resolve(dir, spec.slice('link:'.length));
    const pkg = await readJson(join(pkgDir, 'package.json'));
    if (!pkg) continue;
    const zh = (await readJson(join(pkgDir, 'locale/zh.json'))) || {};
    const en = (await readJson(join(pkgDir, 'locale/en.json'))) || {};
    entries.push({
      name,
      packageName: pkg.name || name,
      zh: (zh.meta && zh.meta.title) || '',
      en: (en.meta && en.meta.title) || '',
      selected: selected.includes(name),
    });
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  return { ok: true, reason: 'ok', entries };
}

async function writeTitle(pkgDir, locale, title) {
  const file = join(pkgDir, 'locale', `${locale}.json`);
  const document = (await readJson(file)) || {};
  const meta = document.meta && typeof document.meta === 'object' ? document.meta : {};
  meta.title = title;
  document.meta = meta;
  const body = `${JSON.stringify(document, null, 2)}\n`;
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, file);
}

export function apply(ctx) {
  const webServer = ctx.get('webServer');
  if (!webServer) return;

  const send = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  };

  const handle = async (req, res) => {
    try {
      if (req.method === 'GET') {
        send(res, 200, await localBundles());
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 32 * 1024) break;
        }
        let input;
        try {
          input = JSON.parse(body || '{}');
        } catch {
          send(res, 400, { ok: false, reason: 'bad-json' });
          return;
        }
        const updates = Array.isArray(input.updates) ? input.updates : [];
        const current = await localBundles();
        const byName = new Map(current.entries.map((entry) => [entry.name, entry]));
        let written = 0;
        for (const update of updates) {
          if (!update || typeof update.name !== 'string') continue;
          const entry = byName.get(update.name);
          if (!entry) continue;
          const zh = clean(update.zh);
          const en = clean(update.en);
          if (!zh && !en) continue;
          const spec = await profileSpec(update.name);
          if (!spec) continue;
          const pkgDir = resolve(process.env.DSH_PROFILE_DIR, spec);
          if (zh) await writeTitle(pkgDir, 'zh', zh);
          if (en) await writeTitle(pkgDir, 'en', en);
          written += 1;
        }
        send(res, 200, { ...(await localBundles()), written });
        return;
      }
      send(res, 405, { ok: false, reason: 'method-not-allowed' });
    } catch (error) {
      try {
        ctx.logger?.error?.('plugin-names: api failed', error);
      } catch {}
      send(res, 500, { ok: false, reason: 'internal' });
    }
  };

  ctx.effect(() => webServer.register({ kind: 'prefix', path: API, handler: handle }), 'plugin-names: api');
}

async function profileSpec(name) {
  const manifest = await readJson(join(process.env.DSH_PROFILE_DIR, 'package.json'));
  const spec = manifest && manifest.dependencies ? manifest.dependencies[name] : '';
  if (typeof spec !== 'string' || !spec.startsWith('link:')) return '';
  return spec.slice('link:'.length);
}
