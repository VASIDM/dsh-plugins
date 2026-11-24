# DeepSeek Web（DeepSeek 网页版）

右侧栏新增一个 **DeepSeek 网页版** 标签页：里面是真正的 chat.deepseek.com，用你自己账号的登录态，
不经过 Harness 的模型通道，因此不消耗 Harness / API token。

## 怎么用

1. 打开右侧栏（`展开右侧栏`），在空白引导页点 **DeepSeek 网页版** 卡片。
2. 首次打开会显示 DeepSeek 的登录页，登录一次。
3. 之后标签页、右侧栏、会话切换都不影响登录；重启应用后登录态也保持（需要 `app.asar` 的持久化补丁，见下）。

## 为什么不是 iframe

`chat.deepseek.com` 返回 `content-security-policy: frame-ancestors 'none'`，任何 iframe 都会被浏览器拦掉。
桌面版（Electron）主进程提供了一条受租约约束的 webview 通道，官方侧边栏浏览器用的就是它；
本插件通过 `dshDesktop.browser.acquire()` 申请租约，再用 `about:blank#<lease>` 附着一个受控的 `<webview>`，
因此既绕开了 frame-ancestors，也不放开 `nodeIntegration`／`webSecurity`。

## 登录态为什么能活过重启

主进程给 guest 会话分配的分区默认是内存态（`dsh-sidebar-browser-<uuid>`），退出即清空。
`tools/patch-persistent-partition.mjs` 把这一行原地改成一个 `persist:` 分区（等长替换，不重打包 asar），
让 cookie 落到磁盘。补丁与插件解耦：补丁不在时插件照常工作，只是重启后要重新登录一次。

## 皮肤：纸墨（墨夜 / 宣纸）

`chat.deepseek.com` 和 Harness 共用同一套 `--dsw-*` 设计令牌（`--dsw-alias-bg-base`、`--dsw-specific-bubble`、
`--dsw-static-deepseek-450` …），调色板只在 `body` 与 `body[data-ds-dark-theme]` 上声明一次。
所以不需要猜它的 DOM：`webview.insertCSS()` 以 `!important` 覆盖 `html, body, body[data-ds-dark-theme]` 即可整站换肤。

**为什么不是照抄 Harness 的令牌值**：Harness 的暗色令牌彼此只差几个百分点（`#0d0c0b` / `#141210` / `#1b1815`），
因为它靠分隔线和留白分层；而 DeepSeek 的对话页只靠**填充色**分层。照抄的结果就是整页糊成一块深黑。
本插件因此带一套自用的暖墨色阶（`#0f0d0b → #161310 → #1d1915 → #25201a`），
与 Harness 同一个墨、只把台阶拉开；并按宿主的 `--dsw-alias-bg-base` 亮度自动选「墨夜」或「宣纸」。

**只在配色上下功夫，不加任何叠加层。** 早几版往 guest 上叠纸纹、帘纹、装裱框和墨晕，
结果是在 Harness 的平涂界面上贴了一张别的画 —— 突兀。现在背景、边框、纹理全部撤掉，
guest 和 Harness 一样是平涂，差别只在色阶：

- **暖墨阶**：基色 `#0f0d0b`，与 Harness 自己的 `#0d0c0b` 几乎同色；三层凸起 `#161310 / #1d1915 / #25201a`，
  比 Harness 的 `#141210 / #1b1815` 只开一点点 —— 刚好让对话页的「填充式分层」分得开，又不跳出同一个墨。
- **纸白字**：`#ece6d9` 起，`#b3a895 / #8a8173 / #6f6a5f` 依次收敛。
- **动作不用红**：发送键暗色下是一枚纸白按钮（文字墨色），浅色下是一块墨。
- **红只剩印记**：引用竖线、标题小方印、选区、焦点环；链接与任务胶囊用同一味暖墨，不再抢眼。
- **浅色就是羊皮纸**：底 `#f2ebdb`、卡 `#faf5e8`、代码块 `#eae1cd` —— 想要"宣纸感"用浅色主题，
  暗色下它只能是"暖墨"。

**配色分工**：

| 角色 | 用在哪 | 墨夜 | 宣纸 |
| --- | --- | --- | --- |
| 朱砂 | 只留在代码写死的地方：引用竖线、标题小印、选区 | `#9c4a3a` | `#9e3b2f` |
| 暖墨（品牌/链接/business） | 网站用令牌画的任何东西 —— 任务名、链接、图标、焦点 | `#b9ac96 / #cfc4ae` | `#5a5348 / #4a443a` |
| 纸白 | 文字、发送键（暗色） | `#ece6d9 → #6f6a5f` | `#fbf8ef` |
| 墨 | 面与线 | `#0f0d0b → #25201a` | `#f2ebdb → #ded3b9` |

关键一条：**品牌色与链接色都改成暖墨**。站点里凡是「有状态」的文字（任务名、工具名、激活图标）
多半吃 `--dsw-alias-brand-primary` 或 `--dsw-alias-link`，把这两个令牌压成中性色，
页面就不可能自己冒出红色；朱砂只出现在本插件手写的那几条规则里。

- 勾选类控件（`.ds-toggle-button--selected`）做成**印章式反相**：暗色下一枚纸白实心印章，浅色下一枚墨块，
  未勾选只剩一圈发丝描边 —— 不再靠一点点填充色区分。它用稳定类名，不依赖哈希类。
- 正文宋体栈（`Songti SC / SimSun`），标题带朱砂小方印，引用块朱砂竖线，代码块发丝描边 —— 这几条是排版做的事，不叠图。
- 工具栏的笔刷按钮开关皮肤，状态记在 `localStorage['dsh.deepseek-web.skin']`。
- 只从宿主继承字体族／圆角／阴影，颜色全部来自插件自己的色阶；`*-font-size`、`*-line-height` 一律不搬，网页排版不动。
- 皮肤跟随 Harness 的明暗；切换主题后插件每 1.2s 比对一次 `--dsw-alias-bg-base`，一变就自己重绘。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半边的空壳，只为让 bundle 的 patch 行存在。 |
| `client.js` | 注册 tab 类型、右侧栏引导卡片、标签标题，托管 webview guest，并把纸墨皮肤注入 guest。 |
| `cordis.patch.yml` | 插入 `deepseek-web` 行。 |
| `locale/*.json` | 插件管理页的标题与描述。 |
| `icon.svg` | 原创图标：墨底白鲸 + 朱红印章。 |
| `tools/patch-persistent-partition.mjs` | 把 guest 会话分区改成 `persist:`，登录态活过重启。 |
| `docs/skin-preview.png` | 登录页真实截图对照（早期版本，仅存档）。 |
