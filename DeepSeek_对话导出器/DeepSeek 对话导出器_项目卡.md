# DeepSeek 对话导出器 · 项目卡

> 写给接手这个项目的 AI 或开发者。
> 当前稳定版：**v1.5 极简正序版**

---

## 项目目标

从 DeepSeek 网页版（V4）导出全部对话历史，按对话顺序正序输出 JSON/Markdown。

---

## 版本沿革 —— 每个版本死了什么

| 版本 | 思路 | 为什么失败 | 教训 |
|------|------|-----------|------|
| **0.0.9** 原版 | 拦截 `history_messages` + `completion`，不做任何过滤，谁最后到谁覆盖 | 有时正序有时倒序、不全、乱码 | 覆盖式 `setTarget` 是万恶之源 |
| **v1.1** | 只收 `history_messages`，屏蔽 `completion` | 新消息永远进不来 | completion 里有增量数据，不能一刀切屏蔽 |
| **v1.2** | 收两端，completion 按 id 去重合并 | 最后一问仍然没拿到。completion 是 SSE 流，`JSON.parse` 直接失败被 catch 吞掉 | completion 的 body 不可 parse 为 JSON |
| **v1.3** | 放弃网络拦截，从 IndexedDB 直读 | IDB 缓存不是实时更新的，6 条消息永远 6 条 | DeepSeek 不会每条新消息都写 IDB |
| **v1.4** | 从 DOM 直接抓取 | 没真正试过（用户没等到这版就找到根因了） | DOM scraping 可靠但丢元数据 |
| **v1.5 ✅** | 回归 0.0.9 的捕获方式，但 setTarget 改成**合并而非覆盖** | **不死了** | 见下文"为什么 v1.5 好了" |

---

## DeepSeek V4 常识（必须知道，否则寸步难行）

### API 端点

```
/api/v0/chat/history_messages     ← 全量对话数据
/api/v0/chat/completion           ← 流式响应（SSE）
```

### history_messages 的 MERGE 模式

这是最大的坑。V4 版的 `history_messages` 经常返回：

```json
{
  "chat_session": { "id": "...", "title": "..." },
  "chat_messages": [],
  "cache_control": "MERGE"
}
```

`chat_messages` 是**空数组**。真正的消息数据在客户端的 IndexedDB 里。但 IDB 也不一定是最新的（见下）。

### completion 是 SSE 流，不是 JSON

body 长这样：

```
event: ready
data: {"request_message_id":290,"response_message_id":291}

: 

e
```

`JSON.parse(body)` 必然失败。所以直接 `JSON.parse(e.data.body)` 会抛异常被 catch 吞掉。

**但关键：** 在 SSE 流结束后，DeepSeek 页面通常会再发一个**普通 XHR 请求**（非流式）到同一个 completion 端点，这个请求的响应是**纯 JSON**，包含最新的消息数据。这个请求才是真正补全数据的关键。

### IndexedDB 结构（v4）

```
DB: deepseek-chat
  Store: history-message
    Record: {
      data: {
        chat_session: {...},
        chat_messages: [...],
        cache_control: "MERGE"
      },
      version: N,
      key: "session-uuid",
      ...
    }
```

- 每个会话一条 record
- 消息在 `record.data.chat_messages` 里
- IDB **不是实时更新的**，可能滞后多条消息

### inserted_at 不可靠

同一问答对内，AI 回答的 `inserted_at` 可能早于用户问题。**永远不要按 `inserted_at` 排序**，否则会打乱问答对。

---

## 关键踩坑记录

### 坑 1：覆盖式 setTarget 导致不全

```javascript
// ❌ 坏写法（0.0.9）
function setTarget(session, messages) {
    state.target = { chat_session: session, chat_messages: messages };  // 直接覆盖
}
```

每次 API 返回都覆盖上一次的数据。如果 `completion` 最后返回只有 2 条消息，50 条变 2 条。

**修复：合并而非覆盖。**

```javascript
// ✅ 好写法（v1.5）
function setTarget(session, messages) {
    if (state.target && state.target.chat_session.id === session.id) {
        // 按 id 去重合并，保留原有顺序
        state.target.chat_messages = mergeMessages(state.target.chat_messages, messages);
    } else {
        state.target = { chat_session: session, chat_messages: [...messages] };
    }
}
```

### 坑 2：过早点拦截——"装在 load 里等于没装"

`setupIntercept()` 如果放在 `window.addEventListener('load', ...)` 里调用就太晚了，`history_messages` 在页面加载阶段就发完了。

```javascript
// ✅ 必须在顶层 IIFE 里立即执行
setupIntercept();  // 不在任何事件回调里
```

### 坑 3：端点过滤堵死了增量更新的入口

`completion` 虽然 SSE body 不可解析，但 DeepSeek 在流结束后会发一个普通 JSON 请求到同一个 URL（非流式回调）。如果按 `e.data.endpoint === 'history_messages'` 过滤，这个关键请求就被挡在外面了。

**不要过滤端点，让所有数据进来，在 setTarget 里合并去重。**

### 坑 4：IDB 不是实时缓存

DeepSeek 不会在每次 AI 回答后立即更新 IndexedDB。IDB 可能落后很多条消息。所以不能把 IDB 作为主要数据源，只能作为后备（而且是不太可靠的后备）。

### 坑 5：同一页面内切换会话（SPA）

DeepSeek 是 SPA，切换会话不刷新页面。必须 hook `history.pushState` 和 `popstate` 来检测 URL 变化，重置 `state.sessionId` 和 `state.target`。

---

## 哪些代码不能动

```
const URL_RE = /\/api\/v0\/chat\/(history_messages|completion)/;
```

这个正则**两个端点都要匹配**，不能只留 `history_messages`。`completion` 的最终回调是增量数据的关键入口。

```
const post = body => w.postMessage({ ds: 1, body }, '*');
```

**不要加 endpoint 参数**（如 `post(body, endpoint)`）。加了之后消息处理器会按端点分流，重蹈 v1.1/v1.2 的覆辙。让消息处理器不做区分地接受所有数据，在 `setTarget` 里统一处理。

```
window.addEventListener('message', e => {
    if (!e.data?.ds) return;
    try {
        const biz = JSON.parse(e.data.body)?.data?.biz_data;
        if (biz?.chat_session && biz.chat_messages?.length > 0) setTarget(biz.chat_session, biz.chat_messages);
    } catch {}
});
```

这个 handler **不能加任何端点判断**。所有端点来的数据都走同一个路径。`JSON.parse` 失败说明 body 是 SSE 流，catch 吞掉就好——那个失败的请求不重要，重要的是之后可能来的非流式回调。

---

## 文件清单

| 文件 | 状态 |
|------|------|
| `v1.5 极简正序版` | **当前稳定版**，应该用这个 |
| `v1.4 极简正序版` | DOM scraping 思路，未验证 |
| `v1.3 极简正序版` | IDB 直读，过时 |
| `v1.2 极简正序版` | 端点过滤 + IDB 回补，过时 |
| `v1.1 极简正序版` | 只收 history_messages，过时 |
| `0.0.9（原版倒序）` | 原版，能导出全量但顺序可能错乱 |
| `V0.1.0 正序` | 原版的正序改版 |
| `DeepSeek的侧边栏选择器_项目工作流.md` | 无关的另一个项目 |

---

## 给接手 AI 的 CheckList

如果你要改这个脚本，按顺序读：

1. **读这张项目卡** ← 你在读的这份
2. **读 v1.5 的完整代码**，理解 `setTarget` + `mergeMessages` 的协作方式
3. 如果 DeepSeek 改了 API URL，改 `URL_RE` 正则
4. 如果 IndexedDB 结构变了，改 `readIDB` 里的字段路径
5. **绝对不要做**：加端点过滤、按 `inserted_at` 排序、在 `setTarget` 里覆盖而非合并

---

## 历史对话（调试参考）

调试过程中使用的关键会话：
- `b278fa9c-8920-4105-9bc8-4e05ff482b6b` — "角色目录设计讨论"，v1.2/v1.3 调试用
- IDB 中该会话 version=6，6 条消息，cache_control=MERGE
- 更多历史导出文件在 `E:\下载\`（若干 `.md` 导出文件）
