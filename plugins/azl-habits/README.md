# 习惯档案 + 碧蓝航线 L2D VIEWER

一个 DSH 插件包，包含两个独立的侧边栏插件：

| 侧边栏 | 插件 | 作用 |
| --- | --- | --- |
| 习惯档案 | `@local/azl-habits` | 从所有对话里学习你的长期偏好，作为每个任务的基本预设注入系统提示，随时可在面板里查看、编辑、停用、删除。 |
| 碧蓝 L2D | `@local/azl-habits/l2d` | 浏览公开镜像里的碧蓝航线 Live2D 皮肤，实时渲染，支持视线跟随、点击动作、动作切换、缩放、拖拽、镜像与背景切换。 |

## 习惯档案

**它怎么学习**

- Host 半边监听每个会话的 `user/message` 事件（包括启动时对已存会话的补扫）。只从带**强长期标记**的句子里提炼一条习惯（「以后都…」「以后不要用…」「记得…」「always…」「prefer…」），保留并凝练用户原话，不再用预设模板替换。
- 以下内容一律不记：回复语言（用中文/英文回答）、寒暄与客套、只是道谢的短句、一次性任务请求；旧版本学到的语言类记录会在加载档案时自动清掉。
- 同一条偏好被重复提到会累加强度；`#habit` 标记可强制记录整句。
- 模型也可以主动记录：`habit_remember` / `habit_list` / `habit_forget` 三个工具已注册，工具说明要求「一条持久的、非显而易见的要求」，不许记回复语言与一次性指令。
- 审批通知、系统注入等合成输入会被过滤，不会污染档案。

**它怎么生效**

习惯档案注册为一个系统提示 section（`azl-habits/profile`，order 1000），每个 agent、每个任务都会带上；section 文本在每次组装时读取当前档案，所以档案更新后下一轮请求就会生效。用户在当前对话里的明确指令优先于习惯。

**动作 / 互动 / 台词**

- 动作列表取自游戏数据表的 `l2d_animations`（每套皮肤真实可用的动作：摸头、触碰、特触、待机、主界面 1-3、登录、任务、誓约…），不是猜的。
- 舞台点击按区域分发：上半身以上算摸头，中部算触碰，`touch_special` 存在的皮肤中部区域算特触；点击同时从对应该类别的台词里随机抽一句显示在画面气泡里。
- 台词来自公开的 `ship_skin_words_extra`（中/英），按舰船归并；当前 132 套里 61 套有公开台词，其余显示「公开数据里没有这套皮肤的台词」。
- 语音：数据里有 voice id；插件配置 `voiceBaseUrl` 指向你自己的语音目录（`<id>.mp3`）即可在点台词时播放。公开渠道没有可直接引用的语音源，所以默认不播放，也不会假装有声音。

**面板能力**

- 查看生效中的习惯、类别、强度、出现次数与来源（自动学习 / 模型记录 / 手动添加）。
- 每条右侧的铅笔按钮直接改内容（双击文字也可以）；另有启停、删除与手动添加。
- 两个开关：是否从对话自动学习、是否注入系统提示。
- 「重新学习」会让 Host 重新扫描当前与已存会话。

**存储**

`~/.dsh/cache/azl-habits/habits.json`（原子写入、去抖保存）。

## 碧蓝航线 L2D VIEWER

**数据来源**

- 默认合并两个公开镜像：`ddddbug/Live2d-model`（130 套，动作最全）与 `alg-wiki/AzurLaneL2DViewer`（社区转换版，补齐前者缺的部分），去重后当前 **132 套**；`sources` 配置可再加镜像。
- 舰船名与皮肤标题来自公开的 `AzurLaneTools/AzurLaneData` 舰船皮肤表（EN + CN），按 `painting` / `prefab` 归并到拼音代码。
- 模型资源经 Host 代理并按来源区分：Cubism Core 取自 Live2D 官方 CDN，`pixi-live2d-display`（MIT）取自 jsDelivr；moc3 / 贴图 / 动作文件经 Host 落盘缓存（首次拉取后本地秒开），鼠标悬停卡片时预取。插件本身不打包任何游戏素材。

**面板能力**

- 右侧按舰船分组列出全部皮肤，可搜索舰船名 / 英文名 / 皮肤标题 / 拼音代码；每条带自动生成的 Live2D 预览缩略图（首次进入按需渲染并缓存）。
- 左侧舞台实时渲染：自动眨眼、跟随鼠标视线、点击头部/身体触发对应动作、动作组按钮、缩放/水平/垂直滑杆、镜像、三种背景（深海 / 网格 / 绿幕）。
- 模型加载失败时显示具体原因，便于判断是镜像限流还是网络问题。

**Host 路由**（只读）

```
GET /api/azl-l2d/catalog                        皮肤目录（6 小时磁盘缓存）
GET /api/azl-l2d/model?folder=&file=            模型摘要（动作组、贴图、表情）
GET /api/azl-l2d/descriptor?folder=&file=       重写后的 model3.json（相对引用指回代理）
GET /api/azl-l2d/raw?ref=                       moc3 / 贴图 / motion3 等原始资源
GET /api/azl-l2d/runtime?name=pixi|live2d|cubismcore
```

## 配置

`cordis.patch.yml` 已插入两行：

```yaml
- id: azl-habits
  config:
    enabled: true
    learnFromConversations: true
    injectIntoPrompt: true
    maxHabits: 40
    maxEvidencePerSession: 200
- id: azl-l2d
  config:
    source: 'ddddbug/Live2d-model'
    allowNetwork: true
```

`source` 还支持 `kka-aris/newAzurLane-L2DViewer`；也可以在 `l2d.js` 的 `SOURCES` 里加自己的镜像。

## 免责声明

《碧蓝航线》的角色、立绘与 Live2D 模型版权归上海蛮啾网络科技、上海悠星等相关权利方所有。本插件只提供本地查看与互动能力，不附带、不分发任何游戏素材，所有模型都由公开镜像在运行时按需加载，仅供个人学习与欣赏。
