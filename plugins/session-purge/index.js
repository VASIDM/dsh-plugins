// session-purge: permanent-erase capability (Host half).
//
//   POST /api/session-purge/purge  - HTTP endpoint for the client dialog
//   session_purge                  - model tool for agents
//
// This is a hardened integration: the deletion ORDER and live-session release
// below come from the community-proven cascade-delete engine (MIT, see NOTICE),
// extended with the secure-erase and attachment-reclamation work this package
// was originally built for.
//
//   POST /api/session-purge/purge  - HTTP endpoint for the client dialog
//   session_delete                    - model tool for agents
//
// Deleting a session is out-of-band maintenance in the current Harness: the
// session-persistence seam deliberately ships NO deletion API ("Nothing deletes
// session files"; "pruning stored sessions is out-of-band backend
// maintenance"), so this plugin performs the whole chain and keeps the LIVE
// storage services in step with the filesystem. The order is the load-bearing
// part:
//
//   1. stop a live agent that still owns the session (cancel + bounded wait);
//   2. flush the live session, then detach its live entry from the session
//      store and its agent entry from the agent registry. Detaching emits
//      `session/disposed`, which drains and closes the persistence write
//      handle and makes the projection cache publish its final row; removing
//      the registry entry keeps the session out of every live list;
//   3. resolve the artifact through sessionPersistence.locate() and remove the
//      session directory, every id spelling, and the project directory once it
//      is empty;
//   4. sweep until the detached write path has released the directory, and
//      refuse to continue while anything survives;
//   5. only once the log is confirmed gone, drop the projection-cache row —
//      live domain row AND its on-disk document — and the workspace accounting
//      (`sessionIds`, plus archive/pin membership through the registry's own
//      methods when it exposes them);
//   6. announce `api-session/removed` for both id spellings. The detached
//      session already makes the controller announce the canonical one; this
//      covers the other spelling and a composition that missed the detach.
//
// A session may OWN subagent sessions (`ctx.subagents.listDescendants`). They
// are deleted FIRST, deepest-first, because a removed parent leaves them on
// disk with a `parentSession` that no longer resolves: still listed, unreachable
// through their lineage, and impossible to reach as a group again. Callers that
// want to inspect them instead pass `keepDescendants` / `keepSubagents`.
//
// ESM module format (cordis bundle rule): named exports apply/inject/name.
// Every registration belongs to the plugin fiber (ctx.effect).
//
// The package deliberately imports NOTHING: a profile-installed bundle links
// into the profile directory, whose node_modules holds only profile-installed
// packages, so a Harness package import would fail to resolve. Tool definitions
// are therefore written as the registry's own plain `ToolDefinition` shape
// (name/description/parameters/output/execute) instead of `defineTool`.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const name = 'session-purge'

// Only `tools` is a hard dependency. Every other service is optional so the
// plugin stays valid in a terminal-only, storage-less, or persistence-less
// profile instead of hanging on a service that will never appear.
const inject = ['tools']

const SESSION_ID_RE = /^(session-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TOOL_NAME = 'session_purge'
const ROUTE_PATH = '/api/session-purge/purge'
const INFO_PATH = '/api/session-purge/info'

class DeleteError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'DeleteError'
    this.status = status
  }
}

// --- configuration ----------------------------------------------------------

// No `Config` export, deliberately.
//
// The Cordis loader validates a row's raw `config` through `Config['~standard']`,
// and the Harness Config surface only projects a *native* schemastery schema
// (`Config[Symbol.for('schemastery')] === true` with `type` and `meta`). Both
// shapes require importing a schema package, and a profile-installed bundle is
// linked into the profile directory, whose node_modules holds only
// profile-installed packages — so a Harness or schema import fails to resolve.
//
// Shipping a half-real schema would be worse than shipping none: the Config
// surface would report the row as `unsupported` and show no form. The one
// tunable value is therefore read defensively from the row's raw `config`,
// which reaches `apply()` unvalidated. Without it the profile's session root
// is used.

// `sessionPersistence.locate()` is the primary path source; this root is only
// the fallback sweep for a backend that cannot name its own artifacts.
function configuredRoot(config, ctx) {
  const configured = typeof config?.sessionsRoot === 'string' ? config.sessionsRoot.trim() : ''
  if (configured) return configured
  const backend = ctx?.get?.('sessionPersistence')
  if (backend && typeof backend.root === 'string' && backend.root.length > 0) return backend.root
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'sessions')
}

// --- id and path helpers ----------------------------------------------------

// A session id names one store slot but appears in more than one spelling:
// the header id is `session-<uuid>` on the current backend, while older
// workspace records and caches stored the raw uuid. Clean every spelling.
function sessionIdVariants(sessionId) {
  const variants = new Set([sessionId])
  const tail = sessionId.startsWith('session-') ? sessionId.slice('session-'.length) : sessionId
  if (!sessionId.startsWith('session-') && SESSION_ID_RE.test(sessionId)) variants.add(`session-${sessionId}`)
  if (tail && SESSION_ID_RE.test(tail)) {
    variants.add(tail)
    variants.add(`session-${tail}`)
  }
  return [...variants]
}

function projectDirs(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name))
  } catch {
    return []
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory()
  } catch {
    return false
  }
}

function treeSizeSync(target) {
  let bytes = 0
  let files = 0
  let stat
  try {
    stat = fs.lstatSync(target)
  } catch {
    return { bytes, files }
  }
  if (stat.isSymbolicLink()) return { bytes, files }
  if (stat.isFile()) return { bytes: stat.size, files: 1 }
  if (!stat.isDirectory()) return { bytes, files }
  let entries = []
  try {
    entries = fs.readdirSync(target, { withFileTypes: true })
  } catch {
    return { bytes, files }
  }
  for (const entry of entries) {
    const nested = treeSizeSync(path.join(target, entry.name))
    bytes += nested.bytes
    files += nested.files
  }
  return { bytes, files }
}

// Every on-disk session directory for `sessionId` under `root`, for both id
// spellings. The backend encodes the id to one safe path segment; scanning the
// project directories keeps this independent of that encoding without ever
// re-deriving a workspace slug.
function findSessionDirs(root, sessionId) {
  const variants = sessionIdVariants(sessionId)
  const found = []
  for (const project of projectDirs(root)) {
    for (const variant of variants) {
      const candidate = path.join(project, variant)
      if (isDirectory(candidate) && !found.includes(candidate)) found.push(candidate)
    }
  }
  return found
}

// --- secure erase -----------------------------------------------------------

// Overwrite a regular file with zeros, fsync it, then unlink it. Best effort:
// a file that cannot be reopened for writing is still unlinked, and the outer
// retry loop decides whether the directory really survived.
function shredFileSync(file) {
  let stat
  try {
    stat = fs.statSync(file)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  if (!stat.isFile()) return
  try {
    const fd = fs.openSync(file, 'r+')
    try {
      const chunk = Buffer.alloc(Math.min(1024 * 1024, Math.max(1, stat.size)))
      let offset = 0
      while (offset < stat.size) {
        const length = Math.min(chunk.length, stat.size - offset)
        fs.writeSync(fd, chunk, 0, length, offset)
        offset += length
      }
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    /* fall through to unlink: an overwrite failure is not a delete failure */
  }
  fs.unlinkSync(file)
}

/** Recursively erase one session-owned tree. Never follows symlinks. */
function secureRemoveTreeSync(target, shred) {
  let stat
  try {
    stat = fs.lstatSync(target)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  if (stat.isSymbolicLink() || stat.isFile()) {
    if (shred) shredFileSync(target)
    else fs.unlinkSync(target)
    return
  }
  let entries
  try {
    entries = fs.readdirSync(target, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  for (const entry of entries) secureRemoveTreeSync(path.join(target, entry.name), shred)
  fs.rmdirSync(target)
}

function removeSessionDirs(root, sessionId, shred = true) {
  const dirs = findSessionDirs(root, sessionId)
  for (const dir of dirs) {
    try {
      secureRemoveTreeSync(dir, shred)
    } catch {
      /* the verification sweep below reports what survived */
    }
  }
  // A project directory is named after the workspace and exists for as long as
  // the workspace has sessions; once the last session is gone it is an empty
  // husk that only shows up in a listing. Prune it, never the root itself.
  // Sweeping the project directories themselves — not just the parents of the
  // session directories found above — is what makes this fire on the LAST
  // session of a workspace, the only case where the project actually empties.
  for (const project of projectDirs(root)) {
    try {
      if (fs.readdirSync(project).length === 0) fs.rmSync(project, { recursive: true, force: true })
    } catch {
      /* already gone */
    }
  }
  return dirs.length > 0
}

// The exact artifact directory: the log's own parent. `locate` is the
// persistence backend's refusal-diagnostics hook and touches no filesystem, so
// it is safe on a session that is still live.
function dirsFromPersistence(persistence, meta) {
  if (!persistence || typeof persistence.locate !== 'function' || !meta || meta.id === undefined) return []
  try {
    const location = persistence.locate(meta)
    if (location && typeof location.path === 'string' && location.path) return [path.dirname(location.path)]
  } catch {
    /* unsupported backend: the root sweep still applies */
  }
  return []
}

// --- live session helpers ---------------------------------------------------

// Resolve the stored header for a session: a live session first, then the cold
// query corpus. The header is what `locate` needs and what identifies the
// lifecycle (and hence the artifact) to remove.
//
// ⚠️ Match ACROSS BOTH ID SPELLINGS, never with raw string equality. The two
// spellings are in live use for the same session: `process.env.DSH_SESSION_ID`
// (and therefore the tool's `callerId`) is the RAW uuid, while the persisted
// header id is the `session-<uuid>` form — and individual backends have been
// seen on either side. An exact comparison therefore finds nothing, which
// silently disables everything downstream of it: `locate()` returns no path,
// the cascade decides the session owns no subagents, and `discoverTree` reports
// a root that is not known to the profile.
async function resolveHeader(ctx, sessionId, signal) {
  const sessions = ctx.get('sessions')
  const live = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
  if (live !== undefined) return live.header
  const query = ctx.get('sessionQuery')
  if (query && typeof query.listSessions === 'function') {
    try {
      const records = await query.listSessions(signal)
      const match = records.find((record) => typeof record?.header?.id === 'string' && idsReferToSameSession(record.header.id, sessionId))
      if (match !== undefined) return match.header
      // A live session can also be found by trying the other spelling.
      const alt = sessionIdVariants(sessionId).find((variant) => variant !== sessionId)
      if (alt !== undefined && sessions && typeof sessions.get === 'function') {
        const other = sessions.get(alt)
        if (other !== undefined) return other.header
      }
    } catch {
      /* a failed cold read is not fatal: the root sweep still applies */
    }
  }
  return undefined
}

// Stop a live agent before its session disappears. `cancel` is synchronous and
// the wait is time-boxed, so a wedged driver never blocks the deletion.
//
// ⚠️ Look the agent up by ENUMERATING live agents, not with `agents.get(id)`.
// Same reason as `liveSessionFor`: `agents.get` is an exact-key lookup keyed by
// the canonical spelling, so a caller holding the other spelling gets a silent
// miss — and skipping the stop is exactly what lets a live session's in-flight
// writes land on the log AFTER the removal and re-create it.
function liveAgentFor(ctx, sessionId) {
  const agents = ctx.get('agents')
  if (!agents || typeof agents.list !== 'function') return undefined
  let all
  try {
    all = agents.list()
  } catch {
    return undefined
  }
  for (const agent of Array.isArray(all) ? all : []) {
    if (!agent || typeof agent !== 'object') continue
    const candidates = [agent.id, agent.session && agent.session.id]
    if (candidates.some((candidate) => typeof candidate === 'string' && idsReferToSameSession(candidate, sessionId))) return agent
  }
  return undefined
}

async function stopAgentIfRunning(ctx, sessionId) {
  const agent = liveAgentFor(ctx, sessionId)
  if (agent === undefined) return false
  try {
    if (typeof agent.cancel === 'function') agent.cancel({ kind: 'user' })
  } catch {
    /* already settling */
  }
  if (typeof agent.whenIdle !== 'function') return true
  let timer
  try {
    return await Promise.race([
      Promise.resolve(agent.whenIdle()).then(() => true, () => false),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), 15000)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// Ask the store for a durability checkpoint on a session that is still live.
//
// The boolean is "did at least one `session/flush` durability listener
// participate" (`dsh-session`'s `flush(session)`), so `false` is NOT a failure:
// it means this composition registered no listener. A throw is caught here
// because the deletion proceeds either way — the removal is what matters.
async function flushLiveSession(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  if (!sessions || typeof sessions.get !== 'function' || typeof sessions.flush !== 'function') return false
  const session = liveSessionFor(ctx, sessionId)
  if (session === undefined) return false
  try {
    await sessions.flush(session)
    return true
  } catch {
    /* deletion proceeds and removes the log anyway */
  }
  return false
}

// A live session and a live agent are entries in their owning service's `store`
// map, and each entry carries the teardown the owning lifecycle would run:
// `SessionStore.enter()` installs `entry.detach()`, `AgentRegistry.enter()`
// installs the registry removal (`detachEntered`). Removing both entries is
// what stops them from outliving their deleted log: `session/disposed` drains
// and closes the persistence write handle, the projection cache commits its
// final row (which this plugin then deletes), and the session controller tells
// the UI to drop the row.
//
// Stopping the turn alone is not enough: a cancelled but still-registered
// agent keeps the session in `sessions.list()` and can publish one more cache
// row after the filesystem sweep.
function storeEntry(service, sessionId) {
  const store = service && service.store
  if (!(store instanceof Map)) return undefined
  for (const [key, entry] of store) {
    const id = entry && typeof entry.id === 'string' ? entry.id : key
    if (typeof id === 'string' && idsReferToSameSession(id, sessionId)) return entry
  }
  return undefined
}

function detachSessionEntry(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  const entry = storeEntry(sessions, sessionId)
  if (entry === undefined) return false
  try {
    if (typeof entry.detach === 'function') {
      entry.detach()
      return true
    }
    if (typeof sessions.detachEntered === 'function') {
      sessions.detachEntered(entry)
      return true
    }
  } catch {
    /* the report states whether the entry left the live store */
  }
  return false
}

function detachAgentEntry(ctx, sessionId) {
  const agents = ctx.get('agents')
  const entry = storeEntry(agents, sessionId)
  if (entry === undefined) return false
  try {
    if (typeof agents.detachEntered === 'function') {
      agents.detachEntered(entry)
      return true
    }
    if (typeof entry.detach === 'function') {
      entry.detach()
      return true
    }
  } catch {
    /* best effort: the session detach already removed it from every list */
  }
  return false
}

/**
 * The session this tool call is running in, or null.
 *
 * `currentInitiator()` is the documented optional form: it answers undefined
 * outside an initiator boundary, which is why this is not `requireInitiator()`.
 */
function callingSessionId(ctx) {
  try {
    const agents = ctx.get('agents')
    if (agents === undefined || typeof agents.currentInitiator !== 'function') return null
    const agent = agents.currentInitiator()
    const id = agent === undefined || agent === null ? undefined : agent.id
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

/** Whether two ids name the same session, across both spellings. */
function idsReferToSameSession(left, right) {
  const leftVariants = new Set(sessionIdVariants(left))
  return sessionIdVariants(right).some((variant) => leftVariants.has(variant))
}

function warn(ctx, message) {
  try {
    if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(`session-purge: ${message}`)
  } catch {
    /* diagnostics must never break the operation */
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- derived-state cleanup --------------------------------------------------

// The projection cache keeps one document per session on disk; clearing only
// the live domain would leave that document behind, and a later cache read
// could serve a deleted session's rows.
function projectionDirectory() {
  return path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'storages', 'session_projcache', 'sessions')
}

function projectionFileNames(sessionId) {
  let names = []
  try {
    names = fs.readdirSync(projectionDirectory())
  } catch {
    return []
  }
  const variants = sessionIdVariants(sessionId)
  return names.filter((entry) => variants.some((variant) => entry === `${variant}.json` || entry.startsWith(`${variant}.json.bak.`)))
}

function removeProjectionFiles(sessionId, shred = true) {
  const dir = projectionDirectory()
  let removed = 0
  for (const entry of projectionFileNames(sessionId)) {
    try {
      const target = path.join(dir, entry)
      if (shred) shredFileSync(target)
      else fs.rmSync(target, { force: true })
      removed++
    } catch {
      /* held open or already gone */
    }
  }
  return removed
}

function projectionFilesPresent(sessionId) {
  return projectionFileNames(sessionId).length > 0
}

// --- attachment reclamation -------------------------------------------------

function dshHomePath() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}

function collectAttachmentRefs(value, out) {
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectAttachmentRefs(item, out)
    return
  }
  for (const key of ['attachmentId', 'variantId']) {
    const id = value[key]
    if (typeof id === 'string' && id.startsWith('sha256:')) {
      const hex = id.slice('sha256:'.length)
      if (/^[a-f0-9]{64}$/.test(hex)) out.add(hex)
    }
  }
  for (const child of Object.values(value)) collectAttachmentRefs(child, out)
}

/** Hash set referenced by one session's events, read before its log is gone. */
async function collectAttachmentHashes(ctx, sessionId, signal) {
  const persistence = ctx.get('sessionPersistence')
  if (!persistence || typeof persistence.open !== 'function') return new Set()
  let events = []
  try {
    const handle = await persistence.open(sessionId, 'read', { signal })
    try {
      const read = await handle.read()
      events = Array.isArray(read?.events) ? read.events : []
    } finally {
      if (typeof handle?.close === 'function') await handle.close()
    }
  } catch {
    return new Set()
  }
  const out = new Set()
  for (const event of events) collectAttachmentRefs(event, out)
  return out
}

/**
 * Which candidate hashes are still referenced by another persisted session.
 * Conservative by construction: a single unreadable log keeps every candidate.
 */
async function referencedHashes(ctx, hashes, purgedIds) {
  const used = new Set()
  if (hashes.size === 0) return used
  const persistence = ctx.get('sessionPersistence')
  if (!persistence || typeof persistence.list !== 'function') {
    for (const hash of hashes) used.add(hash)
    return used
  }
  const purged = new Set(purgedIds.flatMap((id) => sessionIdVariants(id)))
  let snapshots = []
  try {
    snapshots = await persistence.list()
  } catch {
    for (const hash of hashes) used.add(hash)
    return used
  }
  for (const snapshot of snapshots) {
    const id = snapshot?.header?.id
    if (typeof id !== 'string' || purged.has(id)) continue
    let events = []
    try {
      const handle = await persistence.open(id, 'read')
      try {
        const read = await handle.read()
        events = Array.isArray(read?.events) ? read.events : []
      } finally {
        if (typeof handle?.close === 'function') await handle.close()
      }
    } catch {
      for (const hash of hashes) used.add(hash)
      return used
    }
    for (const event of events) {
      const text = JSON.stringify(event)
      if (text === undefined) continue
      for (const hash of hashes) {
        if (!used.has(hash) && text.includes(`sha256:${hash}`)) used.add(hash)
      }
    }
  }
  return used
}

async function purgeAttachments(ctx, hashes, purgedId, shred) {
  if (hashes.size === 0) return 0
  const stillUsed = await referencedHashes(ctx, hashes, [purgedId])
  const candidates = [...hashes].filter((hash) => !stillUsed.has(hash))
  if (candidates.length === 0) return 0
  const home = dshHomePath()
  let removed = 0
  for (const hash of candidates) {
    const prefix = hash.slice(0, 2)
    const files = [
      path.join(home, 'attachments', 'v1', 'objects', prefix, hash),
      path.join(home, 'attachments', 'v1', 'file-objects', prefix, hash),
    ]
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          if (shred) shredFileSync(file)
          else fs.rmSync(file, { force: true })
          removed++
        }
      } catch {
        /* held open; the file stays and the report counts what was removed */
      }
    }
    const references = path.join(home, 'attachments', 'v1', 'files', prefix, hash)
    try {
      if (fs.existsSync(references)) {
        secureRemoveTreeSync(references, shred)
        removed++
      }
    } catch {
      /* a missing or held reference directory is not a delete failure */
    }
  }
  purgeFileCacheRecords(home, candidates)
  return removed
}

function purgeFileCacheRecords(home, hashes) {
  if (hashes.length === 0) return
  const file = path.join(home, 'llm-deepseek', 'files-v3.json')
  let document
  try {
    document = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return
  }
  if (!Array.isArray(document?.records)) return
  const set = new Set(hashes.map((hash) => `sha256:${hash}`))
  const kept = document.records.filter((record) => {
    const attachment = typeof record?.attachmentId === 'string' ? record.attachmentId : ''
    const variant = typeof record?.variantId === 'string' ? record.variantId : ''
    return !(set.has(attachment) || set.has(variant))
  })
  if (kept.length === document.records.length) return
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(temp, JSON.stringify({ ...document, records: kept }))
    fs.renameSync(temp, file)
  } catch {
    try {
      fs.rmSync(temp, { force: true })
    } catch {
      /* best effort */
    }
  }
}

function safeGlobalRead(registry) {
  try {
    const state = registry.global.get()
    return state && typeof state === 'object' ? state : undefined
  } catch {
    return undefined
  }
}

// Drop the session's derived rows through the opened domain facilities (the
// authoritative in-memory state), so a later flush cannot republish a stale
// row. Every id spelling is cleaned because cache and workspace records may
// use either spelling.
//
// Archive and pin membership go through `workspaceRegistry`'s public methods
// when it exposes them, so the registry's own cache and the durable global
// state stay in step; the direct global write is the fallback for a profile
// without that service. Workspace membership has no public removal API at all,
// so that one write goes to the live table and is reported as degraded when it
// throws instead of failing silently.
async function stripStorageDomains(ctx, sessionId) {
  const result = { projection: false, workspace: false, archive: false, pin: false, degraded: [] }
  const domains = ctx.get('storageDomain')
  if (!domains || typeof domains.get !== 'function') return result
  const variants = sessionIdVariants(sessionId)
  const held = (list) => Array.isArray(list) && variants.some((variant) => list.includes(variant))

  const cache = domains.get('session_projcache')
  if (cache && typeof cache.table === 'function') {
    try {
      const sessions = cache.table('sessions')
      for (const variant of variants) {
        if (sessions.get(variant) !== undefined) {
          await sessions.delete(variant)
          result.projection = true
        }
      }
    } catch (error) {
      result.degraded.push({ step: 'projection-row', detail: String(error?.message ?? error) })
    }
  }

  const registry = domains.get('workspace')
  if (!registry || typeof registry.table !== 'function') {
    return result
  }

  const global = registry.global && typeof registry.global.get === 'function' ? safeGlobalRead(registry) : undefined
  const wasArchived = global !== undefined && held(global.archivedSessionIds)
  const wasPinned = global !== undefined && held(global.pinnedSessionIds)

  try {
    const workspaces = registry.table('workspaces')
    for (const [workspaceId, record] of workspaces.entries()) {
      if (!record || !held(record.sessionIds)) continue
      const kept = record.sessionIds.filter((id) => !variants.includes(id))
      if (kept.length === record.sessionIds.length) continue
      await workspaces.put(workspaceId, { ...record, sessionIds: kept })
      result.workspace = true
    }
  } catch (error) {
    const detail = String(error?.message ?? error)
    warn(ctx, `could not remove workspace membership: ${detail}`)
    result.degraded.push({ step: 'workspace-membership', detail })
  }

  const workspaceRegistry = ctx.get('workspaceRegistry')
  const canUnarchive = workspaceRegistry !== undefined && typeof workspaceRegistry.unarchiveSession === 'function'
  const canUnpin = workspaceRegistry !== undefined && typeof workspaceRegistry.unpinSession === 'function'

  for (const variant of variants) {
    if (wasArchived && canUnarchive) {
      try {
        await workspaceRegistry.unarchiveSession(variant)
        result.archive = true
      } catch (error) {
        result.degraded.push({ step: 'archive-membership', detail: String(error?.message ?? error) })
      }
    }
    if (wasPinned && canUnpin) {
      try {
        await workspaceRegistry.unpinSession(variant)
        result.pin = true
      } catch (error) {
        result.degraded.push({ step: 'pin-membership', detail: String(error?.message ?? error) })
      }
    }
  }

  // Direct global writes only for what the registry could not own, so a stale
  // id can never survive as an archived or pinned ghost.
  const needsArchive = wasArchived && !result.archive
  const needsPin = wasPinned && !result.pin
  if ((needsArchive || needsPin) && registry.global && typeof registry.global.set === 'function' && global !== undefined) {
    try {
      const next = { ...global }
      if (needsArchive) {
        next.archivedSessionIds = global.archivedSessionIds.filter((id) => !variants.includes(id))
        result.archive = true
      }
      if (needsPin) {
        next.pinnedSessionIds = global.pinnedSessionIds.filter((id) => !variants.includes(id))
        result.pin = true
      }
      await registry.global.set(next)
    } catch (error) {
      const detail = String(error?.message ?? error)
      warn(ctx, `could not clean archive/pin sets: ${detail}`)
      if (needsArchive) result.degraded.push({ step: 'archive-membership', detail })
      if (needsPin) result.degraded.push({ step: 'pin-membership', detail })
    }
  }

  return result
}

// Tell every connected Client that this session is gone.
//
// The Host does exactly this from `session/disposed`; deleting files never
// disposes a session, so a plugin that removes state itself must emit it.
// Without the event a running UI keeps the row: the client list only re-reads
// on a rebuilt connection and preserves unchanged rows across a re-read, so the
// removed row has to be learned explicitly.
function publishRemoved(ctx, sessionId) {
  if (typeof ctx.emit !== 'function') return
  for (const variant of sessionIdVariants(sessionId)) {
    try {
      ctx.emit.call(ctx, 'api-session/removed', variant)
    } catch (error) {
      warn(ctx, `could not announce the removal of ${variant}: ${String(error?.message ?? error)}`)
    }
  }
}

// --- session discovery (id ⇄ title) -----------------------------------------

// Every session that REALLY EXISTS, with its authoritative title and live agent
// state, read from the projection cache (the same rows a cold session list
// serves). The UI addresses a session by id; a model may only know its title.
//
// ⚠️ EXISTENCE IS CHECKED, NOT ASSUMED. The projection cache is a derived store
// and it is NOT swept when a log disappears out of band, so it can hold rows for
// sessions whose log directory is gone. Listing those makes a deleted session
// look alive ("I deleted it and it is still in the list"), and — far worse —
// lets a title/id resolve onto a row that has no log at all. The authority for
// existence is the persistence corpus (`sessionQuery.listSessions`), with live
// in-process sessions unioned in because a live session may not be persisted
// yet.
async function listSessions(ctx) {
  const out = []
  const seen = new Set()
  const agents = ctx.get('agents')

  // 1. Existing sessions, from the persistence corpus (the cold list) …
  const existing = new Set()
  const query = ctx.get('sessionQuery')
  if (query && typeof query.listSessions === 'function') {
    try {
      for (const record of await query.listSessions()) {
        const id = record?.header?.id
        if (typeof id === 'string' && id.length > 0) existing.add(id)
      }
    } catch {
      /* a failed cold read leaves `existing` empty; live sessions still count */
    }
  }
  // … plus every in-process session, which is authoritative by definition.
  const sessions = ctx.get('sessions')
  if (sessions && typeof sessions.list === 'function') {
    try {
      for (const session of sessions.list()) {
        if (session && typeof session.id === 'string' && session.id.length > 0) existing.add(session.id)
      }
    } catch {
      /* store unavailable */
    }
  }
  // The corpus is authoritative when it answered; an empty set means the service
  // is absent (not "no sessions exist"), so the cache rows are kept then.
  const known = (id) => existing.size === 0 || [...existing].some((candidate) => idsReferToSameSession(candidate, id))

  const push = (id, title) => {
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) return
    seen.add(id)
    out.push({ sessionId: id, title, running: !!(agents && typeof agents.get === 'function' && agents.get(id)) })
  }

  const domains = ctx.get('storageDomain')
  const cache = domains && typeof domains.get === 'function' ? domains.get('session_projcache') : undefined
  if (cache && typeof cache.table === 'function') {
    try {
      for (const [id, record] of cache.table('sessions').entries()) {
        if (!record || typeof record !== 'object') continue
        if (!known(id)) continue
        const rows = record.rows && typeof record.rows === 'object' ? record.rows : {}
        push(id, rows.title && typeof rows.title.val === 'string' ? rows.title.val : null)
      }
    } catch {
      /* unit closed or table absent */
    }
  }

  // Sessions live in memory but not yet checkpointed are invisible to the
  // projection cache, and a child can be exactly that. Union them in so the
  // header sweep and the tree preview see the same set the cascade would.
  if (sessions && typeof sessions.list === 'function') {
    try {
      for (const session of sessions.list()) {
        const id = session && session.id
        const title = session && session.header && typeof session.header.title === 'string' ? session.header.title : null
        push(typeof id === 'string' ? id : undefined, title)
      }
    } catch {
      /* store unavailable */
    }
  }
  return out
}

// Resolve a caller-supplied title to exactly ONE session.
// Deliberately strict: an exact normalized match wins, a fork-suffixed match
// (`Title (1)`) is accepted next, and anything ambiguous reports its candidates
// instead of guessing — deleting the wrong session cannot be undone.
async function resolveSessionByTitle(ctx, title) {
  const wanted = String(title ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  if (wanted.length === 0) return { error: 'a session title or id is required', candidates: [] }
  const base = wanted.replace(/\s*\(\d+\)\s*$/, '')
  const all = await listSessions(ctx)
  const normalized = (entry) => (entry.title === null ? null : entry.title.trim().replace(/\s+/g, ' ').toLowerCase())
  const exact = all.filter((entry) => normalized(entry) === wanted)
  if (exact.length === 1) return { sessionId: exact[0].sessionId }
  const forked = all.filter((entry) => {
    const value = normalized(entry)
    return value !== null && value.replace(/\s*\(\d+\)\s*$/, '') === base
  })
  if (forked.length === 1) return { sessionId: forked[0].sessionId }
  const matched = (exact.length > 1 ? exact : forked).map((entry) => ({ sessionId: entry.sessionId, title: entry.title }))
  return {
    error: matched.length === 0
      ? `no session matches the title ${JSON.stringify(title)}; set discover to list sessions, then pass an exact sessionId`
      : `${matched.length} sessions match that title; pass an exact sessionId instead`,
    candidates: matched,
  }
}

// --- subagent tree ----------------------------------------------------------

// The sessions a session owns through the subagent catalog, deepest-first.
//
// `subagents.listDescendants(root)` walks ONLY that root's reachable parent
// catalogs, in pre-order, without loading or resuming an Agent; each row carries
// its catalog `parentId` and `depth`. It is therefore scoped to ONE session's
// subagent tree — never the profile's whole session list.
//
// Diagnostic rows (a corrupt, unsupported or unavailable child catalog) are not
// sessions — they are returned separately so the caller can report what could
// not be discovered.
//
// Ancestors are deliberately NOT returned: a child may never be deleted through
// its parent's tree.
async function collectDescendants(ctx, rootSessionId, signal) {
  const subagents = ctx.get('subagents')
  if (!subagents || typeof subagents.listDescendants !== 'function') {
    return { ok: false, reason: 'ctx.subagents.listDescendants is unavailable in this composition', list: [], diagnostics: [] }
  }
  let rows
  try {
    rows = await subagents.listDescendants(rootSessionId, signal)
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error), list: [], diagnostics: [] }
  }
  const list = []
  const diagnostics = []
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue
    if (row.kind === 'diagnostic') {
      diagnostics.push({ id: String(row.id ?? ''), reason: String(row.reason ?? 'unknown') })
      continue
    }
    if (row.kind !== 'child' || typeof row.id !== 'string' || row.id.length === 0) continue
    list.push({ sessionId: row.id, depth: Number.isFinite(row.depth) ? row.depth : 0, parentId: typeof row.parentId === 'string' ? row.parentId : null })
  }
  list.sort((a, b) => b.depth - a.depth)
  return { ok: true, reason: null, list, diagnostics }
}

// WHY THERE IS NO "header names a parent" SWEEP ANY MORE.
//
// Earlier revisions tried to catch a child the catalog had dropped by scanning
// every known session for one whose header `parentSession` pointed at the
// target. That heuristic is wrong, and it cost real data:
//
//   * THREE KINDS OF SESSION LOOK ALIKE IN A HEADER. A real **subagent**
//     (`origin: 'subagent'`, owned by the parent, unreachable once the parent is
//     gone); a **fork branch** (`isSeeded: true`, no `origin` — an INDEPENDENT
//     user-facing session created by "branch from here", whose header names the
//     source session); and a session that merely records a resume or re-parent.
//     Deleting one branch therefore deleted its siblings as well.
//   * THE SPELLINGS DO NOT EVEN LINE UP. A header id may be `session-<uuid>`
//     while the `parentSession` it is compared against is the bare uuid (or the
//     other way round), so a raw-string comparison never matches — the sweep
//     was both unreliable and, when spellings did line up, over-broad.
//
// The subagent catalog (`ctx.subagents.listDescendants`, see
// `collectDescendants`) is the authority for what a session owns. Answering
// "what does this session own?" any other way means GUESSING about a
// destructive operation. A child the catalog cannot name is left on disk as an
// orphan row the operator can delete by id — strictly better than deleting a
// session that was never a child.

// Is this session still held by this process (and therefore the one the user
// may be looking at right now)?
//
// ⚠️ DO NOT LOOK IT UP WITH `sessions.get(id)`. The store is keyed by the
// canonical spelling, which is NOT the spelling the caller holds and not even
// consistently the spelling on disk: the header id of a root/branch session is
// `session-<uuid>` while a subagent's is a bare uuid, and a persisted directory
// can carry the other form. Enumerating `sessions.list()` and comparing across
// spellings is the only lookup that answers for every case; an exact-key `get`
// silently reports "not live" for a session that IS live, which would skip both
// the stop and the checkpoint.
function liveSessionFor(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  if (!sessions || typeof sessions.list !== 'function') return undefined
  let all
  try {
    all = sessions.list()
  } catch {
    return undefined
  }
  for (const session of Array.isArray(all) ? all : []) {
    if (!session || typeof session !== 'object') continue
    const candidates = [session.id, session.header && session.header.id]
    if (candidates.some((candidate) => typeof candidate === 'string' && idsReferToSameSession(candidate, sessionId))) return session
  }
  return undefined
}

// --- core delete ------------------------------------------------------------

// Delete ONE session's artifacts and accounting, leaving the grouping
// accounting last. Returns a report; throws only for an invalid id, a partial
// filesystem removal, or a session that does not exist.
async function purgeOne(ctx, raw, { config, signal } = {}) {
  const root = configuredRoot(config, ctx)
  const shred = config?.shred !== false
  const persistence = ctx.get('sessionPersistence')

  // Resolve the artifact BEFORE stopping anything: a live session's header is
  // the only reliable source, and the cold corpus is cheapest while the log
  // still exists.
  const header = await resolveHeader(ctx, raw, signal)
  const exactDirs = new Set(dirsFromPersistence(persistence, header))
  // Read attachment references while the log is definitely still readable.
  // A failed read yields an empty set, so no attachment is guessed at.
  const attachmentHashes = await collectAttachmentHashes(ctx, raw, signal).catch(() => new Set())

  // Stop the turn, checkpoint it, then release both live entries. The release
  // is what closes the persistence write handle (through `session/disposed`)
  // and empties the live session list; deleting files while the entries stayed
  // registered is what let a stopped session keep publishing a cache row.
  const wasLive = liveSessionFor(ctx, raw) !== undefined || liveAgentFor(ctx, raw) !== undefined
  const stopped = await stopAgentIfRunning(ctx, raw)
  const flushed = await flushLiveSession(ctx, raw)
  const sessionDetached = detachSessionEntry(ctx, raw)
  const agentDetached = detachAgentEntry(ctx, raw)

  // `session/disposed` listeners are asynchronous: the persistence backend
  // drains and closes its writer, and the projection cache writes its final
  // row. Give both a turn before removing what they touch.
  if (sessionDetached) {
    for (let attempt = 0; attempt < 40 && liveSessionFor(ctx, raw) !== undefined; attempt++) await sleep(25)
    await sleep(150)
  }

  const removeAll = () => {
    let removed = false
    for (const dir of exactDirs) {
      try {
        secureRemoveTreeSync(dir, shred)
        removed = true
      } catch {
        /* the verification below reports what survived */
      }
    }
    return removeSessionDirs(root, raw, shred) || removed
  }

  // The detach path may still be draining, so retry until the directory is
  // gone; a write handle that has not closed yet keeps the file locked on
  // Windows for a few turns.
  let dirRemoved = false
  for (let attempt = 0; attempt < 20; attempt++) {
    dirRemoved = removeAll() || dirRemoved
    const survivors = [...exactDirs].filter(isDirectory)
    if (survivors.length === 0 && findSessionDirs(root, raw).length === 0) break
    await sleep(150)
  }

  const leftovers = [...new Set([...[...exactDirs].filter(isDirectory), ...findSessionDirs(root, raw)])]
  if (leftovers.length > 0) {
    throw new DeleteError(`session files could not be fully removed: ${leftovers.join(', ')}`, 500)
  }

  // The projection row is not the grouping authority; only now, with the log
  // confirmed gone, does the session leave its grouping accounting.
  const cleanup = await stripStorageDomains(ctx, raw)
  let cacheFilesRemoved = removeProjectionFiles(raw, shred)
  const projectionRemoved = cleanup.projection || cacheFilesRemoved > 0

  // The detached session's final cache write is asynchronous; remove anything
  // that landed between the domain delete and that write.
  if (sessionDetached) {
    for (let attempt = 0; attempt < 10 && projectionFilesPresent(raw); attempt++) {
      await sleep(100)
      cacheFilesRemoved += removeProjectionFiles(raw, shred)
    }
    if (projectionFilesPresent(raw)) {
      cleanup.degraded.push({ step: 'projection-file', detail: 'a projection cache document survived the removal attempts' })
    }
  }

  if (!dirRemoved && !projectionRemoved && !cleanup.workspace && !sessionDetached && !agentDetached) {
    throw new DeleteError(`session not found: ${raw}`, 404)
  }

  // Attachments are content-addressed and may be shared; reclaim only what no
  // remaining session references. This runs after the logs are gone, so a
  // referenced hash scanned here really belongs to a survivor.
  const attachmentsRemoved = await purgeAttachments(ctx, attachmentHashes, raw, shred).catch(() => 0)

  return {
    sessionId: raw,
    wasLive,
    stopped,
    flushed,
    sessionDetached,
    agentDetached,
    dirRemoved,
    projectionRemoved,
    cacheFilesRemoved,
    workspaceRemoved: cleanup.workspace,
    archiveRemoved: cleanup.archive,
    pinRemoved: cleanup.pin,
    attachmentsRemoved,
    located: exactDirs.size > 0,
    degraded: cleanup.degraded,
  }
}

// Delete a session, and by default the subagent sessions it owns.
//
// Descendants go FIRST, deepest-first. A deleted parent would otherwise leave
// its children alive on disk with a `parentSession` header that no longer
// resolves — they stay listed, cannot be opened through their lineage, and can
// never be reached through the tree again.
//
// Cascading is the default because the tree is the only way back: once the
// parent is gone, nothing lists those children as a group. An operator who
// wants to keep them for inspection passes `keepDescendants` (row
// `config.deleteSubagents: false`, or `keepSubagents` in a tool call / route body).
async function deleteSessionCore(ctx, sessionId, { config, signal, keepDescendants = false } = {}) {
  const raw = String(sessionId ?? '').trim()
  if (!SESSION_ID_RE.test(raw)) throw new DeleteError(`invalid session id: ${raw}`, 400)

  const degraded = []
  let descendants = []
  let descendantsDiscovered = keepDescendants

  if (!keepDescendants) {
    const found = await collectDescendants(ctx, raw, signal)
    if (!found.ok) {
      // The catalog could not be enumerated, so the cascade does not run.
      // Reported out loud rather than silently orphaning the tree.
      descendantsDiscovered = false
      degraded.push({ step: 'subagent-descendants', detail: found.reason })
    } else {
      descendantsDiscovered = true
      descendants = found.list
      for (const diagnostic of found.diagnostics) {
        degraded.push({ step: 'subagent-catalog', detail: `${diagnostic.id || '(unknown id)'}: ${diagnostic.reason}` })
      }
      // The catalog is the ONLY source. There is deliberately no header-scan
      // fallback: it cannot tell a subagent from a fork branch, and guessing
      // about a destructive operation is what deleted unrelated branches before
      // (see the long note above `liveSessionFor`). A child the catalog cannot
      // name stays on disk as an orphan row, deletable by id.
      descendants.sort((a, b) => b.depth - a.depth)
    }
  }

  const removedDescendants = []
  for (const entry of descendants) {
    try {
      const report = await purgeOne(ctx, entry.sessionId, { config, signal })
      removedDescendants.push({ sessionId: entry.sessionId, depth: entry.depth, stopped: report.stopped })
    } catch (error) {
      degraded.push({ step: 'subagent-delete', detail: `${entry.sessionId}: ${String(error?.message ?? error)}` })
    }
  }

  const report = await purgeOne(ctx, raw, { config, signal })

  // Announced only after a clean delete, so a refused one never makes the row
  // vanish from a connected UI. Each descendant gets its own announcement: a
  // client learns about a removed row only through this event.
  publishRemoved(ctx, raw)
  for (const entry of removedDescendants) publishRemoved(ctx, entry.sessionId)

  return {
    ...report,
    descendants: removedDescendants.map((entry) => entry.sessionId),
    removedDescendants,
    descendantsDiscovered,
    degraded: [...report.degraded, ...degraded],
  }
}

// --- http helpers -----------------------------------------------------------

function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1e6) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
    req.on('aborted', () => reject(new Error('aborted')))
  })
}

// The webserver's own contract is "No server-wide TLS, authentication, or origin
// policy — route owners enforce their own request policy", and an exact route
// takes precedence over the SPA fallback that would otherwise answer 401. So
// this route asks the Connection service for its Host/Origin fence and browser
// authentication itself, and FAILS CLOSED: without that service this would be
// an unauthenticated endpoint that deletes sessions, which is the one outcome
// worth refusing. The trade is that a web composition without Connection loses
// the UI delete path; the agent tool is unaffected.
function rejectUnauthenticated(ctx, req) {
  const connection = ctx.get('connection')
  if (connection === undefined || connection === null) {
    warn(ctx, 'no connection service; refused an unauthenticated delete request')
    return 401
  }
  if (typeof connection.requestRejection !== 'function') {
    warn(ctx, 'connection exposes no requestRejection; refused the delete request')
    return 401
  }
  try {
    const rejection = connection.requestRejection({ headers: req.headers })
    return rejection === 401 || rejection === 403 ? rejection : undefined
  } catch (error) {
    warn(ctx, `connection trust check failed (${String(error?.message ?? error)}); refused the delete request`)
    return 403
  }
}

// --- plugin -----------------------------------------------------------------

// --- preview ----------------------------------------------------------------

/** Scope preview: what a delete would touch, without changing anything. */
async function infoFor(ctx, raw, { config, signal } = {}) {
  if (!SESSION_ID_RE.test(raw)) throw new DeleteError(`invalid session id: ${raw}`, 400)
  const header = await resolveHeader(ctx, raw, signal)
  const live = liveSessionFor(ctx, raw) !== undefined || liveAgentFor(ctx, raw) !== undefined
  if (header === undefined && !live) throw new DeleteError(`session not found: ${raw}`, 404)

  const root = configuredRoot(config, ctx)
  const persistence = ctx.get('sessionPersistence')
  const dirs = new Set(dirsFromPersistence(persistence, header))
  for (const dir of findSessionDirs(root, raw)) dirs.add(dir)
  let bytes = 0
  let files = 0
  for (const dir of dirs) {
    const size = treeSizeSync(dir)
    bytes += size.bytes
    files += size.files
  }

  let descendants = 0
  let cascadeAvailable = false
  if (config?.deleteSubagents !== false) {
    const found = await collectDescendants(ctx, raw, signal)
    if (found.ok) {
      cascadeAvailable = true
      descendants = found.list.length
    }
  }

  const registry = ctx.get('workspaceRegistry')
  let workspace = null
  let archived = false
  let pinned = false
  try {
    const entity = registry?.list?.().find((candidate) => Array.isArray(candidate.sessionIds) && candidate.sessionIds.some((id) => idsReferToSameSession(id, raw)))
    workspace = entity?.title ?? null
    const variants = new Set(sessionIdVariants(raw))
    archived = Array.isArray(registry?.archivedSessionIds) && registry.archivedSessionIds.some((id) => variants.has(id))
    pinned = Array.isArray(registry?.pinnedSessionIds) && registry.pinnedSessionIds.some((id) => variants.has(id))
  } catch {
    /* preview only */
  }

  return {
    sessionId: raw,
    title: header?.title ?? null,
    cwd: header?.cwd ?? null,
    live,
    descendants,
    cascadeAvailable,
    deleteSubagents: config?.deleteSubagents !== false,
    shred: config?.shred !== false,
    bytes,
    files,
    workspace,
    archived,
    pinned,
    located: dirs.size > 0,
  }
}

function apply(ctx, config) {
  // Row config (read defensively, since no Config schema is exported): setting
  // `deleteSubagents: false` makes the default delete leave subagent sessions
  // on disk. An explicit per-call argument still wins.
  const cascadeByDefault = config?.deleteSubagents !== false

  // One registration path, not two. `ctx.inject` runs its callback immediately
  // when the service already exists and again if it is ever replaced, and it
  // hands back the child context that owns the service — so the route's
  // lifetime follows the web surface instead of outliving a replaced one.
  ctx.inject(['webServer'], (sub) => {
    const webServer = sub.webServer
    sub.effect(() => webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        const rejection = rejectUnauthenticated(ctx, req)
        if (rejection !== undefined) {
          sendJson(res, rejection, { ok: false, error: 'unauthenticated request' })
          return
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        let args = {}
        try {
          const body = await readBody(req)
          if (body) args = JSON.parse(body)
        } catch {
          sendJson(res, 400, { ok: false, error: 'bad json body' })
          return
        }
        const sessionId = typeof args?.sessionId === 'string' ? args.sessionId.trim() : ''
        if (!sessionId) {
          sendJson(res, 400, { ok: false, error: 'sessionId required' })
          return
        }
        // `keepSubagents: true` deletes only this session and leaves the
        // subagent sessions it owns on disk (they become orphaned rows).
        const keepDescendants = args?.keepSubagents === true ? true : !cascadeByDefault
        // The dialog deletes the session the user is looking at, so the tool's
        // calling-session refusal must NOT apply here: the Host does the work
        // and the client repairs its own view.
        try {
          const report = await deleteSessionCore(ctx, sessionId, { config, keepDescendants })
          sendJson(res, 200, { ok: true, ...report })
        } catch (error) {
          const status = error instanceof DeleteError && error.status ? error.status : 500
          warn(ctx, `delete failed for ${sessionId}: ${String(error?.message ?? error)}`)
          sendJson(res, status, { ok: false, error: String(error?.message ?? error) })
        }
      },
    }), 'session-purge: delete route')

    sub.effect(() => webServer.register({
      kind: 'exact',
      path: INFO_PATH,
      handler: async (req, res) => {
        const rejection = rejectUnauthenticated(ctx, req)
        if (rejection !== undefined) {
          sendJson(res, rejection, { ok: false, error: 'unauthenticated request' })
          return
        }
        if (req.method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        let sessionId = ''
        try {
          const url = new URL(req.url || '/', 'http://localhost')
          sessionId = (url.searchParams.get('sessionId') || '').trim()
        } catch {
          sendJson(res, 400, { ok: false, error: 'bad query' })
          return
        }
        if (!sessionId) {
          sendJson(res, 400, { ok: false, error: 'sessionId required' })
          return
        }
        try {
          const info = await infoFor(ctx, sessionId, { config })
          sendJson(res, 200, { ok: true, info })
        } catch (error) {
          const status = error instanceof DeleteError && error.status ? error.status : 500
          sendJson(res, status, { ok: false, error: String(error?.message ?? error) })
        }
      },
    }), 'session-purge: info route')
  })

  // The agent tool is the second caller of the same operation; it registers
  // unconditionally so the plugin is useful in a headless profile too.
  ctx.tools.register({
    name: TOOL_NAME,
    description: [
      'Permanently delete one session: stops its agent if running, then removes its log directory,',
      'projection-cache row and workspace accounting. Pass discover: true with no other arguments to',
      'list the sessions this profile knows instead. Never touches sessions forked from it. By default',
      'the SUBAGENT sessions it owns are deleted too, deepest-first (keepSubagents: true keeps them).',
      'There is no undo, so pass an exact sessionId; title is only a fallback and is refused unless',
      'unique. discoverTree shows one session\'s subagent tree. The session this call runs in is',
      'refused — delete that one from its row menu in the UI.',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session id to delete (the `session-<uuid>` form shown by the session list, or its raw uuid). Preferred over title.',
        },
        title: {
          type: 'string',
          description: 'Session title, used only when sessionId is unknown. Refused unless it resolves to exactly one session.',
        },
        discover: {
          type: 'boolean',
          description: 'List the sessions this profile knows (id, title, running, and whether it is the session you are running in) and delete nothing. Pass this alone — with no sessionId, no title, no discoverTree. Defaults to false.',
        },
        discoverTree: {
          type: 'string',
          description: 'Session id: show ONLY the subagent tree that one session owns (id, depth, parent, and which one you are running in) and delete nothing. Not needed before deleting — a delete cascades on its own and its result reports what was removed. Use it only when the caller asks what a cascade would remove.',
        },
        keepSubagents: {
          type: 'boolean',
          description: 'Delete only this session and leave the SUBAGENT sessions it owns on disk. Defaults to false (its subagent sessions are deleted too, deepest-first). Sessions forked from this one are never subagents and are never deleted by a cascade.',
        },
      },
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: String(value) }]
      },
    },
    async execute(args, exec) {
      const callerId = callingSessionId(ctx)

      // Tree discovery: mechanical, read-only. It calls the SAME
      // `collectDescendants` the cascade calls — one source (the subagent
      // catalog), so the preview and the delete can never disagree.
      const treeRoot = typeof args?.discoverTree === 'string' ? args.discoverTree.trim() : ''
      if (treeRoot.length > 0) {
        if (!SESSION_ID_RE.test(treeRoot)) throw new TypeError(`invalid arguments: "discoverTree" must be a session id, got ${JSON.stringify(treeRoot)}`)
        const found = await collectDescendants(ctx, treeRoot, exec?.signal)
        const knownList = await listSessions(ctx)
        const known = new Set(knownList.map((entry) => entry.sessionId))
        const lines = [`tree root: ${treeRoot}${known.has(treeRoot) ? '' : '  NOT known to this profile'}`]
        lines.push(`root parent (an ancestor, never deleted through this tree): ${(await resolveHeader(ctx, treeRoot))?.parentSession ?? '(none)'}`)
        if (!found.ok) {
          lines.push(`cascade unavailable: ${found.reason}`)
          lines.push('subagent sessions this session owns: unknown (the cascade would not run)')
          return lines.join('\n')
        }
        const all = [...found.list].sort((a, b) => b.depth - a.depth)
        lines.push(`subagent sessions this session owns: ${all.length}`)
        for (const entry of all) {
          lines.push(`  ${entry.sessionId === callerId ? '>' : ' '} depth ${entry.depth}  ${entry.sessionId}  (parent ${entry.parentId ?? 'unknown'})${known.has(entry.sessionId) ? '' : '  NOT known to this profile'}`)
        }
        // Fork branches name their source session in their header exactly like a
        // subagent child does, and they are NEVER part of this tree. Say so, so
        // a reader does not read a small count as "my branches are safe because
        // they are not listed" without knowing why.
        lines.push('note: branches forked from this session are NOT descendants — a cascade never deletes them.')
        for (const diagnostic of found.diagnostics) lines.push(`  ! catalog diagnostic ${diagnostic.id}: ${diagnostic.reason}`)
        return lines.join('\n')
      }

      if (args?.discover === true) {
        const sessions = await listSessions(ctx)
        if (sessions.length === 0) return 'no sessions are known to this profile'
        // The current Session is marked after the TITLE, not as a leading column:
        // the title is what a reader matches on, and a leading marker is easy to
        // misread across a table.
        const lines = sessions.map((entry) => {
          const title = entry.title ?? '(untitled)'
          return `${entry.sessionId}  running=${entry.running}  ${title}${entry.sessionId === callerId ? ' > (当前会话)' : ''}`
        })
        return lines.join('\n')
      }

      let sessionId = typeof args?.sessionId === 'string' ? args.sessionId.trim() : ''
      if (sessionId.length === 0) {
        const resolved = await resolveSessionByTitle(ctx, args?.title)
        if (resolved.sessionId === undefined) {
          const candidates = (resolved.candidates ?? []).map((entry) => `${entry.sessionId}  ${entry.title ?? '(untitled)'}${entry.sessionId === callerId ? ' > (当前会话)' : ''}`).join('\n')
          return [`delete failed: ${resolved.error}`, candidates].filter((line) => line.length > 0).join('\n')
        }
        sessionId = resolved.sessionId
      }

      // Refuse to delete the session this call runs in: `tool/result` is
      // appended by the agent loop AFTER execution, so removing that log here
      // either loses the result or lets the append path recreate the file. The
      // UI path has no such contradiction, so point the caller there.
      if (callerId !== null && idsReferToSameSession(sessionId, callerId)) {
        return [
          `refused: ${sessionId} is the session THIS call is running in.`,
          '',
          'Deleting it from inside itself cannot work: this tool result has to be recorded in that very log,',
          'and the session write path would then recreate or truncate it unpredictably.',
          '',
          'To delete the session you are currently in, use that session row\'s "..." menu in the UI instead.',
        ].join('\n')
      }

      // The caller's own ancestors are never deleted through this call, but a
      // cascade must never reach the running session either.
      const keepSubagents = args?.keepSubagents === true
      if (!keepSubagents && callerId !== null) {
        // The catalog is the only source, exactly as in the cascade itself, so
        // the guard covers the same set the delete will walk. A fork branch is
        // never in it and therefore never blocks a delete.
        const found = await collectDescendants(ctx, sessionId, exec?.signal)
        const reached = found.ok ? found.list.map((entry) => entry.sessionId) : []
        if (reached.some((id) => idsReferToSameSession(id, callerId))) {
          return [
            `refused: ${sessionId} owns the session THIS call is running in (${callerId}).`,
            '',
            'A cascade would delete the log this tool result must be written into.',
            'Delete that subagent session from its own row menu first, or pass keepSubagents to delete only this session.',
          ].join('\n')
        }
      }

      try {
        const report = await deleteSessionCore(ctx, sessionId, { config, signal: exec?.signal, keepDescendants: keepSubagents })
        const descendantLines = report.removedDescendants.length === 0
          ? [report.descendantsDiscovered
              ? 'subagent sessions removed: none (this session owns none)'
              : 'subagent sessions removed: none (the cascade could not be enumerated, see below)']
          : [`subagent sessions removed: ${report.removedDescendants.length}`, ...report.removedDescendants.map((entry) => `  - depth ${entry.depth}: ${entry.sessionId}${entry.stopped ? ' (was running, stopped)' : ''}`)]
        return [
          `deleted session ${report.sessionId}`,
          `was live at delete time: ${report.wasLive}`,
          `agent stopped: ${report.stopped}`,
          `live session released: ${report.sessionDetached}`,
          `live agent unregistered: ${report.agentDetached}`,
          // NOT a failure when false: `sessions.flush` returns "did at least one
          // durability listener participate", so false means this composition
          // registered none — not that the checkpoint failed.
          `durability checkpoint participated: ${report.flushed}`,
          `log directory removed: ${report.dirRemoved}`,
          `projection row removed: ${report.projectionRemoved} (cache documents: ${report.cacheFilesRemoved})`,
          `workspace accounting removed: ${report.workspaceRemoved}`,
          `archive membership removed: ${report.archiveRemoved}`,
          `pin membership removed: ${report.pinRemoved}`,
          ...descendantLines,
          ...(report.degraded.length === 0
            ? []
            : [
                '',
                `INCOMPLETE: ${report.degraded.length} cleanup step(s) could not run — the log is gone, but the`,
                'accounting below may still name this session:',
                ...report.degraded.map((entry) => `  - ${entry.step}: ${entry.detail}`),
              ]),
        ].join('\n')
      } catch (error) {
        if (error instanceof DeleteError && error.status === 400) throw error
        return `delete failed: ${String(error?.message ?? error)}`
      }
    },
  })
}

export { apply, inject, name }
