/**
 * Documentation composer.
 *
 * Root README: banner, curated screenshots, plugin index with thumbnails, and
 * one detailed section per top-level plugin. Every package README is generated
 * from the local README plus a generated cover and preview gallery.
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

function summary(text, limit = 96) {
  return cut(text, limit);
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
    lines.push(`| ${heading(component.title)} | \`${cleanInline(component.name)}\` | ${summary(component.intro, 88)} |`);
  }
  return lines.join('\n');
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageTag(src, alt, width) {
  const safeSrc = String(src || '').replace(/ /g, '%20');
  return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" width="${width}" />`;
}

function imageTable(images, width = 350) {
  if (!images.length) return '';
  const rows = [];
  for (let index = 0; index < images.length; index += 2) {
    const cells = images.slice(index, index + 2).map((image) => (
      `<td align="center">${imageTag(image.src, image.alt, width)}</td>`
    ));
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return ['<table>', ...rows, '</table>'].join('\n');
}

function featureList(plugin) {
  const features = (plugin.features || []).slice(0, 10);
  if (!features.length) return [];
  return ['**功能**', '', ...features.map((feature) => `- ${cleanInline(feature)}`), ''];
}

function heroFor(plugin) {
  if (plugin._media && plugin._media.length) return plugin._media[0];
  return plugin._cover;
}

function galleryFor(plugin) {
  return (plugin._media || []).slice(1, 5);
}

function xml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, width, maxLines) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return [];
  const lines = [];
  let line = '';
  const chars = Array.from(source);
  for (const char of chars) {
    line += char;
    if (Array.from(line).length < width) continue;
    const breakAt = line.lastIndexOf(' ');
    if (breakAt > width * 0.55) {
      lines.push(line.slice(0, breakAt).trim());
      line = line.slice(breakAt + 1).trim();
    } else {
      lines.push(line.trim());
      line = '';
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  if (lines.length === maxLines) {
    const rendered = lines.join('');
    if (rendered.length < chars.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/…$/, '') + '…';
  }
  return lines.filter(Boolean);
}

function sealChar(title) {
  const chars = Array.from(heading(title));
  return chars[0] || 'D';
}

function pluginCoverSvg(plugin) {
  const title = heading(plugin.title);
  const intro = plugin.intro || plugin.description || '';
  const forms = cut(formsText(plugin), 14);
  const components = plugin.components || [];
  const titleLines = wrapText(title, 16, 2);
  const introLines = wrapText(intro, 30, 3);
  const tags = [forms, `v${plugin.version || '—'}`, ...(components.length ? [`${components.length} 个组件`] : [])];
  const detailLines = components.length
    ? components.slice(0, 4).map((component) => component.title)
    : (plugin.features || []).slice(0, 4);
  const titleTop = titleLines.length > 1 ? 245 : 295;
  const formsY = titleTop + titleLines.length * 76;
  const introTop = formsY + 52;
  const tagY = 540;
  let tagX = 72;
  const tagMarkup = tags.map((tag) => {
    const label = cut(tag, 14);
    const width = Math.max(72, Array.from(label).length * 15 + 28);
    const markup = `<g><rect x="${tagX}" y="${tagY}" width="${width}" height="38" rx="3" fill="none" stroke="#8d5147" stroke-opacity=".8"/><text x="${tagX + width / 2}" y="${tagY + 25}" text-anchor="middle" font-family="Songti SC, STSong, SimSun, serif" font-size="16" fill="#d7cbb8">${xml(label)}</text></g>`;
    tagX += width + 10;
    return markup;
  }).join('');
  const detailMarkup = detailLines.map((line, index) => (
    `<text x="856" y="${262 + index * 46}" font-family="Songti SC, STSong, SimSun, serif" font-size="18" fill="#d7cbb8">${xml(cut(line, 22))}</text>`
  )).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d0c0b"/>
    <stop offset=".55" stop-color="#171310"/>
    <stop offset="1" stop-color="#241a16"/>
  </linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="#f2ece0" stroke-opacity=".045"/>
  </pattern>
  <radialGradient id="glow" cx=".18" cy="0" r=".95">
    <stop offset="0" stop-color="#a63a2e" stop-opacity=".34"/>
    <stop offset="1" stop-color="#a63a2e" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect width="1200" height="675" fill="url(#grid)"/>
<rect width="1200" height="675" fill="url(#glow)"/>
<rect x="72" y="64" width="74" height="74" rx="4" fill="#a63a2e"/>
<text x="109" y="118" text-anchor="middle" font-family="Songti SC, STSong, SimSun, serif" font-size="44" fill="#f6f1e7">${xml(sealChar(title))}</text>
<text x="72" y="190" font-family="Segoe UI, Arial, sans-serif" font-size="17" letter-spacing="4" fill="#9d9282">DEEPSEEK HARNESS · PLUGIN</text>
<text x="72" y="228" font-family="Songti SC, STSong, SimSun, serif" font-size="20" fill="#cbbfae">${xml(forms)}</text>
${titleLines.map((line, index) => `<text x="72" y="${titleTop + index * 76}" font-family="Songti SC, STSong, SimSun, serif" font-size="64" font-weight="600" fill="#f5efe3">${xml(line)}</text>`).join('')}
<text x="72" y="${formsY}" font-family="Songti SC, STSong, SimSun, serif" font-size="22" fill="#b8ab98">${xml(plugin.name)}</text>
${introLines.map((line, index) => `<text x="72" y="${introTop + index * 38}" font-family="Songti SC, STSong, SimSun, serif" font-size="24" fill="#d7cbb8">${xml(line)}</text>`).join('')}
${tagMarkup}
<g>
  <rect x="704" y="128" width="424" height="412" rx="18" fill="#0b0908" stroke="#3a3029" stroke-width="1.5"/>
  <rect x="704" y="128" width="424" height="48" rx="18" fill="#13100e"/>
  <circle cx="732" cy="152" r="5" fill="#a63a2e"/>
  <circle cx="750" cy="152" r="5" fill="#6d5f50"/>
  <circle cx="768" cy="152" r="5" fill="#3c332b"/>
  <text x="1092" y="158" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#786c5d">DSH · PLUGIN</text>
  <rect x="728" y="200" width="92" height="300" rx="8" fill="#12100e" stroke="#2c2520"/>
  <rect x="742" y="220" width="62" height="7" rx="3" fill="#a63a2e"/>
  <rect x="742" y="244" width="52" height="6" rx="3" fill="#5c5145"/>
  <rect x="742" y="266" width="58" height="6" rx="3" fill="#5c5145"/>
  <rect x="742" y="288" width="44" height="6" rx="3" fill="#5c5145"/>
  <rect x="742" y="330" width="56" height="6" rx="3" fill="#3c332b"/>
  <rect x="844" y="200" width="256" height="42" rx="8" fill="#171310" stroke="#2c2520"/>
  <rect x="860" y="216" width="120" height="8" rx="4" fill="#a63a2e"/>
  ${detailMarkup}
  <rect x="844" y="476" width="256" height="1" fill="#2c2520"/>
  <rect x="844" y="500" width="176" height="7" rx="3" fill="#4a4037"/>
  <rect x="844" y="520" width="220" height="7" rx="3" fill="#3c332b"/>
</g>
<text x="72" y="626" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="2" fill="#796d5e">PLUGIN ASCENT · DSH</text>
<text x="1128" y="626" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#796d5e">${xml(plugin.id)}</text>
</svg>`;
}

function repoCoverSvg(plugins) {
  const names = plugins.slice(0, 10).map((plugin) => cut(plugin.title, 12));
  const left = names.slice(0, 5);
  const right = names.slice(5, 10);
  const line = (title, index, x) => `<text x="${x}" y="${272 + index * 30}" font-family="Songti SC, STSong, SimSun, serif" font-size="20" fill="#cbbfae">${xml(title)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d0c0b"/>
    <stop offset=".6" stop-color="#171310"/>
    <stop offset="1" stop-color="#241a16"/>
  </linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="#f2ece0" stroke-opacity=".045"/>
  </pattern>
  <radialGradient id="glow" cx=".15" cy="0" r=".9">
    <stop offset="0" stop-color="#a63a2e" stop-opacity=".32"/>
    <stop offset="1" stop-color="#a63a2e" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1200" height="420" fill="url(#bg)"/>
<rect width="1200" height="420" fill="url(#grid)"/>
<rect width="1200" height="420" fill="url(#glow)"/>
<rect x="72" y="62" width="74" height="74" rx="4" fill="#a63a2e"/>
<text x="109" y="116" text-anchor="middle" font-family="Songti SC, STSong, SimSun, serif" font-size="44" fill="#f6f1e7">插</text>
<text x="72" y="188" font-family="Segoe UI, Arial, sans-serif" font-size="17" letter-spacing="4" fill="#9d9282">DEEPSEEK HARNESS · PLUGIN VAULT</text>
<text x="72" y="270" font-family="Songti SC, STSong, SimSun, serif" font-size="66" font-weight="600" fill="#f5efe3">插件</text>
<text x="72" y="316" font-family="Songti SC, STSong, SimSun, serif" font-size="22" fill="#cbbfae">${plugins.length} 个插件 · 一库多包 · 独立安装</text>
<text x="72" y="366" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="2" fill="#796d5e">PLUGIN COLLECTION · ${xml(plugins.length)} PACKAGES</text>
${left.map((title, index) => line(title, index, 760)).join('')}
${right.map((title, index) => line(title, index, 990)).join('')}
<rect x="720" y="70" width="1" height="280" fill="#3a3029"/>
</svg>`;
}

function mediaFor(plugin, selected) {
  const media = [];
  for (const preview of plugin.previews || []) {
    if (preview.source === 'plugin' && !selected.has(preview.target)) continue;
    media.push({
      path: preview.target,
      repoPath: `plugins/${plugin.id}/${preview.target}`,
      alt: preview.alt || `${plugin.title} · 预览`,
    });
  }
  if (plugin.fileMap && selected.has('docs/cover.svg')) {
    media.push({
      path: 'docs/cover.svg',
      repoPath: `plugins/${plugin.id}/docs/cover.svg`,
      alt: `${plugin.title} · 封面`,
    });
  }
  return media;
}

function preparePlugins({ plugins, selectedByPlugin }) {
  const assets = [];
  const prepared = plugins.map((plugin) => {
    const selected = selectedByPlugin.get(plugin.id) || new Set();
    const media = mediaFor(plugin, selected);
    let cover = null;
    if (media.length === 0) {
      cover = {
        path: 'docs/cover.svg',
        repoPath: `plugins/${plugin.id}/docs/cover.svg`,
        alt: `${plugin.title} · 封面`,
      };
      assets.push({ path: cover.repoPath, content: pluginCoverSvg(plugin) });
    }
    return {
      ...plugin,
      _selected: selected,
      _media: media,
      _cover: cover,
    };
  });
  return { prepared, assets };
}

function rootReadme({ plugins, owner, repo, preservedDirs }) {
  const example = plugins.find((plugin) => plugin.id === 'usage-center')
    || plugins.find((plugin) => !(plugin.components || []).length)
    || plugins[0];
  const exampleId = example ? example.id : '<id>';
  const shots = [];
  for (const plugin of plugins) {
    if (plugin._media.length === 0) continue;
    shots.push({ src: plugin._media[0].repoPath, alt: plugin._media[0].alt });
    if (shots.length >= 4) break;
  }
  const lines = [];
  lines.push(`<p align="center">${imageTag('docs/cover.svg', '插件 · DeepSeek Harness 插件合集', 920)}</p>`);
  lines.push('');
  lines.push('# 插件');
  lines.push('');
  lines.push(`DeepSeek Harness 插件合集。当前收录 ${plugins.length} 个插件，每个插件独立安装，按需取用。`);
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
  if (shots.length) {
    lines.push('## 界面预览');
    lines.push('');
    lines.push('真实界面截图，亮色与暗色均随 Harness 主题切换。');
    lines.push('');
    lines.push(imageTable(shots, 360));
    lines.push('');
  }
  lines.push('## 插件一览');
  lines.push('');
  lines.push('| 预览 | 插件 | 版本 | 说明 |');
  lines.push('| --- | --- | --- | --- |');
  for (const plugin of plugins) {
    const hero = heroFor(plugin);
    const thumb = hero ? imageTag(hero.repoPath, hero.alt, 190) : '—';
    lines.push(`| ${thumb} | **${heading(plugin.title)}** | ${cleanInline(plugin.version || '—')} | ${summary(plugin.intro)} |`);
  }
  lines.push('');
  for (const plugin of plugins) {
    const hero = heroFor(plugin);
    const gallery = galleryFor(plugin);
    lines.push(`## ${heading(plugin.title)}`);
    lines.push('');
    if (hero) {
      lines.push(`<p align="center">${imageTag(hero.repoPath, hero.alt, 760)}</p>`);
      lines.push('');
    }
    const labels = [cleanInline(plugin.name), `v${plugin.version || '—'}`, formsText(plugin)];
    const group = componentLabel(plugin);
    if (group) labels.push(group);
    lines.push(`\`${plugin.name}\` · ${labels.slice(1).join(' · ')}`);
    lines.push('');
    if (plugin.intro) {
      lines.push(plugin.intro);
      lines.push('');
    }
    const features = featureList(plugin);
    if (features.length) lines.push(...features);
    if (!features.length && !(plugin.components && plugin.components.length)) {
      const entries = entryLines(plugin);
      if (entries.length) {
        lines.push('**组成**');
        lines.push('');
        lines.push(...entries);
        lines.push('');
      }
    }
    if (plugin.components && plugin.components.length) {
      lines.push('**组件**');
      lines.push('');
      lines.push(componentTable(plugin));
      lines.push('');
    }
    if (gallery.length) {
      lines.push('**更多截图**');
      lines.push('');
      lines.push(imageTable(gallery.map((image) => ({ src: image.repoPath, alt: image.alt })), 350));
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
  const hero = heroFor(plugin);
  const gallery = galleryFor(plugin);
  const lines = [];
  lines.push(`# ${heading(plugin.title)}`);
  lines.push('');
  if (hero) {
    lines.push(`<p align="center">${imageTag(hero.path, hero.alt, 700)}</p>`);
    lines.push('');
  }
  lines.push(`\`${plugin.name}\` · v${plugin.version || '—'} · ${formsText(plugin)}`);
  lines.push('');
  if (plugin.intro) {
    lines.push(plugin.intro);
    lines.push('');
  }
  const features = featureList(plugin);
  if (features.length) lines.push(...features);
  lines.push('## 安装');
  lines.push('');
  lines.push(installBlock(plugin, repo));
  lines.push('');
  if (gallery.length) {
    lines.push('## 预览');
    lines.push('');
    lines.push(imageTable(gallery.map((image) => ({ src: image.path, alt: image.alt })), 330));
    lines.push('');
  }
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

function authoredReadme(plugin) {
  const hero = heroFor(plugin);
  const gallery = galleryFor(plugin);
  const lines = [];
  if (hero) {
    lines.push(`<p align="center">${imageTag(hero.path, hero.alt, 700)}</p>`);
    lines.push('');
  }
  lines.push(String(plugin.readmeText || '').trim());
  lines.push('');
  if (gallery.length) {
    lines.push('## 预览');
    lines.push('');
    lines.push(imageTable(gallery.map((image) => ({ src: image.path, alt: image.alt })), 330));
    lines.push('');
  }
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
  const { prepared, assets } = preparePlugins({ plugins, selectedByPlugin });
  const readme = rootReadme({ plugins: prepared, owner, repo, preservedDirs });
  const perPlugin = [];
  for (const plugin of prepared) {
    const keepsReadme = Boolean(plugin.readme) && plugin._selected.has('README.md');
    if (keepsReadme && plugin.readmeText) {
      perPlugin.push({
        id: plugin.id,
        path: `plugins/${plugin.id}/README.md`,
        content: authoredReadme(plugin),
      });
      continue;
    }
    perPlugin.push({
      id: plugin.id,
      path: `plugins/${plugin.id}/README.md`,
      content: pluginReadme(plugin, { owner, repo }),
    });
  }
  const repoCover = { path: 'docs/cover.svg', content: repoCoverSvg(prepared) };
  return { readme, perPlugin, assets: [repoCover, ...assets] };
}
