# 从零开发一个 DeepSeek Harness 侧边栏用量插件

本文以已经完成的 `@local/usage-center` 为例，讲清楚一个可安装、可维护的 DSH 插件从目录、Host、Client、槽位、样式到安装验证的完整过程。读完后，你应该能独立做出类似的面板，并知道哪些地方最容易出错。

---

## 1. 最终成品

侧边栏会多出一个 **用量与额度** 图标。点击后打开一个全局页面，包含：

- DeepSeek 账户余额、充值余额、赠送余额
- **累计消费金额**（来自开放平台 `total_costs`，与平台账单一致）
- 今日 / 近 7 天 / 近 30 天的 Token 消耗与**实际消费**
- 输入、输出、缓存读取、缓存写入、缓存命中率、请求数、会话数
- **柱状趋势图**，鼠标悬停显示该时间桶的 Token 消耗和实际金额
- 缓存命中环图、Token 构成条、按模型明细
- **任务消耗排行**：按会话/任务列出 Token、金额、请求数，可按 Token 或金额排名
- 直接跳转到开放平台的“用量明细”和“充值”页面

![](icon.svg)

> 重要口径：开放平台的“余额”是金额，不是 Token 数量。这个插件把余额显示为金额，把 Token 显示为消耗量。今日 / 7 天 / 30 天的 Token 与金额直接读取开放平台用量接口，累计消费读取 `total_costs`；只有平台接口不可用时才退回本地会话日志估算，并在界面上标注“本地估算”。

---

## 2. 先理解 DSH 插件的两层结构

DSH 的 Web 插件通常由两半组成：

| 半边 | 运行位置 | 负责什么 | 入口 |
|---|---|---|---|
| Host | Node.js / Cordis | 读取服务、访问账户、扫描会话日志、注册 HTTP 路由 | `index.js` |
| Client | 浏览器 Web GUI | React UI、侧边栏入口、主面板、样式 | `client.js` |

Host 和 Client 通过一个 **同源 HTTP 路由** 通信。浏览器只拿到汇总后的 JSON，不接触 API Key 或账户令牌。

一个 bundle 还需要：

- `package.json`：声明包名、入口、`dsh.bundle.patch`、`dsh.client`
- `cordis.patch.yml`：把 Host 插件行插入 profile
- `locale/*.json`：插件管理器显示的标题和描述
- `icon.svg`：插件管理器图标

最终目录：

```text
usage-center/
├─ package.json
├─ cordis.patch.yml
├─ index.js              # Host
├─ client.js             # Client
├─ icon.svg
├─ locale/
│  ├─ zh.json
│  └─ en.json
├─ README.md
└─ TUTORIAL.md
```

---

## 3. 第一步：创建 manifest

`package.json` 的关键不是依赖，而是 `dsh` 字段：

```json
{
  "name": "@local/usage-center",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "locale/*.json",
    "icon.svg",
    "README.md",
    "TUTORIAL.md"
  ],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-client-ui-sidebar",
        "@deepseek-ai/dsh-client-locale"
      ]
    }
  }
}
```

要点：

- `exports["./client"]` 必须指向浏览器 bundle。
- `dsh.bundle.patch` 让安装器把 Host 行插进 profile。
- `dsh.client.inject` 只负责 **激活顺序**，不是 npm 依赖；不要在这里要求 `@deepseek-ai/dsh-client-ui-primitives`，也不要在代码里 `require` 它。
- `immediately: true` 表示页面启动时加载，不等到某个面板被打开。

### `cordis.patch.yml`

```yaml
- insert:
    - id: usage-center
      name: '@local/usage-center'
```

`id` 是 profile 里的行 id，`name` 是包名。两者可以不同，但建议保持可读。

---

## 4. 第二步：Host 半边

### 4.1 最小路由骨架

```js
export const inject = ['webServer'];

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-center/summary',
    handler: handleSummary,
  }), 'usage-center: summary route');
}
```

为什么用 `ctx.effect`？

- 插件卸载时自动移除路由。
- 热重载不会留下僵尸 handler。
- 这是 Cordis 的资源所有权模型：注册必须挂在某个 Context 的 effect 上。

### 4.2 可选服务用 `ctx.get`

Host 需要很多服务，但有些 profile 可能没有。推荐：

```js
const sessions = ctx.get('sessions');
const persistence = ctx.get('sessionPersistence');
const sessionQuery = ctx.get('sessionQuery');
const account = ctx.get('deepseekAccount');
const credentials = ctx.get('credentials');
```

如果某个服务不存在，插件仍然能启动，只是对应能力降级。只有 `webServer` 是硬依赖，因为它负责提供路由。

### 4.3 余额：优先账户，回退 API Key

账户服务是首选：

```js
const state = await account.getState();          // 是否登录、usage/top-up 链接
const balance = await account.getBalance({       // 钱包
  version: '0.2.1',
  locale: 'zh-CN',
  timezoneOffsetSeconds: 480 * 60,
});
```

返回结构大致是：

```js
{
  status: 'ready',
  value: [{ currency: 'CNY', balance: '131.90' }],
  bonusWallets: [{ currency: 'CNY', balance: '0.00' }]
}
```

把 recharge 和 bonus 按币种合并：

```js
entry.recharge += normalWallet;
entry.bonus += bonusWallet;
entry.total += normalWallet + bonusWallet;
```

如果账户未登录，再回退到 `DEEPSEEK_API_KEY`：

```js
const resolved = await credentials.resolve('DEEPSEEK_API_KEY');
const response = await fetch('https://api.deepseek.com/user/balance', {
  headers: { Authorization: 'Bearer ' + resolved.value },
});
```

**API Key 永远不进入浏览器。** 浏览器只拿 `wallets` 和 `links`。

另外要做两件事：

- 给账户请求加超时，避免页面一直转圈。
- 给余额结果做短缓存（例如 20 秒），避免自动刷新频繁打平台接口。

### 4.4 读取 Token 用量：平台优先，本地兜底

要和 API 平台的“累计消费”对上，**不能只靠本地日志**。本地日志不包含标题生成、压缩摘要、搜索直连等调用，也可能缺少更早的历史会话，所以金额一定会有偏差。

正确做法是：Host 用当前登录账户的 Platform Session 调平台自己的用量接口。

#### 1）累计消费：`get_user_summary`

```js
const session = await account.getPlatformSession();
// session.origin / session.token / session.requestHeaders

const response = await fetch(new URL('/api/v0/users/get_user_summary', session.origin), {
  headers: {
    ...session.requestHeaders,
    accept: 'application/json',
    'x-dsh-auth-token': session.token,
  },
});
const biz = (await response.json()).data.biz_data;
```

关键字段：

- `biz.total_costs`：按币种的累计消费，就是这个账户在平台上的历史总消费
- `biz.normal_wallets` / `biz.bonus_wallets`：充值余额和赠送余额
- 某些账户可能还有 `current_token`、`total_usage`、`monthly_usage`

累计消费直接取 `total_costs[currency].amount`，不要用本地 Token × 价目表去猜。

> 常见错误：把“本地会话日志的 Token × 价目表”当成累计消费。它只覆盖当前 DSH 实例能读到的会话，不包含更早的历史、标题生成、压缩摘要、搜索直连等调用，所以一定会和平台账单对不上。累计消费必须用 `total_costs`，本地估算只能做兜底。

#### 2）按时间桶的 Token 与金额

平台用量页使用两个接口：

```text
GET /api/v0/usage/by_api_key/cost?start=<秒>&end=<秒>&tz=<秒>
GET /api/v0/usage/by_api_key/amount?start=<秒>&end=<秒>&tz=<秒>
```

- `start` / `end` 是 Unix 秒；`end` 用“明天 00:00”而不是“现在”，否则平台会返回 `INVALID_PARAM`。
- `tz` 是时区偏移秒数，中国是 `28800`。
- `amount` 返回 `series[].buckets[].usage`，字段是 `PROMPT_CACHE_HIT_TOKEN`、`PROMPT_CACHE_MISS_TOKEN`、`RESPONSE_TOKEN`、`REQUEST`。
- `cost` 返回 `data[].series[].buckets[].cost`，以及 `function_series`（搜索/抓取费用）。
- `bucket` 是桶大小秒数：`3600` 表示小时桶，`86400` 表示日桶。

把两个接口按 `bucket.time` 合并，就得到每个柱子的：

```js
{
  label: '11-03',           // 由 time + tz 生成
  totalTokens: 139446979,
  inputTokens: 1290764,     // 缓存未命中
  outputTokens: 679052,
  cacheReadTokens: 134787968,
  cost: 13.9547,            // 平台实际金额
  requests: 659,
}
```

这样柱状图、本期消费、Token 总数和平台用量页完全一致。

> 注意：这些是 Platform Web 自己使用的接口，不是公开 API 契约，字段和路径可能随平台升级变化。必须用 `try/catch` + 超时 + 本地兜底，不能把平台接口失败当成“零消费”。

#### 3）平台不可用时，再读本地会话

平台接口可能因为未登录、网络、接口变更而失败。此时退回本地日志，并在响应里标记 `source: 'local'`，界面显示“本地估算”。

优先读活会话：

```js
for (const session of sessions.list()) {
  const events = session.ownEvents(); // 只算本会话自己的事件
  records.push(...foldEvents(events));
}
```

已持久化但不在内存里的会话，通过持久化服务读：

```js
const handle = await persistence.open(sessionId, 'read');
const read = await handle.read();
const inherited = Number(handle.inheritedEventCount) || 0;
const events = read.events.slice(inherited); // 跳过 fork 继承的事件
```

这行 `slice(inherited)` 很关键：fork 出来的会话会复制父会话事件，如果不跳过，父会话的用量会被重复计算。

### 4.5 折叠规则：按 `turn/step` 去重

一条消费记录最终来自 `assistant/message` 的 `usage`：

```js
if (event.type === 'assistant/message' && data.usage) {
  usage = normalizeUsage(data.usage);
}
```

同一个 `turn/step` 可能先出现 usage chunk，再出现最终 message；重试也可能产生多次样本。所以不能逐事件累加，而要“最后一条覆盖前一条”：

```js
const key = data.turn + ':' + data.step;
currentByStep.set(key, {
  time: event.time,
  model,
  usage,
  cost: estimateCost(usage, model, event.time),
});
```

最后：

```js
return Array.from(currentByStep.values());
```

这样 chunk 和 final message 不会双计，重试也不会双计。

### 4.6 缓存

不要每次请求都把全部日志重扫一遍。两个缓存就够：

```js
const liveCache = new Map();       // sessionId -> { seq, records }
const persistedCache = new Map();  // sessionId -> { revision, records }
```

- 活会话用 `session.seq` 判断是否变化。
- 持久化会话用 `snapshot.revision + eventCount + sizeBytes` 判断是否变化。
- 只有变化的会话才重新读。

如果历史会话非常多，第一次扫描会偏慢。更重的方案是把折叠放进 Worker Thread，主线程只做路由和聚合；本项目在数据量可控时先用同步折叠 + 缓存，保持代码简单。

### 4.7 消费金额：平台实际值优先，价目表只做兜底

平台用量接口成功时，`usage.cost`、`series[].cost`、`models[].cost` 都直接使用平台返回值。价目表只在这些接口失败、退回本地日志时使用。

价格表集中在一个常量里，方便以后改：

```js
const PRICES = {
  flash: {
    current: { hit: 0.02, miss: 1.0, out: 2.0 }, // 2026-08-17 之前的旧价
    offPeak: { hit: 0.02, miss: 1.0, out: 4.0 },
    peak: { hit: 0.04, miss: 2.0, out: 8.0 },
  },
  pro: {
    current: { hit: 0.025, miss: 3.0, out: 6.0 },
    offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
    peak: { hit: 0.30, miss: 9.0, out: 27.0 },
  },
};
```

单位：人民币 / 百万 Token。2026-08-17 起按北京时间峰谷计价：

- 高峰：周一至周五（不含中国法定节假日）09:00–12:00、14:00–18:00
- 其他时间：空闲
- 2026 年法定节假日：按 `CN_HOLIDAYS_2026` 集合全天空闲

单次请求成本：

```js
const missTokens = usage.input + usage.cacheWrite;
const cost =
  (missTokens * price.miss +
   usage.cacheRead * price.hit +
   usage.output * price.out) / 1_000_000;
```

本地兜底时：

- `usage.cost`：选中周期内的估算消费
- `usage.allTime.cost`：**仍然优先取平台的 `total_costs`**；取不到才用本地累计
- `usage.models[].cost`：按模型拆分
- `series[].cost`：趋势图上每个桶的估算消费

UI 上必须区分两种来源：平台数据标“实际”，本地兜底标“预估”。不要把两者混在一起。

### 4.8 聚合周期和返回结构

周期用本地时区计算：

```js
today: 本地当天 00:00 到现在
7d:    本地 6 天前 00:00 到现在
30d:   本地 29 天前 00:00 到现在
```

趋势桶由平台返回：

- `today`：`bucket = 3600`，24 个小时桶
- `7d` / `30d`：`bucket = 86400`，日桶
- `series[].time` 是 Unix 秒，`label` 在 Host 按 `time + tz` 生成

最终 JSON 结构（平台可用时）：

```json
{
  "ok": true,
  "generatedAt": 1790000000000,
  "period": { "id": "7d", "start": 0, "end": 0, "tzOffset": 480 },
  "balance": {
    "ok": true,
    "source": "account",
    "signedIn": true,
    "wallets": [{ "currency": "CNY", "recharge": 126.08, "bonus": 0, "total": 126.08 }],
    "links": {
      "usageUrl": "https://platform.deepseek.com/usage",
      "topUpUrl": "https://platform.deepseek.com/top_up"
    }
  },
  "usage": {
    "totalTokens": 139446979,
    "inputTokens": 1290764,
    "outputTokens": 679052,
    "cacheReadTokens": 134787968,
    "cacheWriteTokens": 0,
    "cost": 13.9547,
    "requests": 659,
    "sessions": 3,
    "cacheHitRate": 99.1,
    "source": "platform",
    "models": [
      { "model": "deepseek-flash", "tokens": 139446979, "requests": 659, "cost": 13.9547 }
    ],
    "series": [
      { "label": "11-03", "totalTokens": 139446979, "cost": 13.9547, "requests": 659 }
    ],
    "tasks": [
      {
        "id": "session-…",
        "title": "侧边栏 Token 用量插件",
        "tokens": 234803358,
        "cost": 10.7728,
        "localCost": 9.88,
        "requests": 500,
        "share": 52.4
      }
    ],
    "taskBasis": "allocated",
    "taskLocalTokens": 448015639,
    "taskLocalCost": 21.65,
    "taskCount": 3,
    "allTime": { "cost": 95.0703, "costSource": "platform", "tokens": 71048226, "requests": 404 },
    "pricing": { "currency": "CNY", "estimated": false, "source": "platform" }
  },
  "coverage": { "liveSessions": 3, "persistedSessions": 0, "failedSessions": 0, "partial": false }
}
```

注意 `allTime.cost` 来自平台 `total_costs`，而 `allTime.tokens` 只是本地日志累计；所以 UI 只把累计消费作为“平台实际”展示，不再展示容易误导的“累计 Token”。

### 4.9 任务排行与金额分摊

“任务”在 DSH 里就是 Session。Host 在按周期过滤事件时，顺手按 `sessionId` 聚合：

```js
const task = {
  id: sessionId,
  tokens: 0,
  localCost: 0,
  requests: 0,
  lastAt: 0,
};
```

任务标题不要自己截 session id，走 session 查询服务批量读：

```js
const results = await sessionQuery.readTitleSnapshots(tasks.map((task) => task.id));
const title = results.find((item) => item.sessionId === task.id)?.value?.title?.title;
```

平台用量接口只按 API Key / 模型 / 时间聚合，**不提供按 DSH Session 的账单**。所以单任务金额只能两种口径：

1. **平台不可用**：直接用本地价目表算 `localCost`，标“本地估算”。
2. **平台可用**：按本地 Token 分布把平台实际消费分摊到任务：

```js
const factor = platformPeriodCost / localTaskCostSum;
task.cost = task.localCost * factor;
```

这样所有任务的金额之和等于平台本期实际消费，但每个任务的金额是“分摊值”，不是平台逐会话出账。UI 上必须标“平台金额分摊”，不能写成“平台逐任务账单”。

返回字段：

- `tasks[]`：`id`、`title`、`tokens`、`cost`、`localCost`、`requests`、`share`
- `taskBasis`：`allocated` 或 `local`
- `taskCount`、`taskLocalTokens`、`taskLocalCost`

Client 端用两个排序键切换：按 Token 或按金额；表格显示全部任务，超过一定高度后在表内滚动，表头固定，底部保留“共 N 个任务”。

### 4.10 路由安全

这是本地只读接口，但仍然建议做最小防护：

```js
if (req.method !== 'GET') return send(405, { ok: false });

const remote = req.socket.remoteAddress;
if (!isLoopback(remote)) return send(403, { ok: false });

const origin = req.headers.origin;
if (origin && !isAllowedOrigin(origin, req.headers.host)) {
  return send(403, { ok: false });
}
```

- 只允许本机回环地址。
- 拒绝明显跨站的 Origin。
- 不返回任何 Token、Cookie、API Key。
- 设置 `cache-control: no-store`。

---

## 5. 第三步：Client 半边

### 5.1 模块加载器格式

DSH 的 Client bundle 不是普通 ESM 文件，而是注册到 `window.__ModuleLoader__` 的工厂：

```js
window.__ModuleLoader__.load({
  id: '@local/usage-center',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    // ...
    return { inject: ['slots', 'locale', 'theme'], apply };
  },
});
```

`require('react')` 来自浏览器模块表，**不要安装第二份 React**。

### 5.2 本地化

注册中英文字典：

```js
ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'usage-center: dictionaries');
const t = ctx.locale.bind(NS);
```

侧边栏标签用 thunk，切换语言时不需要重新注册：

```js
label: () => t('panel')
```

### 5.3 槽位：侧边栏入口 + 主面板

侧边栏全局面板由两个槽位配合：

| 槽位 | 作用 | 注册字段 |
|---|---|---|
| `sidebar.panellist` | 侧边栏图标/标签 | `id`、`order`、`label` |
| `main` | 点击后显示的主区域 | `key` |

`id` 和 `key` 必须完全一致，侧边栏点击时用它来 dispatch 主面板。

```js
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist',
  id: 'usage-center',
  order: 20,
  locale: NS,
  label: () => t('panel'),
}, UsageIcon));

ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main',
  key: 'usage-center',
  locale: NS,
}, UsagePage));
```

为什么不用 `sidebar.footer.action`？

- `sidebar.footer.action` 是 Settings 旁边的动作按钮，适合打开弹窗或做快捷操作。
- `sidebar.panellist` 是“全局面板图标”，和 Plugins / Automation tasks 同级，点击后会切换到主面板。
- 我们的页面信息量大，用主面板更合适。

### 5.4 获取 Host 数据

```js
const url = '/api/usage-center/summary?period=' + period
  + '&tzOffset=' + (-new Date().getTimezoneOffset())
  + '&locale=' + (isZh ? 'zh' : 'en');

fetch(url, { cache: 'no-store', credentials: 'same-origin' })
```

组件里要处理：

- `loading`：首次加载显示骨架屏
- `error`：首次失败显示重试；已有数据时显示顶部警告，保留旧数据
- `AbortController`：切换周期时取消上一个请求
- 自动刷新：45 秒一次
- 周期偏好：`localStorage` 保存

### 5.5 UI 结构

推荐的信息层级：

```text
┌──────────────────────────────────────────────────────────────┐
│ Header：标题 / 自动刷新 / 更新时间 / 刷新按钮                  │
├──────────────────────────────────────────────────────────────┤
│ Hero：账户余额            │ 累计消费（平台实际）               │
│      充值 / 赠送          │ 去充值 / 查看用量                  │
├──────────────────────────────────────────────────────────────┤
│ 本期消耗                              [今日][7天][30天]        │
│ [本期消费] [总 Token] [缓存命中] [输出 Token]                 │
├──────────────────────────────────┬───────────────────────────┤
│ 消耗趋势（柱状图 + 悬停 tooltip）│ Token 构成（环图 + 条）    │
├──────────────────────────────────┴───────────────────────────┤
│ 模型明细：模型 / Token / 消费 / 占比                          │
├──────────────────────────────────────────────────────────────┤
│ 任务消耗排行：任务 / Token / 金额 / 占比  [按 Token][按金额]  │
├──────────────────────────────────────────────────────────────┤
│ 口径说明 + 平台链接                                           │
└──────────────────────────────────────────────────────────────┘
```

实现顺序也建议按这个层级来：先把数据跑通，再放 Hero，再做指标行，最后做图表和模型表。不要一上来就画图，否则数据口径一改，图表要全部返工。

### 5.6 柱状图 + 悬停 tooltip

用户要的是“像 API 平台一样，鼠标停在柱子上同时看到 Token 和实际金额”。所以不要只画一条面积线。

每个时间桶一根柱子，高度按 Token 比例：

```js
const height = max > 0
  ? Math.max(tokens > 0 ? 4 : 0, Math.round((tokens / max) * 100))
  : 0;

h('div', { className: 'uc-bar-fill', style: { height: height + '%' } })
```

每根柱子自己保存悬停状态：

```js
const [hover, setHover] = React.useState(null);

h('div', {
  className: 'uc-bar-col' + (hover?.key === point.key ? ' is-active' : ''),
  onMouseEnter: () => setHover(point),
  onMouseLeave: () => setHover(null),
  onFocus: () => setHover(point),
  onBlur: () => setHover(null),
  tabIndex: 0,
})
```

Tooltip 同时展示 Token、金额和请求数：

```js
h('div', { className: 'uc-bar-tip' },
  h('div', { className: 'uc-bar-tip-date' }, point.label),
  h('div', { className: 'uc-bar-tip-row' },
    h('span', null, '总 Token'),
    h('strong', null, point.totalTokens.toLocaleString(locale))),
  h('div', { className: 'uc-bar-tip-row' },
    h('span', null, '消费'),
    h('strong', { className: 'uc-bar-tip-cost' }, point.cost.toFixed(2))),
  h('div', { className: 'uc-bar-tip-meta' }, point.requests + ' 次请求'))
```

`point.cost` 来自平台 `cost` 接口，不是本地估算，所以 tooltip 里的金额与实际扣费一致。

CSS 关键点：

```css
.uc-bar-col { position: relative; flex: 1; display: flex; flex-direction: column; }
.uc-bar-tip {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--uc-paper);
  border: 1px solid var(--uc-cinnabar);
  border-radius: 0;
  pointer-events: none;
}
.uc-bar-col:first-child .uc-bar-tip { left: 0; transform: none; }
.uc-bar-col:last-child .uc-bar-tip { left: auto; right: 0; transform: none; }
```

边缘柱子单独调整 tooltip 位置，避免超出版面；`tabIndex` 让键盘用户也能聚焦查看。

### 5.7 缓存命中环图

用 `conic-gradient` 就够了，不需要图表库：

```js
style={{
  background:
    'conic-gradient(from -90deg, var(--uc-cinnabar) 0deg, var(--uc-ink) ' +
    (rate * 3.6) + 'deg, var(--uc-hair) 0)',
}}
```

中间再放一个圆形遮罩：

```css
.uc-ring-inner {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--uc-paper);
}
```

### 5.8 样式规则

- 普通管理页面优先用 `--dsw-alias-*` token；如果要做强 art direction，允许在 `.uc-page` 内使用一套自有颜色，但必须通过 `theme` 服务切换浅色/深色两套变量，不能只适配一种主题。
- 本项目的颜色是“太初”式的纸/墨/朱砂，不再跟随 DSH 的蓝色品牌色。
- 圆角、间距、字号参考「太初」：直角、发丝线、大留白、宋体标题、等宽编号。
- 字号下限 12px；辅助文字 12–13px，正文 14–15px，标题 18–21px，数字 26–62px，避免“标题巨大、注释极小”的失衡。
- 不在界面里写“悬停查看”“点击这里”这类教学提示；交互靠 affordance 和 tooltip 本身表达。
- 所有 class 加 `uc-` 前缀，避免污染宿主。
- 不使用渐变卡片、彩色图标底座和大阴影；用 1px 线、纸纹、朱砂印做层次。
- 动画尊重 `prefers-reduced-motion`。
- 不要 require `@deepseek-ai/dsh-client-ui-primitives`；自己写按钮、表格、Ring，保持无依赖。

本项目的视觉语言参考本机插件 `@local/dsh-scifi-boot`（「太初」开机序列）：

- **墨色**：`#0d0c0b` / 浅色 `#171512`
- **纸色**：`#ece6d9` / 浅色 `#f2eee4`
- **朱砂**：`#a63a2e` / 浅色 `#8f2f25`
- **灰阶**：`#7d776c`、`#4c4842`、`#c9c2b3` 等
- **字体**：宋体标题、等宽字体做编号/数字/注释
- **线条**：大量 1px 发丝线、直角或极小圆角、无阴影、无渐变卡片
- **装饰**：纸纹、极淡晕染、朱砂方印、细红线

这类页面不是 DSH token 能完全表达的，所以参考「太初」的做法：给 `.uc-page` 一套自有 CSS 变量，并用 `theme/change` 切换 `data-uc-theme`。

```css
.uc-page {
  --uc-paper: #0d0c0b;
  --uc-paper-2: #141210;
  --uc-bone: #ece6d9;
  --uc-bone-2: #c9c2b3;
  --uc-mute: #7d776c;
  --uc-mute-2: #4c4842;
  --uc-cinnabar: #a63a2e;
  --uc-cinnabar-soft: rgba(166, 58, 46, .16);
  --uc-hair: rgba(236, 230, 217, .14);
  --uc-hair-2: rgba(236, 230, 217, .07);
  --uc-display: "Songti SC", "Noto Serif SC", "STSong", "SimSun", serif;
  --uc-mono: "SFMono-Regular", "Cascadia Mono", "Consolas", monospace;
}
.uc-page[data-uc-theme="light"] {
  --uc-paper: #f2eee4;
  --uc-bone: #171512;
  --uc-mute: #6f6a60;
  --uc-cinnabar: #8f2f25;
  --uc-hair: rgba(23, 21, 18, .16);
}
```

主题模式不要靠 `prefers-color-scheme` 猜，而是注入 `theme` 服务：

```js
const [themeMode, setThemeMode] = React.useState(
  () => ctx.theme.getTheme().active.colorScheme,
);

React.useEffect(() => ctx.on('theme/change', (snapshot) => {
  setThemeMode(snapshot.active.colorScheme);
}), []);
```

根节点写 `data-uc-theme={themeMode}`，浅色/深色就是两套完整纸色，不会出现“深色底上硬套浅色卡片”。

### 5.9 任务排行

`TaskCard` 是一个带本地状态的小组件：

```js
const [rankBy, setRankBy] = React.useState('tokens');

const sorted = [...tasks].sort((a, b) => (
  rankBy === 'cost'
    ? b.cost - a.cost
    : b.tokens - a.tokens
));
```

表头：`# / 任务 / Token / 金额 / 占比`。
每行：朱砂编号、宋体任务标题、等宽 Token 与金额、1px 占比线。
右上角两枚文字按钮切换排序，`aria-pressed` 控制激活状态。

`usage.taskBasis === 'allocated'` 时，标题旁标“平台金额分摊”；否则标“本地估算”。
底部保留“共 N 个任务”和口径说明，避免把分摊金额误读成平台逐任务账单。

---

## 6. 第四步：本地化和图标

`locale/zh.json`：

```json
{
  "meta": {
    "title": "用量与额度",
    "description": "在侧边栏查看 DeepSeek 账户余额、Token 消耗与缓存命中，并快速跳转开放平台查看用量或充值。"
  }
}
```

`locale/en.json` 保持同样的 key。插件管理器会读取 `meta.title` / `meta.description`，并在缺少图标时使用默认图。

`icon.svg` 要求：

- SVG / PNG / JPEG / WebP
- 不超过 256 KiB
- 路径在包内，不能是 URL 或越界符号链接

---

## 7. 第五步：安装和验证

### 7.1 语法检查

```powershell
node --check index.js
node --check client.js
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
```

### 7.2 安装 bundle

在 DSH Agent 里用插件管理器：

```text
plugin_manager action=install_bundle
target=<绝对路径>\usage-center
```

或者命令行：

```powershell
dsh plugin --profile desktop add "<绝对路径>\usage-center"
```

安装结果必须看到：

```json
{ "application": "applied", "warnings": [] }
```

### 7.3 验证槽位

如果环境提供 `cordis_inspect_query`，查询：

```text
client / Slots / listSubTree  root=sidebar.panellist
client / Slots / listSubTree  root=main
```

应该看到 `usage-center` occupant，且 `active: true`。

### 7.4 验证路由

```powershell
Invoke-RestMethod "http://127.0.0.1:<port>/api/usage-center/summary?period=7d&tzOffset=480&locale=zh"
```

检查：

- `ok: true`
- `balance.wallets` 有金额
- `usage.source` 为 `platform`（平台接口可用时）
- `usage.totalTokens` 和 `usage.cost` 有值
- `usage.allTime.cost` 与开放平台“累计消费”一致
- `usage.allTime.costSource` 为 `platform`
- `usage.series` 长度符合周期（今日 24 个、7 天 7 个、30 天 30 个）
- `coverage.partial` 为 `false`

### 7.5 页面验证

刷新页面，点击侧边栏图标：

- 主面板能打开
- 余额、累计消费、本期消费、Token、柱状图、模型明细都有数据
- 鼠标悬停柱子能看到该时间桶的 Token、实际金额和请求数
- 明暗主题都正常
- 切换周期会重新请求
- “查看用量”和“去充值”能打开平台

没有浏览器控制能力时，只能验证到“槽位注册 + 路由数据”这一层，并明确说明视觉未做像素级验收。不要把安装成功当成视觉验证。

---

## 8. 常见坑

| 现象 | 原因 | 解决 |
|---|---|---|
| 侧边栏有图标，点击报错 | `sidebar.panellist.id` 和 `main.key` 不一致 | 两处用同一个常量 |
| 页面空白，console 有 slot crash | slot 组件抛异常 | 先检查 React hooks 是否无条件调用 |
| 切换语言不更新 | label 写死字符串 | 用 `label: () => t('panel')` |
| 插件卸载后路由还在 | 没有用 `ctx.effect` 包注册 | 所有注册都挂 effect |
| 引入 primitives 后崩溃 | 跨版本内部 API 不稳定 | 自己写控件，只用主题 token |
| Token 翻倍 | chunk 和 final message 都累加 | 按 `turn/step` 覆盖 |
| fork 后父会话被重复计费 | 没跳过 `inheritedEventCount` | 读持久化日志时 slice |
| 累计消费和平台对不上 | 用了本地价目表估算，没有读 `total_costs` | 平台优先；本地只做兜底并标“预估” |
| 柱状图 tooltip 金额和平台对不上 | 用了本地 `series[].cost` | 直接使用 `/usage/by_api_key/cost` 的 `buckets[].cost` |
| 平台接口返回 `INVALID_PARAM` | `end` 传了“现在”，不是“明天 00:00” | `end` 用本地明天 0 点 |
| 页面显示“无法读取余额” | 未登录且没有 API Key | 登录账户或配置 Key |
| 柱状图只有当天有数据 | 平台账户本来只有当天用量 | 正常；切到 7 天/30 天看完整范围 |
| 暗色主题文字看不清 | 写死了颜色 | 全部换成 `--dsw-alias-*` |
| 页面卡顿 | 首次扫描全部历史会话 | 加缓存；数据量大时用 Worker |

---

## 9. 如何继续迭代

### 更新价格

只改 `index.js` 的 `PRICES` 和 `NEW_PRICING_FROM`，然后重新安装/重启 Host。Client 不需要改，因为成本由 Host 返回。

### 增加一个模型

在 `PRICES` 里增加一个 family，并在 `priceFor` 里补匹配规则。更好的做法是把“模型 id → family”做成一张显式映射表，避免仅靠 `pro` / `flash` 字符串猜测。

### 增加一个周期

1. `PERIODS` 加 id。
2. `periodWindow` 加边界。
3. `buildSeries` 决定 bucket。
4. Client 的 `PERIODS` 和 locale 加文案。

### 增加一个指标

1. Host 聚合字段。
2. Client `renderMetrics` 加一行。
3. 中英文 key 同步。

### 性能

- 先做 per-session 缓存，按 `seq` / `revision` 失效。
- 持久化读取并发控制在 4 左右。
- 大量历史数据时把折叠放入 Worker Thread，避免阻塞 Web 事件循环。
- 不要在每个请求里全量重读日志。

### 安全

- 浏览器永远不接触 API Key、账户 Token。
- 路由只允许回环地址 + 同源/可信 Origin。
- 返回字段白名单，不返回原始日志、prompt、文件路径、Session ID。
- 余额端点做超时和失败降级。

---

## 10. 验收清单

- [ ] `index.js`、`client.js` 通过 `node --check`
- [ ] `package.json`、locale JSON 可解析
- [ ] `dsh.bundle.patch` 和 `dsh.client` 都存在
- [ ] `exports`、`files` 包含所有运行时文件
- [ ] `sidebar.panellist` 与 `main` 注册为 active
- [ ] 路由返回 `ok: true`
- [ ] 余额、累计消费、Token、趋势、模型明细都有数据
- [ ] 任务排行能按 Token / 金额切换，并标注“平台金额分摊”或“本地估算”
- [ ] 中英文 key 数量一致
- [ ] 明暗主题使用 `--dsw-alias-*`
- [ ] 消费金额标注“预估”
- [ ] 充值/用量链接正确
- [ ] 刷新页面后入口仍存在
- [ ] 汇报时说明视觉验证是否完成

---

## 11. 文件地图

- [`index.js`](index.js) — Host：余额、会话统计、价格估算、汇总路由
- [`client.js`](client.js) — Client：侧边栏图标、主面板、柱状图 + 悬停金额、环图、模型表
- [`package.json`](package.json) — bundle / client / exports / files
- [`cordis.patch.yml`](cordis.patch.yml) — profile 插入行
- [`locale/zh.json`](locale/zh.json)、[`locale/en.json`](locale/en.json) — 插件管理器文案
- [`README.md`](README.md) — 使用说明
- [`TUTORIAL.md`](TUTORIAL.md) — 本文

---

## 12. 延伸阅读

- DSH 插件开发技能：`cordis-plugin-development`
- DSH 组合与 patch 语法：`cordis-composition-reference`
- DSH 官方仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 社区参考实现：
  - <https://github.com/Ouye-UE/dsh-token-stats>
  - <https://github.com/lurejewel/dsh-usage-plugin>
  - <https://github.com/ParticleLight/dsh-all-usage>

社区实现可以看思路，但要注意它们的版本兼容性、数据口径和路由安全策略。真正稳定的做法是：以当前安装的 DSH 服务契约为准，用 `cordis_inspect_query` 查 Service / Slot / Theme，再写自己的最小实现。
