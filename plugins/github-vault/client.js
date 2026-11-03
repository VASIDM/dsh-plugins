/* Browser half of Plugin Ascent: GitHub login, plugin selection, diff preview, upload. */
window.__ModuleLoader__.load({
  id: '@local/github-vault',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useState } = React;

    const NS = 'github.vault';
    const PANEL = 'github-vault';
    const API = '/api/github-vault';
    const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=DSH%20Plugin%20Ascent';
    const FINE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

    const zh = {
      panel: '插件上行',
      title: '插件上行',
      subtitle: '择本地插件，成一库之索引；源码、安装与说明，随提交而新。',
      eyebrow: 'GITHUB · PLUGIN VAULT',
      connect: '连接 GitHub',
      connectHint: '令牌只入本机凭据库，Harness 进程内取用，不回传页面。',
      token: 'Personal access token',
      tokenPlaceholder: 'ghp_… 或 github_pat_…',
      login: '登录',
      loggingIn: '登录中',
      loginFirst: '登录后可上传',
      loggedOut: '已退出',
      tokenCreate: '生成经典令牌（repo）',
      tokenCreateFine: '生成细粒度令牌',
      tokenNote: '经典令牌勾选 repo；细粒度令牌需 Contents 读写，创建仓库另需 Administration 读写。',
      localPlugins: '本机已发现 {count} 个插件包。',
      logout: '退出',
      refresh: '刷新',
      refreshing: '刷新中',
      settings: '仓库设置',
      notConnected: '未连接',
      connected: '已连接',
      repo: '仓库',
      repoMissing: '仓库未建',
      branchNew: '分支将新建',
      emptyRepo: '空仓库',
      updateCount: '更新 {count} 个插件',
      replaceUpload: '完全替换仓库',
      public: '公开',
      private: '私有',
      branch: '分支',
      owner: '账户',
      repoName: '仓库名',
      repoNameHint: 'GitHub 仓库名只收 ASCII 字母、数字及 - _ .；中文标题写入 README。',
      root: '扫描目录',
      save: '保存并刷新',
      saving: '保存中',
      createRepo: '创建仓库',
      creating: '创建中',
      autoCreate: '上传时若仓库不存在，将自动创建。',
      scanRoot: '扫描目录',
      pluginsCount: '{count} 个插件',
      selectedCount: '已选 {count} 个',
      selectAll: '全选',
      selectNone: '全不选',
      noPlugins: '未发现插件',
      noPluginsHint: '目录下须有含 dsh.bundle、dsh.client 或 cordis.patch.yml 的 package.json。',
      filesCount: '{count} 个文件',
      sync: '增量同步',
      syncHint: '只写所选；未选插件原样保留。',
      replace: '完全替换',
      replaceHint: '远端多余目录一并删除，仓库与所选严格一致。',
      mode: '同步方式',
      added: '新增',
      changed: '修改',
      deleted: '删除',
      unchanged: '未变',
      total: '合计',
      same: '一致',
      commitMessage: '提交说明',
      commitPlaceholder: '留空则自动生成',
      preview: '生成预览',
      previewing: '生成中',
      upload: '上传',
      update: '更新',
      uploading: '正在写入 GitHub…',
      noChanges: '远端已与本地一致，无需提交。',
      generateFirst: '生成预览后核对差异、文档与提交说明。',
      docs: '说明文档',
      docsHint: '生成预览后，此处显示索引 README 与各包说明。',
      rootDoc: '索引 README',
      packageDoc: '包说明',
      copy: '复制',
      copied: '已复制',
      copyFailed: '复制失败，请手动选取。',
      warnings: '注意',
      confirmTitle: '确认删除远端文件',
      confirmBody: '本次将删除 {count} 个远端文件，不可撤销。',
      cancel: '取消',
      confirm: '继续上传',
      close: '关闭',
      success: '已上传',
      commitLink: '查看提交',
      loading: '正在读取…',
      retry: '重试',
      emptySelection: '请至少选择一个插件。',
      tokenScopes: '令牌缺少 repo 权限，可能无法写入。',
      remoteFailed: '远端状态读取失败',
      configSaved: '仓库设置已保存。',
      repoCreated: '仓库已创建。',
      uploadCount: '上传 {count} 个插件',
      createAndUpload: '创建并上传',
      deleteCount: '将删除 {count} 个远端文件',
      footerNote: '令牌存于 Harness 凭据库；提交经 GitHub REST API 写入，不经本地 git。',
      scopes: '权限',
      repoLink: '打开仓库',
      authFailed: 'GitHub 登录失败',
      noPluginsSelected: '未选择文件',
      docsEmpty: '暂无文档',
      previewNeeded: '尚未生成预览',
      selectPlugin: '选择此插件',
      expand: '展开文件',
      collapse: '收起文件',
    };

    const en = {
      panel: 'Plugin Ascent',
      title: 'Plugin Ascent',
      subtitle: 'Select local plugins, compose one repository index, and keep source, install notes, and docs in step.',
      eyebrow: 'GITHUB · PLUGIN VAULT',
      connect: 'Connect GitHub',
      connectHint: 'The token lives only in the local credential store and is used inside the Harness process; it never returns to this page.',
      token: 'Personal access token',
      tokenPlaceholder: 'ghp_… or github_pat_…',
      login: 'Sign in',
      loggingIn: 'Signing in',
      loginFirst: 'Sign in to upload',
      loggedOut: 'Signed out',
      tokenCreate: 'Create a classic token (repo)',
      tokenCreateFine: 'Create a fine-grained token',
      tokenNote: 'Classic: select repo. Fine-grained: Contents read/write; repository creation also needs Administration read/write.',
      localPlugins: '{count} plugin packages found locally.',
      logout: 'Sign out',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      settings: 'Repository settings',
      notConnected: 'Not connected',
      connected: 'Connected',
      repo: 'Repository',
      repoMissing: 'Repository missing',
      branchNew: 'Branch will be created',
      emptyRepo: 'Empty repository',
      updateCount: 'Update {count} plugins',
      replaceUpload: 'Replace the repository',
      public: 'Public',
      private: 'Private',
      branch: 'Branch',
      owner: 'Owner',
      repoName: 'Repository',
      repoNameHint: 'GitHub repository names accept ASCII letters, digits, and - _ . only; put a Chinese title in the README.',
      root: 'Scan root',
      save: 'Save and refresh',
      saving: 'Saving',
      createRepo: 'Create repository',
      creating: 'Creating',
      autoCreate: 'The repository is created automatically on the first upload.',
      scanRoot: 'Scan root',
      pluginsCount: '{count} plugins',
      selectedCount: '{count} selected',
      selectAll: 'Select all',
      selectNone: 'Select none',
      noPlugins: 'No plugins found',
      noPluginsHint: 'A package needs package.json with dsh.bundle or dsh.client, or a cordis.patch.yml.',
      filesCount: '{count} files',
      sync: 'Incremental',
      syncHint: 'Write the selection only; unselected plugins stay untouched.',
      replace: 'Full replace',
      replaceHint: 'Delete every remote path outside the selection, so the repository matches exactly.',
      mode: 'Sync mode',
      added: 'Added',
      changed: 'Changed',
      deleted: 'Deleted',
      unchanged: 'Unchanged',
      total: 'Total',
      same: 'In sync',
      commitMessage: 'Commit message',
      commitPlaceholder: 'Leave empty to generate one',
      preview: 'Build preview',
      previewing: 'Building',
      upload: 'Upload',
      update: 'Update',
      uploading: 'Writing to GitHub…',
      noChanges: 'The remote already matches the local selection.',
      generateFirst: 'Build a preview to inspect the diff, docs, and commit message.',
      docs: 'Documentation',
      docsHint: 'After a preview, the index README and package notes appear here.',
      rootDoc: 'Index README',
      packageDoc: 'Package note',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Copy failed; select the text manually.',
      warnings: 'Notes',
      confirmTitle: 'Delete remote files?',
      confirmBody: '{count} remote files will be deleted. This cannot be undone.',
      cancel: 'Cancel',
      confirm: 'Upload anyway',
      close: 'Close',
      success: 'Uploaded',
      commitLink: 'View commit',
      loading: 'Reading…',
      retry: 'Retry',
      emptySelection: 'Select at least one plugin.',
      tokenScopes: 'The token lacks the repo scope and may not be able to write.',
      remoteFailed: 'Remote state could not be read',
      configSaved: 'Repository settings saved.',
      repoCreated: 'Repository created.',
      uploadCount: 'Upload {count} plugins',
      createAndUpload: 'Create and upload',
      deleteCount: '{count} remote files will be deleted',
      footerNote: 'The token stays in the Harness credential store; commits go through the GitHub REST API, not local git.',
      scopes: 'Scopes',
      repoLink: 'Open repository',
      authFailed: 'GitHub sign-in failed',
      noPluginsSelected: 'No files selected',
      docsEmpty: 'No docs',
      previewNeeded: 'No preview yet',
      selectPlugin: 'Select this plugin',
      expand: 'Expand files',
      collapse: 'Collapse files',
    };

    const CSS = `
.gv-page {
  --gv-red: #a63a2e;
  --gv-red-soft: rgba(166, 58, 46, .10);
  --gv-ink: var(--dsw-alias-label-primary);
  --gv-paper: var(--dsw-alias-bg-base);
  --gv-line: color-mix(in srgb, var(--dsw-alias-label-primary) 17%, transparent);
  --gv-line-strong: color-mix(in srgb, var(--dsw-alias-label-primary) 34%, transparent);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--gv-ink);
  background:
    radial-gradient(1100px 360px at 12% -8%, color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent), transparent 70%),
    radial-gradient(700px 260px at 100% 0%, var(--gv-red-soft), transparent 72%),
    var(--gv-paper);
  font-size: 13px;
  line-height: 1.5;
}
.gv-page[data-gv-theme="dark"] { --gv-red: #c9564a; --gv-red-soft: rgba(201, 86, 74, .14); }
.gv-page * { box-sizing: border-box; }
.gv-page button, .gv-page input, .gv-page textarea { font: inherit; }
.gv-head { display: flex; align-items: flex-start; gap: 18px; padding: 19px 26px 13px; }
.gv-brand { display: flex; gap: 14px; min-width: 0; }
.gv-seal {
  flex: none; width: 46px; height: 46px; display: grid; place-items: center;
  background: var(--gv-red); color: #f6f0e4; border-radius: 3px;
  font-family: "Songti SC", "Noto Serif SC", "STSong", serif;
  font-size: 27px; line-height: 1; transform: rotate(-2deg);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2);
}
.gv-eyebrow { color: var(--dsw-alias-label-secondary); font-size: 9.5px; font-weight: 650; letter-spacing: .2em; }
.gv-title {
  margin: 2px 0 2px; font-family: "Songti SC", "Noto Serif SC", "STSong", serif;
  font-size: 24px; font-weight: 600; letter-spacing: .05em; line-height: 1.2;
}
.gv-sub { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.gv-headmeta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; margin-left: auto; max-width: 42%; padding-top: 5px; }
.gv-headactions { display: flex; gap: 7px; padding-top: 2px; }
.gv-chip {
  display: inline-flex; align-items: center; gap: 5px; height: 23px; padding: 0 8px;
  border: 1px solid var(--gv-line); color: var(--dsw-alias-label-secondary);
  font-size: 10.5px; white-space: nowrap;
}
.gv-chip b { color: var(--gv-ink); font-weight: 550; }
.gv-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
.gv-dot.ok { background: var(--gv-red); }
.gv-dot.idle { background: var(--dsw-alias-state-warn-primary); }
.gv-rule { flex: none; height: 2px; margin: 0 26px; background: linear-gradient(90deg, var(--gv-red) 0 54px, var(--gv-line) 54px 100%); }
.gv-banner {
  display: flex; align-items: flex-start; gap: 10px; margin: 11px 26px 0; padding: 8px 11px;
  border-left: 3px solid var(--gv-red); background: var(--gv-red-soft); font-size: 12px;
}
.gv-banner p { flex: 1; margin: 0; overflow-wrap: anywhere; }
.gv-banner button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0 2px; opacity: .65; }
.gv-loading { flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.gv-spin { width: 14px; height: 14px; border: 1.5px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: gv-spin .8s linear infinite; }
@keyframes gv-spin { to { transform: rotate(360deg); } }
.gv-loginwrap { flex: 1; min-height: 0; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 28px; }
.gv-login {
  position: relative; width: min(560px, 100%); padding: 30px 32px 26px;
  border: 1px solid var(--gv-line-strong); background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 1px 0 var(--gv-line);
}
.gv-login::before { content: ""; position: absolute; inset: 6px; border: 1px solid var(--gv-line); pointer-events: none; }
.gv-login > * { position: relative; }
.gv-login-seal {
  width: 38px; height: 38px; display: grid; place-items: center; margin-bottom: 14px;
  background: var(--gv-red); color: #f6f0e4; border-radius: 2px;
  font-family: "Songti SC", "Noto Serif SC", serif; font-size: 23px; transform: rotate(-2deg);
}
.gv-login h2 { margin: 0 0 5px; font-size: 18px; font-weight: 600; letter-spacing: .03em; }
.gv-login .gv-sub { margin-bottom: 20px; }
.gv-form { display: flex; flex-direction: column; gap: 8px; }
.gv-fieldlabel { display: block; margin: 0 0 4px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; letter-spacing: .06em; }
.gv-loginrow { display: flex; gap: 7px; }
.gv-input {
  min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--gv-line-strong); border-radius: 2px;
  background: var(--gv-paper); color: var(--gv-ink); font-size: 12px;
}
.gv-input.grow { flex: 1; }
.gv-input:focus, .gv-message:focus { outline: 2px solid var(--gv-red); outline-offset: 1px; }
.gv-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 30px; padding: 0 12px; border: 1px solid var(--gv-line-strong); border-radius: 2px;
  background: transparent; color: var(--gv-ink); font-size: 11.5px; cursor: pointer; white-space: nowrap;
  transition: background .14s ease, border-color .14s ease, opacity .14s ease;
}
.gv-btn:hover { background: color-mix(in srgb, var(--gv-ink) 6%, transparent); }
.gv-btn:focus-visible { outline: 2px solid var(--gv-red); outline-offset: 1px; }
.gv-btn.primary { border-color: var(--gv-red); background: var(--gv-red); color: #fff; }
.gv-btn.primary:hover { background: color-mix(in srgb, var(--gv-red) 84%, #000); border-color: color-mix(in srgb, var(--gv-red) 84%, #000); }
.gv-btn.ghost { border-color: transparent; }
.gv-btn.ghost:hover { border-color: var(--gv-line); }
.gv-btn.small { height: 25px; padding: 0 8px; font-size: 10.5px; }
.gv-btn[disabled] { opacity: .42; cursor: not-allowed; background: transparent; }
.gv-btn.primary[disabled] { opacity: .48; background: var(--gv-red); }
.gv-links { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 9px; }
.gv-link {
  display: inline-flex; align-items: center; gap: 4px; color: var(--gv-red);
  font-size: 11px; text-decoration: none; cursor: pointer;
}
.gv-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.gv-note { margin: 11px 0 0; color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.65; }
.gv-inlineerror { margin-top: 13px; padding: 8px 10px; border-left: 2px solid var(--gv-red); background: var(--gv-red-soft); color: var(--gv-ink); font-size: 11.5px; overflow-wrap: anywhere; }
.gv-loginfoot { margin-top: 18px; padding-top: 12px; border-top: 1px dashed var(--gv-line); color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.gv-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 372px; }
.gv-main { min-width: 0; min-height: 0; overflow: auto; padding: 14px 22px 28px 26px; }
.gv-side { min-width: 0; min-height: 0; overflow: auto; padding: 12px 22px 28px 20px; border-left: 1px solid var(--gv-line); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 44%, transparent); }
.gv-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 11px; }
.gv-toolbar .spacer { flex: 1; }
.gv-root {
  display: flex; align-items: center; gap: 5px; max-width: 100%; color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-family-code-default); font-size: 10.5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.gv-plugin { margin-bottom: 7px; border: 1px solid var(--gv-line); background: var(--dsw-alias-bg-layer-1); }
.gv-plugin.on { border-color: var(--gv-line-strong); }
.gv-plugin-head { display: flex; align-items: center; gap: 9px; padding: 9px 11px; }
.gv-check { display: inline-flex; align-items: center; flex: none; }
.gv-page input[type="checkbox"] { width: 14px; height: 14px; accent-color: var(--gv-red); cursor: pointer; }
.gv-plugin-title { flex: 1; min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.gv-plugin-titletext { display: block; overflow: hidden; font-size: 13px; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
.gv-plugin-meta {
  display: block; margin-top: 1px; overflow: hidden; color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-family-code-default); font-size: 10px; white-space: nowrap; text-overflow: ellipsis;
}
.gv-forms { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.gv-form { padding: 0 4px; border: 1px solid var(--gv-line); color: var(--dsw-alias-label-secondary); font-size: 9px; line-height: 14px; }
.gv-nums { display: flex; flex: none; gap: 5px; font-family: var(--dsw-font-family-code-default); font-size: 9.5px; font-variant-numeric: tabular-nums; }
.gv-num.add { color: var(--gv-red); }
.gv-num.change { color: var(--gv-ink); }
.gv-num.del, .gv-num.same { color: var(--dsw-alias-label-tertiary); }
.gv-caret { flex: none; width: 18px; color: var(--dsw-alias-label-secondary); text-align: center; transition: transform .16s ease; }
.gv-plugin.open .gv-caret { transform: rotate(90deg); }
.gv-plugin-body { padding: 8px 11px 11px 34px; border-top: 1px dashed var(--gv-line); }
.gv-intro { margin: 0 0 8px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.6; }
.gv-filelist { display: flex; flex-direction: column; gap: 1px; max-height: 250px; overflow: auto; }
.gv-file {
  display: grid; grid-template-columns: 18px minmax(0, 1fr) 62px 44px; align-items: center; gap: 5px;
  padding: 2px 3px; font-family: var(--dsw-font-family-code-default); font-size: 10.5px;
}
.gv-file:hover { background: color-mix(in srgb, var(--gv-ink) 5%, transparent); }
.gv-fpath { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.gv-fsize, .gv-fstat { color: var(--dsw-alias-label-tertiary); font-size: 9.5px; text-align: right; }
.gv-fstat.added { color: var(--gv-red); }
.gv-fstat.changed { color: var(--gv-ink); }
.gv-plugin-warn { margin: 7px 0 0; color: var(--dsw-alias-state-warn-primary); font-size: 10.5px; }
.gv-empty { padding: 34px 18px; border: 1px dashed var(--gv-line-strong); color: var(--dsw-alias-label-secondary); text-align: center; font-size: 12px; }
.gv-empty strong { display: block; margin-bottom: 5px; color: var(--gv-ink); font-size: 14px; font-weight: 550; }
.gv-empty p { margin: 0; line-height: 1.7; }
.gv-footerline { margin-top: 14px; padding-top: 9px; border-top: 1px solid var(--gv-line); color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 1.6; }
.gv-card { padding: 12px 0 15px; border-top: 2px solid var(--gv-ink); }
.gv-card + .gv-card { border-top: 1px solid var(--gv-line); }
.gv-card:first-child { border-top-color: var(--gv-red); }
.gv-cardhead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.gv-cardtitle { font-size: 10px; font-weight: 650; letter-spacing: .17em; }
.gv-cardnote { color: var(--dsw-alias-label-secondary); font-size: 10px; }
.gv-repohead { display: flex; align-items: flex-start; gap: 8px; }
.gv-repohead .gv-dot { margin-top: 6px; }
.gv-repo-main { flex: 1; min-width: 0; }
.gv-reponame { display: block; overflow: hidden; color: var(--gv-ink); font-size: 12.5px; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; }
.gv-reponame:hover { color: var(--gv-red); }
.gv-repoline { display: flex; flex-wrap: wrap; gap: 5px 9px; margin-top: 3px; color: var(--dsw-alias-label-secondary); font-size: 10px; }
.gv-repoline code { font-family: var(--dsw-font-family-code-default); font-size: 10px; }
.gv-repoactions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.gv-hint { margin: 6px 0 0; color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.6; }
.gv-settings { margin: 2px 0 13px; padding: 0 0 13px; border-bottom: 1px solid var(--gv-line); }
.gv-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.gv-field { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.gv-field.full { grid-column: 1 / -1; }
.gv-checkrow { display: inline-flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.gv-seg { display: flex; border: 1px solid var(--gv-line-strong); }
.gv-seg button {
  flex: 1; height: 27px; border: 0; background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 10.5px; cursor: pointer;
}
.gv-seg button[aria-pressed="true"] { background: var(--gv-ink); color: var(--dsw-alias-bg-base); }
.gv-counts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 10px; border: 1px solid var(--gv-line); background: var(--gv-line); }
.gv-count { padding: 6px 3px; background: var(--dsw-alias-bg-layer-1); text-align: center; }
.gv-count b { display: block; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.gv-count span { color: var(--dsw-alias-label-secondary); font-size: 9px; }
.gv-count.add b { color: var(--gv-red); }
.gv-warnlist { margin: 8px 0 0; padding: 0; list-style: none; }
.gv-warnlist li { position: relative; padding-left: 10px; color: var(--dsw-alias-state-warn-primary); font-size: 10px; line-height: 1.55; }
.gv-warnlist li::before { content: "·"; position: absolute; left: 0; }
.gv-message {
  width: 100%; min-height: 50px; max-height: 120px; resize: vertical; padding: 7px 9px;
  border: 1px solid var(--gv-line-strong); border-radius: 2px; background: var(--gv-paper); color: var(--gv-ink);
  font-family: var(--dsw-font-family-code-default); font-size: 10.5px; line-height: 1.5;
}
.gv-actions { display: flex; gap: 7px; margin-top: 9px; }
.gv-actions .gv-btn { flex: 1; }
.gv-dochead { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.gv-doctabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
.gv-doctab {
  max-width: 100%; padding: 2px 7px; border: 1px solid var(--gv-line); background: transparent;
  color: var(--dsw-alias-label-secondary); font-size: 10px; cursor: pointer;
}
.gv-doctab[aria-pressed="true"] { border-color: var(--gv-red); color: var(--gv-red); }
.gv-docs { max-height: 300px; overflow: auto; border: 1px solid var(--gv-line); background: var(--gv-paper); }
.gv-docs pre { margin: 0; padding: 10px 11px; font-family: var(--dsw-font-family-code-default); font-size: 10px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.gv-toast {
  position: absolute; left: 50%; bottom: 18px; z-index: 30; display: flex; align-items: center; gap: 10px;
  max-width: min(680px, 86%); padding: 8px 12px; border: 1px solid var(--gv-line-strong);
  background: var(--dsw-alias-toast-bg); color: var(--dsw-alias-toast-label);
  box-shadow: var(--dsw-shadow-lv2); font-size: 11.5px; transform: translateX(-50%);
}
.gv-toast a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.gv-toast button { border: 0; background: transparent; color: inherit; cursor: pointer; opacity: .7; }
.gv-modal { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: var(--dsw-alias-bg-mask-1); }
.gv-modal-card { width: min(440px, 90vw); padding: 22px 24px 18px; border: 1px solid var(--gv-line-strong); background: var(--dsw-alias-bg-overlay); box-shadow: var(--dsw-shadow-lv3); }
.gv-modal-card h3 { margin: 0 0 7px; font-size: 15px; font-weight: 600; }
.gv-modal-card p { margin: 0 0 18px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.7; }
.gv-modal-actions { display: flex; justify-content: flex-end; gap: 7px; }
.gv-versionline { margin-top: 2px; color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
@media (max-width: 1080px) {
  .gv-body { grid-template-columns: minmax(0, 1fr) 330px; }
  .gv-headmeta { display: none; }
}
@media (max-width: 860px) {
  .gv-body { grid-template-columns: 1fr; }
  .gv-side { border-left: 0; border-top: 1px solid var(--gv-line); }
  .gv-head { flex-wrap: wrap; }
  .gv-headactions { margin-left: auto; }
  .gv-sub { max-width: 60ch; }
}
@media (prefers-reduced-motion: reduce) {
  .gv-page *, .gv-page *::before, .gv-page *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;

    const icons = {
      refresh: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M13 7a5 5 0 1 0 .2 2.6M13 3.5V7H9.5', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      upload: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M8 11V3M4.8 6.2 8 3l3.2 3.2M3 12.5h10', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      login: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M9.5 2.5H13v11H9.5M7 5 3.5 8 7 11M3.5 8H10', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      external: h('svg', { viewBox: '0 0 16 16', width: 11, height: 11, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M9 3h4v4M13 3 7.5 8.5M12 9.5V13H3V4h3.5', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      close: h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'm4 4 8 8M12 4l-8 8', strokeLinecap: 'round' })),
      chevron: h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'm6 3 5 5-5 5', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      docs: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
        h('path', { d: 'M4 2.5h5l3 3V13H4zM9 2.5V6h3M6 8h4M6 10.5h4', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      check: h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true },
        h('path', { d: 'm3 8.5 3 3 7-7', strokeLinecap: 'round', strokeLinejoin: 'round' })),
    };

    function svg(name) { return icons[name] || null; }

    function fmtSize(bytes) {
      const n = Number(bytes) || 0;
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1024 / 1024).toFixed(1) + ' MB';
    }

    function shortSha(sha) {
      return typeof sha === 'string' && sha.length > 8 ? sha.slice(0, 7) : (sha || '');
    }

    function openExternal(url) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        /* ignore popup failure */
      }
    }

    async function api(path, body, signal) {
      const response = await fetch(API + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal,
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok || !data || data.ok === false) {
        const error = new Error((data && data.message) || ('GitHub Vault HTTP ' + response.status));
        error.code = data && data.code;
        error.status = response.status;
        error.details = data && data.details;
        throw error;
      }
      return data;
    }

    function fill(text, values) {
      return String(text).replace(/\{(\w+)\}/g, (_match, key) => (values && values[key] !== undefined ? String(values[key]) : ''));
    }

    function Panel({ t, ctx }) {
      const [status, setStatus] = useState(null);
      const [scan, setScan] = useState(null);
      const [remote, setRemote] = useState(null);
      const [remoteError, setRemoteError] = useState('');
      const [error, setError] = useState('');
      const [authError, setAuthError] = useState('');
      const [loading, setLoading] = useState(true);
      const [token, setToken] = useState('');
      const [loginBusy, setLoginBusy] = useState(false);
      const [saving, setSaving] = useState(false);
      const [creating, setCreating] = useState(false);
      const [previewing, setPreviewing] = useState(false);
      const [uploading, setUploading] = useState(false);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [cfg, setCfg] = useState({ owner: '', repo: 'dsh-plugins', branch: 'main', root: '', private: false });
      const [workspaces, setWorkspaces] = useState([]);
      const [selected, setSelected] = useState({});
      const [expanded, setExpanded] = useState({});
      const [mode, setMode] = useState('sync');
      const [message, setMessage] = useState('');
      const [preview, setPreview] = useState(null);
      const [docTab, setDocTab] = useState('root');
      const [toast, setToast] = useState(null);
      const [confirm, setConfirm] = useState(null);

      const themeMode = useMemo(() => {
        try {
          const theme = ctx.theme.getTheme();
          return theme && theme.active && theme.active.colorScheme === 'light' ? 'light' : 'dark';
        } catch {
          return 'light';
        }
      }, [ctx]);

      useEffect(() => {
        loadAll(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(null), 9000);
        return () => clearTimeout(timer);
      }, [toast]);

      useEffect(() => {
        if (!confirm) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setConfirm(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [confirm]);

      const plugins = scan && Array.isArray(scan.plugins) ? scan.plugins : [];

      function mergeSelection(previous, list, reset) {
        const next = {};
        for (const plugin of list) {
          const old = previous && previous[plugin.id];
          const entry = {};
          for (const file of plugin.files) {
            entry[file.path] = reset || !old ? true : old[file.path] !== false;
          }
          next[plugin.id] = entry;
        }
        return next;
      }

      async function loadAll(resetSelection) {
        setLoading(true);
        setError('');
        try {
          const state = await api('/state');
          setStatus(state);
          setCfg(state.config);
          setAuthError(state.authError || '');
          setWorkspaces(Array.isArray(state.workspaces) ? state.workspaces : []);
          if (state.repoError) setRemoteError(state.repoError);
          try {
            const scanned = await api('/plugins');
            setScan(scanned);
            const list = Array.isArray(scanned.plugins) ? scanned.plugins : [];
            setSelected((previous) => mergeSelection(previous, list, resetSelection));
          } catch (scanError) {
            setScan(null);
            setError(scanError.message);
          }
          if (state.auth.connected) {
            try {
              const result = await api('/remote');
              setRemote(result.remote);
              setRemoteError('');
            } catch (remoteFailure) {
              setRemote(null);
              setRemoteError(remoteFailure.message);
            }
          } else {
            setRemote(null);
            setRemoteError('');
          }
          setPreview(null);
          setConfirm(null);
        } catch (failure) {
          setError(failure.message);
        } finally {
          setLoading(false);
        }
      }

      function fileStatus(plugin, file) {
        if (!remote || !remote.exists || remote.empty) return 'added';
        const entry = remote.files && remote.files['plugins/' + plugin.id + '/' + file.path];
        if (!entry) return 'added';
        return entry.sha === file.sha ? 'same' : 'changed';
      }

      function pluginSelectedCount(plugin) {
        const entry = selected[plugin.id] || {};
        return plugin.files.filter((file) => entry[file.path] !== false).length;
      }

      function isPluginSelected(plugin) {
        return pluginSelectedCount(plugin) > 0;
      }

      function pluginAllSelected(plugin) {
        const entry = selected[plugin.id] || {};
        return plugin.files.length > 0 && plugin.files.every((file) => entry[file.path] !== false);
      }

      function togglePlugin(plugin, on) {
        setSelected((previous) => {
          const entry = {};
          for (const file of plugin.files) entry[file.path] = on;
          return { ...previous, [plugin.id]: entry };
        });
        setPreview(null);
      }

      function toggleFile(plugin, file, on) {
        setSelected((previous) => ({
          ...previous,
          [plugin.id]: { ...(previous[plugin.id] || {}), [file.path]: on },
        }));
        setPreview(null);
      }

      function selectAll(on) {
        const next = {};
        for (const plugin of plugins) {
          const entry = {};
          for (const file of plugin.files) entry[file.path] = on;
          next[plugin.id] = entry;
        }
        setSelected(next);
        setPreview(null);
      }

      function selectionPayload() {
        const selection = [];
        for (const plugin of plugins) {
          const entry = selected[plugin.id] || {};
          const files = plugin.files.filter((file) => entry[file.path] !== false).map((file) => file.path);
          if (files.length > 0) selection.push({ id: plugin.id, files });
        }
        return selection;
      }

      const selection = selectionPayload();
      const selectedPlugins = selection.length;
      const selectedFiles = selection.reduce((total, item) => total + item.files.length, 0);

      function pluginDelta(plugin) {
        let added = 0;
        let changed = 0;
        let same = 0;
        const entry = selected[plugin.id] || {};
        for (const file of plugin.files) {
          if (entry[file.path] === false) continue;
          const state = fileStatus(plugin, file);
          if (state === 'added') added += 1;
          else if (state === 'changed') changed += 1;
          else same += 1;
        }
        let deleted = 0;
        if (remote && remote.exists && isPluginSelected(plugin)) {
          const prefix = 'plugins/' + plugin.id + '/';
          for (const repoPath of Object.keys(remote.files || {})) {
            if (!repoPath.startsWith(prefix)) continue;
            const rel = repoPath.slice(prefix.length);
            if (entry[rel] === false) deleted += 1;
          }
        }
        return { added, changed, same, deleted };
      }

      async function submitLogin(event) {
        event.preventDefault();
        if (!token.trim()) return;
        setLoginBusy(true);
        setAuthError('');
        setError('');
        try {
          await api('/login', { token: token.trim() });
          setToken('');
          await loadAll(false);
        } catch (failure) {
          setAuthError(failure.message);
        } finally {
          setLoginBusy(false);
        }
      }

      async function doLogout() {
        setError('');
        try {
          await api('/logout', {});
          await loadAll(false);
          setToast({ kind: 'info', text: t('loggedOut') });
        } catch (failure) {
          setError(failure.message);
        }
      }

      async function saveSettings(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
          const state = await api('/config', {
            owner: cfg.owner,
            repo: cfg.repo,
            branch: cfg.branch,
            root: cfg.root,
            private: cfg.private,
          });
          setStatus(state);
          setCfg(state.config);
          setSettingsOpen(false);
          setToast({ kind: 'ok', text: t('configSaved') });
          await loadAll(false);
        } catch (failure) {
          setError(failure.message);
        } finally {
          setSaving(false);
        }
      }

      async function createRepository() {
        setCreating(true);
        setError('');
        try {
          await api('/create-repo', {});
          setToast({ kind: 'ok', text: t('repoCreated') });
          await loadAll(false);
        } catch (failure) {
          setError(failure.message);
        } finally {
          setCreating(false);
        }
      }

      async function buildPreview() {
        const current = selectionPayload();
        if (current.length === 0) {
          setError(t('emptySelection'));
          return null;
        }
        setPreviewing(true);
        setError('');
        try {
          const result = await api('/preview', { selection: current, mode });
          setPreview(result.plan);
          setDocTab('root');
          return result.plan;
        } catch (failure) {
          setError(failure.message);
          return null;
        } finally {
          setPreviewing(false);
        }
      }

      async function performUpload() {
        const current = selectionPayload();
        if (current.length === 0) {
          setError(t('emptySelection'));
          return;
        }
        setUploading(true);
        setError('');
        try {
          const result = await api('/upload', {
            selection: current,
            mode,
            message: message.trim() || undefined,
          });
          setPreview(null);
          if (result.noChanges) setToast({ kind: 'info', text: t('noChanges') });
          else setToast({ kind: 'ok', text: t('success'), url: result.commit && result.commit.url });
          await loadAll(false);
        } catch (failure) {
          setError(failure.message);
        } finally {
          setUploading(false);
        }
      }

      async function startUpload() {
        let plan = preview;
        if (!plan) plan = await buildPreview();
        if (!plan) return;
        if (plan.counts.added + plan.counts.changed + plan.counts.deleted === 0) {
          setToast({ kind: 'info', text: t('noChanges') });
          return;
        }
        if (plan.counts.deleted > 0) {
          setConfirm(plan);
          return;
        }
        await performUpload();
      }

      async function copyDoc() {
        const active = activeDoc();
        if (!active) return;
        try {
          await navigator.clipboard.writeText(active.content);
          setToast({ kind: 'ok', text: t('copied') });
        } catch {
          setError(t('copyFailed'));
        }
      }

      function titleOf(id) {
        const plugin = plugins.find((entry) => entry.id === id);
        return plugin ? plugin.title : id;
      }

      function docItems() {
        if (!preview || !preview.docs) return [];
        const items = [{ id: 'root', label: t('rootDoc'), content: preview.docs.readme }];
        for (const doc of preview.docs.perPlugin || []) {
          items.push({ id: doc.id, label: titleOf(doc.id), content: doc.content });
        }
        return items;
      }

      function activeDoc() {
        const items = docItems();
        return items.find((item) => item.id === docTab) || items[0] || null;
      }

      function changeMode(next) {
        setMode(next);
        setPreview(null);
      }

      function summaryLabel() {
        if (!status || !status.auth.connected) return t('loginFirst');
        if (!status.repo || !status.repo.exists) return t('createAndUpload');
        if (preview && preview.counts.added + preview.counts.changed + preview.counts.deleted === 0) return t('noChanges');
        if (mode === 'replace') return t('replaceUpload');
        if (remote && !remote.empty) return t('updateCount').replace('{count}', String(selectedPlugins));
        return t('uploadCount').replace('{count}', String(selectedPlugins));
      }

      function renderHeader() {
        const connected = Boolean(status && status.auth.connected);
        const repo = status && status.repo;
        return h('header', { className: 'gv-head' },
          h('div', { className: 'gv-brand' },
            h('div', { className: 'gv-seal', 'aria-hidden': true }, '上'),
            h('div', null,
              h('div', { className: 'gv-eyebrow' }, t('eyebrow')),
              h('h1', { className: 'gv-title' }, t('title')),
              h('p', { className: 'gv-sub' }, t('subtitle')))),
          h('div', { className: 'gv-headmeta' },
            h('span', { className: 'gv-chip' },
              h('i', { className: 'gv-dot ' + (connected ? 'ok' : 'idle') }),
              connected ? h('b', null, '@' + status.auth.login) : t('notConnected')),
            repo && repo.exists
              ? h('span', { className: 'gv-chip' }, h('i', { className: 'gv-dot ok' }), h('b', null, repo.fullName))
              : null,
            repo && repo.exists
              ? h('span', { className: 'gv-chip' }, t('branch'), h('b', null, cfg.branch || repo.defaultBranch))
              : null,
            repo && repo.private
              ? h('span', { className: 'gv-chip' }, t('private'))
              : null),
          h('div', { className: 'gv-headactions' },
            h('button', {
              type: 'button',
              className: 'gv-btn small',
              onClick: () => loadAll(false),
              disabled: loading || uploading,
            }, loading ? h('span', { className: 'gv-spin' }) : svg('refresh'), t('refresh')),
            connected
              ? h('button', {
                type: 'button',
                className: 'gv-btn small ghost',
                onClick: () => setSettingsOpen((value) => !value),
                'aria-expanded': settingsOpen,
              }, t('settings'))
              : null,
            connected
              ? h('button', { type: 'button', className: 'gv-btn small ghost', onClick: doLogout }, t('logout'))
              : null));
      }

      function renderError() {
        if (!error) return null;
        return h('div', { className: 'gv-banner', role: 'alert' },
          h('p', null, error),
          h('button', { type: 'button', onClick: () => setError(''), 'aria-label': t('close') }, svg('close')));
      }

      function renderLogin() {
        const localCount = plugins.length;
        return h('div', { className: 'gv-loginwrap' },
          h('div', { className: 'gv-login' },
            h('div', { className: 'gv-login-seal', 'aria-hidden': true }, '上'),
            h('h2', null, t('connect')),
            h('p', { className: 'gv-sub' }, t('connectHint')),
            h('form', { className: 'gv-form', onSubmit: submitLogin },
              h('label', null,
                h('span', { className: 'gv-fieldlabel' }, t('token')),
                h('div', { className: 'gv-loginrow' },
                  h('input', {
                    className: 'gv-input grow',
                    type: 'password',
                    value: token,
                    onChange: (event) => setToken(event.target.value),
                    placeholder: t('tokenPlaceholder'),
                    autoComplete: 'off',
                    spellCheck: false,
                    'aria-label': t('token'),
                  }),
                  h('button', {
                    type: 'submit',
                    className: 'gv-btn primary',
                    disabled: loginBusy || !token.trim(),
                  }, loginBusy ? h('span', { className: 'gv-spin' }) : svg('login'), loginBusy ? t('loggingIn') : t('login'))))),
            h('div', { className: 'gv-links' },
              h('a', {
                className: 'gv-link',
                href: TOKEN_URL,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: (event) => { event.preventDefault(); openExternal(TOKEN_URL); },
              }, svg('external'), t('tokenCreate')),
              h('a', {
                className: 'gv-link',
                href: FINE_TOKEN_URL,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: (event) => { event.preventDefault(); openExternal(FINE_TOKEN_URL); },
              }, svg('external'), t('tokenCreateFine'))),
            h('p', { className: 'gv-note' }, t('tokenNote')),
            authError ? h('div', { className: 'gv-inlineerror' }, authError) : null,
            h('div', { className: 'gv-loginfoot' },
              h('div', null, t('localPlugins').replace('{count}', String(localCount))),
              h('div', { className: 'gv-versionline' }, t('footerNote')))));
      }

      function renderFileRow(plugin, file) {
        const entry = selected[plugin.id] || {};
        const on = entry[file.path] !== false;
        const state = fileStatus(plugin, file);
        const stateLabel = state === 'added' ? t('added') : state === 'changed' ? t('changed') : t('same');
        return h('label', { className: 'gv-file', key: file.path },
          h('input', {
            type: 'checkbox',
            checked: on,
            onChange: (event) => toggleFile(plugin, file, event.target.checked),
            'aria-label': file.path,
          }),
          h('span', { className: 'gv-fpath', title: file.path }, file.path),
          h('span', { className: 'gv-fsize' }, fmtSize(file.size)),
          h('span', { className: 'gv-fstat ' + state }, stateLabel));
      }

      function renderPlugin(plugin) {
        const open = Boolean(expanded[plugin.id]);
        const on = pluginAllSelected(plugin);
        const any = isPluginSelected(plugin);
        const delta = pluginDelta(plugin);
        return h('div', {
          className: 'gv-plugin' + (any ? ' on' : '') + (open ? ' open' : ''),
          key: plugin.id,
        },
        h('div', { className: 'gv-plugin-head' },
          h('label', { className: 'gv-check', title: t('selectPlugin') },
            h('input', {
              type: 'checkbox',
              checked: on,
              onChange: (event) => togglePlugin(plugin, event.target.checked),
              'aria-label': plugin.title,
            })),
          h('button', {
            type: 'button',
            className: 'gv-plugin-title',
            onClick: () => setExpanded((previous) => ({ ...previous, [plugin.id]: !open })),
            'aria-expanded': open,
            title: open ? t('collapse') : t('expand'),
          },
            h('span', { className: 'gv-plugin-titletext' }, plugin.title),
            h('span', { className: 'gv-plugin-meta' }, plugin.name + ' · v' + (plugin.version || '—')),
            h('span', { className: 'gv-forms' },
              (plugin.forms || []).map((form) => h('span', { className: 'gv-form', key: form }, form)))),
          h('div', { className: 'gv-nums' },
            delta.added ? h('span', { className: 'gv-num add' }, '+' + delta.added) : null,
            delta.changed ? h('span', { className: 'gv-num change' }, '~' + delta.changed) : null,
            delta.deleted ? h('span', { className: 'gv-num del' }, '-' + delta.deleted) : null,
            !delta.added && !delta.changed && !delta.deleted ? h('span', { className: 'gv-num same' }, '· ' + delta.same) : null),
          h('span', { className: 'gv-caret', 'aria-hidden': true }, svg('chevron'))),
        open
          ? h('div', { className: 'gv-plugin-body' },
            plugin.intro ? h('p', { className: 'gv-intro' }, plugin.intro) : null,
            h('div', { className: 'gv-filelist' }, plugin.files.map((file) => renderFileRow(plugin, file))),
            (plugin.warnings || []).map((warning) => h('p', { className: 'gv-plugin-warn', key: warning }, warning)))
          : null);
      }

      function renderMain() {
        if (!scan) {
          return h('div', { className: 'gv-empty' },
            h('strong', null, loading ? t('loading') : t('noPlugins')),
            h('p', null, t('noPluginsHint')));
        }
        if (plugins.length === 0) {
          return h('div', { className: 'gv-empty' },
            h('strong', null, t('noPlugins')),
            h('p', null, scan.root),
            h('p', null, t('noPluginsHint')));
        }
        return h('div', null,
          h('div', { className: 'gv-toolbar' },
            h('span', { className: 'gv-root', title: scan.root }, t('scanRoot') + ' · ' + scan.root),
            h('span', { className: 'spacer' }),
            h('span', { className: 'gv-cardnote' }, t('pluginsCount').replace('{count}', String(plugins.length)) + ' · ' + t('selectedCount').replace('{count}', String(selectedPlugins))),
            h('button', { type: 'button', className: 'gv-btn small ghost', onClick: () => selectAll(true) }, t('selectAll')),
            h('button', { type: 'button', className: 'gv-btn small ghost', onClick: () => selectAll(false) }, t('selectNone'))),
          plugins.map(renderPlugin),
          h('div', { className: 'gv-footerline' }, t('footerNote')));
      }

      function renderRepoCard() {
        const repo = status && status.repo;
        if (!repo || !repo.exists) {
          return h('div', { className: 'gv-card' },
            h('div', { className: 'gv-cardhead' },
              h('span', { className: 'gv-cardtitle' }, t('repo')),
              h('button', { type: 'button', className: 'gv-btn small ghost', onClick: () => setSettingsOpen((value) => !value) }, t('settings'))),
            h('div', { className: 'gv-repohead' },
              h('i', { className: 'gv-dot idle' }),
              h('div', { className: 'gv-repo-main' },
                h('span', { className: 'gv-reponame' }, (cfg.owner || (status && status.auth.login) || '') + '/' + cfg.repo),
                h('span', { className: 'gv-repoline' }, h('span', null, t('repoMissing'))))),
            h('p', { className: 'gv-hint' }, t('autoCreate')),
            h('div', { className: 'gv-repoactions' },
              h('button', { type: 'button', className: 'gv-btn small', onClick: createRepository, disabled: creating },
                creating ? h('span', { className: 'gv-spin' }) : svg('upload'), t('createRepo'))));
        }
        return h('div', { className: 'gv-card' },
          h('div', { className: 'gv-cardhead' },
            h('span', { className: 'gv-cardtitle' }, t('repo')),
            h('button', { type: 'button', className: 'gv-btn small ghost', onClick: () => setSettingsOpen((value) => !value) }, t('settings'))),
          h('div', { className: 'gv-repohead' },
            h('i', { className: 'gv-dot ok' }),
            h('div', { className: 'gv-repo-main' },
              h('a', {
                className: 'gv-reponame',
                href: repo.htmlUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: (event) => { event.preventDefault(); openExternal(repo.htmlUrl); },
              }, repo.fullName),
              h('span', { className: 'gv-repoline' },
                h('span', null, repo.private ? t('private') : t('public')),
                h('span', null, t('branch') + ' ', h('code', null, cfg.branch || repo.defaultBranch)),
                remote && remote.head ? h('span', null, h('code', null, shortSha(remote.head.sha))) : null,
                remote && remote.empty ? h('span', null, t('emptyRepo')) : null))),
          remote && remote.branchExists === false && !remote.empty
            ? h('p', { className: 'gv-hint' }, t('branchNew'))
            : null,
          remoteError ? h('ul', { className: 'gv-warnlist' }, h('li', null, t('remoteFailed') + '：' + remoteError)) : null,
          h('div', { className: 'gv-repoactions' },
            h('button', {
              type: 'button',
              className: 'gv-btn small ghost',
              onClick: () => openExternal(repo.htmlUrl),
            }, svg('external'), t('repoLink'))));
      }

      function renderSettings() {
        return h('form', { className: 'gv-settings', onSubmit: saveSettings },
          h('div', { className: 'gv-grid2' },
            h('div', { className: 'gv-field' },
              h('label', { className: 'gv-fieldlabel', htmlFor: 'gv-owner' }, t('owner')),
              h('input', {
                id: 'gv-owner',
                className: 'gv-input',
                value: cfg.owner,
                onChange: (event) => setCfg({ ...cfg, owner: event.target.value }),
                placeholder: (status && status.auth.login) || 'owner',
                spellCheck: false,
              })),
            h('div', { className: 'gv-field' },
              h('label', { className: 'gv-fieldlabel', htmlFor: 'gv-repo' }, t('repoName')),
              h('input', {
                id: 'gv-repo',
                className: 'gv-input',
                value: cfg.repo,
                onChange: (event) => setCfg({ ...cfg, repo: event.target.value }),
                spellCheck: false,
              }),
              h('p', { className: 'gv-hint' }, t('repoNameHint'))),
            h('div', { className: 'gv-field' },
              h('label', { className: 'gv-fieldlabel', htmlFor: 'gv-branch' }, t('branch')),
              h('input', {
                id: 'gv-branch',
                className: 'gv-input',
                value: cfg.branch,
                onChange: (event) => setCfg({ ...cfg, branch: event.target.value }),
                spellCheck: false,
              })),
            h('div', { className: 'gv-field' },
              h('span', { className: 'gv-fieldlabel' }, t('private')),
              h('label', { className: 'gv-checkrow' },
                h('input', {
                  type: 'checkbox',
                  checked: Boolean(cfg.private),
                  onChange: (event) => setCfg({ ...cfg, private: event.target.checked }),
                }),
                cfg.private ? t('private') : t('public'))),
            h('div', { className: 'gv-field full' },
              h('label', { className: 'gv-fieldlabel', htmlFor: 'gv-root' }, t('root')),
              h('input', {
                id: 'gv-root',
                className: 'gv-input',
                value: cfg.root,
                onChange: (event) => setCfg({ ...cfg, root: event.target.value }),
                list: 'gv-roots',
                spellCheck: false,
              }),
              h('datalist', { id: 'gv-roots' },
                workspaces.map((workspace) => h('option', {
                  key: workspace.id,
                  value: workspace.path,
                }, workspace.title))))),
          h('div', { className: 'gv-repoactions' },
            h('button', { type: 'submit', className: 'gv-btn small primary', disabled: saving },
              saving ? h('span', { className: 'gv-spin' }) : svg('check'), t('save'))));
      }

      function renderSyncCard() {
        const counts = preview ? preview.counts : null;
        const warnings = [];
        if (preview && preview.warnings) warnings.push(...preview.warnings);
        if (status && status.auth && status.auth.scopes && !String(status.auth.scopes).split(',').map((item) => item.trim()).includes('repo')) {
          warnings.push(t('tokenScopes'));
        }
        if (remoteError) warnings.push(t('remoteFailed') + '：' + remoteError);
        const canUpload = Boolean(status && status.auth.connected) && selectedPlugins > 0 && !uploading;
        const upToDate = Boolean(preview && preview.counts.added + preview.counts.changed + preview.counts.deleted === 0);
        return h('div', { className: 'gv-card' },
          h('div', { className: 'gv-cardhead' },
            h('span', { className: 'gv-cardtitle' }, t('mode')),
            h('span', { className: 'gv-cardnote' },
              t('selectedCount').replace('{count}', String(selectedPlugins))
              + ' · '
              + t('filesCount').replace('{count}', String(selectedFiles)))),
          h('div', { className: 'gv-seg', role: 'group', 'aria-label': t('mode') },
            h('button', { type: 'button', 'aria-pressed': mode === 'sync', onClick: () => changeMode('sync') }, t('sync')),
            h('button', { type: 'button', 'aria-pressed': mode === 'replace', onClick: () => changeMode('replace') }, t('replace'))),
          h('p', { className: 'gv-hint' }, mode === 'sync' ? t('syncHint') : t('replaceHint')),
          h('div', { className: 'gv-counts' },
            h('div', { className: 'gv-count add' }, h('b', null, counts ? counts.added : '—'), h('span', null, t('added'))),
            h('div', { className: 'gv-count' }, h('b', null, counts ? counts.changed : '—'), h('span', null, t('changed'))),
            h('div', { className: 'gv-count' }, h('b', null, counts ? counts.deleted : '—'), h('span', null, t('deleted'))),
            h('div', { className: 'gv-count' }, h('b', null, counts ? counts.total : '—'), h('span', null, t('total')))),
          counts
            ? null
            : h('p', { className: 'gv-hint' }, t('generateFirst')),
          warnings.length
            ? h('ul', { className: 'gv-warnlist' }, warnings.map((warning, index) => h('li', { key: index }, warning)))
            : null,
          h('label', { className: 'gv-fieldlabel', htmlFor: 'gv-commit', style: { marginTop: '10px' } }, t('commitMessage')),
          h('textarea', {
            id: 'gv-commit',
            className: 'gv-message',
            value: message,
            onChange: (event) => setMessage(event.target.value),
            placeholder: t('commitPlaceholder'),
            spellCheck: false,
          }),
          h('div', { className: 'gv-actions' },
            h('button', {
              type: 'button',
              className: 'gv-btn',
              onClick: buildPreview,
              disabled: previewing || uploading,
            }, previewing ? h('span', { className: 'gv-spin' }) : svg('docs'), previewing ? t('previewing') : t('preview')),
            h('button', {
              type: 'button',
              className: 'gv-btn primary',
              onClick: startUpload,
              disabled: !canUpload || previewing || upToDate,
            }, uploading ? h('span', { className: 'gv-spin' }) : svg('upload'), uploading ? t('uploading') : summaryLabel())),
          h('p', { className: 'gv-hint' }, t('footerNote')));
      }

      function renderDocsCard() {
        const items = docItems();
        const active = activeDoc();
        return h('div', { className: 'gv-card' },
          h('div', { className: 'gv-dochead' },
            h('span', { className: 'gv-cardtitle' }, t('docs')),
            items.length ? h('button', { type: 'button', className: 'gv-btn small ghost', onClick: copyDoc }, t('copy')) : null),
          items.length
            ? h('div', null,
              h('div', { className: 'gv-doctabs', role: 'group', 'aria-label': t('docs') },
                items.map((item) => h('button', {
                  key: item.id,
                  type: 'button',
                  className: 'gv-doctab',
                  'aria-pressed': docTab === item.id,
                  title: item.label,
                  onClick: () => setDocTab(item.id),
                }, item.label))),
              h('div', { className: 'gv-docs' }, h('pre', null, active ? active.content : t('docsEmpty'))))
            : h('div', null,
              h('p', { className: 'gv-hint' }, t('docsHint')),
              h('button', {
                type: 'button',
                className: 'gv-btn small',
                onClick: buildPreview,
                disabled: previewing,
              }, previewing ? h('span', { className: 'gv-spin' }) : svg('docs'), previewing ? t('previewing') : t('preview'))));
      }

      function renderSide() {
        return h('aside', { className: 'gv-side' },
          renderRepoCard(),
          settingsOpen ? renderSettings() : null,
          renderSyncCard(),
          renderDocsCard());
      }

      function renderToast() {
        if (!toast) return null;
        return h('div', { className: 'gv-toast', role: 'status' },
          h('span', null, toast.text),
          toast.url
            ? h('a', {
              href: toast.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              onClick: (event) => { event.preventDefault(); openExternal(toast.url); },
            }, t('commitLink'))
            : null,
          h('button', { type: 'button', onClick: () => setToast(null), 'aria-label': t('close') }, svg('close')));
      }

      function renderConfirm() {
        if (!confirm) return null;
        return h('div', {
          className: 'gv-modal',
          role: 'presentation',
          onMouseDown: (event) => { if (event.target === event.currentTarget) setConfirm(null); },
        },
        h('div', { className: 'gv-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('confirmTitle') },
          h('h3', null, t('confirmTitle')),
          h('p', null, t('confirmBody').replace('{count}', String(confirm.counts.deleted))),
          h('div', { className: 'gv-modal-actions' },
            h('button', { type: 'button', className: 'gv-btn', onClick: () => setConfirm(null), autoFocus: true }, t('cancel')),
            h('button', {
              type: 'button',
              className: 'gv-btn primary',
              onClick: () => { setConfirm(null); performUpload(); },
            }, t('confirm')))));
      }

      const content = !status && loading
        ? h('div', { className: 'gv-loading' }, h('span', { className: 'gv-spin' }), t('loading'))
        : !status
          ? h('div', { className: 'gv-loginwrap' },
            h('div', { className: 'gv-empty' },
              h('strong', null, t('noPlugins')),
              h('p', null, error || t('retry')),
              h('button', { type: 'button', className: 'gv-btn', onClick: () => loadAll(false) }, t('retry'))))
          : status.auth.connected
            ? h('div', { className: 'gv-body' }, h('section', { className: 'gv-main' }, renderMain()), renderSide())
            : renderLogin();

      return h('div', { className: 'gv-page', 'data-gv-theme': themeMode },
        renderHeader(),
        h('div', { className: 'gv-rule' }),
        renderError(),
        content,
        renderToast(),
        renderConfirm());
    }

    function PanelIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, fill: 'none', 'aria-hidden': true },
        h('rect', { x: 3.2, y: 3.2, width: 13.6, height: 13.6, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M10 13.8V7M7.2 9.8 10 7l2.8 2.8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'square' }));
    }

    function apply(ctx) {
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.setAttribute('data-plugin-css', 'github-vault');
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, 'github-vault: styles');

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'github-vault: dictionaries');
      const t = ctx.locale.bind(NS);

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL,
        locale: NS,
      }, (props) => h(Panel, { ...props, t, ctx })));

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL,
        order: 21,
        locale: NS,
        label: () => t('panel'),
      }, PanelIcon));
    }

    return {
      inject: ['slots', 'locale', 'theme'],
      apply,
    };
  },
});
