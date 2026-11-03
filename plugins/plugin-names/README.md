# 插件改名

`@local/plugin-names` · v1.0.0 · Web 界面 + Host 插件

在 设置 → 插件 → 「插件改名」里给本地链接的插件换显示名，写回该包的 locale 文件，刷新后生效。

## 安装

```sh
dsh plugin --profile <profile> add "dsh-plugins/plugins/plugin-names"
```

## 源码

本目录为包根，清单见 `package.json`。

## 入口

- Web：`client.js`。
- Host：`index.js`。
- 组合：`cordis.patch.yml`。
- 行：`plugin-names`。
- 槽位：`settings.plugins.tab`。

## 仓库

源码合集：https://github.com/VASIDM/dsh-plugins
