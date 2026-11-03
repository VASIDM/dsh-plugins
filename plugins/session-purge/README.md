# 彻底删除对话（Session Purge）v2

在 DSH 里，**归档**只是隐藏，**删除工作区**只是把会话移到「未分组」，都不会删除对话本身。  
这个插件补上缺失的那一步：**永久抹除一个对话，并保证“日志没删干净就不动工作区记账”**，因此不会再出现“删一半、会话掉进未分组”的坏行。

## 入口

- 会话标题旁的 **垃圾桶按钮**
- 侧栏会话行 **「…」→「彻底删除会话」**
- Agent 工具：`session_purge`（支持 `discover` / `discoverTree` / `keepSubagents`）

## 删除顺序（关键）

1. 解析会话头与日志目录（两种 id 拼写、历史 v0–v3 格式都覆盖）
2. 停止运行中的 Agent（cancel + 有界等待），flush 会话
3. 从 Session store / Agent registry 中 **detach** 活条目，等待 `session/disposed` 关闭写句柄
4. **删除日志目录**（默认先写零、fsync、再 unlink），反复重试直到确认没有残留
5. 只有日志确认删净后，才清理投影缓存行/文件、工作区成员、归档、置顶
6. 回收不再被其他会话引用的附件对象与 `files-v3.json` 记录
7. 广播 `api-session/removed`，侧栏立即移除该行
8. 任一步失败都会返回明确错误，并把未完成步骤列在 `degraded` 里

子代理会话由 `ctx.subagents.listDescendants` 发现，**由深到浅先删**；分叉（fork）不是子代理，永远不会被连带删除。

## 删除范围

| 对象 | 处理 |
|---|---|
| 会话日志 | 目录内所有文件写零、`fsync`、unlink；失败重试，残留则报错且不动记账 |
| 子代理会话 | 级联删除（最深优先） |
| 投影缓存 | 领域表行 + `session_projcache/sessions/*.json`（含 `.bak.`） |
| 工作区 | `sessionIds`、`archivedSessionIds`、`pinnedSessionIds` |
| 附件 | 仅删除**没有其他会话引用**的 `objects` / `file-objects` / `files` |
| DeepSeek 文件缓存 | `llm-deepseek/files-v3.json` 中对应记录 |
| 界面 | `api-session/removed` 通知；若删的是当前打开的会话，清空主视图，不新建会话 |

**不删除**：工作区里由任务写出的项目文件、分叉会话、其他会话共享的附件。

## 配置（profile 的 `cordis.patch.yml`）

```yaml
- id: session-purge
  name: "@local/session-purge"
  config:
    deleteSubagents: true   # false: 只删目标会话，保留子代理（默认 true）
    shred: true             # false: 不做写零，直接 unlink（默认 true）
    sessionsRoot: ""         # 可选：覆盖会话日志根目录
```

## 安全边界

- 只接受 `session-<uuid>` 或裸 uuid；路径由 Host 解析，客户端不能传路径。
- 日志确认删净之前，不写工作区/归档/置顶，杜绝“掉分组”的中间态。
- 同一会话的删除由调用方串行；重复/并发请求最多造成一次幂等失败。
- 第三方插件拥有 Host 权限；本插件不向外部上传任何会话内容。

## 无法抹掉的痕迹

1. 已上报的 DSH 遥测 / OTel。
2. DeepSeek 服务端请求日志与已上传的 `files` 对象（本地只删映射）。
3. SSD 磨损均衡、NTFS 日志、卷影副本、云同步/备份中的旧块。写零只是逻辑覆盖。
4. 浏览器自己的 Cache / Code Cache / Local Storage。
5. `cache/attachments/request-images` 这类没有会话反向索引的派生缓存。
6. 工作区里由任务创建的项目文件。

## 来源与许可

Host 删除引擎与 Client 槽位集成改编自 MIT 项目：

- [@liuyu-f/dsh-plugin-session-cascade-delete](https://github.com/liuyu-f/dsh-plugin-session-cascade-delete)（Copyright 2026 liuyu-f）
- 其上上游 [@huanlin/dsh-plugin-session-delete](https://github.com/lsz-asd/dsh-plugin-session-delete)（Copyright 2026 lsz-asd）

本包新增：写零擦除、附件引用检查与回收、`files-v3.json` 清理、`session_purge` 命名与中英文文案、附件回收报告。完整许可见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

## 安装

本包是本地 bundle，不是 npm 市场包：

```powershell
# 1) profile 的 package.json：dependencies 加
#    "@local/session-purge": "link:C:/Users/<你>/Documents/deepseek-harness/default-workspace/session-purge"
#    dsh.profile.bundles 末尾加 "@local/session-purge"
# 2) 安装链接
pnpm --dir C:\Users\<你>\.dsh\profiles\desktop install
# 3) 完全退出 DSH（托盘退出）并重启
```

`cordis.patch.yml` 插入 `session-purge` 行；`dsh.client` 会加载 `client.js`。

## 验证

```powershell
node --check index.js
node --check client.js
node test-client-smoke.mjs
```

Host 端建议用隔离 profile 启动一次 Web 实例，调用 `/api/session-purge/info` 与 `/api/session-purge/purge`，确认日志目录、投影缓存和工作区记录按顺序消失。
