# dsh-plugins

我的 DeepSeek Harness 插件源码备份，由 **插件管家（@local/plugin-hub）** 自动维护。

- `packages/<目录>/…` —— 每个插件包的完整源码
- `manifest.json` —— 包清单、每个文件的 git blob sha、以及备份时 profile 的启用状态
- `bootstrap.ps1` / `bootstrap.cmd` —— 新机器一键装回

## 新机器怎么装回来

1. 装好 DSH，至少启动过一次（生成默认 profile）。
2. 关掉 DSH。
3. 把 `bootstrap.cmd` 和 `bootstrap.ps1` 下载到同一个文件夹，双击 `bootstrap.cmd`。
4. 看到绿色的“完成”后重新打开 DSH。

它会匿名下载本仓库（不需要 git、不需要 Token），把包写到 `F:\DSH-Plugins`，按 `manifest.json` 复原依赖与启用列表，再用 DSH 自带的 pnpm 安装依赖。

## 日常使用

打开 DSH 右侧栏的「插件管家」：

- 列表里直接开关插件（即时生效）
- 「备份到 GitHub」一键推送（不需要 git，走 GitHub API）
- 「从 GitHub 恢复」把任意机器拉回同一套插件
- 底部对话框可以直接说“把 sudoku 关了然后备份”，由专属会话动手

## 私有仓库

仓库若改私有，匿名下载会失败：需要在这台机器上先配置 Token（插件管家面板里粘贴），再用面板的「从 GitHub 恢复」，不要用 bootstrap 的匿名下载。
