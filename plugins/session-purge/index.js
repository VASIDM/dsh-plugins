/**
 * Session Purge — Host half.
 *
 * There is deliberately no session-delete API in DSH: the JSONL persistence
 * seam documents that logs accumulate until removed externally. This plugin
 * provides that external removal for one conversation and everything the
 * harness itself wrote for it:
 *
 *   - the session log directory (all format generations, both encodings)
 *   - subagent descendant sessions (origin === 'subagent', recursively)
 *   - the durable projection-cache row (`storages/session_projcache`)
 *   - workspace accounting, archived and pinned entries (`storages/workspace.json`)
 *   - attachment objects only when no remaining session references them
 *   - cached DeepSeek file records for those attachments
 *
 * The destructive part is intentionally best-effort per file so one locked
 * artifact cannot leave the rest of the conversation readable. Anything that
 * cannot be removed immediately is renamed out of the session namespace and
 * recorded in a purge queue that is retried on the next plugin load.
 *
 * Scope boundary: files the *agent* wrote inside the workspace are not touched.
 * Deleting a conversation must never silently delete the user's project files.
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const ROUTE_INFO = '/api/session-purge/info';
const ROUTE_PURGE = '/api/session-purge/purge';
const ROUTE_SWEEP = '/api/session-purge/sweep';
const PURGE_SUFFIX = '.purged-';
const MAX_BODY_BYTES = 8192;
const MAX_ATTACHMENT_SCAN_BYTES = 256 * 1024 * 1024;

export const name = 'session-purge';
export const inject = ['webServer'];

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const inflight = new Set();
  let pending = null;
  let pendingDirty = false;
  const suppressed = new Set();
  let cachePatched = false;

  const sessions = () => ctx.get('sessions');
  const persistence = () => ctx.get('sessionPersistence');
  const workspaces = () => ctx.get('workspaceRegistry');
  const projectionCache = () => ctx.get('sessionProjectionCache');

  /**
   * The projection cache writes a checkpoint again on `session/disposed`. For
   * a conversation we are erasing, that would resurrect its title and stats
   * after the delete. Wrap the service's single durable write path so erased
   * ids can never be checkpointed again for this Host lifetime.
   */
  function suppressProjectionWrites(ids) {
    for (const id of ids) suppressed.add(id);
    if (cachePatched) return;
    const cache = projectionCache();
    if (!cache || typeof cache.put !== 'function') return;
    const original = cache.put;
    cache.put = function put(id, identity, rows) {
      if (suppressed.has(id)) return Promise.resolve();
      return original.call(this, id, identity, rows);
    };
    cachePatched = true;
  }

  function dshHome() {
    const backend = persistence();
    if (backend?.root) return dirname(backend.root);
    return process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh');
  }

  function pendingPath() {
    return join(dshHome(), 'storages', 'session_purge', 'pending.json');
  }

  async function loadPending() {
    if (pending !== null) return pending;
    pending = new Set();
    pendingDirty = false;
    try {
      const parsed = JSON.parse(await fs.readFile(pendingPath(), 'utf8'));
      if (Array.isArray(parsed?.sessionIds)) {
        for (const id of parsed.sessionIds) if (isSessionId(id)) pending.add(id);
      }
    } catch {
      /* absent or unreadable queue: start empty */
    }
    return pending;
  }

  async function savePending() {
    if (!pendingDirty || pending === null) return;
    const path = pendingPath();
    const document = JSON.stringify({ version: 1, sessionIds: [...pending] }, null, 2);
    await fs.mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${randomUUID()}.tmp`;
    await fs.writeFile(temp, document, 'utf8');
    await fs.rename(temp, path);
    pendingDirty = false;
  }

  async function markPending(ids) {
    const set = await loadPending();
    for (const id of ids) {
      if (!set.has(id)) {
        set.add(id);
        pendingDirty = true;
      }
    }
    await savePending();
  }

  async function clearPending(ids) {
    const set = await loadPending();
    for (const id of ids) {
      if (set.delete(id)) pendingDirty = true;
    }
    await savePending();
  }

  // ---------------------------------------------------------------------------
  // HTTP surface
  // ---------------------------------------------------------------------------

  function send(res, status, payload) {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    res.end(JSON.stringify(payload));
  }

  function isLoopback(req) {
    const remote = req.socket?.remoteAddress;
    if (!remote) return true;
    const normalized = String(remote).replace(/^::ffff:/, '');
    return normalized === '::1' || normalized === '127.0.0.1' || /^127\./.test(normalized);
  }

  function isSameOrigin(req) {
    const origin = req.headers?.origin;
    if (!origin) return true;
    try {
      const parsed = new URL(origin);
      if (parsed.protocol === 'file:' || parsed.protocol === 'app:' || parsed.protocol === 'dsh:') return true;
      const host = req.headers?.host;
      if (host && parsed.host === host) return true;
      return parsed.hostname === '127.0.0.1' || parsed.hostname === '::1' || parsed.hostname === 'localhost';
    } catch {
      return false;
    }
  }

  function allowed(req) {
    return isLoopback(req) && isSameOrigin(req);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(Object.assign(new Error('request body too large'), { code: 'too-large' }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch (error) {
          reject(Object.assign(new Error('invalid JSON body'), { code: 'bad-json', cause: error }));
        }
      });
      req.on('error', reject);
    });
  }

  function isSessionId(value) {
    return typeof value === 'string' && /^session-[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(value);
  }

  async function handleInfo(req, res) {
    if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'method-not-allowed' });
    if (!allowed(req)) return send(res, 403, { ok: false, error: 'forbidden' });
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const sessionId = url.searchParams.get('sessionId') || '';
      if (!isSessionId(sessionId)) return send(res, 400, { ok: false, error: 'invalid-session-id' });
      const info = await collectInfo(sessionId);
      if (info === undefined) return send(res, 404, { ok: false, error: 'session-not-found' });
      return send(res, 200, { ok: true, info });
    } catch (error) {
      ctx.logger?.warn?.(`[session-purge] info failed: ${String(error)}`);
      return send(res, 500, { ok: false, error: 'info-failed', message: errorMessage(error) });
    }
  }

  async function handlePurge(req, res) {
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method-not-allowed' });
    if (!allowed(req)) return send(res, 403, { ok: false, error: 'forbidden' });
    if (req.headers['x-dsh-session-purge'] !== '1') return send(res, 403, { ok: false, error: 'missing-action-header' });
    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return send(res, 415, { ok: false, error: 'json-required' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      const code = error?.code === 'too-large' ? 413 : 400;
      return send(res, code, { ok: false, error: error?.code || 'bad-request' });
    }
    if (!isSessionId(body?.sessionId)) return send(res, 400, { ok: false, error: 'invalid-session-id' });
    if (body?.confirm !== true) return send(res, 400, { ok: false, error: 'confirmation-required' });
    if (inflight.has(body.sessionId)) return send(res, 409, { ok: false, error: 'purge-in-progress' });

    inflight.add(body.sessionId);
    try {
      const outcome = await purgeOne(body.sessionId);
      return send(res, 200, outcome);
    } catch (error) {
      ctx.logger?.warn?.(`[session-purge] purge failed: ${String(error)}`);
      const notFound = error?.code === 'session-not-found';
      return send(res, notFound ? 404 : 500, {
        ok: false,
        error: notFound ? 'session-not-found' : 'purge-failed',
        message: errorMessage(error),
      });
    } finally {
      inflight.delete(body.sessionId);
    }
  }

  async function handleSweep(req, res) {
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method-not-allowed' });
    if (!allowed(req)) return send(res, 403, { ok: false, error: 'forbidden' });
    if (req.headers['x-dsh-session-purge'] !== '1') return send(res, 403, { ok: false, error: 'missing-action-header' });
    try {
      const swept = await sweep();
      return send(res, 200, { ok: true, swept });
    } catch (error) {
      return send(res, 500, { ok: false, error: 'sweep-failed', message: errorMessage(error) });
    }
  }

  // ---------------------------------------------------------------------------
  // Conversation graph
  // ---------------------------------------------------------------------------

  async function snapshots() {
    const backend = persistence();
    if (!backend || typeof backend.list !== 'function') throw new Error('session persistence is unavailable');
    return backend.list();
  }

  async function collectInfo(sessionId) {
    const backend = persistence();
    if (!backend) return undefined;
    const list = await snapshots();
    const live = sessions()?.get(sessionId);
    const target = list.find((snapshot) => snapshot.header?.id === sessionId);
    const targetHeader = target?.header ?? live?.header;
    if (targetHeader === undefined) return undefined;

    const ids = descendantIds(list, [sessionId]);
    const liveCount = ids.filter((id) => sessions()?.get(id) !== undefined).length;
    let bytes = 0;
    let files = 0;
    const directories = [];
    for (const id of ids) {
      const directory = await resolveLogDir(id);
      if (directory === undefined) continue;
      directories.push(directory);
      const size = await treeSize(directory);
      bytes += size.bytes;
      files += size.files;
    }

    const registry = workspaces();
    const workspace = registry?.list?.().find((entity) => entity.sessionIds.includes(sessionId));
    const archived = registry?.archivedSessionIds?.includes?.(sessionId) === true;
    const pinned = registry?.pinnedSessionIds?.includes?.(sessionId) === true;

    return {
      sessionId,
      title: targetHeader.title ?? null,
      cwd: targetHeader.cwd ?? null,
      createdAt: targetHeader.createdAt ?? null,
      live: live !== undefined || liveCount > 0,
      liveSessions: liveCount,
      descendants: ids.length - 1,
      sessionIds: ids,
      bytes,
      files,
      directories,
      workspace: workspace?.title ?? null,
      archived,
      pinned,
      origin: targetHeader.origin ?? 'user',
      willDelete: {
        logs: true,
        projectionCache: true,
        workspaceAccounting: true,
        attachments: true,
        fileCache: true,
      },
    };
  }

  function descendantIds(list, roots) {
    const children = new Map();
    for (const snapshot of list) {
      const header = snapshot.header;
      if (!header || header.origin !== 'subagent' || typeof header.parentSession !== 'string') continue;
      const bucket = children.get(header.parentSession) ?? [];
      bucket.push(header.id);
      children.set(header.parentSession, bucket);
    }
    const out = [];
    const seen = new Set();
    const queue = [...roots];
    while (queue.length > 0) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      for (const child of children.get(id) ?? []) queue.push(child);
    }
    return out;
  }

  async function resolveLog(id) {
    const backend = persistence();
    if (!backend || typeof backend.resolveCurrentLog !== 'function') return undefined;
    try {
      return await backend.resolveCurrentLog(id);
    } catch {
      return undefined;
    }
  }

  /**
   * Resolve the session-owned directory for any generation, including the
   * historical v0–v3 layouts that `resolveCurrentLog` deliberately reports as
   * undefined. A directory scan is safe here: ids are validated and their
   * encoded segment is identical for the ordinary `session-<uuid>` shape.
   */
  async function resolveLogDir(id) {
    const log = await resolveLog(id);
    if (log !== undefined) return dirname(log);
    const backend = persistence();
    if (!backend?.root) return undefined;
    try {
      const projects = await fs.readdir(backend.root, { withFileTypes: true });
      for (const project of projects) {
        if (!project.isDirectory()) continue;
        const candidate = join(backend.root, project.name, id);
        try {
          if ((await fs.stat(candidate)).isDirectory()) return candidate;
        } catch {
          /* not in this project */
        }
      }
    } catch {
      /* root is unreadable */
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Purge
  // ---------------------------------------------------------------------------

  async function purgeOne(sessionId) {
    const backend = persistence();
    if (!backend) throw new Error('session persistence is unavailable');
    const info = await collectInfo(sessionId);
    if (info === undefined) {
      const error = new Error('session not found');
      error.code = 'session-not-found';
      throw error;
    }

    const ids = info.sessionIds;
    const registry = workspaces();
    const notes = [];
    const entities = new Map();
    if (registry) {
      for (const id of ids) {
        const entity = registry.list?.().find((candidate) => candidate.sessionIds.includes(id));
        if (entity !== undefined) entities.set(id, entity);
      }
    }
    let stopped = false;

    // 1. Stop any work the conversation still owns. Reusing the archive
    //    admission path gives us turn, subagent, job and schedule stops in one
    //    request; the archive flag itself is removed below.
    if (registry && info.live) {
      try {
        await registry.archiveSession(sessionId, { stopActivity: true });
        stopped = true;
      } catch (error) {
        notes.push(`stop-activity: ${errorMessage(error)}`);
      }
      await delay(400);
    }

    try {
      // 2. Read the attachment references before the logs are gone.
      const attachments = await collectAttachmentIds(ids).catch((error) => {
        notes.push(`read-attachments: ${errorMessage(error)}`);
        return new Set();
      });

      // 3. Move every log directory out of the session namespace, then erase
      //    the bytes. A failed rename means a writer still holds a file; the
      //    conversation stays intact and the request reports busy.
      const removed = [];
      const pendingIds = [];
      let busyTarget = null;
      for (const id of ids) {
        const directory = await resolveLogDir(id);
        if (directory === undefined) {
          removed.push({ sessionId: id, status: 'no-artifact' });
          continue;
        }
        const outcome = await purgeDirectory(directory);
        if (outcome.ok) {
          removed.push({ sessionId: id, status: 'deleted', bytes: outcome.bytes, files: outcome.files });
        } else if (outcome.busy) {
          if (id === sessionId) {
            busyTarget = outcome.error;
            break;
          }
          pendingIds.push(id);
          removed.push({ sessionId: id, status: 'deferred', error: outcome.error });
        } else if (outcome.pending) {
          pendingIds.push(id);
          removed.push({ sessionId: id, status: 'deferred', error: outcome.error });
        } else {
          notes.push(`delete ${id}: ${outcome.error}`);
          removed.push({ sessionId: id, status: 'failed', error: outcome.error });
        }
      }

      if (busyTarget !== null) {
        if (pendingIds.length > 0) await markPending(pendingIds);
        return {
          ok: false,
          error: 'session-busy',
          message: '会话仍在写入，日志文件被占用；请等当前回答结束后重试。',
          pending: pendingIds,
          notes,
        };
      }

      // 4. Drop the workspace projection entries now that the logs are out of
      //    the namespace. The entities were captured while their headers still
      //    validated candidate membership.
      if (registry) {
        for (const id of ids) {
          await ignore(registry.unarchiveSession?.(id));
          await ignore(registry.unpinSession?.(id));
          const entity = entities.get(id);
          if (entity !== undefined) await ignore(entity.detachSession?.(id));
        }
      }

      // 5. Drop the durable projection rows. Suppress their write path first,
      //    because disposing a live session would otherwise checkpoint it back.
      suppressProjectionWrites(ids);
      for (const id of ids) {
        await dropProjectionRow(id).catch((error) => notes.push(`projection ${id}: ${errorMessage(error)}`));
      }

      // 6. Erase attachments that only this conversation tree referenced.
      let attachmentsRemoved = 0;
      if (attachments.size > 0) {
        try {
          attachmentsRemoved = await purgeAttachments(attachments, ids);
        } catch (error) {
          notes.push(`attachments: ${errorMessage(error)}`);
        }
      }

      // 7. A writer that was mid-flight can keep a file open after the rename;
      //    remember those ids and retry on load.
      if (pendingIds.length > 0) await markPending(pendingIds);
      else await clearPending(ids);

      return {
        ok: true,
        sessionIds: ids,
        removed,
        attachmentsRemoved,
        pending: pendingIds,
        stopped,
        notes,
        reload: true,
      };
    } finally {
      if (stopped) await ignore(registry.unarchiveSession?.(sessionId));
    }
  }

  /**
   * Rename a session directory out of the namespace, then shred and unlink
   * every regular file inside it. The rename is the safety boundary: if it
   * fails, nothing has been destroyed and the caller can report a clean
   * "busy" result.
   */
  async function purgeDirectory(directory) {
    const parent = dirname(directory);
    const name = basename(directory);
    const tombstone = join(parent, `${name}${PURGE_SUFFIX}${Date.now()}-${randomUUID().slice(0, 8)}`);
    try {
      await fs.rename(directory, tombstone);
    } catch (error) {
      const code = error?.code;
      if (code === 'ENOENT') return { ok: true, bytes: 0, files: 0, missing: true };
      if (code === 'EPERM' || code === 'EACCES' || code === 'EBUSY') {
        return { ok: false, busy: true, error: `${code}: session files are still open` };
      }
      return { ok: false, error: errorMessage(error) };
    }
    const result = await removeTree(tombstone);
    return { ok: result.pending === false, busy: false, pending: result.pending, error: result.error, bytes: result.bytes, files: result.files };
  }

  async function treeSize(path) {
    let bytes = 0;
    let files = 0;
    let entries;
    try {
      entries = await fs.readdir(path, { withFileTypes: true });
    } catch {
      return { bytes, files };
    }
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const nested = await treeSize(child);
        bytes += nested.bytes;
        files += nested.files;
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(child);
          bytes += Number(stat.size) || 0;
          files += 1;
        } catch {
          /* vanished while measuring */
        }
      }
    }
    return { bytes, files };
  }

  async function removeTree(path) {
    let entries;
    try {
      entries = await fs.readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return { pending: false, bytes: 0, files: 0 };
      return { pending: true, bytes: 0, files: 0, error: errorMessage(error) };
    }
    let bytes = 0;
    let files = 0;
    let pending = false;
    let error;
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) {
        await ignore(fs.unlink(child));
        continue;
      }
      if (entry.isDirectory()) {
        const nested = await removeTree(child);
        bytes += nested.bytes;
        files += nested.files;
        pending ||= nested.pending;
        if (nested.error !== undefined) error ??= nested.error;
        continue;
      }
      const shredded = await shredFile(child);
      bytes += shredded.bytes;
      if (shredded.ok) files += 1;
      else {
        pending = true;
        error ??= shredded.error;
      }
    }
    if (!pending) {
      try {
        await fs.rmdir(path);
      } catch (rmError) {
        if (rmError?.code !== 'ENOENT') {
          pending = true;
          error ??= errorMessage(rmError);
        }
      }
    }
    return { pending, bytes, files, error };
  }

  /** Overwrite a regular file with zeros, fsync, then unlink it. */
  async function shredFile(path) {
    let stat;
    try {
      stat = await fs.stat(path);
    } catch (error) {
      if (error?.code === 'ENOENT') return { ok: true, bytes: 0 };
      return { ok: false, bytes: 0, error: errorMessage(error) };
    }
    if (!stat.isFile()) return { ok: true, bytes: 0 };
    let handle;
    try {
      handle = await fs.open(path, 'r+');
      const chunk = Buffer.alloc(Math.min(1024 * 1024, Math.max(1, stat.size)));
      let offset = 0;
      while (offset < stat.size) {
        const length = Math.min(chunk.length, stat.size - offset);
        await handle.write(chunk, 0, length, offset);
        offset += length;
      }
      await handle.sync();
      await handle.close();
      handle = undefined;
      await fs.unlink(path);
      return { ok: true, bytes: stat.size };
    } catch (error) {
      await ignore(handle?.close?.());
      // A locked file can still be marked delete-on-close; try the unlink
      // anyway after the overwrite attempt.
      try {
        await fs.unlink(path);
        return { ok: true, bytes: stat.size };
      } catch (unlinkError) {
        return { ok: false, bytes: 0, error: errorMessage(unlinkError) };
      }
    }
  }

  async function dropProjectionRow(id) {
    const cache = projectionCache();
    if (cache?.table?.delete) {
      await cache.table.delete(id);
      return;
    }
    const file = join(dshHome(), 'storages', 'session_projcache', 'sessions', `${id}.json`);
    await ignore(fs.rm(file, { force: true }));
  }

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  async function collectAttachmentIds(ids) {
    const out = new Set();
    const backend = persistence();
    if (!backend) return out;
    for (const id of ids) {
      let events;
      try {
        const handle = await backend.open(id, 'read');
        try {
          const read = await handle.read();
          events = read?.events ?? [];
        } finally {
          await ignore(handle?.close?.());
        }
      } catch {
        continue;
      }
      for (const event of events) {
        collectAttachmentRefs(event, out);
      }
    }
    return out;
  }

  async function purgeAttachments(hashes, purgedIds) {
    const stillUsed = await referencedHashes(hashes, purgedIds);
    const candidates = [...hashes].filter((hash) => !stillUsed.has(hash));
    if (candidates.length === 0) return 0;
    const home = dshHome();
    let removed = 0;
    for (const hash of candidates) {
      const prefix = hash.slice(0, 2);
      const paths = [
        join(home, 'attachments', 'v1', 'objects', prefix, hash),
        join(home, 'attachments', 'v1', 'file-objects', prefix, hash),
      ];
      for (const path of paths) {
        const result = await shredFile(path);
        if (result.ok && result.bytes > 0) removed += 1;
      }
      const fileDir = join(home, 'attachments', 'v1', 'files', prefix, hash);
      const tree = await removeTree(fileDir);
      removed += tree.files;
    }
    await purgeFileCacheRecords(candidates);
    return removed;
  }

  async function referencedHashes(hashes, purgedIds) {
    const used = new Set();
    if (hashes.size === 0) return used;
    const backend = persistence();
    if (!backend) throw new Error('session persistence is unavailable');
    const list = await snapshots();
    let budget = MAX_ATTACHMENT_SCAN_BYTES;
    const purged = new Set(purgedIds);
    for (const snapshot of list) {
      const id = snapshot.header?.id;
      if (typeof id !== 'string' || purged.has(id)) continue;
      try {
        const handle = await backend.open(id, 'read');
        let events;
        try {
          const read = await handle.read();
          events = read?.events ?? [];
        } finally {
          await ignore(handle?.close?.());
        }
        for (const event of events) {
          const text = JSON.stringify(event);
          if (text === undefined) continue;
          budget -= text.length;
          for (const hash of hashes) {
            if (!used.has(hash) && text.includes(`sha256:${hash}`)) used.add(hash);
          }
          if (used.size === hashes.size) return used;
          if (budget <= 0) {
            // Conservative: keep every remaining attachment rather than risk
            // deleting one another conversation still needs.
            for (const hash of hashes) used.add(hash);
            return used;
          }
        }
      } catch {
        for (const hash of hashes) used.add(hash);
        return used;
      }
    }
    return used;
  }

  async function purgeFileCacheRecords(hashes) {
    if (hashes.length === 0) return;
    const home = dshHome();
    const path = join(home, 'llm-deepseek', 'files-v3.json');
    let document;
    try {
      document = JSON.parse(await fs.readFile(path, 'utf8'));
    } catch {
      return;
    }
    if (!Array.isArray(document?.records)) return;
    const set = new Set(hashes);
    const kept = document.records.filter((record) => {
      const attachment = hexOf(record?.attachmentId);
      const variant = hexOf(record?.variantId);
      return !(set.has(attachment) || set.has(variant));
    });
    if (kept.length === document.records.length) return;
    const next = { ...document, records: kept };
    const temp = `${path}.${randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(next), 'utf8');
    await fs.rename(temp, path);
  }

  function hexOf(value) {
    return typeof value === 'string' && value.startsWith('sha256:') ? value.slice('sha256:'.length) : '';
  }

  // ---------------------------------------------------------------------------
  // Deferred cleanup
  // ---------------------------------------------------------------------------

  async function sweep() {
    if (inflight.size > 0) return { directories: 0, caches: 0, skipped: true };
    const backend = persistence();
    if (!backend?.root) return { directories: 0, caches: 0 };
    let directories = 0;
    let caches = 0;
    let projectDirs = [];
    try {
      projectDirs = await fs.readdir(backend.root, { withFileTypes: true });
    } catch {
      return { directories, caches };
    }
    for (const project of projectDirs) {
      if (!project.isDirectory()) continue;
      const projectPath = join(backend.root, project.name);
      let children = [];
      try {
        children = await fs.readdir(projectPath, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const child of children) {
        if (!child.isDirectory()) continue;
        if (!/\.purged-\d+-[0-9a-f]{8}$/.test(child.name)) continue;
        const result = await removeTree(join(projectPath, child.name));
        if (!result.pending) directories += 1;
      }
    }
    const queue = await loadPending();
    for (const id of [...queue]) {
      try {
        const directory = await resolveLogDir(id);
        if (directory !== undefined) {
          const outcome = await purgeDirectory(directory);
          if (!outcome.ok && !outcome.missing) continue;
        }
        await dropProjectionRow(id);
        caches += 1;
        queue.delete(id);
        pendingDirty = true;
      } catch {
        /* keep it queued */
      }
    }

    // A live title/checkpoint write can recreate a session artifact after the
    // purge. Keep erased identities suppressed for this Host lifetime and
    // delete any artifact that reappears.
    for (const id of suppressed) {
      try {
        const directory = await resolveLogDir(id);
        if (directory !== undefined) {
          await purgeDirectory(directory);
          directories += 1;
        }
        await dropProjectionRow(id);
      } catch {
        /* retried by the next sweep */
      }
    }
    await savePending();
    return { directories, caches };
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ROUTE_INFO, handler: handleInfo }),
    'session-purge: info route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ROUTE_PURGE, handler: handlePurge }),
    'session-purge: purge route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ROUTE_SWEEP, handler: handleSweep }),
    'session-purge: sweep route',
  );

  ctx.effect(() => {
    let timer;
    const run = () => {
      sweep()
        .catch((error) => ctx.logger?.warn?.(`[session-purge] deferred sweep failed: ${String(error)}`))
        .finally(() => {
          timer = setTimeout(run, 30_000);
          timer.unref?.();
        });
    };
    timer = setTimeout(run, 2_000);
    timer.unref?.();
    return () => clearTimeout(timer);
  }, 'session-purge: deferred sweep');

  ctx.on('session/disposed', (session) => {
    const id = session?.id;
    if (typeof id !== 'string') return;
    if (suppressed.has(id)) {
      const timer = setTimeout(() => {
        (async () => {
          const directory = await resolveLogDir(id);
          if (directory !== undefined) await purgeDirectory(directory);
          await dropProjectionRow(id);
        })().catch(() => {});
      }, 1_500);
      timer.unref?.();
      return;
    }
    loadPending()
      .then((set) => {
        if (!set.has(id)) return;
        const timer = setTimeout(() => {
          dropProjectionRow(id)
            .then(() => clearPending([id]))
            .catch(() => {});
        }, 1_500);
        timer.unref?.();
      })
      .catch(() => {});
  });
}

function collectAttachmentRefs(value, out) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectAttachmentRefs(item, out);
    return;
  }
  for (const key of ['attachmentId', 'variantId']) {
    const id = value[key];
    if (typeof id === 'string' && id.startsWith('sha256:')) {
      const hex = id.slice('sha256:'.length);
      if (/^[a-f0-9]{64}$/.test(hex)) out.add(hex);
    }
  }
  for (const child of Object.values(value)) collectAttachmentRefs(child, out);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ignore(promise) {
  try {
    await promise;
  } catch {
    /* best effort */
  }
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
