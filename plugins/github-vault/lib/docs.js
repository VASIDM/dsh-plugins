/**
 * Documentation composer.
 *
 * The root README is the repository index; a plugin README is emitted only
 * when no selected README exists, so an authored README is never overwritten.
 * The voice is deliberately terse: facts, paths, commands, no filler.
 */

function cleanInline(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function heading(text) {
  return cleanInline(text).replace(/^#+\s*/, '') || '未命名插件';
}

function summary(text, limit = 64) {
  const value = cleanInline(text);
  if (!value) return '—';
  if (value.length <= limit) return value;
  const head = value.slice(0, limit);
  const stop = Math.max(head.lastIndexOf('。'), head.lastIndexOf('；'), head.lastIndexOf('，'), head.lastIndexOf('. '));
  if (stop >= limit * 0.5) return head.slice(0, stop + 1);
  return head.trimEnd() + '…';
}

function formsOf(plugin) {
  return plugin.forms && plugin.forms.length ? plugin.forms.join(' + ') : '插件包';
}

function installCommand(id, repo) {
  return `dsh plugin --profile <profile> add "${repo || '<repo>'}/plugins/${id}"`;
}

function cloneUrl(owner, repo) {
  return `https://github.com/${owner || '<owner>'}/${repo || '<repo>'}.git`;
}

function tableRow(plugin) {
  return `| ${heading(plugin.title)} | \`${cleanInline(plugin.name)}\` | ${cleanInline(plugin.version || '—')} | ${formsOf(plugin)} | ${summary(plugin.intro)} |`;
}

function rootReadme({ plugins, owner, repo, preservedDirs }) {
  const lines = [];
  lines.push('# 插件');
  lines.push('');
  lines.push('DeepSeek Harness 插件源码合集。一库多包，各自成体，独立安装，互不依赖。');
  lines.push('');
  lines.push('仓库只收源码、清单与说明；依赖、构建产物、密钥与环境变量不入库。');
  lines.push('');
  lines.push('## 安装');
  lines.push('');
  lines.push('```sh');
  lines.push(`git clone ${cloneUrl(owner, repo)}`);
  lines.push(`dsh plugin --profile <profile> add "${repo || '<repo>'}/plugins/<id>"`);
  lines.push('```');
  lines.push('');
  lines.push('亦可在 Harness 会话中给出插件目录的绝对路径，交由 `install_bundle` 安装。');
  lines.push('');
  lines.push('## 索引');
  lines.push('');
  lines.push('| 插件 | 标识 | 版本 | 形态 | 要旨 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const plugin of plugins) lines.push(tableRow(plugin));
  lines.push('');
  for (const plugin of plugins) {
    lines.push(`## ${heading(plugin.title)}`);
    lines.push('');
    lines.push(`\`${plugin.name}\` · v${plugin.version || '—'} · ${formsOf(plugin)}`);
    lines.push('');
    if (plugin.intro) {
      lines.push(plugin.intro);
      lines.push('');
    }
    lines.push(`- 源码：\`plugins/${plugin.id}/\``);
    lines.push(`- 安装：\`${installCommand(plugin.id, repo)}\``);
    lines.push(`- 详述：[README](plugins/${plugin.id}/README.md)`);
    if (plugin.tools && plugin.tools.length) {
      lines.push(`- 工具：${plugin.tools.map((tool) => `\`${cleanInline(tool)}\``).join('、')}`);
    }
    lines.push('');
  }
  if (preservedDirs.length) {
    lines.push('## 保留目录');
    lines.push('');
    lines.push(`以下远端目录未纳入本次索引，保持原样：${preservedDirs.map((dir) => `\`${cleanInline(dir)}\``).join('、')}。`);
    lines.push('');
  }
  lines.push('## 约定');
  lines.push('');
  lines.push('- 一个目录一个包；包根必有 `package.json`，通常声明 `dsh.bundle`、`dsh.client` 或 `cordis.patch.yml`。');
  lines.push('- 包内 `locale/*.json` 的 `meta.title` 与 `meta.description` 供本索引取样。');
  lines.push('- 新增插件后，于 Harness 插件页刷新、择取、上传，索引随提交更新。');
  lines.push('');
  lines.push('## 维护');
  lines.push('');
  lines.push('本文件由 Harness 插件「插件上行」生成。源码变更后重新同步即可，勿手工改动生成段落。');
  lines.push('');
  return lines.join('\n');
}

function pluginReadme(plugin, { owner, repo }) {
  const lines = [];
  lines.push(`# ${heading(plugin.title)}`);
  lines.push('');
  lines.push(`\`${plugin.name}\` · v${plugin.version || '—'} · ${formsOf(plugin)}`);
  lines.push('');
  if (plugin.intro) {
    lines.push(plugin.intro);
    lines.push('');
  }
  lines.push('## 安装');
  lines.push('');
  lines.push('```sh');
  lines.push(installCommand(plugin.id, repo));
  lines.push('```');
  lines.push('');
  lines.push('## 源码');
  lines.push('');
  lines.push('本目录为包根，清单见 `package.json`。');
  lines.push('');
  const filePaths = new Set((plugin.files || []).map((file) => file.path));
  const entryLines = [];
  if (filePaths.has('client.js')) entryLines.push('- Web：`client.js`。');
  if (filePaths.has('index.js')) entryLines.push('- Host：`index.js`。');
  if (filePaths.has('cordis.patch.yml')) entryLines.push('- 组合：`cordis.patch.yml`。');
  if (plugin.rows && plugin.rows.length) {
    entryLines.push(`- 行：${plugin.rows.slice(0, 8).map((row) => `\`${cleanInline(row)}\``).join('、')}。`);
  }
  if (plugin.slots && plugin.slots.length) {
    entryLines.push(`- 槽位：${plugin.slots.slice(0, 8).map((slot) => `\`${cleanInline(slot)}\``).join('、')}。`);
  }
  if (entryLines.length) {
    lines.push('## 入口');
    lines.push('');
    lines.push(...entryLines);
    lines.push('');
  }
  if (plugin.tools && plugin.tools.length) {
    lines.push('## 工具');
    lines.push('');
    for (const tool of plugin.tools) lines.push(`- \`${cleanInline(tool)}\``);
    lines.push('');
  }
  lines.push('## 仓库');
  lines.push('');
  lines.push(`源码合集：${cloneUrl(owner, repo).replace(/\.git$/, '')}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {object} input
 * @param {Array} input.plugins selected scan records
 * @param {Map<string, Set<string>>} input.selectedByPlugin selected file paths per plugin id
 * @param {string} input.owner
 * @param {string} input.repo
 * @param {string[]} [input.preservedDirs]
 */
export function generateDocs({ plugins, selectedByPlugin, owner, repo, preservedDirs = [] }) {
  const readme = rootReadme({ plugins, owner, repo, preservedDirs });
  const perPlugin = [];
  for (const plugin of plugins) {
    const selected = selectedByPlugin.get(plugin.id) || new Set();
    const keepsReadme = Boolean(plugin.readme) && selected.has('README.md');
    if (keepsReadme) continue;
    perPlugin.push({
      id: plugin.id,
      path: `plugins/${plugin.id}/README.md`,
      content: pluginReadme(plugin, { owner, repo }),
    });
  }
  return { readme, perPlugin };
}
