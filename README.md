# 插件

DeepSeek Harness 插件源码合集。一库多包，各自成体，独立安装，互不依赖。

仓库只收源码、清单与说明；依赖、构建产物、密钥与环境变量不入库。

## 安装

```sh
git clone https://github.com/VASIDM/dsh-plugins.git
dsh plugin --profile <profile> add "dsh-plugins/plugins/<id>"
```

亦可在 Harness 会话中给出插件目录的绝对路径，交由 `install_bundle` 安装。

## 索引

| 插件 | 标识 | 版本 | 形态 | 要旨 |
| --- | --- | --- | --- | --- |
| 插件改名 | `@local/plugin-names` | 1.0.0 | Web 界面 + Host 插件 | 在 设置 → 插件 → 「插件改名」里给本地链接的插件换显示名，写回该包的 locale 文件，刷新后生效。 |
| 插件上行 | `@local/github-vault` | 1.0.0 | Web 界面 + Host 插件 | 连接 GitHub，择取本地 DSH 插件，生成索引与说明，同步至单一仓库。 |
| 彻底删除对话 | `@local/session-purge` | 0.1.0 | Web 界面 + Host 插件 | 在会话行的「…」菜单中永久抹除一个对话及其本地痕迹：日志、子会话、投影缓存、工作区记账、未共享附件与文件缓存记录。不可恢复。 |
| 太初 开机序列 | `@local/dsh-scifi-boot` | 1.7.2 | Web 界面 + Host 插件 | 每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」， |
| 习惯档案 · Habit Memory | `@local/azl-habits` | 1.0.8 | Web 界面 + Host 插件 + 工具 | 从每一次对话里学习你的长期偏好，并默认注入每个任务的系统提示，随时可以在侧边栏查看和调整。 |
| 用量与额度 | `@local/usage-center` | 1.0.0 | Web 界面 + Host 插件 | 在侧边栏查看 DeepSeek 账户余额、Token 消耗与缓存命中，并快速跳转开放平台查看用量或充值。 |
| 纸墨 | `@local/paper-ink` | 1.0.0 | Host 插件 | 温纸作底、墨色作字、朱砂作印。包含配色、字体、布局、设计四个独立组件。 |
| 纸墨 · 布局 | `@local/paper-ink-layout` | 1.0.0 | Web 界面 | 版心收窄到 720px，对话行距放宽到 10px。 |
| 纸墨 · 配色 | `@local/paper-ink-theme` | 1.0.0 | Web 界面 | 纸面、墨字、朱砂印与状态色，覆盖全部语义令牌。 |
| 纸墨 · 设计 | `@local/paper-ink-design` | 1.0.0 | Web 界面 | 方角、平影、细滚动条、朱砂引线与标题墨线。 |
| 纸墨 · 字体 | `@local/paper-ink-type` | 1.0.0 | Web 界面 | 正文改宋体，代码保持等宽，品牌字改衬线。 |

## 插件改名

`@local/plugin-names` · v1.0.0 · Web 界面 + Host 插件

在 设置 → 插件 → 「插件改名」里给本地链接的插件换显示名，写回该包的 locale 文件，刷新后生效。

- 源码：`plugins/plugin-names/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/plugin-names"`
- 详述：[README](plugins/plugin-names/README.md)

## 插件上行

`@local/github-vault` · v1.0.0 · Web 界面 + Host 插件

连接 GitHub，择取本地 DSH 插件，生成索引与说明，同步至单一仓库。

- 源码：`plugins/github-vault/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/github-vault"`
- 详述：[README](plugins/github-vault/README.md)

## 彻底删除对话

`@local/session-purge` · v0.1.0 · Web 界面 + Host 插件

在会话行的「…」菜单中永久抹除一个对话及其本地痕迹：日志、子会话、投影缓存、工作区记账、未共享附件与文件缓存记录。不可恢复。

- 源码：`plugins/session-purge/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/session-purge"`
- 详述：[README](plugins/session-purge/README.md)

## 太初 开机序列

`@local/dsh-scifi-boot` · v1.7.2 · Web 界面 + Host 插件

每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」，宋体大字、朱砂印记与逐帧显现的五句话（太易、太初、太始、太素、启户），等你按 Enter 或点「启」。

- 源码：`plugins/dsh-scifi-boot/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/dsh-scifi-boot"`
- 详述：[README](plugins/dsh-scifi-boot/README.md)

## 习惯档案 · Habit Memory

`@local/azl-habits` · v1.0.8 · Web 界面 + Host 插件 + 工具

从每一次对话里学习你的长期偏好，并默认注入每个任务的系统提示，随时可以在侧边栏查看和调整。

- 源码：`plugins/azl-habits/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/azl-habits"`
- 详述：[README](plugins/azl-habits/README.md)
- 工具：`habit_list`、`habit_remember`、`habit_forget`

## 用量与额度

`@local/usage-center` · v1.0.0 · Web 界面 + Host 插件

在侧边栏查看 DeepSeek 账户余额、Token 消耗与缓存命中，并快速跳转开放平台查看用量或充值。

- 源码：`plugins/usage-center/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/usage-center"`
- 详述：[README](plugins/usage-center/README.md)

## 纸墨

`@local/paper-ink` · v1.0.0 · Host 插件

温纸作底、墨色作字、朱砂作印。包含配色、字体、布局、设计四个独立组件。

- 源码：`plugins/paper-ink/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/paper-ink"`
- 详述：[README](plugins/paper-ink/README.md)

## 纸墨 · 布局

`@local/paper-ink-layout` · v1.0.0 · Web 界面

版心收窄到 720px，对话行距放宽到 10px。

- 源码：`plugins/paper-ink-layout/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/paper-ink-layout"`
- 详述：[README](plugins/paper-ink-layout/README.md)

## 纸墨 · 配色

`@local/paper-ink-theme` · v1.0.0 · Web 界面

纸面、墨字、朱砂印与状态色，覆盖全部语义令牌。

- 源码：`plugins/paper-ink-theme/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/paper-ink-theme"`
- 详述：[README](plugins/paper-ink-theme/README.md)

## 纸墨 · 设计

`@local/paper-ink-design` · v1.0.0 · Web 界面

方角、平影、细滚动条、朱砂引线与标题墨线。

- 源码：`plugins/paper-ink-design/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/paper-ink-design"`
- 详述：[README](plugins/paper-ink-design/README.md)

## 纸墨 · 字体

`@local/paper-ink-type` · v1.0.0 · Web 界面

正文改宋体，代码保持等宽，品牌字改衬线。

- 源码：`plugins/paper-ink-type/`
- 安装：`dsh plugin --profile <profile> add "dsh-plugins/plugins/paper-ink-type"`
- 详述：[README](plugins/paper-ink-type/README.md)

## 约定

- 一个目录一个包；包根必有 `package.json`，通常声明 `dsh.bundle`、`dsh.client` 或 `cordis.patch.yml`。
- 包内 `locale/*.json` 的 `meta.title` 与 `meta.description` 供本索引取样。
- 新增插件后，于 Harness 插件页刷新、择取、上传，索引随提交更新。

## 维护

本文件由 Harness 插件「插件上行」生成。源码变更后重新同步即可，勿手工改动生成段落。
