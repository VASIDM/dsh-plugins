/**
 * 纸墨 · 用户 — Host half。
 *
 * 存一份本机账户卡：头像（data URL）、名称、手机号。
 * 名称留空时由客户端回退为系统用户名（userInfo().username），
 * 所以第一次打开就有一行"自动写好的用户名"。
 *
 * 文件：$DSH_HOME/cache/paper-ink/profile.json（原子写入）。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, userInfo } from 'node:os';

const API = '/api/paper-ink-profile';
const MAX_TEXT = 60;
const MAX_AVATAR = 900_000;

function storePath() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(home, 'cache', 'paper-ink', 'profile.json');
}

async function readProfile() {
  try {
    return JSON.parse(await readFile(storePath(), 'utf8'));
  } catch {
    return {};
  }
}

function clean(value, limit = MAX_TEXT) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeAvatar(value) {
  return typeof value === 'string' && value.startsWith('data:image/') ? value.slice(0, MAX_AVATAR) : '';
}

function defaultName() {
  try {
    return clean(userInfo().username);
  } catch {
    return '';
  }
}

function snapshot(profile) {
  return {
    ok: true,
    name: clean(profile.name),
    phone: clean(profile.phone),
    avatar: normalizeAvatar(profile.avatar),
    defaultName: defaultName(),
  };
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
        send(res, 200, snapshot(await readProfile()));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 2_000_000) break;
        }
        let input;
        try {
          input = JSON.parse(body || '{}');
        } catch {
          send(res, 400, { ok: false, reason: 'bad-json' });
          return;
        }
        const saved = await readProfile();
        const next = {
          name: 'name' in input ? clean(input.name) : clean(saved.name),
          phone: 'phone' in input ? clean(input.phone) : clean(saved.phone),
          avatar: 'avatar' in input ? normalizeAvatar(input.avatar) : normalizeAvatar(saved.avatar),
          updatedAt: Date.now(),
        };
        const file = storePath();
        await mkdir(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
        await rename(tmp, file);
        send(res, 200, snapshot(next));
        return;
      }
      send(res, 405, { ok: false, reason: 'method-not-allowed' });
    } catch (error) {
      try {
        ctx.logger?.error?.('paper-ink-user: api failed', error);
      } catch {}
      send(res, 500, { ok: false, reason: 'internal' });
    }
  };

  ctx.effect(() => webServer.register({ kind: 'prefix', path: API, handler: handle }), 'paper-ink-user: api');
}
