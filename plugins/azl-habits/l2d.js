/**
 * Azur Lane Live2D viewer - the Host half.
 *
 * The browser cannot read the public model mirrors directly (CORS), and the
 * Cubism runtime comes from its vendor CDN, so this half proxies read-only HTTP
 * surfaces under /api/azl-l2d:
 *
 *   GET /api/azl-l2d/catalog                    merged skin list (several
 *                                               public mirrors, de-duplicated,
 *                                               names resolved from ship data)
 *   GET /api/azl-l2d/model?folder=&source=      model summary for the panel
 *   GET /api/azl-l2d/descriptor?folder=&source= model3.json rewritten so every
 *                                               nested reference resolves here
 *   GET /api/azl-l2d/raw?ref=&source=           one raw asset (moc3, texture,
 *                                               motion, physics)
 *   GET /api/azl-l2d/warm?folder=&source=      fetch and cache a model's assets
 *                                               ahead of the click
 *   GET /api/azl-l2d/runtime?name=              Cubism Core + the MIT PixiJS
 *                                               Live2D bindings
 *
 * Assets are cached on disk on first use, so a model loads once from the mirror
 * and is instant afterwards. No game artwork is bundled with the plugin.
 */

import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, posix } from 'node:path';

const ROW_NAME = '@local/azl-habits/l2d';
const API_PREFIX = '/api/azl-l2d';
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const TREE_TTL_MS = 6 * 60 * 60 * 1000;
const ASSET_CACHE_LIMIT = 400;

export const SOURCES = {
  'ddddbug/Live2d-model': {
    owner: 'ddddbug',
    repo: 'Live2d-model',
    ref: 'master',
    root: '碧蓝航线 Azue Lane/Azue Lane(JP)',
    priority: 0,
  },
  'alg-wiki/AzurLaneL2DViewer': {
    owner: 'alg-wiki',
    repo: 'AzurLaneL2DViewer',
    ref: 'gh-pages',
    root: 'assets',
    priority: 1,
  },
  'kka-aris/newAzurLane-L2DViewer': {
    owner: 'kka-aris',
    repo: 'newAzurLane-L2DViewer',
    ref: 'main',
    root: 'assets',
    priority: 2,
  },
};

const DEFAULT_SOURCES = ['ddddbug/Live2d-model', 'alg-wiki/AzurLaneL2DViewer'];

const SKIN_DATA = {
  EN: 'https://raw.githubusercontent.com/AzurLaneTools/AzurLaneData/main/EN/ShareCfg/ship_skin_template.json',
  CN: 'https://raw.githubusercontent.com/AzurLaneTools/AzurLaneData/main/CN/ShareCfg/ship_skin_template.json',
};

/** Community English titles for converted models (folder id -> display name). */
const COMMUNITY_NAMES = 'https://raw.githubusercontent.com/alg-wiki/AzurLaneL2DViewer/gh-pages/js/charData.js';

const RUNTIME_URLS = {
  cubismcore: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  pixi: 'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js',
  live2d: 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js',
};

/* ----------------------------------------------------------------- helpers */

function cacheRoot() {
  const base = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(base, 'cache', 'azl-l2d');
}

function cacheFile(name) {
  return join(cacheRoot(), name);
}

async function readJsonCache(name) {
  try {
    return JSON.parse(await readFile(cacheFile(name), 'utf8'));
  } catch {
    return null;
  }
}

async function writeJsonCache(name, value) {
  try {
    const target = cacheFile(name);
    await mkdir(dirname(target), { recursive: true });
    const temp = target + '.tmp';
    await writeFile(temp, JSON.stringify(value), 'utf8');
    await rename(temp, target);
  } catch {
    /* cache is best-effort */
  }
}

async function fetchWithTimeout(url, { timeoutMs = 30_000, headers = {}, method = 'GET' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method, signal: controller.signal, headers, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  return await response.json();
}

function sourceOf(value) {
  const key = typeof value === 'string' && SOURCES[value] ? value : DEFAULT_SOURCES[0];
  return { key, ...SOURCES[key] };
}

function b64url(value) {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(value) {
  return Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function rawUrl(source, file) {
  return 'https://raw.githubusercontent.com/' + source.owner + '/' + source.repo + '/' + source.ref + '/' + encodeURI(file);
}

function cdnUrl(source, file) {
  return 'https://cdn.jsdelivr.net/gh/' + source.owner + '/' + source.repo + '@' + source.ref + '/' + encodeURI(file);
}

function contentTypeOf(file) {
  const lower = String(file).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}

const HUMAN_GROUPS = {
  Idle: '待机',
  TapBody: '点击身体',
  TapHead: '点击头部',
  TapSpecial: '特殊触碰',
  Login: '登录',
  Home: '主界面',
  Main: '主界面',
  Mission: '任务',
  MissionComplete: '任务完成',
  Mail: '邮件',
  Complete: '完成',
  Effect: '特效',
  Wedding: '誓约',
  TouchDrag: '拖拽',
  Touch: '触碰',
  Start: '开始',
};

function motionLabel(name) {
  const cleaned = String(name || '').replace(/\.motion3\.json$/i, '').replace(/[_-]+/g, ' ').trim();
  if (HUMAN_GROUPS[cleaned]) return HUMAN_GROUPS[cleaned];
  if (!cleaned) return '默认';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/* ------------------------------------------------------------------ catalog */

/** Walk one mirror folder: list the parent, then walk the folder tree. */
async function loadTree(source, { timeoutMs = 30_000 } = {}) {
  const api = 'https://api.github.com/repos/' + source.owner + '/' + source.repo;
  const headers = { 'user-agent': 'dsh-azl-l2d/1.0' };
  const enc = (value) => value.split('/').map(encodeURIComponent).join('/');
  const segments = source.root.split('/').filter(Boolean);
  const leaf = segments.pop();
  const parentPath = segments.join('/');
  const listingUrl = parentPath ? api + '/contents/' + enc(parentPath) + '?ref=' + source.ref : api + '/contents?ref=' + source.ref;
  const listingResponse = await fetchWithTimeout(listingUrl, { headers, timeoutMs });
  if (!listingResponse.ok) throw new Error('listing HTTP ' + listingResponse.status);
  const listing = await listingResponse.json();
  const entry = Array.isArray(listing) ? listing.find((item) => item && item.name === leaf) : listing;
  if (!entry || typeof entry.sha !== 'string') throw new Error('mirror folder not found: ' + source.root);

  const treeResponse = await fetchWithTimeout(api + '/git/trees/' + entry.sha + '?recursive=1', { headers, timeoutMs });
  if (!treeResponse.ok) throw new Error('tree HTTP ' + treeResponse.status);
  const tree = await treeResponse.json();
  const entries = Array.isArray(tree.tree) ? tree.tree : [];
  if (entries.length === 0) throw new Error('mirror has no files');
  return {
    fetchedAt: Date.now(),
    truncated: Boolean(tree.truncated),
    basePrefix: source.root.replace(/\/+$/, '') + '/',
    entries: entries
      .filter((item) => item && item.type === 'blob' && typeof item.path === 'string')
      .map((item) => ({ path: item.path, size: Number(item.size) || 0 })),
  };
}

/** folder id -> { shipEn, shipCn, skinEn, skinCn } from the public ship table. */
async function loadShipNames() {
  const cached = await readJsonCache('ship-names-v3.json');
  if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CATALOG_TTL_MS && cached.map) {
    return { map: cached.map, idToGroup: cached.idToGroup || {} };
  }
  const [en, cn] = await Promise.all([
    fetchJson(SKIN_DATA.EN).catch(() => null),
    fetchJson(SKIN_DATA.CN).catch(() => null),
  ]);
  const rows = new Map();
  const collect = (table, field) => {
    if (!table || typeof table !== 'object') return;
    for (const key of Object.keys(table)) {
      const row = table[key];
      if (!row || typeof row !== 'object') continue;
      const title = typeof row.name === 'string' ? row.name.trim() : '';
      if (!title) continue;
      const prefab = typeof row.prefab === 'string' ? row.prefab.trim().toLowerCase() : '';
      const painting = typeof row.painting === 'string' ? row.painting.trim().toLowerCase() : '';
      const id = String(key);
      const record = rows.get(id) || { id, prefab, painting, en: '', cn: '', shipId: '', animations: [] };
      if (prefab) record.prefab = prefab;
      if (painting) record.painting = painting;
      if (field === 'en' && !record.en) record.en = title;
      if (field === 'cn' && !record.cn && /[\u4e00-\u9fff]/.test(title)) record.cn = title;
      if (Array.isArray(row.l2d_animations) && row.l2d_animations.length > record.animations.length) {
        record.animations = row.l2d_animations.filter((name) => typeof name === 'string');
      }
      if (Number.isFinite(Number(row.ship_group)) && Number(row.ship_group) > 0) {
        record.shipId = String(row.ship_group);
      }
      rows.set(id, record);
    }
  };
  collect(en, 'en');
  collect(cn, 'cn');

  const byRoot = new Map();
  for (const record of rows.values()) {
    const prefab = record.prefab || record.painting;
    if (!prefab) continue;
    const match = /^([a-z0-9]+?)(?:_|$)/i.exec(prefab);
    if (!match) continue;
    const root = match[1].toLowerCase();
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(record);
  }
  const baseTitle = new Map();
  for (const [root, list] of byRoot) {
    const direct = list.find((record) => record.prefab && record.prefab === record.painting);
    const baseRow = direct || list.slice().sort((left, right) => left.id.localeCompare(right.id))[0];
    if (baseRow) baseTitle.set(root, { en: baseRow.en, cn: baseRow.cn });
  }

  const idToGroup = {};
  for (const record of rows.values()) {
    if (record.id && record.shipId) idToGroup[record.id] = record.shipId;
  }

  const map = {};
  for (const record of rows.values()) {
    if (!record.painting) continue;
    const prefab = record.prefab || record.painting;
    const match = /^([a-z0-9]+?)(?:_|$)/i.exec(prefab);
    const root = match ? match[1].toLowerCase() : prefab;
    const base = baseTitle.get(root) || { en: '', cn: '' };
    const current = map[record.painting] || {
      shipEn: '',
      shipCn: '',
      skinEn: '',
      skinCn: '',
      shipId: '',
      animations: [],
    };
    map[record.painting] = {
      shipEn: current.shipEn || base.en || record.en,
      shipCn: current.shipCn || base.cn || record.cn,
      skinEn: current.skinEn || (record.en && record.en !== base.en ? record.en : ''),
      skinCn: current.skinCn || (record.cn && record.cn !== base.cn ? record.cn : ''),
      shipId: current.shipId || record.shipId || '',
      animations: (record.animations && record.animations.length > current.animations.length)
        ? record.animations
        : current.animations,
    };
  }
  await writeJsonCache('ship-names-v3.json', { fetchedAt: Date.now(), map, idToGroup });
  return { map, idToGroup };
}

const WORD_DATA = {
  CN: 'https://raw.githubusercontent.com/AzurLaneTools/AzurLaneData/main/CN/ShareCfg/ship_skin_words_extra.json',
  EN: 'https://raw.githubusercontent.com/AzurLaneTools/AzurLaneData/main/EN/ShareCfg/ship_skin_words_extra.json',
};

const WORD_LABELS = {
  idle: '待机',
  main: '主界面',
  main_extra: '主界面（追加）',
  touch: '触碰',
  touch2: '特殊触碰',
  headtouch: '摸头',
  home: '返回港区',
  login: '登录',
  wedding: '誓约',
  feeling1: '好感 1',
  feeling2: '好感 2',
  feeling3: '好感 3',
  feeling4: '好感 4',
  feeling5: '好感 5',
  battle: '战斗',
  mission: '任务',
  mission_complete: '任务完成',
  mail: '邮件',
  expedition: '委托',
  complete: '完成',
  detail: '详情',
  profile: '档案',
  lose: '失败',
  hp_warning: '低血量',
  skill: '技能',
  vote: '投票',
};

/** ship id -> [{ type, label, voiceId, text }] from the public word tables. */
async function loadWords(locale, idToGroup = {}) {
  const cacheName = 'words-' + locale + '-v1.json';
  const cached = await readJsonCache(cacheName);
  if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CATALOG_TTL_MS && cached.map) return cached.map;
  const table = await fetchJson(WORD_DATA[locale] || WORD_DATA.CN).catch(() => null);
  const map = {};
  if (table && typeof table === 'object') {
    for (const skinId of Object.keys(table)) {
      const group = idToGroup[skinId];
      if (!group) continue;
      const row = table[skinId];
      if (!row || typeof row !== 'object') continue;
      const lines = [];
      for (const type of Object.keys(row)) {
        const field = row[type];
        if (Array.isArray(field) && field.length > 0) {
          const [voiceId, rawText] = Array.isArray(field[0]) ? field[0] : field;
          const text = typeof rawText === 'string' ? rawText : '';
          const variants = text.split('|').map((part) => part.trim()).filter(Boolean);
          for (const variant of variants) {
            lines.push({
              type,
              label: WORD_LABELS[type] || type,
              voiceId: String(voiceId || ''),
              text: variant,
            });
          }
        } else if (typeof field === 'string' && field.trim()) {
          lines.push({ type, label: WORD_LABELS[type] || type, voiceId: '', text: field.trim() });
        }
      }
      if (lines.length > 0) {
        if (!map[group]) map[group] = [];
        map[group].push(...lines);
      }
    }
  }
  await writeJsonCache(cacheName, { fetchedAt: Date.now(), map });
  return map;
}

/** English display titles from the community viewer's own index. */
async function loadCommunityNames() {
  const cached = await readJsonCache('community-names.json');
  if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CATALOG_TTL_MS && cached.map) return cached.map;
  const map = {};
  try {
    const text = await fetchWithTimeout(COMMUNITY_NAMES, { timeoutMs: 20_000 }).then((response) => (response.ok ? response.text() : ''));
    for (const match of text.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) map[match[2].toLowerCase()] = match[1];
  } catch {
    /* optional */
  }
  await writeJsonCache('community-names.json', { fetchedAt: Date.now(), map });
  return map;
}

function modelFromPath(sourceKey, path, names, community) {
  if (!/\.model3\.json$/i.test(path)) return null;
  const parts = path.split('/');
  if (parts.length < 2) return null;
  const file = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  if (file.replace(/\.model3\.json$/i, '').toLowerCase() !== folder.toLowerCase()) return null;
  const base = folder.toLowerCase();
  const underscore = base.lastIndexOf('_');
  const stem = underscore > 0 ? base.slice(0, underscore) : base;
  const variant = underscore > 0 ? base.slice(underscore + 1) : '';
  const ship = names[base] || names[base.replace(/_hx$/, '')] || names[variant] || names[stem] || null;
  const communityTitle = community[base] || '';
  return {
    id: base,
    folder,
    file,
    source: sourceKey,
    stem,
    variant,
    nameCn: ship ? ship.shipCn || '' : '',
    nameEn: ship ? ship.shipEn || '' : '',
    skin: ship ? ship.skinCn || ship.skinEn || '' : '',
    skinEn: ship ? ship.skinEn || '' : '',
    shipId: ship ? ship.shipId || '' : '',
    animations: ship && Array.isArray(ship.animations) ? ship.animations : [],
    community: communityTitle,
  };
}

/* ------------------------------------------------------------------- plugin */

export const name = ROW_NAME;
export const inject = ['webServer'];

export function apply(ctx, config = {}) {
  const configured = Array.isArray(config.sources) ? config.sources.filter((key) => SOURCES[key]) : [];
  const sources = configured.length > 0 ? configured : DEFAULT_SOURCES;

  const log = (message, error) => {
    if (error) console.error('[azl-l2d] ' + message, error);
    else console.log('[azl-l2d] ' + message);
  };

  const state = { trees: new Map(), names: null, idToGroup: {}, community: null, catalog: null, catalogAt: 0, inflight: null };

  async function treeFor(sourceKey, { force = false } = {}) {
    const cached = state.trees.get(sourceKey);
    if (!force && cached && Date.now() - cached.fetchedAt < TREE_TTL_MS) return cached;
    const tree = await loadTree(sourceOf(sourceKey));
    state.trees.set(sourceKey, tree);
    await writeJsonCache('tree-' + b64url(sourceKey) + '.json', tree);
    return tree;
  }

  async function treeFromDisk(sourceKey) {
    const cached = await readJsonCache('tree-' + b64url(sourceKey) + '.json');
    if (cached && Array.isArray(cached.entries)) {
      state.trees.set(sourceKey, cached);
      return cached;
    }
    return null;
  }

  async function catalog({ force = false } = {}) {
    if (!force && state.catalog && Date.now() - state.catalogAt < CATALOG_TTL_MS) return state.catalog;
    if (state.inflight) return state.inflight;
    state.inflight = (async () => {
      if (!state.names) {
        const loaded = await loadShipNames().catch(() => ({ map: {}, idToGroup: {} }));
        state.names = loaded.map || {};
        state.idToGroup = loaded.idToGroup || {};
      }
      if (!state.community) state.community = await loadCommunityNames().catch(() => ({}));

      const byFolder = new Map();
      const sourceStats = [];
      for (const sourceKey of sources) {
        const source = SOURCES[sourceKey];
        let added = 0;
        if (sourceKey === 'alg-wiki/AzurLaneL2DViewer') {
          // Derived from the community index: folders are known to exist and are
          // addressed as <folder>/<folder>.model3.json.
          for (const id of Object.keys(state.community || {})) {
            const folder = id;
            if (byFolder.has(folder)) continue;
            const ship = state.names[folder] || state.names[folder.replace(/_hx$/, '')] || null;
            byFolder.set(folder, {
              id: folder,
              folder,
              file: folder + '.model3.json',
              source: sourceKey,
              stem: folder.replace(/_\d+.*$/, ''),
              size: 0,
              nameCn: ship ? ship.shipCn || '' : '',
              nameEn: ship ? ship.shipEn || '' : '',
              skin: ship ? ship.skinCn || ship.skinEn || '' : '',
              skinEn: ship ? ship.skinEn || '' : '',
              community: state.community[folder],
            });
            added += 1;
          }
          sourceStats.push({ source: sourceKey, count: added });
          continue;
        }
        let tree = null;
        try {
          tree = await treeFor(sourceKey, { force });
        } catch (error) {
          log('tree fetch failed for ' + sourceKey + ', trying disk cache', error);
          tree = await treeFromDisk(sourceKey);
        }
        if (!tree) {
          const fallback = await readJsonCache('catalog-' + b64url(sourceKey) + '.json');
          if (fallback && Array.isArray(fallback.models)) {
            for (const model of fallback.models) {
              if (!model || !model.folder || byFolder.has(model.folder)) continue;
              const ship = state.names[model.folder] || null;
              byFolder.set(model.folder, {
                ...model,
                source: sourceKey,
                nameCn: (ship && ship.shipCn) || model.nameCn || '',
                nameEn: (ship && ship.shipEn) || model.nameEn || '',
                skin: (ship && (ship.skinCn || ship.skinEn)) || model.skin || '',
                community: model.community || state.community[model.folder] || '',
              });
              added += 1;
            }
            sourceStats.push({ source: sourceKey, count: added, cached: true });
            continue;
          }
          sourceStats.push({ source: sourceKey, count: 0, error: 'unavailable' });
          continue;
        }
        for (const entry of tree.entries) {
          const model = modelFromPath(sourceKey, entry.path, state.names, state.community);
          if (!model) continue;
          if (byFolder.has(model.id)) continue; // earlier sources win
          model.size = entry.size;
          byFolder.set(model.id, model);
          added += 1;
        }
        sourceStats.push({ source: sourceKey, count: added });
      }

      const models = [...byFolder.values()].map((model) => ({
        ...model,
        name: model.nameCn || model.nameEn || model.community || model.id,
      }));
      models.sort((a, b) => (a.nameCn || a.community || a.id).localeCompare(b.nameCn || b.community || b.id, 'zh-Hans-CN'));

      const groups = new Map();
      for (const model of models) {
        const key = model.stem || model.id;
        if (!groups.has(key)) groups.set(key, { stem: key, name: model.nameCn, nameEn: model.nameEn, skins: [] });
        groups.get(key).skins.push(model.id);
      }

      const built = {
        builtAt: Date.now(),
        sources: sourceStats,
        count: models.length,
        groups: [...groups.values()],
        models,
      };
      state.catalog = built;
      state.catalogAt = Date.now();
      await writeJsonCache('catalog-merged.json', built);
      for (const stat of sourceStats) {
        const own = models.filter((model) => model.source === stat.source);
        if (own.length > 0) await writeJsonCache('catalog-' + b64url(stat.source) + '.json', { models: own });
      }
      log('catalog: ' + built.count + ' model(s) from ' + sourceStats.map((item) => item.source + '=' + item.count).join(', '));
      return built;
    })().finally(() => {
      state.inflight = null;
    });
    return state.inflight;
  }

  /* ---- asset + descriptor caching ---- */

  function assetCachePath(sourceKey, relative) {
    const hash = createHash('sha1').update(sourceKey + '\u0000' + relative).digest('hex');
    return join(cacheRoot(), 'assets', hash + '.bin');
  }

  async function readCachedAsset(sourceKey, relative) {
    try {
      const buffer = await readFile(assetCachePath(sourceKey, relative));
      return buffer.length > 0 ? buffer : null;
    } catch {
      return null;
    }
  }

  async function writeCachedAsset(sourceKey, relative, buffer) {
    try {
      const dir = join(cacheRoot(), 'assets');
      await mkdir(dir, { recursive: true });
      const names = await readdir(dir);
      if (names.length > ASSET_CACHE_LIMIT) {
        for (const stale of names.slice(0, names.length - ASSET_CACHE_LIMIT)) {
          await unlink(join(dir, stale)).catch(() => {});
        }
      }
      await writeFile(assetCachePath(sourceKey, relative), buffer);
    } catch {
      /* cache is an optimisation only */
    }
  }

  async function fetchMirror(sourceKey, relative) {
    if (relative.includes('..') || relative.startsWith('/')) throw new Error('bad path');
    const source = sourceOf(sourceKey);
    let lastError = null;
    // raw GitHub first: measured ~3x faster than the CDN for these large PNGs.
    for (const url of [rawUrl(source, relative), cdnUrl(source, relative)]) {
      try {
        const response = await fetchWithTimeout(url, { headers: { 'user-agent': 'dsh-azl-l2d/1.0' } });
        if (!response.ok) {
          lastError = new Error('HTTP ' + response.status + ' from ' + url);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('asset unavailable');
  }

  async function readAsset(sourceKey, relative) {
    const cached = await readCachedAsset(sourceKey, relative);
    if (cached) return cached;
    const response = await fetchMirror(sourceKey, relative);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeCachedAsset(sourceKey, relative, buffer);
    return buffer;
  }

  async function readJsonAsset(sourceKey, relative) {
    const buffer = await readAsset(sourceKey, relative);
    return JSON.parse(buffer.toString('utf8'));
  }

  function shipIdForFolder(folder) {
    const names = state.names || {};
    const ship = names[folder] || names[folder.replace(/_hx$/, '')] || null;
    return ship && ship.shipId ? ship.shipId : '';
  }

  const webServer = ctx.get('webServer');
  if (!webServer) {
    log('webServer unavailable; viewer stopped');
    return;
  }

  const proxyUrl = (ref, sourceKey) =>
    API_PREFIX + '/raw?ref=' + b64url(ref) + '&source=' + encodeURIComponent(sourceKey);

  function rewriteDescriptor(raw, baseDir, sourceKey) {
    const clone = JSON.parse(JSON.stringify(raw));
    const refs = clone.FileReferences || (clone.FileReferences = {});
    const rewrite = (value) => {
      if (typeof value !== 'string' || !value) return value;
      const resolved = posix.normalize(posix.join(baseDir, value));
      return proxyUrl(resolved, sourceKey);
    };
    if (typeof refs.Moc === 'string') refs.Moc = rewrite(refs.Moc);
    if (Array.isArray(refs.Textures)) refs.Textures = refs.Textures.map(rewrite);
    if (typeof refs.Physics === 'string') refs.Physics = rewrite(refs.Physics);
    if (typeof refs.Pose === 'string') refs.Pose = rewrite(refs.Pose);
    if (typeof refs.DisplayInfo === 'string') refs.DisplayInfo = rewrite(refs.DisplayInfo);
    if (typeof refs.UserData === 'string') refs.UserData = rewrite(refs.UserData);
    if (refs.Motions && typeof refs.Motions === 'object') {
      const remapped = {};
      const seenFiles = new Set();
      for (const group of Object.keys(refs.Motions)) {
        const list = Array.isArray(refs.Motions[group]) ? refs.Motions[group] : [];
        const files = list
          .filter((item) => item && typeof item.File === 'string')
          .map((item) => ({ ...item, stem: item.File.split('/').pop().replace(/\?.*$/, '').replace(/\.motion3\.json.*$/i, ''), File: rewrite(item.File) }));
        if (group !== '' && group !== 'default') {
          remapped[group] = [...(remapped[group] || []), ...files];
          continue;
        }
        for (const item of files) {
          if (seenFiles.has(item.File)) continue;
          seenFiles.add(item.File);
          const key = item.stem || 'motion';
          const unique = remapped[key] ? key + '_' + (Object.keys(remapped).length + 1) : key;
          remapped[unique] = [{ File: item.File }];
        }
      }
      refs.Motions = remapped;
    }
    if (Array.isArray(refs.Expressions)) {
      refs.Expressions = refs.Expressions.map((item) => (item && typeof item.File === 'string' ? { ...item, File: rewrite(item.File) } : item));
    }
    return clone;
  }

  function summarize(raw) {
    const refs = raw && raw.FileReferences ? raw.FileReferences : {};
    const motionGroups = new Map();
    const groups = refs.Motions && typeof refs.Motions === 'object' ? refs.Motions : {};
    let motionCount = 0;
    for (const group of Object.keys(groups)) {
      const list = Array.isArray(groups[group]) ? groups[group] : [];
      if (list.length === 0) continue;
      const groupName = group === '' ? 'Default' : group;
      for (const item of list) {
        if (!item || typeof item.File !== 'string') continue;
        motionCount += 1;
        const label = motionLabel(item.File.split('/').pop());
        if (!motionGroups.has(groupName)) motionGroups.set(groupName, []);
        motionGroups.get(groupName).push(label);
      }
    }
    const motions = [];
    for (const group of Object.keys(groups)) {
      const list = Array.isArray(groups[group]) ? groups[group] : [];
      for (const item of list) {
        if (!item || typeof item.File !== 'string') continue;
        const name = group || item.File.split('/').pop().replace(/\.motion3\.json$/i, '');
        if (motions.some((entry) => entry.name === name)) continue;
        motions.push({ name, group: group || 'Default', file: item.File });
      }
    }
    return {
      motions,
      moc: typeof refs.Moc === 'string' ? refs.Moc : '',
      textures: Array.isArray(refs.Textures) ? refs.Textures.length : 0,
      physics: typeof refs.Physics === 'string' ? refs.Physics : '',
      motionCount,
      motionGroups: [...motionGroups.entries()].map(([group, labels]) => ({ group, labels })),
      hitAreas: Array.isArray(raw.HitAreas) ? raw.HitAreas.map((area) => area && area.Id).filter(Boolean) : [],
    };
  }

  async function descriptorFor(sourceKey, folder) {
    const source = sourceOf(sourceKey);
    const relative = posix.join(source.root, folder, folder + '.model3.json');
    const raw = await readJsonAsset(sourceKey, relative);
    const baseDir = posix.dirname(relative);
    const rewritten = rewriteDescriptor(raw, baseDir, sourceKey);
    return { raw, rewritten, summary: summarize(rewritten), relative, baseDir };
  }

  function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  const handler = async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const action = url.pathname.slice(API_PREFIX.length).replace(/^\//, '');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      res.end();
      return;
    }
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
      return;
    }

    try {
      if (action === 'catalog') {
        const data = await catalog({ force: url.searchParams.get('refresh') === '1' });
        sendJson(res, 200, { ok: true, ...data });
        return;
      }

      if (action === 'model') {
        const folder = url.searchParams.get('folder') || '';
        const sourceKey = url.searchParams.get('source') || sources[0];
        if (!folder || !/^[\w.\-()（）\u4e00-\u9fff]+$/.test(folder)) throw new Error('bad folder');
        const descriptor = await descriptorFor(sourceKey, folder);
        sendJson(res, 200, {
          ok: true,
          folder,
          source: sourceKey,
          summary: descriptor.summary,
          descriptor: descriptor.rewritten,
        });
        return;
      }

      if (action === 'descriptor') {
        const folder = url.searchParams.get('folder') || '';
        const sourceKey = url.searchParams.get('source') || sources[0];
        if (!folder) throw new Error('bad folder');
        const descriptor = await descriptorFor(sourceKey, folder);
        sendJson(res, 200, descriptor.rewritten);
        return;
      }

      if (action === 'raw') {
        const ref = unb64url(url.searchParams.get('ref') || '');
        if (!ref || ref.includes('..') || ref.startsWith('/')) throw new Error('bad ref');
        const sourceKey = url.searchParams.get('source') || sources[0];
        const buffer = await readAsset(sourceKey, ref);
        res.writeHead(200, {
          'content-type': contentTypeOf(ref),
          'content-length': buffer.length,
          'cache-control': 'public, max-age=604800, immutable',
          'access-control-allow-origin': '*',
        });
        res.end(buffer);
        return;
      }

      if (action === 'warm') {
        const folder = url.searchParams.get('folder') || '';
        const sourceKey = url.searchParams.get('source') || sources[0];
        if (!folder || !/^[\w.\-()（）\u4e00-\u9fff]+$/.test(folder)) throw new Error('bad folder');
        const source = sourceOf(sourceKey);
        const baseDir = posix.join(source.root, folder);
        const raw = await readJsonAsset(sourceKey, posix.join(baseDir, folder + '.model3.json')).catch(() => null);
        if (!raw) {
          sendJson(res, 200, { ok: false, error: 'descriptor-unavailable' });
          return;
        }
        const files = [];
        if (raw.FileReferences) {
          if (typeof raw.FileReferences.Moc === 'string') files.push(raw.FileReferences.Moc);
          if (Array.isArray(raw.FileReferences.Textures)) files.push(...raw.FileReferences.Textures);
          if (typeof raw.FileReferences.Physics === 'string') files.push(raw.FileReferences.Physics);
        }
        let cachedBytes = 0;
        for (const file of files.slice(0, 6)) {
          try {
            const relative = posix.join(baseDir, file);
            const buffer = await readAsset(sourceKey, relative);
            cachedBytes += buffer.length;
          } catch {
            /* best-effort */
          }
        }
        sendJson(res, 200, { ok: true, cachedBytes });
        return;
      }

      if (action === 'dialogue') {
        const folder = url.searchParams.get('folder') || '';
        const locale = url.searchParams.get('lang') === 'en' ? 'EN' : 'CN';
        if (!folder) throw new Error('bad folder');
        if (!state.words) state.words = {};
        if (!state.words[locale]) state.words[locale] = await loadWords(locale, state.idToGroup);
        const shipId = shipIdForFolder(folder);
        const lines = (shipId && state.words[locale][shipId]) || [];
        const groups = [];
        const seen = new Set();
        for (const line of lines) {
          if (!seen.has(line.type)) {
            seen.add(line.type);
            groups.push({ type: line.type, label: line.label, lines: [] });
          }
          groups.find((group) => group.type === line.type).lines.push(line);
        }
        sendJson(res, 200, {
          ok: true,
          folder,
          shipId,
          voiceConfigured: Boolean(config.voiceBaseUrl),
          groups,
          count: lines.length,
        });
        return;
      }

      if (action === 'voice') {
        const voiceId = (url.searchParams.get('id') || '').replace(/[^0-9]/g, '');
        const base = typeof config.voiceBaseUrl === 'string' ? config.voiceBaseUrl.replace(/\/+$/, '') : '';
        if (!base || !voiceId) {
          sendJson(res, 404, { ok: false, error: 'no-voice-source' });
          return;
        }
        const target = base + '/' + voiceId + '.mp3';
        const response = await fetchWithTimeout(target, { timeoutMs: 20_000 });
        if (!response.ok) {
          sendJson(res, 404, { ok: false, error: 'voice-missing' });
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        res.writeHead(200, {
          'content-type': 'audio/mpeg',
          'content-length': buffer.length,
          'cache-control': 'public, max-age=86400',
          'access-control-allow-origin': '*',
        });
        res.end(buffer);
        return;
      }

      if (action === 'runtime') {
        const target = RUNTIME_URLS[url.searchParams.get('name') || ''];
        if (!target) {
          sendJson(res, 404, { ok: false, error: 'unknown-runtime' });
          return;
        }
        const response = await fetchWithTimeout(target);
        if (!response.ok) throw new Error('runtime HTTP ' + response.status);
        const buffer = Buffer.from(await response.arrayBuffer());
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'content-length': buffer.length,
          'cache-control': 'public, max-age=86400',
          'access-control-allow-origin': '*',
        });
        res.end(buffer);
        return;
      }

      if (action === 'health') {
        const builtAt = state.catalog ? state.catalog.builtAt : 0;
        sendJson(res, 200, {
          ok: true,
          sources,
          models: state.catalog ? state.catalog.count : 0,
          sourceStats: state.catalog ? state.catalog.sources : [],
          catalogAgeMs: builtAt ? Date.now() - builtAt : null,
        });
        return;
      }

      sendJson(res, 404, { ok: false, error: 'unknown-action' });
    } catch (error) {
      log('request failed: ' + url.pathname, error);
      sendJson(res, 502, {
        ok: false,
        error: 'upstream-failed',
        message: String(error && error.message ? error.message : error),
      });
    }
  };

  ctx.effect(() => webServer.register({ kind: 'prefix', path: API_PREFIX, handler }), 'azl-l2d: api route');
  void catalog({}).catch((error) => log('warm-up catalog failed', error));
}

export default { name, inject, apply };
