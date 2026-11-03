/**
 * Local plugin discovery for the GitHub vault.
 *
 * A plugin is a directory directly under the scan root that either declares
 * `dsh` in its package.json or carries a cordis.patch.yml. Every uploadable
 * file is read once to compute its Git blob id, which is the only value the
 * GitHub tree comparison needs.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.idea',
  '.vscode',
  '.plugin-manager',
  '.cache',
  'coverage',
]);

const IGNORED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.npmrc',
  '.netrc',
  '.env',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
]);

const SECRET_SUFFIXES = ['.pem', '.key', '.p12', '.pfx', '.keystore'];

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_FILES = 3000;

export function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`, 'utf8'))
    .update(buffer)
    .digest('hex');
}

export function safeId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 120
    && !id.includes('/') && !id.includes('\\') && id !== '.' && id !== '..';
}

function isSecretFile(name) {
  const lower = name.toLowerCase();
  if (IGNORED_FILES.has(name)) return true;
  if (lower.startsWith('.env.')) return true;
  return SECRET_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function cleanMarkdown(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(markdown) {
  const blocks = String(markdown).split(/\n\s*\n/);
  for (const block of blocks) {
    const cleaned = cleanMarkdown(block);
    if (cleaned.length < 24) continue;
    if (/^(badge|build|license|coverage|npm|downloads)\b/i.test(cleaned) && cleaned.length < 80) continue;
    return cleaned;
  }
  return cleanMarkdown(markdown).slice(0, 280);
}

function trimText(text, limit) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value.length <= limit) return value;
  const head = value.slice(0, limit);
  const stop = Math.max(head.lastIndexOf('。'), head.lastIndexOf('. '), head.lastIndexOf('；'), head.lastIndexOf(';'));
  if (stop >= limit * 0.55) return head.slice(0, stop + 1).trim();
  return head.trimEnd() + '…';
}

async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function readJson(file) {
  const text = await readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readLocaleMeta(dir) {
  let names = [];
  try {
    names = await readdir(path.join(dir, 'locale'));
  } catch {
    return null;
  }
  const ordered = names
    .filter((name) => /\.json$/i.test(name))
    .sort((a, b) => {
      const rank = (name) => {
        const lower = name.toLowerCase();
        if (lower === 'zh.json' || lower === 'zh-cn.json' || lower === 'zh-hans.json') return 0;
        if (lower.startsWith('zh')) return 1;
        if (lower.startsWith('en')) return 2;
        return 3;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  for (const name of ordered) {
    const data = await readJson(path.join(dir, 'locale', name));
    const meta = data && typeof data === 'object' ? data.meta : null;
    if (meta && (typeof meta.title === 'string' || typeof meta.description === 'string')) {
      return {
        title: typeof meta.title === 'string' ? meta.title.trim() : '',
        description: typeof meta.description === 'string' ? meta.description.trim() : '',
        file: `locale/${name}`,
      };
    }
  }
  return null;
}

function collectNames(source, pattern) {
  const found = [];
  for (const match of String(source).matchAll(pattern)) {
    const value = match[1];
    if (value && !found.includes(value)) found.push(value);
    if (found.length >= 24) break;
  }
  return found;
}

function collectPatchRows(text) {
  const rows = [];
  for (const block of String(text).split(/^\s*-\s+/m)) {
    const id = block.match(/(?:^|\s)id:\s*['"]?([A-Za-z0-9_.@/-]+)/);
    if (!id) continue;
    const name = block.match(/(?:^|\s)name:\s*['"]?([^'"\s#]+)/);
    rows.push({ id: id[1], name: name ? name[1] : '' });
  }
  return rows;
}

/**
 * A bundle whose patch references sibling packages with the same name prefix
 * owns those packages as components. Paper Ink is the canonical case:
 * @local/paper-ink references @local/paper-ink-theme, -type, -layout, -design.
 */
function groupComponents(plugins) {
  const byName = new Map(plugins.map((plugin) => [plugin.name, plugin]));
  for (const parent of plugins) {
    if (parent.parentId) continue;
    for (const row of parent.rowEntries) {
      if (!row.name) continue;
      const child = byName.get(row.name);
      if (!child || child === parent || child.parentId) continue;
      const sameFamily = child.name.startsWith(`${parent.name}-`) || child.id.startsWith(`${parent.id}-`);
      if (!sameFamily) continue;
      child.parentId = parent.id;
      parent.componentIds.push(child.id);
    }
  }
  for (const plugin of plugins) {
    if (plugin.parentId) {
      plugin.repoPrefix = `plugins/${plugin.parentId}/components/${plugin.id}/`;
    } else {
      plugin.repoPrefix = `plugins/${plugin.id}/`;
    }
  }
  for (const plugin of plugins) {
    plugin.componentIds.sort((a, b) => {
      const left = plugins.find((entry) => entry.id === a);
      const right = plugins.find((entry) => entry.id === b);
      return (left ? left.title : a).localeCompare(right ? right.title : b, 'zh-Hans-CN');
    });
  }
}

async function walkFiles(root, pluginId, pluginDir, budget, skipped) {
  const files = [];
  const pluginWarning = [];

  async function walk(dir, relative) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      pluginWarning.push(`无法读取目录：${relative || '.'}`);
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        pluginWarning.push(`文件数超过上限 ${MAX_FILES}，其余已略过。`);
        return;
      }
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        if (skipped.length < 80) skipped.push({ path: rel, reason: 'symlink' });
        continue;
      }
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(abs, rel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isSecretFile(entry.name)) {
        if (skipped.length < 80) skipped.push({ path: rel, reason: 'secret' });
        continue;
      }
      let info;
      try {
        info = await lstat(abs);
      } catch {
        continue;
      }
      if (info.size > MAX_FILE_BYTES) {
        if (skipped.length < 80) skipped.push({ path: rel, reason: 'large' });
        continue;
      }
      if (budget.total + info.size > MAX_TOTAL_BYTES) {
        pluginWarning.push('总大小超过 40 MB，其余文件已略过。');
        return;
      }
      let buffer;
      try {
        buffer = await readFile(abs);
      } catch {
        if (skipped.length < 80) skipped.push({ path: rel, reason: 'unreadable' });
        continue;
      }
      budget.total += buffer.length;
      files.push({
        path: rel,
        size: buffer.length,
        sha: gitBlobSha(buffer),
      });
    }
  }

  await walk(pluginDir, '');
  files.sort((a, b) => {
    const rank = (file) => {
      if (file.path === 'package.json') return 0;
      if (file.path === 'cordis.patch.yml') return 1;
      if (/^readme(\.|$)/i.test(file.path)) return 2;
      if (file.path.startsWith('locale/')) return 3;
      return 4;
    };
    return rank(a) - rank(b) || a.path.localeCompare(b.path);
  });
  return { files, warning: pluginWarning };
}

function describeForms(pkg, source, hasPatch, tools) {
  const forms = [];
  const dsh = pkg && typeof pkg.dsh === 'object' ? pkg.dsh : null;
  if (dsh && dsh.client) forms.push('Web 界面');
  if (dsh && dsh.bundle) forms.push('Host 插件');
  if (!dsh && hasPatch) forms.push('配置层');
  if (tools.length > 0) forms.push('工具');
  if (forms.length === 0) forms.push('插件包');
  return [...new Set(forms)];
}

async function inspectPlugin(root, id, budget, skipped) {
  const dir = path.join(root, id);
  const pkgPath = path.join(dir, 'package.json');
  const pkg = await readJson(pkgPath);
  if (!pkg) return null;
  let patchText = await readText(path.join(dir, 'cordis.patch.yml'));
  const hasPatch = patchText !== null;
  const dsh = typeof pkg.dsh === 'object' && pkg.dsh !== null ? pkg.dsh : null;
  if (!dsh && !hasPatch) return null;

  const meta = await readLocaleMeta(dir);
  const readme = await readText(path.join(dir, 'README.md'));
  const indexSource = await readText(path.join(dir, 'index.js')) || '';
  const clientSource = await readText(path.join(dir, 'client.js')) || '';
  const tools = collectNames(indexSource, /ctx\.tools\.register\s*\(\s*\{[\s\S]{0,600}?\bname:\s*['"]([^'"]+)['"]/g);
  const slots = collectNames(clientSource, /ctx\.slots\.register\s*\(\s*\{[\s\S]{0,400}?\bname:\s*['"]([^'"]+)['"]/g);
  const rowEntries = hasPatch ? collectPatchRows(patchText) : [];
  const rows = rowEntries.map((row) => row.id);

  const { files, warning } = await walkFiles(root, id, dir, budget, skipped);
  const fileMap = new Map(files.map((file) => [file.path, file]));

  const description = (meta && meta.description)
    || (typeof pkg.description === 'string' ? pkg.description.trim() : '')
    || (readme ? firstParagraph(readme) : '');
  const title = (meta && meta.title)
    || (typeof pkg.name === 'string' ? pkg.name.replace(/^@[^/]+\//, '') : id);
  const intro = trimText(description, 220);

  return {
    id,
    name: typeof pkg.name === 'string' ? pkg.name : `@local/${id}`,
    version: typeof pkg.version === 'string' ? pkg.version : '',
    title: title || id,
    description,
    intro,
    forms: describeForms(pkg, indexSource + clientSource, hasPatch, tools),
    tools,
    slots,
    rows,
    rowEntries,
    parentId: null,
    componentIds: [],
    repoPrefix: '',
    path: dir,
    fileCount: files.length,
    size: files.reduce((total, file) => total + file.size, 0),
    files,
    fileMap,
    readme: readme
      ? {
        exists: true,
        path: `${id}/README.md`,
        excerpt: trimText(firstParagraph(readme), 320),
      }
      : null,
    warnings: warning,
  };
}

export async function scanPlugins(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const plugins = [];
  const skipped = [];
  const warnings = [];
  const budget = { total: 0 };
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const id = entry.name;
    try {
      const plugin = await inspectPlugin(root, id, budget, skipped);
      if (plugin) plugins.push(plugin);
    } catch (error) {
      warnings.push(`${id}：${error && error.message ? error.message : '读取失败'}`);
    }
  }
  plugins.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  groupComponents(plugins);
  return { root, plugins, skipped, warnings };
}

export async function listPluginDirs(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
}

export function publicPlugin(plugin) {
  const { fileMap, rowEntries, ...rest } = plugin;
  return {
    ...rest,
    files: plugin.files.map((file) => ({
      ...file,
      repoPath: `${plugin.repoPrefix}${file.path}`,
    })),
  };
}
