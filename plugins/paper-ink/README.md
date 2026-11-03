# 纸墨

`@local/paper-ink` · v1.0.0 · Host 插件 + Web 界面

温纸作底、墨色作字、朱砂作印。包含配色、字体、布局、设计四个独立组件。

## 安装

```sh
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-layout"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-theme"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-design"
dsh plugin --profile <profile> add "./dsh-plugins/plugins/paper-ink/components/paper-ink-type"
```

## 组件

| 组件 | 标识 | 说明 |
| --- | --- | --- |
| 纸墨 · 布局 | `@local/paper-ink-layout` | 版心收窄到 720px，对话行距放宽到 10px。 |
| 纸墨 · 配色 | `@local/paper-ink-theme` | 纸面、墨字、朱砂印与状态色，覆盖全部语义令牌。 |
| 纸墨 · 设计 | `@local/paper-ink-design` | 方角、平影、细滚动条、朱砂引线与标题墨线。 |
| 纸墨 · 字体 | `@local/paper-ink-type` | 正文改宋体，代码保持等宽，品牌字改衬线。 |

## 结构

```
paper-ink/
├── package.json
├── cordis.patch.yml
└── components/
    ├── paper-ink-layout/
    ├── paper-ink-theme/
    ├── paper-ink-design/
    └── paper-ink-type/
```

## 仓库

[`VASIDM/dsh-plugins`](https://github.com/VASIDM/dsh-plugins)
