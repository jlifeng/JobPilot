# AI 修改简历写入预览而非编辑框导致无法编辑

> GitHub Issue: https://github.com/jlifeng/JobPilot/issues/10
> 版本: 1.6.0 · 平台: Windows · 报告人: justinzhuying

## 问题描述

用户写了三段工作经历，其中一段只填了公司基本信息（company/position/dates），没填描述(description)、技术栈(technologies)、亮点(highlights)，让 AI 补充这些字段。结果：

- **预览（右侧）能看到 AI 写入的数据**
- **编辑栏（左侧）是空的，无法编辑**

预期：AI 写的数据应进入编辑框（左侧编辑栏），而非直接写到最终文档/预览。

## 复现步骤（issue 原文）

1. 工作经历只写基本信息（company 等）
2. 不填写描述、技术栈、亮点
3. 让 AI 来写描述

## 根因（代码分析已坐实，实测待补）

### 数据流现状

- 编辑器与预览**共用同一份 `useResumeStore().sections`**（`desktop/src/components/editor/editor-preview-panel.tsx:19`、`editor-canvas.tsx`），字段组件全部受控（`editable-markdown.tsx:188-195`、`editable-text.tsx`、`editable-list.tsx`），无本地草稿 state。
- AI tool（`replaceResumeText` / `updateSection`）**从 SQLite 持久化版本读、写回 SQLite**（`desktop/src-tauri/src/ai.rs:2152/2240`），不感知前端内存草稿。
- tool 完成后前端 `reloadDocumentIntoStore` → `getDocument` → `setResume`（`desktop/src/stores/resume-store.ts:67-87`）**整体替换** store 的 sections。

### 三个叠加根因

1. **草稿未 flush 竞态（最直接）**
   用户输入触发 autosave 500ms 节流（`resume-store.ts:11, 266-275`）。`ai-chat-panel.tsx:873-875` 虽有 `if (isDirty) await save()` 兜底，但 `save()` 内部 `if (!isDirty) return`（`resume-store.ts:228-229`），且 `await` 期间用户若再敲键，新字符不在这次 save 的快照里。AI 基于旧 SQLite 操作 → reload 后用户草稿被覆盖丢失。

2. **`updateSection` 整体覆盖而非 merge**（`ai.rs:2249`）
   `target_section.content = input.content` 直接赋值。AI 若只给部分字段（如 `{description}`），其余字段（company/position/technologies/highlights）全丢 → 编辑器 `content.items` 读到空。

3. **tool schema 缺 `updateSection`**
   `build_resume_tools`（`ai.rs:1892-1959`）和 `build_anthropic_resume_tools`（`1961-2022`）**只声明 `replaceResumeText` + `updateResumeMetadata`**，没暴露 `updateSection`。但前端 `shouldReloadResume`（`ai-chat-panel.tsx:579`）和 system prompt（`ai-chat-panel.tsx:310`）都引用 `updateSection`。模型只能用 `replaceResumeText`，而它是 JSON 字符串子串精确匹配（`ai.rs:2208-2229`），对结构化数组字段几乎无法正确工作 —— AI 给的 `originalText` 经 JSON 转义后常匹配不上 → patch 被跳过 → tool 报错（`ai.rs:2193-2195`）。

### "预览有 / 编辑器无"的真实机制（实测坐实）

用户实测复现：AI 调 `replaceResumeText`，tool **报错** `"replaceResumeText did not find any originalText to replace"`。

AI 传入的 `originalText` 是从 resume context JSON 字符串里逐字复制的 **JSON 源码片段**：

```
            "highlights": [
              ""
            ],
```

`replace_first_text_in_json`（`ai.rs:2208-2229`）递归遍历 content JSON，**只在叶子 String 值里做子串查找**。`originalText` 包含了键名 `"highlights":`、`[`、`]`、缩进空格等 JSON 语法符号，这些永远不在任何单个 String 叶子值里 → 匹配失败 → patch 跳过 → 所有 patch 都没匹配 → tool 报错（`ai.rs:2193-2195`）。

**结论：AI 一个字都没写进 SQLite / store。** 用户在聊天面板的 ToolExecutionCard 里看到了 `replacementText`（AI 生成的内容），误以为"写进了文档/预览"，实际编辑器和预览都没动 —— issue 标题"写入后无法编辑"的真相是：AI 自以为用 tool 写了、用户也看到了内容，但 tool 报错没真正写入，所以无法编辑。

### 升级现象：6 轮熔断（第二次实测）

同一根因的升级表现：用户让 AI 给空 highlights 补几个亮点，AI 用 `replaceResumeText` 反复尝试不同 `originalText` 写法，每轮都匹配失败报错，错误回灌后模型重试 → 6 轮到顶触发安全熔断：

```
resume tool execution exceeded the desktop safety limit of 6 rounds
```

熔断点：`MAX_TOOL_ROUNDS = 6`（`ai.rs:18`），检查在 `ai.rs:1156-1160`（OpenAI）和 `ai.rs:1551-1555`（Anthropic）。此时预览和编辑栏**都没有内容**（因为 6 轮里一次都没写入成功）。

这证实模型在 `replaceResumeText` 死路上反复挣扎 —— 因为它**没有可用的 `updateSection` 工具**，只能不断换 originalText 写法重试。

根因 100% 锁定在：**`replaceResumeText` 对结构化（数组/对象）字段无能为力，而 tool schema 又没暴露 `updateSection`，模型没有可靠的工具来写入结构化字段。**

## 修复方案（实测后定稿）

根因锁定：`replaceResumeText` 对结构化字段（数组/对象）无法正确匹配，而 `updateSection` 没在 schema 里暴露。修复让模型能正确写入结构化字段。

1. **补全 `updateSection` tool schema**（`desktop/src-tauri/src/ai.rs:1892-1959` OpenAI、`1961-2022` Anthropic）—— 核心。在两处 tool 声明里新增 `updateSection`，schema 描述 content 为 object，并要求"返回完整 content object（含所有原有字段 + 修改字段）"。可附 work_experience items 形状示例帮助模型理解结构。

2. **`execute_update_section_tool` 改 deep merge**（`desktop/src-tauri/src/ai.rs:2249`）—— `target_section.content = input.content` 改为对 object 做 deep merge（保留 AI 未给的嵌套字段）。兜底：即使 AI 只给部分字段，company/position/其余 items 字段也不丢。

3. **调整 system prompt**（`desktop/src/components/ai/ai-chat-panel.tsx:287-315` `buildResumeEditSystemPrompt`）—— 当前强制"所有编辑用 replaceResumeText + exact originalText"，并暗示 updateSection 可用但实际没暴露。改为：结构化字段（items 数组、description、technologies、highlights 等新增/改写）用 `updateSection`（带完整 content），纯文本逐字润色才用 `replaceResumeText`。

4. **（次要，可后置）草稿 flush 竞态**（`ai-chat-panel.tsx:873-875` + `resume-store.ts:228-229`）—— 非 issue 主因，但 `updateSection` 真正能写之后，"AI 基于旧 SQLite 操作覆盖未保存草稿"的风险会显现。修：提交前强制 flush，绕过 `save()` 的 `isDirty` 早退。

> 不改 `replaceResumeText` 的匹配逻辑（方案 3 在初稿里提过放宽匹配）—— 它的语义本就是叶子字符串替换，保持简单；改让模型用对的工具（updateSection）而非修补错误工具。

## 验收标准

- [ ] 用 issue 复现步骤操作后，AI 补充的字段真正写入 SQLite，并**同时出现在编辑栏和预览**，编辑栏可正常编辑。
- [ ] AI 对工作经历等结构化 section 走 `updateSection`（而非 `replaceResumeText` 报错）。
- [ ] `updateSection` 用 deep merge，AI 给部分字段时不丢其余字段。
- [ ] `updateSection` deep merge 与 `replaceResumeText` 子串匹配各有单测覆盖。
- [ ] `pnpm lint` 通过。
- [ ] Tauri dev 实测无回归（其他 section 类型编辑正常，replaceResumeText 纯文本润色仍可用）。

## 范围说明

- 本任务聚焦 AI 写入路径正确性，**不**重构 section content 为列式存储（长期方案另议）。
- 涉及文件：`desktop/src-tauri/src/ai.rs`、`desktop/src/components/ai/ai-chat-panel.tsx`，可能触及 `desktop/src/stores/resume-store.ts`。
