# 插件上行

本地 DSH 插件源码合集同步至单一 GitHub 仓库。登录、择取、预览、上传，一次提交写清源码与文档。

## 安装

```sh
dsh plugin --profile <profile> add "<本目录>"
```

亦可于 Harness 会话中把本目录的绝对路径交给 `install_bundle`。装后刷新 Web 页面，侧边栏出现「插件上行」。

## 首次配置

1. 打开侧边栏「插件上行」。
2. 粘贴 GitHub 令牌。经典令牌勾 `repo`；细粒度令牌授予 Contents 读写，新建仓库另需 Administration 读写。
3. 令牌存于 `$DSH_HOME/.credentials.yaml` 的 records，键 `github-vault/token`，页面不回显。
4. 默认仓库 `dsh-plugins`、分支 `main`、扫描目录为当前工作区。可在「仓库设置」中改。GitHub 仓库名只收 ASCII 字母、数字与 `-_.`；中文标题「插件」写在 README 与仓库简介中。

## 使用

- **刷新**：重扫本地、重读远端；已选文件保留，新文件默认选中。
- **选择**：按插件或按文件勾选。
- **预览**：生成索引 README、各包 README（原包无 README 时）与增删改计数。
- **上传**：仓库不存在则自动创建；一次提交写入全部变更。
- **增量同步**：只写所选；未选插件原样保留。
- **完全替换**：删除所选之外的 `plugins/*`，仓库与选择严格一致。
- **再更新**：改动源码后刷新、预览、上传；若无差异，不产生提交。

## 文档生成

根 README 由选区生成，含安装命令、索引表与逐包说明。包内已有 README 且被选中，则原样上传；否则生成最小 README。介绍取自 `locale/*.json` 的 `meta.title` 与 `meta.description`，回退 `package.json` 的 `description` 及 README 首段。

## 安全

- 令牌只驻 Host 进程；浏览器仅见登录名与头像地址。
- 上传走 GitHub REST API；不调用本地 git，不写 SSH 配置，不读 credential helper。
- 扫描排除 `node_modules`、`.git`、`.env*`、私钥及超过 2 MB 的文件。
- 提交经 Git Data API 生成；失败不改分支引用。

## 限制

- 一次最多 200 个插件；单文件 2 MB；总量 40 MB。
- 不处理 Git LFS、子模块、符号链接。
- 远端文件树超过 GitHub 的 10 万条目会截断，差分可能不完整。
- 不发布 npm 包；本仓库仅为源码合集。

## 结构

```
index.js        Host：路由、配置、提交
lib/scan.js     插件扫描与 Git blob id
lib/api.js      GitHub REST
lib/docs.js     README 生成
client.js       Web 界面
```

版本 1.0.0
