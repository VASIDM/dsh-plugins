# Olympiad · IMO-level problems

侧边栏底部的「Olympiad」图标，点一下弹出纸墨风格的数学题卡片。题目与详细解答全部在本地，不消耗 token。

## 收录

- 精选 9 道 IMO 题（中文题目与逐步证明），始终内置在客户端里，作为离线兜底。
- 完整题库 1148 道（IMO / IMO Shortlist、USAMO、China TST、Putnam、APMO 等），由 `corpus.json.gz` 通过本地 Host 路由提供；题库不可用时自动退回 9 道精选，不会出现空白窗口。

## 功能

- 打开即随机一题；`Next` 换题（不连续重复当前题）
- 分类筛选：数论 / 代数 / 几何 / 组合 / 应用 / 微积分 / 其它
- 难度筛选：全部 / 精选 / 8+ / 5–7
- **Hint** 显示提示；**Answer** 显示答案；**Detailed solution** 显示逐步解答（默认隐藏，避免剧透）
- 快捷键：`N` 换题、`H` 提示、`A` 答案、`S` 解答、`Esc` 关闭
- 纸墨 + 朱红主题，亮/暗自动跟随 Harness
- KaTeX 公式离线渲染；自动清理题库里的 BBCode、Asymptote 代码和跨行公式环境

## 数据与构建

- `problems.json` 为精选题库；`build.mjs` 把精选题目内联进 `template.js` 生成 `client.js`。
- `corpus.json.gz` 是完整题库的 gzip 版本（约 0.85 MB，低于插件备份单文件 2 MB 上限）；Host 路由以 `Content-Encoding: gzip` 返回，浏览器自动解压。
- 重新生成完整题库：把 [Omni-MATH](https://github.com/KbsdJames/Omni-MATH) 的 `Omni-Math.jsonl` 放到 `raw/omni-math.jsonl`，运行 `node build-corpus.mjs`。
- KaTeX 资源位于 `assets/`（MIT 协议，见 `assets/LICENSE-katex.txt`），全部本地加载。

## 存储

`localStorage`：`olympiad.ui.v1`（窗口位置与宽度）。
