/**
 * Olympiad — Host half.
 *
 * Serves the problem corpus and the bundled KaTeX assets, so the reader works
 * fully offline and costs no tokens.
 */
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = '@local/olympiad';
export const inject = ['webServer'];

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const ASSETS = join(ROOT, 'assets');
const CORPUS_GZ = join(ROOT, 'corpus.json.gz');
const CORPUS = join(ROOT, 'corpus.json');
const PREFIX = '/api/olympiad';

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.json': 'application/json; charset=utf-8',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

export function apply(ctx) {
  const webServer = ctx.get('webServer');
  if (!webServer) return;

  const handler = async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        send(res, 405, { 'content-type': 'text/plain; charset=utf-8' }, 'method not allowed');
        return;
      }
      const url = new URL(req.url || '/', 'http://localhost');
      const path = url.pathname;

      if (path === PREFIX + '/health') {
        send(res, 200, { 'content-type': 'application/json; charset=utf-8' }, JSON.stringify({ ok: true }));
        return;
      }

      if (path === PREFIX + '/corpus') {
        let body;
        try {
          body = await readFile(CORPUS_GZ);
          send(res, 200, {
            'content-type': 'application/json; charset=utf-8',
            'content-encoding': 'gzip',
            'content-length': String(body.length),
            'cache-control': 'no-cache',
            'vary': 'Accept-Encoding',
          }, body);
          return;
        } catch {
          /* Fall back to a plain corpus if a local build kept one. */
          body = await readFile(CORPUS);
        }
        send(res, 200, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(body.length),
          'cache-control': 'no-cache',
        }, body);
        return;
      }

      if (path.startsWith(PREFIX + '/assets/')) {
        const relative = decodeURIComponent(path.slice((PREFIX + '/assets/').length));
        const target = normalize(join(ASSETS, relative));
        if (target !== ASSETS && !target.startsWith(ASSETS + sep)) {
          send(res, 403, { 'content-type': 'text/plain; charset=utf-8' }, 'forbidden');
          return;
        }
        const info = await stat(target);
        if (!info.isFile()) {
          send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'not found');
          return;
        }
        const body = await readFile(target);
        send(res, 200, {
          'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
          'content-length': String(body.length),
          'cache-control': 'public, max-age=31536000, immutable',
        }, body);
        return;
      }

      send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'not found');
    } catch (error) {
      ctx.logger?.warn?.('olympiad: route failed', error);
      send(res, 500, { 'content-type': 'text/plain; charset=utf-8' }, 'internal error');
    }
  };

  ctx.effect(() => webServer.register({ kind: 'prefix', path: PREFIX, handler }), 'olympiad: api');
}

export default { name, inject, apply };
