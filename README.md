# 插件

DeepSeek Harness 插件合集。每个插件独立安装，按需取用。

## 快速开始

```sh
git clone https://github.com/VASIDM/dsh-plugins.git
dsh plugin --profile <profile> add "./dsh-plugins/plugins/github-vault"
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
| 太初 开机序列 | 1.7.4 | 每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」， |

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

## 太初 开机序列

`@local/dsh-scifi-boot` · v1.7.4 · Web 界面 + Host 插件

每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」，宋体大字、朱砂印记与逐帧显现的五句话（太易、太初、太始、太素、启户），等你按 Enter 或点「启」。

**安装**

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/dsh-scifi-boot"
```

**详细说明**：[plugins/dsh-scifi-boot/README.md](plugins/dsh-scifi-boot/README.md)

## 保留目录

以下远端目录未纳入本次索引，保持原样：`paper-ink`、`usage-center`。

## 目录结构

```
plugins/
├── github-vault/
├── session-purge/
└── dsh-scifi-boot/
```

---

由「插件上行」生成。插件更新后重新同步即可。
