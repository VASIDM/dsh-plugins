# 插件

DeepSeek Harness 插件合集。每个插件独立安装，按需取用。

## 快速开始

```sh
git clone https://github.com/VASIDM/dsh-plugins.git
dsh plugin --profile <profile> add "./dsh-plugins/plugins/usage-center"
```

以上以其中一个插件为例；其余插件替换路径末尾的目录名。将 `<profile>` 换成本机 profile。
本地路径以 `./` 开头。仓库根不是单个包，不能直接用 `github:` 安装。

## 更新

```sh
cd dsh-plugins
git pull
```

已安装的插件指向本地路径，拉取后重启 Harness 即可；新增组件时按对应小节补装。

## 插件一览

| 插件 | 版本 | 说明 |
| --- | --- | --- |
| 插件上行 | 1.0.0 | 连接 GitHub，择取本地 DSH 插件，生成索引与说明，同步至单一仓库。 |
| 彻底删除对话 | 2.0.0 | 从会话头部或侧栏菜单彻底抹除一个会话：先停止并释放运行中的 Agent，再写零并删除日志，级联删除子代理会话，清理投影缓存、工作区记账与未共享附件。 |
| 数独 · 本地生成 | 1.3.0 | 侧边栏点一下，弹出一个可拖动、可缩放的数独窗口；题目在本地生成，三档高难度，玩起来不消耗 token。 |
| 太初 开机序列 | 1.8.1 | 每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」， |
| 用量与额度 | 1.0.0 | 在侧边栏查看 DeepSeek 账户余额、Token 消耗与缓存命中，并快速跳转开放平台查看用量或充值。 |
| 纸墨 | 1.0.0 | 温纸作底、墨色作字、朱砂作印。包含配色、字体、布局、设计四个独立组件。 |
| DeepSeek 网页版 | 1.0.0 | 在右侧栏以标签页打开 chat.deepseek.com，用你自己的 DeepSeek 账号对话，不消耗 Harness token。 |

## 插件上行

`@local/github-vault` · v1.0.0 · Web 界面 + Host 插件

连接 GitHub，择取本地 DSH 插件，生成索引与说明，同步至单一仓库。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/github-vault"
```

**详细说明**：[plugins/github-vault/README.md](plugins/github-vault/README.md)

## 彻底删除对话

`@local/session-purge` · v2.0.0 · Web 界面 + Host 插件

从会话头部或侧栏菜单彻底抹除一个会话：先停止并释放运行中的 Agent，再写零并删除日志，级联删除子代理会话，清理投影缓存、工作区记账与未共享附件。不可恢复。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/session-purge"
```

**详细说明**：[plugins/session-purge/README.md](plugins/session-purge/README.md)

## 数独 · 本地生成

`@local/sudoku` · v1.3.0 · Web 界面 + Host 插件

侧边栏点一下，弹出一个可拖动、可缩放的数独窗口；题目在本地生成，三档高难度，玩起来不消耗 token。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/sudoku"
```

**详细说明**：[plugins/sudoku/README.md](plugins/sudoku/README.md)

## 太初 开机序列

`@local/dsh-scifi-boot` · v1.8.1 · Web 界面 + Host 插件

每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」，宋体大字、朱砂印记与逐帧显现的五句话（太易、太初、太始、太素、启户），等你按 Enter 或点「启」。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/dsh-scifi-boot"
```

**详细说明**：[plugins/dsh-scifi-boot/README.md](plugins/dsh-scifi-boot/README.md)

## 用量与额度

`@local/usage-center` · v1.0.0 · Web 界面 + Host 插件

在侧边栏查看 DeepSeek 账户余额、Token 消耗与缓存命中，并快速跳转开放平台查看用量或充值。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/usage-center"
```

**详细说明**：[plugins/usage-center/README.md](plugins/usage-center/README.md)

## 纸墨

`@local/paper-ink` · v1.0.0 · Host 插件 + Web 界面 · 含 4 个组件

温纸作底、墨色作字、朱砂作印。包含配色、字体、布局、设计四个独立组件。

**组件**

| 组件 | 标识 | 说明 |
| --- | --- | --- |
| 纸墨 · 布局 | `@local/paper-ink-layout` | 版心收窄到 720px，对话行距放宽到 10px。 |
| 纸墨 · 配色 | `@local/paper-ink-theme` | 纸面、墨字、朱砂印与状态色，覆盖全部语义令牌。 |
| 纸墨 · 设计 | `@local/paper-ink-design` | 方角、平影、细滚动条、朱砂引线与标题墨线。 |
| 纸墨 · 字体 | `@local/paper-ink-type` | 正文改宋体，代码保持等宽，品牌字改衬线。 |

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-layout"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-theme"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-design"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-type"
```

**详细说明**：[plugins/paper-ink/README.md](plugins/paper-ink/README.md)

> 父包与全部组件需一并安装；只装父包会导致组合缺行。

## DeepSeek 网页版

`@local/deepseek-web` · v1.0.0 · Web 界面 + Host 插件

在右侧栏以标签页打开 chat.deepseek.com，用你自己的 DeepSeek 账号对话，不消耗 Harness token。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/deepseek-web"
```

**详细说明**：[plugins/deepseek-web/README.md](plugins/deepseek-web/README.md)

## 目录结构

```
plugins/
├── github-vault/
├── session-purge/
├── sudoku/
├── dsh-scifi-boot/
├── usage-center/
├── paper-ink/
│   └── components/
│       ├── paper-ink-layout/
│       ├── paper-ink-theme/
│       ├── paper-ink-design/
│       └── paper-ink-type/
└── deepseek-web/
```

---

由「插件上行」生成。插件更新后重新同步即可。
