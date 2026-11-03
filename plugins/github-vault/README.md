# 插件上行

本地 DSH 插件合集同步至单一 GitHub 仓库。登录、择取、预览、上传，一次提交写清插件与文档。

## 安装

在包目录内执行：

```sh
dsh plugin --profile <profile> add .
```

亦可于 Harness 会话中把本目录的绝对路径交给 `install_bundle`。装后刷新 Web 页面，模型选择栏左侧出现红色「UP」按钮，点开面板。

## 首次配置

1. 点击模型选择栏左侧的红色「UP」按钮。
2. 粘贴 GitHub 令牌。经典令牌勾 `repo`；细粒度令牌授予 Contents 读写，新建仓库另需 Administration 读写。
3. 令牌存于 `$DSH_HOME/.credentials.yaml` 的 records，键 `github-vault/token`，页面不回显。
4. 默认仓库 `dsh-plugins`、分支 `main`、扫描目录为当前工作区。可在「仓库设置」中改。GitHub 仓库名只收 ASCII 字母、数字与 `-_.`；中文标题「插件」写在 README 与仓库简介中。

## 使用

- **刷新**：重扫本地、重读远端；已选文件保留，新文件默认选中。
- **选择**：按插件勾选；单包插件可按文件勾选。组件随父插件整体上传。
- **预览**：生成索引 README、各包 README（原包无 README 时）与增删改计数。
- **上传**：仓库不存在则自动创建；一次提交写入全部变更。
- **增量同步**：只写所选；未选插件原样保留。
- **完全替换**：删除所选之外的 `plugins/*`，仓库与选择严格一致。
- **再更新**：改动插件后刷新、预览、上传；若无差异，不产生提交。
- **删除远端插件**：页面右侧「远端插件」列出仓库已有目录，勾选后可直接删除并提交；无需打开 GitHub 网页。只删仓库文件，本地不动；若本地仍存在且被选中，下次上传会重新加入。

## 删除远端插件

1. 在「远端插件」勾选要删除的目录。
2. 点「删除所选」，确认对话框可勾选「同时重建 README 索引」（默认开）。
3. 删除与索引更新合并为一次提交；完成后自动刷新远端列表。

删除只针对 GitHub 仓库；本地插件目录不受影响。若要永久移除，需同时删本地目录，否则下次上传若仍选中该插件，会把该插件重新加回仓库。

## 组件

扫描时，若一个 bundle 的 `cordis.patch.yml` 引用了同名前缀的兄弟包，这些包归为该插件的组件。如 `paper-ink` 引用 `paper-ink-theme`、`paper-ink-type`、`paper-ink-layout`、`paper-ink-design`。

- 界面：父插件展开为组件树，整体选择。
- 上传：组件写入 `plugins/<parent>/components/<component>/`。
- 安装：父包与每个组件分别执行 `dsh plugin add`；生成的 README 会列出全部命令。
- 迁移：若远端仍是旧版平铺目录，预览会标出旧目录删除与新目录写入，确认后迁移。

## 文档生成

根 README 由选区生成，含快速开始、插件一览、逐插件安装命令与目录结构。包内已有 README 且被选中，则原样上传；否则生成一份直白的包说明。介绍取自 `locale/*.json` 的 `meta.title` 与 `meta.description`，回退 `package.json` 的 `description` 及 README 首段。

仓库根不是单个包，安装命令使用 `./` 开头的本地路径，例如：

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/usage-center"
```

## 安全

- 令牌只驻 Host 进程；浏览器仅见登录名与头像地址。
- 上传走 GitHub REST API；不调用本地 git，不写 SSH 配置，不读 credential helper。
- 扫描排除 `node_modules`、`.git`、`.env*`、私钥及超过 2 MB 的文件。
- 提交经 Git Data API 生成；失败不改分支引用。

## 限制

- 一次最多 200 个插件；单文件 2 MB；总量 40 MB。
- 不处理 Git LFS、子模块、符号链接。
- 远端文件树超过 GitHub 的 10 万条目会截断，差分可能不完整。
- 不发布 npm 包；本仓库仅存插件包。

## 结构

```
index.js        Host：路由、配置、提交
lib/scan.js     插件扫描与 Git blob id
lib/api.js      GitHub REST
lib/docs.js     README 生成
client.js       Web 界面
```

版本 1.0.0
