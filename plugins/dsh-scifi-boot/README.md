# 太初 开机序列

`@local/dsh-scifi-boot` · v1.7.4 · Web 界面 + Host 插件

每次打开 DeepSeek Harness 时播放一页全屏开机序：取《列子·天瑞》「太初者，气之始也」，宋体大字、朱砂印记与逐帧显现的五句话（太易、太初、太始、太素、启户），等你按 Enter 或点「启」。

## 安装

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/dsh-scifi-boot"
```

## 组成

- Web 入口：`client.js`
- Host 入口：`index.js`
- 组合层：`cordis.patch.yml`
- 行：`scifi-boot`
- 槽位：`shell.overlay`、`conversation.input.activity`

## 仓库

[`VASIDM/dsh-plugins`](https://github.com/VASIDM/dsh-plugins)
