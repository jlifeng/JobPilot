# brainstorm: 模拟面试参考回答

## Goal

在模拟面试中，为用户已经提交的回答按需生成一份结合当前问题、岗位 JD、关联简历与面试上下文的高质量参考回答，补齐“回答—评价—示范—复盘”的训练闭环，同时避免用户在作答前直接查看答案而削弱模拟训练价值。

## What I already know

* 来源为 GitHub Issue [#11](https://github.com/jlifeng/JobPilot/issues/11)，状态为 Open，标签为 `enhancement`，优先级由提交者标记为 Low。
* Issue 原始诉求是在模拟面试问题旁增加按钮，用户回答不理想时可以触发建议回答。
* 当前产品已经支持模拟面试回答评分、维度评价、追问风险、建议追问和训练建议，但缺少一份可直接学习的完整参考回答。
* 初步产品建议是把入口放在用户回答后的评估区域，使用“参考回答”或“优化示例”而不是“标准答案”。
* 参考回答应独立于正式面试对话：不触发下一题、不改变轮次状态、不参与报告评分。
* 现有前端 API 中存在 `updateInterviewMessageMetadata`，消息元数据已承载回答评价，可能可用于保存按需生成结果。
* `InterviewRoom` 已在每条候选人消息后渲染独立的 `AnswerEvaluationCard`，适合作为生成入口和结果容器。
* 现有评价由 Rust 在回答完成后自动生成，并通过 `update_interview_message_metadata` 合并到消息元数据，不需要数据库 schema 变更。
* 主面试流已能读取关联简历上下文，但当前回答评价提示词没有使用简历内容。
* 同类产品研究支持“先回答、后反馈、再示范”：Huru 同时提供结构建议与示例回答，Google 强调避免过度脚本化，实时答案提示则更接近面试辅助而非训练。

## Assumptions

* 参考回答使用当前界面语言生成。
* 结果在首次成功生成后自动展开，历史回看时采用可折叠展示，避免长文本挤占对话空间。

## Requirements

* 仅在候选人已经提交回答后提供参考回答入口。
* 所有已成功生成回答评价的候选人消息都显示入口，不设置分数阈值，也不要求用户先标记该回答。
* 参考回答按需调用 AI 生成，并基于当前问题、用户原回答、JD、可用简历和必要的对话上下文。
* 参考回答不作为面试消息写入正式对话流，也不推进面试状态机。
* 已成功生成的结果应可在历史面试中再次查看。
* UI 和错误文案支持中英文国际化。
* 生成结果包含回答思路、关键要点、相对原回答的改进点，以及一份完整参考回答。
* 每条候选人回答只持久化一份成功结果；成功后不提供主动重新生成，生成失败时允许重试。
* 生成状态按候选人消息隔离，不阻塞用户继续下一题；失败信息与重试入口只显示在对应评价卡内。
* 禁止虚构候选人的公司、项目、职责、指标、结果、技术或其他经历；证据不足时使用明确的补充提示。
* 新增独立的 `interview-suggested-answer` Skill 场景和内置 Skill，允许通过现有默认 Skill 选择机制替换生成策略。
* MVP 不在面试房间增加专用 Skill 下拉框；未配置或 Skill 不可用时回退到 Rust 内置提示词。

## Research References

* [`research/interview-answer-coaching-patterns.md`](research/interview-answer-coaching-patterns.md) — 同类产品与仓库约束均支持“回答后按需生成结构化参考回答”。

## Research Notes

### Feasible approaches

* **独立按需生成命令（推荐）**：生成、持久化和失败重试均与面试状态机隔离，只有用户点击时才产生模型成本。
* **扩展现有自动评价**：跨层改动较少，但每次回答都增加 token、延迟和 JSON 解析风险，且可选功能会拖累评分主流程。
* **新增面试 Turn 类型**：能复用流式事件，但现有 Turn 会插入对话、增加题数并可能结束轮次，隔离状态副作用的复杂度过高。

## Acceptance Criteria

* [ ] 用户提交回答后可以从对应回答/评价区域触发参考回答生成。
* [ ] 每条存在回答评价的候选人消息均显示入口，入口不受评分高低或标记状态影响。
* [ ] 回答提交前不可查看当前问题的参考回答。
* [ ] 生成内容与当前问题、JD 和用户原回答相关，而非通用模板。
* [ ] 生成内容不虚构候选人经历；缺少事实时用明确占位提示用户补充。
* [ ] 生成过程中有明确加载状态，失败后不会影响正常面试流程。
* [ ] 生成期间用户仍可继续面试，且多条消息的生成状态互不覆盖。
* [ ] 参考回答不会新增正式对话消息、推进题目或改变评分结果。
* [ ] 生成成功后重新打开该场面试仍能查看结果，且不会自动重复请求。
* [ ] 成功生成后不提供重新生成；失败后可从原位置重试。
* [ ] 结果包含回答思路、关键要点、改进点和参考回答四部分。
* [ ] 中文与英文界面均有完整文案。
* [ ] Skill 场景注册表和管理页可识别 `interview-suggested-answer`，内置 Skill 可正常引导结构化 JSON 输出。
* [ ] 未选择自定义 Skill、所选 Skill 被禁用或不可用时，参考回答仍可使用内置提示词生成。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 回答前查看答案。
* 自动为每条回答生成参考答案。
* 多版本答案对比、答案编辑和答案分享。
* 成功结果的主动重新生成或版本覆盖。
* 语音朗读、跟读或重新录制训练。
* 将参考回答纳入现有评分或面试报告计算。
* 在面试房间内增加参考回答专用 Skill 选择器。

## Technical Notes

* Issue: <https://github.com/jlifeng/JobPilot/issues/11>
* 初步相关模块：`desktop/src/types/interview.ts`、`desktop/src/lib/desktop-api.ts`、面试房间路由/组件、`desktop/src-tauri/src/ai.rs`、`desktop/src-tauri/src/storage.rs`、Tauri 命令注册与权限配置。
* 在完成代码库自动取证与关键偏好确认前，不进入实现。
* 推荐新增独立的 `generate_interview_suggested_answer` Tauri 命令，不复用会推进状态机的 `start_interview_turn_stream`。
* 推荐把结构化结果保存到对应候选人消息的 `metadata` 中，避免数据库迁移，并支持历史回看。
* 生成命令在 Rust 端解析消息所属轮次和会话，并复用 `build_resume_context` 取得可用简历证据。
* 研究详情见 `research/interview-answer-coaching-patterns.md`。

## Technical Approach

### Data contract

Extend `InterviewMessageMetadata` with one optional structured result:

```ts
interface InterviewSuggestedAnswer {
  outline: string[];
  keyPoints: string[];
  improvements: string[];
  referenceAnswer: string;
  generatedAtEpochMs: number;
}
```

The result is stored under `metadata.suggestedAnswer`. A successful result is immutable in this MVP. Transient loading and error state remain frontend-local and are keyed by candidate message id.

### Native generation boundary

Add an async `generate_interview_suggested_answer` Tauri command. The command:

1. Validates the session, round, and candidate message relationship.
2. Returns an existing persisted result without a new model call when one already exists.
3. Resolves provider configuration and optional linked-resume context on the Rust side.
4. Builds a structured JSON request from the preceding question, original answer, JD, resume evidence, interviewer role/focus, and limited transcript context.
5. Parses and sanitizes the result, rejects an empty reference answer, stamps `generatedAtEpochMs`, and merges it into the candidate message metadata.
6. Returns the updated message/result without inserting an interview message or mutating round/session state.

Use the existing non-streaming JSON completion helpers used by answer evaluation and report generation. Do not reuse `start_interview_turn_stream`.

### Skill integration

Register `interview-suggested-answer` in the frontend scenario registry and i18n. Add a built-in Skill with the required JSON output contract and factual-grounding rules. Resolve `defaultSelections["interview-suggested-answer"]` in `InterviewRoom`; pass its built system prompt to the native command, with Rust fallback when absent or unusable.

### UI behavior

Extend `AnswerEvaluationCard` to receive the candidate message and an action callback. Before generation it shows a secondary “生成参考回答” action. During generation only that message card shows loading. On success it displays four structured sections and removes the generate action. On failure it displays a localized inline error and retry action. The room input, streaming turn, and other message cards remain usable.

### Test focus

* Rust prompt/context assembly, JSON parsing/sanitization, factual-grounding constraints, cached-result behavior, and metadata persistence.
* Frontend metadata normalization for valid, malformed, and missing suggested-answer payloads.
* Per-message loading/error isolation and visibility rules where the current frontend test setup supports component tests.
* Tauri command registration, permission allowlist, i18n parity, lint, TypeScript build, and Rust checks.

## Decision (ADR-lite)

**Context**: The existing interview turn command mutates transcript and round state, while the current answer evaluation is automatic and should not pay the cost or latency of an optional reference answer.

**Decision**: Implement a dedicated on-demand native command, persist one structured result in candidate-message metadata, expose it after every successful answer evaluation, and register a separate Skill scenario.

**Consequences**: This adds a second model call only when requested and requires cross-layer command plumbing. In return, generation is isolated from the interview state machine, history is durable without a database migration, provider failures do not interrupt the interview, and future prompt customization remains consistent with the Skill architecture.

## Implementation Plan (small PRs)

* **PR1 — contracts and native generation**: TypeScript/Rust models, prompt builders, structured completion, cached-result check, metadata persistence, Tauri registration/permissions, and focused Rust tests.
* **PR2 — Skill integration**: scenario registry, built-in Skill, default-selection prompt resolution, i18n labels, and Skill/runtime tests.
* **PR3 — interview-room UX**: per-message action/loading/error state, structured result card, refresh/history behavior, frontend normalization tests, and full project verification.
