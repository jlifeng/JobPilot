# JobPilot AI 助手功能文档

## 功能概览

JobPilot AI 助手是一个集成在桌面应用中的智能简历编辑助手，基于 OpenAI-compatible API 实现。用户通过自然语言与 AI 对话，AI 可以直接修改简历内容、生成求职信、检查语法、分析 JD 匹配度等。

### 核心功能模块

| 功能 | 组件 | 说明 |
|------|------|------|
| AI 聊天面板 | `ai-chat-panel.tsx` | 主交互界面，支持多轮对话、tool calling |
| 求职信生成 | `cover-letter-dialog.tsx` | 根据简历和 JD 生成定制化求职信 |
| 语法检查 | `grammar-check-dialog.tsx` | 检测语法、拼写、弱动词、模糊表达 |
| JD 分析 | `jd-analysis-dialog.tsx` | 分析简历与职位描述的匹配度 |
| 简历翻译 | `translate-dialog.tsx` | 翻译简历内容 |

---

## 技术架构

### 整体架构图

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (React + TypeScript)       │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ AI Chat Panel│  │ Cover Letter │  │ JD Analysis  │ │
│  │ (对话+编辑)  │  │ (求职信生成) │  │ (JD分析)     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │        │
│         └─────────────────┼─────────────────┘        │
│                           │                          │
│                   desktop-api.ts                     │
│              (Tauri invoke 封装层)                    │
│              startAiPromptStream()                   │
│              listenToAiStreamEvents()                 │
└───────────────────────────┬──────────────────────────┘
                            │ Tauri IPC (事件流)
┌───────────────────────────┴──────────────────────────┐
│                   Backend (Rust)                      │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  ai.rs                                       │    │
│  │  ├─ start_ai_prompt_stream()   入口          │    │
│  │  ├─ run_openai_compatible_stream() 流式调用  │    │
│  │  ├─ build_resume_tools()   Tool 定义         │    │
│  │  ├─ execute_resume_tool()  Tool 路由         │    │
│  │  ├─ execute_update_section_tool()  Section 写│    │
│  │  ├─ execute_update_resume_metadata_tool() 元数据写│
│  │  ├─ enrich_prompt_with_exa_context() Exa 搜索│   │
│  │  └─ stream_openai_round()  SSE 解析          │    │
│  ├──────────────────────────────────────────────┤    │
│  │  storage.rs   (SQLite CRUD)                  │    │
│  │  settings.rs  (API Key 管理)                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  外部服务:                                            │
│  ├─ OpenAI-compatible API (LLM 调用)                  │
│  └─ Exa API (网页搜索 + 内容获取)                      │
└──────────────────────────────────────────────────────┘
```

### 支持的 AI Provider

| Provider | 默认 Base URL | 默认 Model |
|----------|---------------|------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic | `https://api.anthropic.com` | `claude-sonnet-4-20250514` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.0-flash` |

---

## Tool Calling 机制详解

### Tool 定义（[ai.rs:1042-1093](desktop/src-tauri/src/ai.rs#L1042-L1093)）

Rust 后端构建 OpenAI function calling 格式的 tool 定义，目前有两个 tool：

#### 1. `updateSection` — 修改简历 Section 内容

```json
{
  "name": "updateSection",
  "description": "Update one existing resume section.",
  "parameters": {
    "type": "object",
    "properties": {
      "sectionId": { "type": "string" },
      "title": { "type": "string" },
      "content": { "type": "object" }
    },
    "required": ["sectionId", "content"]
  }
}
```

#### 2. `updateResumeMetadata` — 修改简历元数据

```json
{
  "name": "updateResumeMetadata",
  "description": "Update top-level resume metadata.",
  "parameters": {
    "properties": {
      "title": {},
      "template": {},
      "language": {},
      "targetJobTitle": {},
      "targetCompany": {}
    }
  }
}
```

### Tool 执行（[ai.rs:1186-1289](desktop/src-tauri/src/ai.rs#L1186-L1289)）

```
execute_resume_tool()
  ├─ "updateSection" → execute_update_section_tool()
  │    1. 从 SQLite 读取文档
  │    2. 按 sectionId 定位目标 section
  │    3. 替换 content + 可选 title
  │    4. storage::save_document() 写回 SQLite
  │    5. 返回 { success, documentId, sectionId }
  │
  └─ "updateResumeMetadata" → execute_update_resume_metadata_tool()
       1. storage::update_document() 直接更新元数据字段
       2. 返回更新后的文档信息
```

### 安全限制

- Tool 最多执行 **6 轮**（`MAX_TOOL_ROUNDS = 6`），防止无限循环
- 必须有 `documentId` 才能执行 tool（需要关联到具体文档）
- API Key 存储在 OS Keyring，不落地明文

---

## 从自然语言到精确修改的完整流程

### 示例：用户说"帮我把工作经历里的'负责项目开发'改得更专业"

```
第 1 步：前端组装上下文（ai-chat-panel.tsx:761-797）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

systemPrompt = buildResumeEditSystemPrompt(sections)
  ↓ 输出:
  "You are JobPilot's desktop resume assistant.
   ...
   Available resume sections:
   - [work-experience] "工作经历" (sectionId: abc123)
   - [education] "教育背景" (sectionId: def456)
   ..."

userPrompt = 用户原话 + 完整简历 JSON
  ↓ 输出:
  "帮我把工作经历里的'负责项目开发'改得更专业一点

   Resume context:
   {
     "sections": [{
       "id": "abc123",
       "type": "work-experience",
       "title": "工作经历",
       "content": {
         "items": [{
           "id": "item-1",
           "description": "负责项目开发",  ← 被修改的目标文本
           ...
         }]
       }
     }]
   }"

第 2 步：发送给 LLM（ai.rs:946-966）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /v1/chat/completions
{
  "model": "gpt-4o",
  "stream": true,
  "messages": [systemPrompt, ...history, userPrompt],
  "tools": [updateSection, updateResumeMetadata]
}

第 3 步：LLM 推理并返回 tool_call
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LLM 从 systemPrompt 中知道:
  - section "工作经历" 的 sectionId = "abc123"
  - 原文 "负责项目开发" 在 content.items[0].description

LLM 从 tool description 知道:
  - 必须发送完整的 content 对象
  - 必须保留原有 item.id

LLM 返回 tool_call:
  updateSection({
    sectionId: "abc123",
    content: {
      items: [{
        id: "item-1",                             ← 保留原有 ID
        title: "...",                              ← 未改动的字段保留
        description: "主导跨部门项目交付，协调5人团队...", ← 新内容
        ...其他字段保持不变
      }]
    }
  })

第 4 步：Rust 后端执行 tool（ai.rs:1208-1251）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

execute_update_section_tool()
  → storage::get_document("abc123")    // SQLite 读取
  → 找到 sectionId="abc123" 的 section
  → section.content = AI 返回的新 content  // 整份替换
  → storage::save_document()            // SQLite 写入
  → emit event: "tool output available" // 通知前端

第 5 步：前端刷新编辑器（ai-chat-panel.tsx:548-588）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

监听到 "completed" 事件:
  → 检测到 updateSection 执行成功
  → reloadDocumentIntoStore(resumeId)
  → getDocument() 重新拉取文档
  → setResume() 更新 Zustand store
  → React 自动重渲染编辑器
  → 工作经历文本框内容变为 "主导跨部门项目交付，协调5人团队..."
```

### 为什么 AI 能精确找到该改哪个文本框？

三个关键设计：

1. **systemPrompt 注入 sectionId 映射表** — 告诉 LLM 每个显示名称对应的精确 sectionId
2. **userPrompt 带完整简历 JSON** — LLM 能看到所有 section 的完整数据结构
3. **Tool 要求 LLM 返回完整 content 对象** — 不是只返回 diff，而是整份替换，保留所有 `item.id` 和未改动的字段；后端直接覆盖写入，前端全量重载，规避了增量 patch 的一致性风险

---

## Exa API 集成（Web 搜索增强）

### 功能

AI 可以通过 Exa API 实现网页搜索和内容获取，增强回答质量。

### 自动触发条件

**网页获取**（[ai.rs:1353-1426](desktop/src-tauri/src/ai.rs#L1353-L1426)）：
- 用户在消息中包含 URL（http:// 或 https://）
- 自动调用 Exa `/contents` 获取网页文本
- 最多获取 3 个 URL，每个最多 8000 字符

**网页搜索**（[ai.rs:1428-1498](desktop/src-tauri/src/ai.rs#L1428-L1498)）：
- 用户消息包含搜索关键词时自动触发
- 关键词列表（[ai.rs:1635-1658](desktop/src-tauri/src/ai.rs#L1635-L1658)）：
  ```
  搜索, 搜一下, 帮我搜, 查一下, 帮我查, 查询, 检索,
  找一下, 帮我找, 最新, 最近, 官网, 文档, 教程,
  search, look up, find, latest, recent, documentation, docs, tutorial
  ```
- 最多返回 5 条搜索结果，每条最多 2000 字符

### Exa 配置

- 需要单独配置 Exa API Key（密钥 key: `provider.exa_pool.api_key`）
- 如未配置 Exa Key，搜索功能静默跳过，不影响正常对话

---

## 会话存储分析

### 当前实现

AI 聊天历史存储在前端 **`window.localStorage`** 中（[ai-chat-panel.tsx:95-198](desktop/src/components/ai/ai-chat-panel.tsx#L95-L198)）：

| 属性 | 值 |
|------|-----|
| 存储位置 | `localStorage` (WebView2 浏览器存储) |
| Key 格式 | `desktop-ai-chat-sessions:{resumeId}` |
| 数据格式 | `{ version: 1, sessions: [...] }` |
| 持久化 | 前端 JavaScript 管理 |

### 后端 SQLite 表（未使用）

`storage.rs` 中定义了 `ai_chat_sessions` 和 `ai_chat_messages` 两张表，但仅在 `importer.rs`（数据迁移）中使用，**当前前端完全不调用后端聊天存储接口**。

### 问题

- **卸载风险**：卸载应用时 localStorage 可能被清理，聊天历史丢失
- **容量限制**：localStorage 通常有 5-10MB 上限
- **架构不一致**：其他数据（文档、面试记录）走 SQLite，聊天走 localStorage

### 结论

目前不建议改造为后端存储，原因：
- 聊天数据是过程性的，核心产出（简历内容）已在 SQLite 中持久化
- 卸载重装是低频边缘场景
- 改造成本大于收益

---

## 关键文件索引

| 文件 | 内容 |
|------|------|
| [desktop/src-tauri/src/ai.rs](desktop/src-tauri/src/ai.rs) | Rust 后端：流式调用、Tool Calling、Exa 集成、面试功能 |
| [desktop/src/components/ai/ai-chat-panel.tsx](desktop/src/components/ai/ai-chat-panel.tsx) | AI 聊天面板：会话管理、流式响应、上下文组装 |
| [desktop/src/components/ai/cover-letter-dialog.tsx](desktop/src/components/ai/cover-letter-dialog.tsx) | 求职信生成对话框 |
| [desktop/src/components/ai/grammar-check-dialog.tsx](desktop/src/components/ai/grammar-check-dialog.tsx) | 语法检查对话框 |
| [desktop/src/components/ai/jd-analysis-dialog.tsx](desktop/src/components/ai/jd-analysis-dialog.tsx) | JD 分析对话框 |
| [desktop/src/components/ai/tool-execution-card.tsx](desktop/src/components/ai/tool-execution-card.tsx) | Tool 执行状态卡片组件 |
| [desktop/src/components/ai/reasoning-block.tsx](desktop/src/components/ai/reasoning-block.tsx) | AI 推理过程展示组件 |
| [desktop/src/lib/desktop-api.ts](desktop/src/lib/desktop-api.ts) | 前端 API 封装层（Tauri invoke） |
| [desktop/src-tauri/src/storage.rs](desktop/src-tauri/src/storage.rs) | SQLite 存储层（ai_chat_sessions 表在此定义但未使用） |
| [desktop/src-tauri/src/settings.rs](desktop/src-tauri/src/settings.rs) | 设置与密钥管理 |
