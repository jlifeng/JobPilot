# Research: AI tool 写入路径与编辑器数据流根因分析

> 调研日期: 2026-07-19 · 关联 issue: JobPilot#10

## 结论（一句话）

`replaceResumeText` 对结构化字段（数组/对象）无法正确匹配，而 `updateSection` 没在 tool schema 里暴露 —— 模型没有可靠工具写入工作经历的 description/technologies/highlights 等结构化字段。

## 实测证据（用户复现）

AI 调 `replaceResumeText`，传入：

```json
{
  "patches": [{
    "originalText": "            \"highlights\": [\n              \"\"\n            ],",
    "replacementText": "            \"highlights\": [\n              \"设计并落地...\",\n              ...\n            ],",
    "sectionId": "8888f4ad-..."
  }]
}
```

tool 返回：`replaceResumeText did not find any originalText to replace`。

`originalText` 是从 resume context JSON 字符串里逐字复制的 JSON 源码片段（含键名 `"highlights":`、`[`、`]`、缩进空格）。`replace_first_text_in_json`（ai.rs:2208-2229）只在叶子 String 值里做子串查找，永远匹配不到跨键的 JSON 源码片段 → patch 跳过 → tool 报错 → 一个字都没写入。

用户在聊天 ToolExecutionCard 看到了 `replacementText`（AI 生成内容），误以为写进了文档，实际 store/SQLite 都没动 → 编辑栏空。issue 标题"写入后无法编辑"真相：AI 自以为写了、用户也看到了内容，但 tool 报错没真正写入。

## 关键代码引用

### 后端 tool 派发与实现（desktop/src-tauri/src/ai.rs）

- `execute_resume_tool` 派发（ai.rs:2115-2141）：含 replaceResumeText / updateSection / updateResumeMetadata 三个分支。
- `execute_replace_resume_text_tool`（ai.rs:2143-2206）：从 `storage::get_document` 读 SQLite（ai.rs:2152），递归子串替换（ai.rs:2177），写回 `storage::save_document`（ai.rs:2197）。所有 patch 匹配失败时报错（ai.rs:2193-2195）。
- `replace_first_text_in_json`（ai.rs:2208-2229）：递归遍历 String/Array/Object，**只在 String 叶子做子串查找替换**。这是结构化字段匹配失败的直接原因。
- `execute_update_section_tool`（ai.rs:2231-2274）：`target_section.content = input.content`（ai.rs:2249）**整体覆盖**，从 SQLite 读（ai.rs:2240），写回 save_document（ai.rs:2260）。
- `UpdateSectionToolInput`（ai.rs:248-252）：`content: serde_json::Value`。
- **tool schema 只暴露 replaceResumeText + updateResumeMetadata**：`build_resume_tools`（ai.rs:1892-1959，OpenAI）、`build_anthropic_resume_tools`（ai.rs:1961-2022，Anthropic）。**两处都没有 updateSection** —— 模型拿不到这把工具。

### 存储层（desktop/src-tauri/src/storage.rs）

- `document_sections` schema（storage.rs:1151-1162）：`content_json TEXT NOT NULL DEFAULT '{}'`，整个 section 结构化数据序列化成 JSON 字符串塞一列。
- `get_document`（storage.rs:3121-3180）：读 SQLite，按 sort_order 排序。
- `save_document`（storage.rs:3703-3818）：先 DELETE 所有旧 sections 再 INSERT（storage.rs:3763-3768），section id 复用传入 id（storage.rs:3773-3777）。

### 前端数据流

- `ai-chat-panel.tsx:436-452` `reloadDocumentIntoStore`：tool 完成后 `getDocument` + `setResume(toResumeDocument(document))`。
- `ai-chat-panel.tsx:573-619` `completed` 事件：`shouldReloadResume` 判断 toolName ∈ {updateSection, replaceResumeText, updateResumeMetadata} 且 state==='output-available' 才 reload。**但 tool 报错时 state 不是 output-available，reload 不触发**（实测场景即如此）。
- `resume-store.ts:67-87` `setResume`：整体替换 sections，isDirty=false。
- `desktop-document-mappers.ts:100-127` `toResumeDocument`：`parseRecord(section.contentJson)` 解析，非合法 JSON 对象返回 `{}`。
- `ai-chat-panel.tsx:287-315` `buildResumeEditSystemPrompt`：强制"所有编辑用 replaceResumeText + exact originalText"（ai-chat-panel.tsx:310），并提到 updateSection（ai-chat-panel.tsx:310 上下文）但 schema 没暴露 —— prompt 与 schema 不一致。

### 编辑器字段（受控，无本地草稿）

- `work-experience.tsx:21-22`：`content.items` 读 items。
- `editable-markdown.tsx:188-195`、`editable-text.tsx`、`editable-list.tsx:40-46`：全部受控，value 直接绑 store。store 更新后编辑器必然刷新 —— 所以"编辑栏空"只能用"store 没被更新（tool 报错没写入）"解释，不能用 React state 不同步解释。

## 修复方向（prd 已定稿）

1. 补全 `updateSection` schema（OpenAI + Anthropic 两处）。
2. `execute_update_section_tool` 改 deep merge。
3. 调整 system prompt：结构化字段用 updateSection，纯文本润色才用 replaceResumeText。
4. （次要）提交前强制 flush 草稿，绕过 save() 的 isDirty 早退。

## 不修复

- `replaceResumeText` 的匹配逻辑保持简单（叶子字符串替换语义），不放宽 —— 改让模型用对工具。
- section content 列式存储重构（长期方案另议）。
