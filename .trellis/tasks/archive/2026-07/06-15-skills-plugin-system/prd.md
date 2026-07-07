# JobPilot Skill 系统（MVP: Phase 1-3）

## Goal

为 JobPilot 引入通用的 AI Skill 系统，使用户可在各 AI 入口安装/切换/自定义不同 AI 能力包（Skill），覆盖简历优化、面试模拟等场景。**纯增量**——不装任何 Skill 时，应用行为与现状完全一致。

本任务收敛自 `docs/skill-system-implementation-plan.md`，MVP 锁定 Phase 1-3：核心基础设施 + AI Chat 接入 + 面试场景接入。管理页面、导入/导出、社区 Skill 预置推迟到后续阶段。

## What I already know

### 现有架构（已核对真实文件）
- AI 入口组件：`desktop/src/components/ai/`（ai-chat-panel、cover-letter、grammar-check、jd-analysis、translate 等共 9 个 dialog/panel）
- 面试组件：`desktop/src/components/interview/`（interview-setup-form、interview-room、interview-report-summary、interview-session-card）
- Rust 后端：`desktop/src-tauri/src/`（ai.rs、storage.rs、lib.rs、importer.rs 等，importer.rs 已有先例）
- 流式 AI：`listenToAiStreamEvents` + `startInterviewTurnStream`
- 面试状态机依赖固定标记（如 `[ROUND_COMPLETE]`），Skill prompt 不得破坏

### 已有 research（06-15 任务）
- [`research/anthropic-skills-spec.md`](research/anthropic-skills-spec.md) — Anthropic Skills 格式：`SKILL.md` + YAML frontmatter（name/description），无官方 schema、无版本字段
- [`research/skills-ecosystem.md`](research/skills-ecosystem.md) — 生态：GitHub/`npx skills` 分发，`~/.agents/skills/` 安装，简历/面试/求职领域尚无现成 Skill（机会）

### 设计决策（来自实施计划，已采纳）
1. **规则驱动，不依赖 AI 解析** — Skill 导入/拆分/匹配/prompt 组装全流程纯规则，AI 只在最终 LLM 调用时用
2. **场景注册表** — 9 个 AI 入口各自注册"需求画像"（AIScenario），作为 Skill 与功能桥梁
3. **Skill 内容以 JSON 字段存 SQLite** — 树形结构，关系拆分会多 5-6 张表，几十个量级 JSON 够用
4. **面试场景通过新增 `system_prompt` 字段接入** — 保留 Rust 端 `build_interview_system_prompt` 作默认，新增可选字段，完全向后兼容
5. **内置 Skill 包装现有 prompt** — 与硬编码 prompt 内容一致，禁用后回退默认行为
6. **Skill 包是 `.skill` 扩展名的 zip**（SKILL.md + references/），Rust 端解压解析

## Requirements

### Phase 1：核心基础设施（不改动任何现有 UI）
- [ ] 1.1 定义 TypeScript 类型（`types/skill.ts`）：Skill、SkillCapability、SkillReference、SkillVariable、ContextRequirement、AIScenario、AvailableCapability
- [ ] 1.2 SQLite 表结构：在 `storage.rs` 的 `bootstrap_schema` 新增 `skills` + `skill_settings` 表
- [ ] 1.3 新建 `skills.rs` 模块：Skill CRUD（list/get/save/delete）、SkillSettings 读写、首次启动注册内置 Skill
- [ ] 1.4 在 `lib.rs` 注册新 Tauri 命令
- [ ] 1.5 前端 `skill-api.ts`（Tauri invoke 封装）
- [ ] 1.6 前端 `skill-runtime.ts`（匹配引擎：getCapabilitiesForScenario / getCapability / findMatchingCapability / buildSystemPrompt，含变量插值 + references 条件加载）
- [ ] 1.7 前端 `skill-store.ts`（Zustand：已安装 Skill 列表、各场景选中 capability、Skill 变量值）
- [ ] 1.8 前端 `skill-scenarios.ts`（场景注册表）

### Phase 2：AI Chat 场景接入
- [ ] 2.1 实现 `SkillSelector` 组件（通用下拉选择器）
- [ ] 2.2 实现 `SkillVariableForm` 组件（select/textarea 变量配置）
- [ ] 2.3 改造 `ai-chat-panel.tsx`：输入区工具栏挂载 SkillSelector；`handleSubmit` 选 Skill 用 SkillRuntime 构建 prompt，否则走现有 `buildResumeEditSystemPrompt`
- [ ] 2.4 注册 `ai-chat` 场景
- [ ] 2.5 创建内置 Skill `builtin-resume-assistant`（包装现有 `buildResumeEditSystemPrompt`）

### Phase 3：面试场景接入
- [ ] 3.1 Rust：`StartInterviewTurnStreamInput` 新增 `system_prompt` 字段
- [ ] 3.2 Rust：`run_interview_turn_stream` 优先使用传入 system_prompt，否则走现有 `build_interview_system_prompt`
- [ ] 3.3 前端：`StartInterviewTurnStreamInput` 类型新增 `systemPrompt`
- [ ] 3.4 改造 `interview-setup-form.tsx`：在 presetInterviewers 基础上增加 Skill 人设选项，选中时记录 skillId + capabilityId
- [ ] 3.5 改造 `interview-room.tsx` 的 `runTurn`：session 记录了 Skill 人设时用 SkillRuntime 构建 systemPrompt 传入，否则不传
- [ ] 3.6 注册 `interview-persona` 场景
- [ ] 3.7 创建内置 Skill `builtin-interview-personas`（包装现有 getPresetInterviewers）

## Acceptance Criteria

- [ ] 不安装任何 Skill 时，AI Chat 与模拟面试行为与改造前完全一致
- [ ] SkillRuntime.buildSystemPrompt() 单元测试通过（变量插值、references 条件加载、场景匹配评分）
- [ ] Skill 数据可正确存取（list/get/save/delete）
- [ ] AI Chat 选 Skill 后 prompt 正确切换；切回默认恢复正常
- [ ] 面试选 Skill 人设后面试官风格变化；答案评估和报告功能不受影响
- [ ] 面试状态机标记（`[ROUND_COMPLETE]` 等）在 Skill prompt 中保留
- [ ] Lint / typecheck / CI green

## Definition of Done

- Tests added/updated（SkillRuntime 匹配与 prompt 构建单元测试）
- Lint / typecheck / CI green
- Docs/notes updated（行为变化时更新对应 i18n 文案 zh/en）
- Rollout/rollback：内置 Skill 首次启动自动注册；不传 system_prompt 时走默认逻辑（向后兼容）

## Technical Approach

### 核心数据模型
- `Skill`：id/name/description/version/source/icon/tags + capabilities[]/references[]/requiredContext[]/variables[] + createdAt/updatedAt/enabled
- `SkillCapability`：id/name/description + matchOn{scenarios,keywords,categories} + prompt（支持 `{{variable}}` 插值）+ outputFormat/outputSchema/outputDelimiters + requiresTools
- `SkillReference`：key/label/filename/content + whenScenario?/whenVariable?（条件加载）
- `AIScenario`：id/name/description/providesContext/availableTools/expectedOutput/defaultSystemPrompt

### 三种 Skill 处理策略（按复杂度自动选择）
- A 全量塞入：单文件 Skill（阶段标题 < 2）→ body + 相关 references 全拼入 systemPrompt
- B 按阶段拆分：多阶段 Skill（阶段标题 ≥ 2）→ 只塞选中阶段 prompt
- C references 条件加载：按 whenScenario / whenVariable 判断

### 阶段标题检测（正则）
`## 阶段X` / `## Stage X` / `## Phase X` / `## Step X` / `## 模块X` / `## Module X` —— ≥2 个匹配走策略 B

### 匹配评分
`场景精确(100) + 分类(50) + 关键词(10/个) - 未满足上下文需求(20/个)`；得分 > 0 才作为候选

### systemPrompt 构建流程
1. 取 capability.prompt 作基础 → 2. 变量插值 → 3. 条件加载 references（whenScenario/whenVariable 匹配或无条件）→ 4. 注入上下文（简历/JD 等）追加到末尾

### SQLite 表（JSON 字段存储）
- `skills`：id PK + name/description/version/author/source/icon/tags_json/capabilities_json/references_json/required_context_json/variables_json/enabled/created_at/updated_at
- `skill_settings`：id=1 单行 + default_selections_json（场景→"skillId:capabilityId"）+ variable_values_json

## Decision (ADR-lite)

**Context**：需要在 9 个现有 AI 入口引入通用 Skill 切换能力，同时保证零破坏、可扩展、可承载社区生态。

**Decision**：
- MVP 锁定 Phase 1-3（核心 + AI Chat + 面试），管理页面/导入导出/社区预置推迟
- 规则驱动解析（非 AI），Rust 端处理 zip 包，前端只做预览和保存
- 面试场景通过新增可选 `system_prompt` 字段接入，保留 Rust 默认逻辑
- 内置 Skill 原样包装现有 prompt，禁用回退硬编码
- **自定义 Skill 不作为 MVP 目标**：Phase 1-3 仅有两个内置 Skill 且内容与现状完全一致，"切换能力"无实际收益，MVP 产物是基础设施验证（管道通不通），不是用户体验验证

**Consequences**：
- ✅ 向后兼容性强，每个阶段可独立交付
- ✅ 解析确定性强（规则驱动），离线可用
- ⚠️ 自动匹配（关键词触发）不在 MVP，用户必须手动选 Skill
- ⚠️ MVP 阶段用户无法通过 UI 导入社区 Skill（需等 Phase 4+）
- ⚠️ 规则推断 matchOn 对结构特殊的社区 Skill 可能不准，需用户手动修正（Phase 6 完善）
- ⚠️ **架构与外部 Skill 的内在张力**：Anthropic Skills 的 `description` 是写给 AI 的自然语言触发条件，JobPilot 的 `matchOn` 是结构化字段靠规则匹配——外部包进来只能"猜" description 属于哪个场景，猜得准不准取决于作者是否用"简历""面试"这类强领域词。这是规则驱动方案的根本性权衡，不是 bug
- ⚠️ **自定义 Skill 的价值取决于外部生态成熟度**，Phase 4 落地前需重新评估 matchOn 推断准确率；若不准，考虑两条互补路径：(a) 要求外部 Skill 在 frontmatter 声明 `scenarios` 扩展字段走结构化匹配，(b) 把"自动匹配"可选增强做起来走 AI 运行时判断

## Out of Scope (explicit)

- Skill 管理页面（`/skills` 路由、浏览/编辑/启用禁用 UI）—— Phase 4
- `.skill` zip 包导入/导出功能（含导入预览弹窗）—— Phase 4/6
- 其他场景接入：cover-letter / grammar-check / jd-analysis / translate / generate-resume / interview-evaluation / interview-report —— Phase 5
- 社区 Skill 预置（interview-master-skill、yupi-skill 一键安装）—— Phase 6
- 自动匹配（输入关键词命中 Skill 自动触发）—— 可选增强，不在 Phase 1-6
- 自定义输出 schema + 动态 UI 组件渲染（旧 PRD 的"专家模式"）—— 远期
- Skill 评分/审核/市场 —— 远期

## Research References

- [`research/anthropic-skills-spec.md`](research/anthropic-skills-spec.md) — Anthropic Skills 格式：SKILL.md + YAML frontmatter，无官方 schema
- [`research/skills-ecosystem.md`](research/skills-ecosystem.md) — 生态分发与安装机制，简历/面试领域空白

## Technical Notes

### 新增文件
- `desktop/src/types/skill.ts`
- `desktop/src/lib/skill-api.ts` / `skill-runtime.ts` / `skill-scenarios.ts`
- `desktop/src/stores/skill-store.ts`
- `desktop/src/components/skill/skill-selector.tsx` / `skill-variable-form.tsx` / `skill-capability-badge.tsx`
- `desktop/src-tauri/src/skills.rs`

### 修改文件
- `desktop/src-tauri/Cargo.toml`（新增 `zip` crate——Phase 4 才用，MVP 可暂不加）
- `desktop/src-tauri/src/storage.rs`（bootstrap_schema 新增两表）
- `desktop/src-tauri/src/lib.rs`（注册 skills 命令）
- `desktop/src-tauri/src/ai.rs`（StartInterviewTurnStreamInput 新增 system_prompt）
- `desktop/src/lib/desktop-api.ts`（skill invoke + interview systemPrompt）
- `desktop/src/components/ai/ai-chat-panel.tsx`（SkillSelector + handleSubmit 分支）
- `desktop/src/components/interview/interview-setup-form.tsx`（Skill 人设选项）
- `desktop/src/components/interview/interview-room.tsx`（runTurn 传 systemPrompt）
- `messages/en.json` / `messages/zh.json`（Skill i18n 文案）

### 风险
- Skill prompt 过长 → token 超限：references 条件加载 + 长度检查 + 超限提示
- 社区 Skill 质量：MVP 不接社区包，风险延后到 Phase 4+
- 面试状态机被破坏：Skill prompt 保留 `[ROUND_COMPLETE]` 等关键标记
- 变量插值 prompt 注入：只做字符串替换不执行代码，变量值长度限制
