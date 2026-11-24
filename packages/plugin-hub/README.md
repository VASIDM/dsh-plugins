# Plugin Hub

右侧栏的插件总管。一个面板里看完所有本地插件，开关即时生效，一键把源码推到 GitHub，换台机器再一键拉回来。

## 面板里能做什么

- **列表**：`F:\DSH-Plugins` 下每个包的名称、版本、是否带 bundle、当前是否启用。
- **开关**：对带 `dsh.bundle` 的包直接启用/停用（走 DSH 插件管理器，即时生效，无需重启）。
- **备份到 GitHub**：把全部插件源码（`packages/<目录>/…`）+ `manifest.json` 一次性提交到配置的仓库。不需要安装 git。
- **从 GitHub 恢复**：读 `manifest.json`，把包写回 `F:\DSH-Plugins`，改写 profile 的 `link:` 依赖与 bundle 列表，并用随附 pnpm 安装。重启 DSH 后全部插件回来。
- **对话**：底部的输入框会把话发给一个专属会话（`plugin-hub-session.json` 记录 id），由它调用工具真正动手，回复显示在面板里。

## 配置

- 仓库信息存在 `$DSH_HOME/plugin-hub.json`，默认 `VASIDM/dsh-plugins`、分支 `main`、根目录 `F:/DSH-Plugins`。
- GitHub Token 存在 DSH 凭据库的 `plugin-hub/token`；没有时会沿用 `github-vault/token`，所以这台机器开箱即用。

## 新机器一键装回

1. 装好 DSH，打开任意对话。
2. 让 DSH 执行仓库里的 `bootstrap.ps1`（或在面板里先手动放好本插件后点“从 GitHub 恢复”）。

`bootstrap.ps1` 会：匿名下载仓库 zip → 解压到 `F:\DSH-Plugins` → 写好 profile 依赖与 bundle → 用随附 pnpm 安装。重启即全部就位。

## 接口

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/plugin-hub/state` | 包列表、profile 接线、仓库与 Token 状态 |
| POST | `/api/plugin-hub/enable` | `{dir, enabled}` 启停一个 bundle |
| POST | `/api/plugin-hub/token` | `{token}` 校验并保存 GitHub 令牌 |
| POST | `/api/plugin-hub/backup` | 推送全部包到仓库 |
| POST | `/api/plugin-hub/restore` | 从仓库拉回并重接 profile |
| POST | `/api/plugin-hub/chat` | `{message}` 与专属会话对话一轮 |
