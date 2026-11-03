# 彻底删除对话（Session Purge）

在侧栏会话行的 **“…” 菜单**里增加一个朱砂色的 **「彻底删除对话…」**。确认后不是归档，而是把这个对话在 DSH 本机留下的记录尽可能抹掉。

> 这是不可恢复的破坏性操作。没有回收站，没有撤销。

## 删除范围

| 对象 | 位置 | 说明 |
|---|---|---|
| 会话日志 | `%USERPROFILE%\.dsh\sessions\<工作区编码>\<session-id>\` | 先改名移出会话命名空间，再按 1 MiB 块写零、`fsync`、删除 |
| 子会话 | 同上 | 递归删除 `origin: subagent` 且 `parentSession` 指向该对话的全部后代 |
| 投影缓存 | `%USERPROFILE%\.dsh\storages\session_projcache` | 通过 storage domain 删除标题、统计、大纲等缓存行 |
| 工作区记账 | `%USERPROFILE%\.dsh\storages\workspace.json` | 从 `sessionIds`、`archivedSessionIds`、`pinnedSessionIds` 中移除 |
| 附件对象 | `%USERPROFILE%\.dsh\attachments\v1` | 只删除**不再被其他会话引用**的 `objects`、`file-objects`、`files` 对象 |
| DeepSeek 文件缓存 | `%USERPROFILE%\.dsh\llm-deepseek\files-v3.json` | 删除对应的 `attachmentId` / `variantId` 记录 |

**不会删除**：工作区目录里由 Agent 写出的任何项目文件、交付物、代码。删除对话不应连带毁掉用户资产。

## 行为细节

- **运行中的对话**：先通过 Workspace 的 archive-admission 停止它的回合、子代理、后台任务和定时提醒，再删除；归档标记随后会被清掉。
- **文件被占用**：先尝试把整个会话目录改名。改名失败（Windows 上写句柄仍在）时返回 `session-busy`，不改动任何内容，让用户等当前回答结束后重试；不会出现“删了一半”的对话。
- **改名成功但有文件删不掉**：会话已经不在列表里，剩余的墓碑目录和队列会在插件启动后、以及每 30 秒的后台清扫中继续删除。
- **附件共享**：删除前会读取其余会话的日志做引用检查；读取失败或超出扫描预算时，保守地保留附件，宁可留下也不误删别的对话还在用的图。
- **刷新**：删除成功后客户端自动刷新页面，让侧栏立即丢掉这一行。

## 安全边界

- 路由只监听本机回环地址，校验 `Origin`/`Host`，POST 要求 `content-type: application/json` 与自定义头 `x-dsh-session-purge: 1`，跨站表单无法直接触发。
- 会话 ID 严格校验为 `session-[A-Za-z0-9._-]`，所有路径都由 Host 的持久化服务解析，客户端不能传路径。
- 删除动作串行化，同一会话并发请求返回 `409`。

## 无法抹掉的痕迹（必须知道）

1. **已经发出去的遥测**：DSH 的产品埋点与会话遥测（OTel）在删除前可能已经上报到远端，本地插件无法召回。
2. **模型服务端日志**：DeepSeek API 侧按平台政策保留的请求日志，不在这台机器上。
3. **SSD / 文件系统 / 备份**：写零只能覆盖逻辑块；SSD 磨损均衡、NTFS 日志、卷影副本、云同步与备份都可能保留旧数据。需要物理级不可恢复时，应使用全盘加密与安全擦除。
4. **浏览器缓存**：Chromium 的 `Cache`、`Code Cache`、`Local Storage` 可能含有标题或渲染片段；插件只清理 DSH 自己的存储，不清空浏览器配置目录。
5. **工作区文件**：Agent 在该任务中创建的项目文件按设计保留。

## 安装

```powershell
# 1) 让 profile 依赖并启用这个本地 bundle
#    C:\Users\<你>\.dsh\profiles\desktop\package.json
#    dependencies 加：
#      "@local/session-purge": "link:C:/Users/<你>/Documents/deepseek-harness/default-workspace/session-purge"
#    dsh.profile.bundles 末尾加：
#      "@local/session-purge"
# 2) 安装链接
pnpm install --dir C:\Users\<你>\.dsh\profiles\desktop
# 3) 重启 DeepSeek Harness
```

`cordis.patch.yml` 会插入 Host 行；`dsh.client` 会让 Web 侧在启动时加载 `client.js`。

## 验证

```powershell
node --check index.js
node --check client.js
node test-host.mjs
node test-client.mjs
```

Host 测试使用临时目录和假的 Cordis 服务，真实走一遍 HTTP handler、改名、写零、删除、工作区记账与附件引用检查，不会碰真实会话。
