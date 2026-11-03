/**
 * Documentation composer.
 *
 * Root README: quick start, plugin index, one section per top-level plugin.
 * Grouped plugins expose their components as a table and install each package
 * from the nested components/ path. Package READMEs are generated only when
 * the package has no selected README of its own.
 */

function cleanInline(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function heading(text) {
  return cleanInline(text).replace(/^#+\s*/, '') || '未命名插件';
}

function cut(text, limit) {
  const value = cleanInline(text);
  if (!value) return '—';
  if (value.length <= limit) return value;
  const head = value.slice(0, limit);
  const stop = Math.max(head.lastIndexOf('。'), head.lastIndexOf('；'), head.lastIndexOf('，'), head.lastIndexOf('. '));
  if (stop >= limit * 0.5) return head.slice(0, stop + 1);
  return head.trimEnd() + '…';
}

function summary(text) {
  return cut(text, 78);
}

function allForms(plugin) {
  const forms = new Set(plugin.forms || []);
  for (const component of plugin.components || []) {
    for (const form of component.forms || []) forms.add(form);
  }
  return forms.size ? [...forms] : ['插件包'];
}

function formsText(plugin) {
  return allForms(plugin).join(' + ');
}

function componentLabel(plugin) {
  const count = (plugin.components || []).length;
  return count > 0 ? `含 ${count} 个组件` : '';
}

function cloneUrl(owner, repo) {
  return `https://github.com/${owner || '<owner>'}/${repo || '<repo>'}.git`;
}

function repoUrl(owner, repo) {
  return cloneUrl(owner, repo).replace(/\.git$/, '');
}

function installCommand(id, repo, suffix = '') {
  return `dsh plugin --profile <profile> add "./${repo || '<repo>'}/plugins/${id}${suffix}"`;
}

function installCommands(plugin, repo) {
  const commands = [installCommand(plugin.id, repo)];
  for (const component of plugin.components || []) {
    commands.push(installCommand(plugin.id, repo, `/components/${component.id}`));
  }
  return commands;
}

function installBlock(plugin, repo) {
  return ['```sh', ...installCommands(plugin, repo), '```'].join('\n');
}

function entryLines(plugin) {
  const lines = [];
  const filePaths = new Set((plugin.files || []).map((file) => file.path));
  if (filePaths.has('client.js')) lines.push('- Web 入口：`client.js`');
  if (filePaths.has('index.js')) lines.push('- Host 入口：`index.js`');
  if (filePaths.has('cordis.patch.yml')) lines.push('- 组合层：`cordis.patch.yml`');
  if (plugin.tools && plugin.tools.length) {
    lines.push(`- 工具：${plugin.tools.map((tool) => `\`${cleanInline(tool)}\``).join('、')}`);
  }
  if (plugin.rows && plugin.rows.length) {
    lines.push(`- 行：${plugin.rows.slice(0, 8).map((row) => `\`${cleanInline(row)}\``).join('、')}`);
  }
  if (plugin.slots && plugin.slots.length) {
    lines.push(`- 槽位：${plugin.slots.slice(0, 8).map((slot) => `\`${cleanInline(slot)}\``).join('、')}`);
  }
  return lines;
}

function componentTable(plugin) {
  const lines = [];
  lines.push('| 组件 | 标识 | 说明 |');
  lines.push('| --- | --- | --- |');
  for (const component of plugin.components || []) {
    lines.push(`| ${heading(component.title)} | \`${cleanInline(component.name)}\` | ${summary(component.intro)} |`);
  }
  return lines.join('\n');
}

function rootReadme({ plugins, owner, repo, preservedDirs }) {
  const example = plugins.find((plugin) => plugin.id === 'usage-center')
    || plugins.find((plugin) => !(plugin.components || []).length)
    || plugins[0];
  const exampleId = example ? example.id : '<id>';
  const lines = [];
  lines.push('# 插件');
  lines.push('');
  lines.push('DeepSeek Harness 插件合集。每个插件独立安装，按需取用。');
  lines.push('');
  lines.push('## 快速开始');
  lines.push('');
  lines.push('```sh');
  lines.push(`git clone ${cloneUrl(owner, repo)}`);
  lines.push(`dsh plugin --profile <profile> add "./${repo || '<repo>'}/plugins/${exampleId}"`);
  lines.push('```');
  lines.push('');
  lines.push('以上以其中一个插件为例；其余插件替换路径末尾的目录名。将 `<profile>` 换成本机 profile。');
  lines.push('本地路径以 `./` 开头。仓库根不是单个包，不能直接用 `github:` 安装。');
  lines.push('');
  lines.push('## 更新');
  lines.push('');
  lines.push('```sh');
  lines.push(`cd ${repo || '<repo>'}`);
  lines.push('git pull');
  lines.push('```');
  lines.push('');
  lines.push('已安装的插件指向本地路径，拉取后重启 Harness 即可；新增组件时按对应小节补装。');
  lines.push('');
  lines.push('## 插件一览');
  lines.push('');
  lines.push('| 插件 | 版本 | 说明 |');
  lines.push('| --- | --- | --- |');
  for (const plugin of plugins) {
    lines.push(`| ${heading(plugin.title)} | ${cleanInline(plugin.version || '—')} | ${summary(plugin.intro)} |`);
  }
  lines.push('');
  for (const plugin of plugins) {
    lines.push(`## ${heading(plugin.title)}`);
    lines.push('');
    const labels = [cleanInline(plugin.name), `v${plugin.version || '—'}`, formsText(plugin)];
    const group = componentLabel(plugin);
    if (group) labels.push(group);
    lines.push(`\`${plugin.name}\` · ${labels.slice(1).join(' · ')}`);
    lines.push('');
    if (plugin.intro) {
      lines.push(plugin.intro);
      lines.push('');
    }
    if (plugin.components && plugin.components.length) {
      lines.push('**组件**');
      lines.push('');
      lines.push(componentTable(plugin));
      lines.push('');
    }
    lines.push('**安装**');
    lines.push('');
    lines.push(installBlock(plugin, repo));
    lines.push('');
    lines.push(`**详细说明**：[plugins/${plugin.id}/README.md](plugins/${plugin.id}/README.md)`);
    if (plugin.components && plugin.components.length) {
      lines.push('');
      lines.push('> 父包与全部组件需一并安装；只装父包会导致组合缺行。');
    }
    lines.push('');
  }
  if (preservedDirs.length) {
    lines.push('## 保留目录');
    lines.push('');
    lines.push(`以下远端目录未纳入本次索引，保持原样：${preservedDirs.map((dir) => `\`${cleanInline(dir)}\``).join('、')}。`);
    lines.push('');
  }
  lines.push('## 目录结构');
  lines.push('');
  lines.push('```');
  lines.push('plugins/');
  plugins.forEach((plugin, index) => {
    const last = index === plugins.length - 1;
    lines.push(`${last ? '└──' : '├──'} ${plugin.id}/`);
    const components = plugin.components || [];
    if (components.length === 0) return;
    const pad = last ? '    ' : '│   ';
    lines.push(`${pad}└── components/`);
    components.forEach((component, componentIndex) => {
      const componentLast = componentIndex === components.length - 1;
      lines.push(`${pad}    ${componentLast ? '└──' : '├──'} ${component.id}/`);
    });
  });
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('由「插件上行」生成。插件更新后重新同步即可。');
  lines.push('');
  return lines.join('\n');
}

function pluginReadme(plugin, { owner, repo }) {
  const lines = [];
  lines.push(`# ${heading(plugin.title)}`);
  lines.push('');
  lines.push(`\`${plugin.name}\` · v${plugin.version || '—'} · ${formsText(plugin)}`);
  lines.push('');
  if (plugin.intro) {
    lines.push(plugin.intro);
    lines.push('');
  }
  lines.push('## 安装');
  lines.push('');
  lines.push(installBlock(plugin, repo));
  lines.push('');
  if (plugin.components && plugin.components.length) {
    lines.push('## 组件');
    lines.push('');
    lines.push(componentTable(plugin));
    lines.push('');
    lines.push('## 结构');
    lines.push('');
    lines.push('```');
    lines.push(`${plugin.id}/`);
    lines.push('├── package.json');
    lines.push('├── cordis.patch.yml');
    lines.push('└── components/');
    plugin.components.forEach((component, index) => {
      const last = index === plugin.components.length - 1;
      lines.push(`    ${last ? '└──' : '├──'} ${component.id}/`);
    });
    lines.push('```');
    lines.push('');
  } else {
    const entries = entryLines(plugin);
    if (entries.length) {
      lines.push('## 组成');
      lines.push('');
      lines.push(...entries);
      lines.push('');
    }
  }
  lines.push('## 仓库');
  lines.push('');
  lines.push(`[\`${owner || '<owner>'}/${repo || '<repo>'}\`](${repoUrl(owner, repo)})`);
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {object} input
 * @param {Array} input.plugins top-level plugins; grouped plugins carry `components`
 * @param {Map<string, Set<string>>} input.selectedByPlugin selected file paths per package id
 * @param {string} input.owner
 * @param {string} input.repo
 * @param {string[]} [input.preservedDirs]
 */
export function generateDocs({ plugins, selectedByPlugin, owner, repo, preservedDirs = [] }) {
  const prepared = plugins.map((plugin) => ({
    ...plugin,
    _selected: selectedByPlugin.get(plugin.id) || new Set(),
  }));
  const readme = rootReadme({ plugins: prepared, owner, repo, preservedDirs });
  const perPlugin = [];
  for (const plugin of prepared) {
    const keepsReadme = Boolean(plugin.readme) && plugin._selected.has('README.md');
    if (keepsReadme) continue;
    perPlugin.push({
      id: plugin.id,
      path: `plugins/${plugin.id}/README.md`,
      content: pluginReadme(plugin, { owner, repo }),
    });
  }
  return { readme, perPlugin };
}
