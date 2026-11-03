/**
 * Host half of Plugin Ascent (插件上行).
 *
 * Responsibilities:
 *   1. discover DSH plugin packages under one root directory;
 *   2. keep the GitHub token in the Harness credential store, never the browser;
 *   3. compare local Git blob ids with the remote tree;
 *   4. compose the index README and per-package README stubs;
 *   5. write one atomic commit through the Git Data API.
 */

import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { Github, GithubError } from './lib/api.js';
import { generateDocs } from './lib/docs.js';
import { gitBlobSha, publicPlugin, safeId, scanPlugins } from './lib/scan.js';

const name = '@local/github-vault';
const API = '/api/github-vault';
const VERSION = '1.0.0';
const RECORD_KEY = 'github-vault/token';
const MAX_BODY = 512 * 1024;
const DEFAULT_REPO = 'dsh-plugins';
const DEFAULT_BRANCH = 'main';
const REPO_DESCRIPTION = '插件 · DeepSeek Harness 插件合集';
const REPO_TOPICS = ['dsh', 'dsh-plugin', 'deepseek-harness', 'cordis'];

export const inject = ['webServer', 'credentials'];

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function log(message, error) {
  if (error) console.error(`[github-vault] ${message}`, error);
  else console.log(`[github-vault] ${message}`);
}

function configFile() {
  const home = process.env.DSH_HOME || path.join(homedir(), '.dsh');
  return path.join(home, 'github-vault.json');
}

function cleanText(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function summarizeRepo(repo) {
  return {
    exists: true,
    id: repo.id,
    owner: repo.owner && repo.owner.login ? repo.owner.login : '',
    name: repo.name,
    fullName: repo.full_name,
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch,
    htmlUrl: repo.html_url,
    size: repo.size,
    permissions: repo.permissions || null,
    canPush: !repo.permissions || repo.permissions.push !== false,
  };
}

function repoState(owner, repoName) {
  return { exists: false, owner, name: repoName, empty: true };
}

function normalizeSelection(input, plugins) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AppError(400, 'selection-empty', '请至少选择一个插件。');
  }
  if (input.length > 200) throw new AppError(400, 'selection-large', '一次最多选择 200 个插件。');
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const seen = new Set();
  const selection = [];
  for (const raw of input) {
    const id = raw && typeof raw.id === 'string' ? raw.id : '';
    if (!safeId(id) || !byId.has(id)) throw new AppError(400, 'plugin-unknown', `未找到插件：${id || '(空)'}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const plugin = byId.get(id);
    if (plugin.parentId) {
      throw new AppError(400, 'component-selection', `「${plugin.title}」是组件，随所属插件一并上传。`);
    }
    let files;
    if (plugin.componentIds.length > 0) {
      files = plugin.files.map((file) => file.path);
    } else if (Array.isArray(raw.files)) {
      files = [...new Set(raw.files.filter((file) => typeof file === 'string'))];
      if (files.length === 0) throw new AppError(400, 'files-empty', `插件「${plugin.title}」未选择任何文件。`);
      for (const file of files) {
        if (!plugin.fileMap.has(file)) {
          throw new AppError(400, 'file-unknown', `插件「${plugin.title}」中不存在文件：${file}`);
        }
      }
    } else {
      files = plugin.files.map((file) => file.path);
    }
    const intro = typeof raw.intro === 'string' ? raw.intro.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
    selection.push({ id, files, intro });
  }
  return selection;
}

function makePlan({ plugins, selection, remote, config, owner, mode }) {
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const componentsByParent = new Map();
  for (const plugin of plugins) {
    if (!plugin.parentId) continue;
    if (!componentsByParent.has(plugin.parentId)) componentsByParent.set(plugin.parentId, []);
    componentsByParent.get(plugin.parentId).push(plugin);
  }
  for (const components of componentsByParent.values()) {
    components.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }

  const chosen = [];
  const selectedByPlugin = new Map();
  for (const item of selection) {
    const plugin = byId.get(item.id);
    if (!plugin) throw new AppError(400, 'plugin-unknown', `未找到插件：${item.id}`);
    const components = componentsByParent.get(plugin.id) || [];
    chosen.push({
      ...plugin,
      ...(item.intro ? { intro: item.intro } : {}),
      components,
    });
    if (plugin.componentIds.length > 0) {
      selectedByPlugin.set(plugin.id, new Set(plugin.files.map((file) => file.path)));
      for (const component of components) {
        selectedByPlugin.set(component.id, new Set(component.files.map((file) => file.path)));
      }
    } else {
      selectedByPlugin.set(plugin.id, new Set(item.files));
    }
  }

  const remoteFiles = remote && remote.exists && !remote.empty ? remote.files : {};
  const remoteDirs = new Set();
  for (const remotePath of Object.keys(remoteFiles)) {
    if (!remotePath.startsWith('plugins/')) continue;
    const dir = remotePath.split('/')[1];
    if (dir) remoteDirs.add(dir);
  }
  const preservedDirs = mode === 'replace'
    ? []
    : [...remoteDirs].filter((dir) => !selectedByPlugin.has(dir)).sort((a, b) => a.localeCompare(b));

  const docs = generateDocs({
    plugins: chosen,
    selectedByPlugin,
    owner,
    repo: config.repo,
    preservedDirs,
  });

  const desired = new Map();
  for (const plugin of chosen) {
    for (const file of selectedByPlugin.get(plugin.id)) {
      const local = plugin.fileMap.get(file);
      if (!local) throw new AppError(400, 'file-unknown', `插件「${plugin.title}」中不存在文件：${file}`);
      desired.set(`plugins/${plugin.id}/${file}`, {
        kind: 'file',
        abs: path.join(plugin.path, file),
        size: local.size,
        sha: local.sha,
        pluginId: plugin.id,
        rel: file,
      });
    }
    for (const component of plugin.components) {
      for (const file of selectedByPlugin.get(component.id)) {
        const local = component.fileMap.get(file);
        if (!local) throw new AppError(400, 'file-unknown', `组件「${component.title}」中不存在文件：${file}`);
        desired.set(`plugins/${plugin.id}/components/${component.id}/${file}`, {
          kind: 'file',
          abs: path.join(component.path, file),
          size: local.size,
          sha: local.sha,
          pluginId: plugin.id,
          componentId: component.id,
          rel: file,
        });
      }
    }
  }
  for (const doc of docs.perPlugin) {
    const content = doc.content;
    desired.set(doc.path, {
      kind: 'text',
      content,
      size: Buffer.byteLength(content, 'utf8'),
      sha: gitBlobSha(Buffer.from(content, 'utf8')),
      pluginId: doc.id,
      virtual: true,
    });
  }
  desired.set('README.md', {
    kind: 'text',
    content: docs.readme,
    size: Buffer.byteLength(docs.readme, 'utf8'),
    sha: gitBlobSha(Buffer.from(docs.readme, 'utf8')),
    virtual: true,
  });

  const statuses = {};
  const deleted = [];
  let added = 0;
  let changed = 0;
  let unchanged = 0;
  for (const [repoPath, entry] of desired) {
    const remoteEntry = remoteFiles[repoPath];
    if (!remoteEntry) {
      statuses[repoPath] = 'added';
      added += 1;
    } else if (remoteEntry.sha !== entry.sha) {
      statuses[repoPath] = 'changed';
      changed += 1;
    } else {
      statuses[repoPath] = 'same';
      unchanged += 1;
    }
  }
  for (const repoPath of Object.keys(remoteFiles)) {
    if (desired.has(repoPath)) continue;
    if (!repoPath.startsWith('plugins/')) continue;
    const dir = repoPath.split('/')[1];
    if (!dir) continue;
    if (mode === 'replace' || selectedByPlugin.has(dir)) {
      deleted.push({ path: repoPath, pluginId: dir });
    }
  }

  const warnings = [];
  if (remote && remote.truncated) warnings.push('远端文件树被 GitHub 截断，差分可能不完整。');
  if (remote && remote.exists && remote.repo && remote.repo.canPush === false) {
    warnings.push('当前令牌对该仓库没有写权限。');
  }
  const topIds = new Set(chosen.map((plugin) => plugin.id));
  const flatComponents = deleted.filter((item) => selectedByPlugin.has(item.pluginId) && !topIds.has(item.pluginId));
  if (flatComponents.length > 0) {
    warnings.push(`检测到旧版平铺组件 ${flatComponents.length} 个文件，将迁移至父插件的 components/ 目录。`);
  }
  const packageTargets = [];
  for (const plugin of chosen) {
    packageTargets.push({ plugin, selected: selectedByPlugin.get(plugin.id) });
    for (const component of plugin.components) {
      packageTargets.push({ plugin: component, selected: selectedByPlugin.get(component.id) });
    }
  }
  for (const target of packageTargets) {
    const { plugin, selected } = target;
    if (!selected) continue;
    if (!selected.has('package.json')) warnings.push(`插件「${plugin.title}」未选择 package.json，安装可能失败。`);
    if (plugin.files.some((file) => file.path === 'cordis.patch.yml') && !selected.has('cordis.patch.yml')) {
      warnings.push(`插件「${plugin.title}」未选择 cordis.patch.yml，bundle 可能无法装载。`);
    }
  }
  if (mode === 'replace' && deleted.length > 0) {
    warnings.push(`完全替换将删除 ${deleted.length} 个远端文件。`);
  }

  return {
    docs,
    desired,
    statuses,
    deleted,
    counts: { added, changed, unchanged, deleted: deleted.length, total: desired.size },
    preservedDirs,
    warnings,
    mode,
  };
}

function planForClient(plan, remote) {
  const desired = [];
  for (const [repoPath, entry] of plan.desired) {
    desired.push({
      path: repoPath,
      status: plan.statuses[repoPath],
      size: entry.size,
      pluginId: entry.pluginId,
      virtual: Boolean(entry.virtual),
    });
  }
  desired.sort((a, b) => a.path.localeCompare(b.path));
  return {
    docs: {
      readme: plan.docs.readme,
      perPlugin: plan.docs.perPlugin.map((doc) => ({ id: doc.id, path: doc.path, content: doc.content })),
    },
    desired,
    deleted: plan.deleted,
    counts: plan.counts,
    preservedDirs: plan.preservedDirs,
    warnings: plan.warnings,
    mode: plan.mode,
    remote: remote
      ? {
        exists: Boolean(remote.exists),
        empty: Boolean(remote.empty),
        branch: remote.branch,
        branchExists: Boolean(remote.branchExists),
        truncated: Boolean(remote.truncated),
        repo: remote.repo || null,
      }
      : null,
  };
}

async function runPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

export function apply(ctx) {
  let configPromise = null;
  let uploadInFlight = false;

  const defaultRoot = () => {
    try {
      const registry = ctx.get('workspaceRegistry');
      if (registry && typeof registry.list === 'function') {
        const list = registry.list();
        if (Array.isArray(list) && list.length > 0) {
          const preferred = list.find((workspace) => /default-workspace[\\/]?$/i.test(String(workspace.path || '')))
            || list[0];
          if (preferred && preferred.path) return preferred.path;
        }
      }
    } catch {
      /* registry is optional */
    }
    try {
      const wd = ctx.get('workingDirectory');
      if (wd && typeof wd.defaultDirectory === 'string' && wd.defaultDirectory) return wd.defaultDirectory;
    } catch {
      /* optional service */
    }
    return process.cwd();
  };

  function workspaceList() {
    try {
      const registry = ctx.get('workspaceRegistry');
      if (!registry || typeof registry.list !== 'function') return [];
      return registry.list().map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        path: workspace.path,
      }));
    } catch {
      return [];
    }
  }

  async function loadConfig() {
    if (!configPromise) {
      configPromise = (async () => {
        let stored = {};
        try {
          const raw = await readFile(configFile(), 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') stored = parsed;
        } catch {
          /* first run */
        }
        const root = typeof stored.root === 'string' && stored.root.trim()
          ? path.resolve(stored.root)
          : '';
        const storedRepo = cleanText(stored.repo, 100) || DEFAULT_REPO;
        return {
          owner: cleanText(stored.owner, 100).replace(/^@/, ''),
          repo: /^[A-Za-z0-9._-]+$/.test(storedRepo) ? storedRepo : DEFAULT_REPO,
          branch: cleanText(stored.branch, 200) || DEFAULT_BRANCH,
          root,
          private: stored.private === true,
        };
      })();
    }
    return configPromise;
  }

  async function persistConfig(next) {
    const target = configFile();
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.tmp`;
    const text = JSON.stringify(next, null, 2) + '\n';
    try {
      await writeFile(temp, text, { encoding: 'utf8', mode: 0o600 });
      await rename(temp, target);
    } catch {
      await writeFile(target, text, { encoding: 'utf8', mode: 0o600 });
    }
    configPromise = Promise.resolve(next);
    return next;
  }

  async function saveConfig(patch) {
    const current = await loadConfig();
    const next = { ...current };
    if ('owner' in patch) next.owner = cleanText(patch.owner, 100).replace(/^@/, '');
    if ('repo' in patch) {
      const repo = cleanText(patch.repo, 100) || DEFAULT_REPO;
      if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
        throw new AppError(400, 'repo-ascii', 'GitHub 仓库名只收 ASCII 字母、数字及 - _ .；中文标题请写入 README。');
      }
      next.repo = repo;
    }
    if ('branch' in patch) {
      const branch = cleanText(patch.branch, 200) || DEFAULT_BRANCH;
      if (/\s/.test(branch) || branch.startsWith('/') || branch.endsWith('/')) {
        throw new AppError(400, 'invalid-branch', '分支名不能含空格，且不能以斜杠开头或结尾。');
      }
      next.branch = branch;
    }
    if ('root' in patch) {
      const root = cleanText(patch.root, 1000);
      next.root = root ? path.resolve(root) : '';
    }
    if ('private' in patch) next.private = Boolean(patch.private);
    if (next.root) {
      try {
        const info = await stat(next.root);
        if (!info.isDirectory()) throw new Error('not a directory');
      } catch {
        throw new AppError(400, 'root-missing', `扫描目录不可用：${next.root}`);
      }
    }
    return persistConfig(next);
  }

  async function resolveRoot(config) {
    const root = config.root || defaultRoot();
    let info;
    try {
      info = await stat(root);
    } catch {
      throw new AppError(400, 'root-missing', `扫描目录不存在：${root}`);
    }
    if (!info.isDirectory()) throw new AppError(400, 'root-not-dir', `扫描路径不是目录：${root}`);
    return root;
  }

  async function readToken() {
    const record = await ctx.credentials.readRecord(RECORD_KEY);
    if (!record || record.kind !== 'api-key' || !record.key) return null;
    return record.key;
  }

  async function writeToken(token) {
    await ctx.credentials.modifyRecord(RECORD_KEY, async () => ({ kind: 'api-key', key: token }));
  }

  async function clearToken() {
    await ctx.credentials.deleteRecord(RECORD_KEY);
  }

  async function requireToken() {
    const token = await readToken();
    if (!token) throw new AppError(401, 'not-connected', '尚未连接 GitHub。');
    return token;
  }

  async function remoteSnapshot(gh, config, owner, knownRepo) {
    const repo = knownRepo === undefined ? await gh.getRepo(owner, config.repo) : knownRepo;
    if (!repo) return { ...repoState(owner, config.repo), branch: config.branch, files: {} };
    let ref = await gh.getRef(owner, config.repo, config.branch);
    let branchExists = Boolean(ref);
    let compareBranch = config.branch;
    if (!ref) {
      compareBranch = repo.default_branch || DEFAULT_BRANCH;
      ref = await gh.getRef(owner, config.repo, compareBranch);
      branchExists = false;
    }
    if (!ref) {
      return {
        exists: true,
        empty: true,
        owner,
        name: config.repo,
        branch: config.branch,
        branchExists: false,
        repo: summarizeRepo(repo),
        files: {},
      };
    }
    const treeRef = branchExists ? config.branch : compareBranch;
    const tree = await gh.getTree(owner, config.repo, treeRef);
    if (!tree) {
      return {
        exists: true,
        empty: false,
        owner,
        name: config.repo,
        branch: config.branch,
        branchExists: false,
        repo: summarizeRepo(repo),
        files: {},
      };
    }
    const files = {};
    for (const entry of tree.tree || []) {
      if (entry.type !== 'blob') continue;
      if (entry.path !== 'README.md' && !entry.path.startsWith('plugins/')) continue;
      files[entry.path] = { sha: entry.sha, size: entry.size };
    }
    return {
      exists: true,
      empty: false,
      owner,
      name: config.repo,
      branch: config.branch,
      branchExists,
      compareBranch,
      head: { sha: ref.object.sha },
      treeSha: tree.sha,
      truncated: Boolean(tree.truncated),
      repo: summarizeRepo(repo),
      files,
    };
  }

  async function ensureRepo(gh, config, user) {
    let owner = config.owner || user.login;
    if (!config.owner) {
      config = await saveConfig({ ...config, owner: user.login });
      owner = user.login;
    }
    let repo = await gh.getRepo(owner, config.repo);
    let created = false;
    if (!repo) {
      try {
        repo = await gh.createRepo(owner, config.repo, {
          private: config.private,
          description: REPO_DESCRIPTION,
          login: user.login,
        });
      } catch (error) {
        if (error instanceof GithubError && error.status === 422) {
          throw new AppError(
            422,
            'repo-create-rejected',
            `${error.message} 若因名称含非 ASCII 字符被拒，可改用 dsh-plugins 之类的 ASCII 名称。`,
          );
        }
        throw error;
      }
      created = true;
      log(`created repository ${owner}/${config.repo}`);
    }
    return { repo, created, owner, config };
  }

  async function resolveHead(gh, repo, owner, repoName, branch) {
    const ref = await gh.getRef(owner, repoName, branch);
    if (ref) return { sha: ref.object.sha, branchExists: true };
    const base = repo.default_branch && repo.default_branch !== branch
      ? await gh.getRef(owner, repoName, repo.default_branch)
      : null;
    return { sha: base ? base.object.sha : null, branchExists: false };
  }

  async function statePayload({ token, user, config } = {}) {
    config = config || await loadConfig();
    const root = config.root || defaultRoot();
    let auth = { connected: false };
    let authError = null;
    let activeToken = token;
    if (activeToken === undefined) activeToken = await readToken();
    if (activeToken && !user) {
      try {
        user = await new Github(activeToken).getUser();
      } catch (error) {
        authError = error instanceof Error ? error.message : 'GitHub 登录状态检查失败。';
      }
    }
    if (activeToken && user) {
      auth = {
        connected: true,
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatarUrl,
        htmlUrl: user.htmlUrl,
        scopes: user.scopes || '',
      };
    }
    let repo = null;
    let repoError = null;
    if (auth.connected) {
      const owner = config.owner || user.login;
      try {
        const data = await new Github(activeToken).getRepo(owner, config.repo);
        repo = data ? summarizeRepo(data) : repoState(owner, config.repo);
      } catch (error) {
        repoError = error instanceof Error ? error.message : 'GitHub 仓库状态检查失败。';
      }
    }
    return {
      ok: true,
      version: VERSION,
      config: {
        ...config,
        root,
        owner: config.owner || (auth.login || ''),
      },
      root,
      auth,
      authError,
      repo,
      repoError,
      workspaces: workspaceList(),
    };
  }

  async function scanForClient(config) {
    const root = await resolveRoot(config);
    const result = await scanPlugins(root);
    const children = new Map();
    for (const plugin of result.plugins) {
      if (!plugin.parentId) continue;
      if (!children.has(plugin.parentId)) children.set(plugin.parentId, []);
      children.get(plugin.parentId).push(plugin);
    }
    const plugins = result.plugins
      .filter((plugin) => !plugin.parentId)
      .map((plugin) => {
        const components = (children.get(plugin.id) || [])
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
          .map(publicPlugin);
        const groupFileCount = plugin.files.length
          + components.reduce((total, component) => total + component.files.length, 0);
        const groupSize = plugin.size
          + components.reduce((total, component) => total + component.size, 0);
        return {
          ...publicPlugin(plugin),
          components,
          groupFileCount,
          groupSize,
        };
      });
    return {
      ok: true,
      root,
      scannedAt: Date.now(),
      plugins,
      counts: {
        plugins: plugins.length,
        components: plugins.reduce((total, plugin) => total + plugin.components.length, 0),
      },
      skipped: result.skipped,
      warnings: result.warnings,
    };
  }

  async function previewPlan(input) {
    const config = await loadConfig();
    const root = await resolveRoot(config);
    const scanned = await scanPlugins(root);
    const selection = normalizeSelection(input && input.selection, scanned.plugins);
    const mode = input && input.mode === 'replace' ? 'replace' : 'sync';
    const token = await readToken();
    let remote = null;
    let remoteError = null;
    let owner = config.owner;
    if (token) {
      try {
        const gh = new Github(token);
        let user;
        if (!owner) {
          user = await gh.getUser();
          owner = user.login;
        }
        remote = await remoteSnapshot(gh, { ...config, repo: config.repo }, owner);
      } catch (error) {
        remoteError = error instanceof Error ? error.message : '远端状态读取失败。';
      }
    }
    const plan = makePlan({
      plugins: scanned.plugins,
      selection,
      remote,
      config,
      owner: owner || config.owner || '',
      mode,
    });
    return {
      ...planForClient(plan, remote),
      remoteError,
      root,
    };
  }

  async function performRemoteDelete(input) {
    if (uploadInFlight) throw new AppError(409, 'write-busy', '正在写入 GitHub，请稍候。');
    uploadInFlight = true;
    try {
      const token = await requireToken();
      const gh = new Github(token);
      const user = await gh.getUser();
      let config = await loadConfig();
      const root = await resolveRoot(config);
      const local = await scanPlugins(root);
      const owner = config.owner || user.login;
      if (!config.owner) config = await saveConfig({ ...config, owner: user.login });

      const repo = await gh.getRepo(owner, config.repo);
      if (!repo) throw new AppError(400, 'repo-missing', '远端仓库不存在，无法删除。');
      const remote = await remoteSnapshot(gh, config, owner, repo);
      if (!remote.exists || remote.empty) throw new AppError(400, 'repo-empty', '远端仓库没有可删除的插件。');

      const rawIds = input && Array.isArray(input.ids) ? input.ids : [];
      const ids = [...new Set(rawIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
      if (ids.length === 0) throw new AppError(400, 'delete-empty', '请选择要删除的远端插件。');
      if (ids.length > 50) throw new AppError(400, 'delete-large', '一次最多删除 50 个插件。');
      for (const id of ids) {
        if (!safeId(id)) throw new AppError(400, 'delete-id', `远端目录名不合法：${id}`);
      }

      const remoteDirs = new Set();
      for (const repoPath of Object.keys(remote.files || {})) {
        if (!repoPath.startsWith('plugins/')) continue;
        const dir = repoPath.split('/')[1];
        if (dir) remoteDirs.add(dir);
      }
      for (const id of ids) {
        if (!remoteDirs.has(id)) throw new AppError(404, 'delete-missing', `远端没有插件目录：${id}`);
      }
      const deletions = Object.keys(remote.files || {}).filter((repoPath) => (
        ids.some((id) => repoPath.startsWith(`plugins/${id}/`))
      ));
      if (deletions.length === 0) throw new AppError(400, 'delete-empty', '所选插件没有可删除的文件。');

      const remainingIds = new Set([...remoteDirs].filter((id) => !ids.includes(id)));
      const rebuildIndex = !input || input.rebuildIndex !== false;
      const warnings = [];
      const localIds = new Set(local.plugins.map((plugin) => plugin.id));
      const localDeleted = ids.filter((id) => localIds.has(id));
      if (localDeleted.length > 0) {
        warnings.push(`本地仍保留 ${localDeleted.length} 个插件；若下次上传仍选中，会重新加入。`);
      }

      const docsEntries = [];
      if (rebuildIndex) {
        const children = new Map();
        for (const plugin of local.plugins) {
          if (!plugin.parentId) continue;
          if (!children.has(plugin.parentId)) children.set(plugin.parentId, []);
          children.get(plugin.parentId).push(plugin);
        }
        const topLocal = local.plugins.filter((plugin) => !plugin.parentId);
        const chosen = topLocal
          .filter((plugin) => remainingIds.has(plugin.id))
          .map((plugin) => ({ ...plugin, components: children.get(plugin.id) || [] }));
        const chosenIds = new Set(chosen.map((plugin) => plugin.id));
        const preservedDirs = [...remainingIds]
          .filter((id) => !chosenIds.has(id))
          .sort((a, b) => a.localeCompare(b));
        const selectedByPlugin = new Map();
        for (const plugin of chosen) {
          selectedByPlugin.set(plugin.id, new Set(plugin.files.map((file) => file.path)));
          for (const component of plugin.components) {
            selectedByPlugin.set(component.id, new Set(component.files.map((file) => file.path)));
          }
        }
        const docs = generateDocs({
          plugins: chosen,
          selectedByPlugin,
          owner,
          repo: config.repo,
          preservedDirs,
        });
        docsEntries.push({ path: 'README.md', content: docs.readme });
        for (const doc of docs.perPlugin) {
          docsEntries.push({ path: doc.path, content: doc.content });
        }
      } else {
        warnings.push('根 README 未重建；需要时再上传同步。');
      }

      const head = await resolveHead(gh, repo, owner, config.repo, config.branch);
      if (!head.sha || !head.branchExists) {
        throw new AppError(409, 'delete-branch', '目标分支不存在，无法删除。请先在仓库设置中检查分支。');
      }
      const parent = await gh.getCommit(owner, config.repo, head.sha);
      const baseTree = parent.tree && parent.tree.sha ? parent.tree.sha : null;

      const treeEntries = [];
      await runPool(docsEntries, 4, async (entry) => {
        const buffer = Buffer.from(entry.content, 'utf8');
        const blobSha = await gh.createBlob(owner, config.repo, buffer.toString('base64'));
        treeEntries.push({ path: entry.path, mode: '100644', type: 'blob', sha: blobSha });
      });
      for (const repoPath of deletions) {
        treeEntries.push({ path: repoPath, mode: '100644', type: 'blob', sha: null });
      }

      const treeSha = await gh.createTree(owner, config.repo, treeEntries, baseTree);
      const message = cleanText(input && input.message, 500)
        || `chore(plugins): 删除 ${ids.length} 个插件`;
      const commit = await gh.createCommit(owner, config.repo, message, treeSha, [head.sha]);
      await gh.updateRef(owner, config.repo, config.branch, commit.sha);

      log(`deleted ${deletions.length} files from ${owner}/${config.repo} (${ids.join(', ')})`);
      return {
        ok: true,
        noChanges: false,
        branch: config.branch,
        commit: {
          sha: commit.sha,
          url: `https://github.com/${owner}/${config.repo}/commit/${commit.sha}`,
          message,
        },
        counts: {
          plugins: ids.length,
          files: deletions.length,
          docs: docsEntries.length,
        },
        warnings,
      };
    } finally {
      uploadInFlight = false;
    }
  }

  async function performUpload(input) {
    if (uploadInFlight) throw new AppError(409, 'write-busy', '正在写入 GitHub，请稍候。');
    uploadInFlight = true;
    try {
      const token = await requireToken();
      const gh = new Github(token);
      const user = await gh.getUser();
      let config = await loadConfig();
      const root = await resolveRoot(config);
      const scanned = await scanPlugins(root);
      const selection = normalizeSelection(input && input.selection, scanned.plugins);
      const mode = input && input.mode === 'replace' ? 'replace' : 'sync';
      const ensured = await ensureRepo(gh, config, user);
      config = ensured.config;
      const owner = ensured.owner;
      const repo = ensured.repo;
      const remote = await remoteSnapshot(gh, config, owner, repo);
      const plan = makePlan({
        plugins: scanned.plugins,
        selection,
        remote,
        config,
        owner,
        mode,
      });
      const changedPaths = [
        ...plan.desired.keys(),
      ].filter((repoPath) => plan.statuses[repoPath] === 'added' || plan.statuses[repoPath] === 'changed');
      if (changedPaths.length === 0 && plan.deleted.length === 0) {
        return {
          ok: true,
          noChanges: true,
          created: ensured.created,
          branch: config.branch,
          repo: remote.repo || summarizeRepo(repo),
          counts: plan.counts,
          warnings: plan.warnings,
          message: '远端已与本地一致。',
        };
      }

      const head = await resolveHead(gh, repo, owner, config.repo, config.branch);
      let baseTree = null;
      if (head.sha) {
        const parent = await gh.getCommit(owner, config.repo, head.sha);
        baseTree = parent.tree && parent.tree.sha ? parent.tree.sha : null;
      }

      const treeEntries = [];
      await runPool(changedPaths, 5, async (repoPath) => {
        const entry = plan.desired.get(repoPath);
        const buffer = entry.kind === 'text'
          ? Buffer.from(entry.content, 'utf8')
          : await readFile(entry.abs);
        const blobSha = await gh.createBlob(owner, config.repo, buffer.toString('base64'));
        treeEntries.push({ path: repoPath, mode: '100644', type: 'blob', sha: blobSha });
      });
      for (const item of plan.deleted) {
        treeEntries.push({ path: item.path, mode: '100644', type: 'blob', sha: null });
      }

      const treeSha = await gh.createTree(owner, config.repo, treeEntries, baseTree);
      const message = cleanText(input && input.message, 500)
        || `chore(plugins): 同步索引（${selection.length} 个插件，+${plan.counts.added} ~${plan.counts.changed} -${plan.counts.deleted}）`;
      const commit = await gh.createCommit(
        owner,
        config.repo,
        message,
        treeSha,
        head.sha ? [head.sha] : [],
      );
      const warnings = [...plan.warnings];
      if (head.branchExists) {
        await gh.updateRef(owner, config.repo, config.branch, commit.sha);
      } else {
        await gh.createRef(owner, config.repo, config.branch, commit.sha);
        const defaultBranch = repo.default_branch || DEFAULT_BRANCH;
        if (config.branch !== defaultBranch) {
          try {
            await gh.patchRepo(owner, config.repo, { default_branch: config.branch });
          } catch (error) {
            warnings.push(`默认分支未切换：${error instanceof Error ? error.message : '权限不足'}`);
          }
        }
      }

      if (input && input.includeMeta !== false) {
        try {
          await gh.patchRepo(owner, config.repo, { description: REPO_DESCRIPTION });
        } catch (error) {
          warnings.push(`仓库简介未更新：${error instanceof Error ? error.message : '权限不足'}`);
        }
        try {
          await gh.setTopics(owner, config.repo, REPO_TOPICS);
        } catch (error) {
          warnings.push(`仓库 Topics 未更新：${error instanceof Error ? error.message : '权限不足'}`);
        }
      }

      log(`pushed ${commit.sha.slice(0, 8)} to ${owner}/${config.repo} (${changedPaths.length} files, ${plan.deleted.length} deletions)`);
      return {
        ok: true,
        noChanges: false,
        created: ensured.created,
        branch: config.branch,
        commit: {
          sha: commit.sha,
          url: `https://github.com/${owner}/${config.repo}/commit/${commit.sha}`,
          message,
        },
        repo: summarizeRepo(repo),
        counts: plan.counts,
        warnings,
      };
    } finally {
      uploadInFlight = false;
    }
  }

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
    if (!type.toLowerCase().startsWith('application/json')) {
      throw new AppError(415, 'content-type', '请求须为 application/json。');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new AppError(413, 'body-large', '请求体过大。');
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new AppError(400, 'bad-json', '请求体不是合法 JSON。');
    }
  }

  function failure(error) {
    if (error instanceof AppError) {
      return {
        status: error.status,
        body: { ok: false, code: error.code, message: error.message, details: error.details },
      };
    }
    if (error instanceof GithubError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return {
        status,
        body: { ok: false, code: error.code, message: error.message, details: error.details },
      };
    }
    log('api failed', error);
    return {
      status: 500,
      body: { ok: false, code: 'internal', message: '插件内部错误，详见 Harness 日志。' },
    };
  }

  const handler = async (req, res) => {
    const url = new URL(req.url || API, 'http://localhost');
    const action = url.pathname.slice(API.length).replace(/^\//, '') || 'state';
    try {
      if (req.method === 'GET') {
        if (action === 'state') {
          send(res, 200, await statePayload());
          return;
        }
        if (action === 'plugins') {
          const config = await loadConfig();
          send(res, 200, await scanForClient(config));
          return;
        }
        if (action === 'remote') {
          const token = await requireToken();
          const gh = new Github(token);
          const user = await gh.getUser();
          const config = await loadConfig();
          const owner = config.owner || user.login;
          send(res, 200, {
            ok: true,
            config: { ...config, owner },
            remote: await remoteSnapshot(gh, config, owner),
          });
          return;
        }
        throw new AppError(404, 'unknown-action', `未知接口：${action}`);
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        if (action === 'login') {
          const token = String(body.token || '').trim();
          if (token.length < 20 || token.length > 500) {
            throw new AppError(400, 'token-shape', '令牌格式不正确。');
          }
          const user = await new Github(token).getUser();
          await writeToken(token);
          let config = await loadConfig();
          if (!config.owner) config = await saveConfig({ ...config, owner: user.login });
          send(res, 200, await statePayload({ token, user, config }));
          return;
        }
        if (action === 'logout') {
          await clearToken();
          send(res, 200, await statePayload({ token: null }));
          return;
        }
        if (action === 'config') {
          const next = await saveConfig(body || {});
          send(res, 200, await statePayload({ config: next }));
          return;
        }
        if (action === 'preview') {
          send(res, 200, { ok: true, plan: await previewPlan(body) });
          return;
        }
        if (action === 'create-repo') {
          const token = await requireToken();
          const gh = new Github(token);
          const user = await gh.getUser();
          let config = await loadConfig();
          const ensured = await ensureRepo(gh, config, user);
          config = ensured.config;
          const remote = await remoteSnapshot(gh, config, ensured.owner, ensured.repo);
          send(res, 200, {
            ok: true,
            created: ensured.created,
            repo: summarizeRepo(ensured.repo),
            remote,
            config: { ...config, owner: ensured.owner },
          });
          return;
        }
        if (action === 'remote-delete') {
          send(res, 200, await performRemoteDelete(body));
          return;
        }
        if (action === 'upload') {
          send(res, 200, await performUpload(body));
          return;
        }
        throw new AppError(404, 'unknown-action', `未知接口：${action}`);
      }
      throw new AppError(405, 'method', '不支持的请求方法。');
    } catch (error) {
      const report = failure(error);
      send(res, report.status, report.body);
    }
  };

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API,
    handler,
  }), 'github-vault: api route');

  log(`mounted at ${API}`);
}

export default { name, inject, apply };
