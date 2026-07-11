# 面试 Skill 人设与内置流程解耦

## Goal

模拟面试开始前，若用户选了 Skill 人设，应可**不选内置面试官**直接开始面试。当前 setup-form 强制 `selectedInterviewers.length > 0` 才能开始，导致 Skill 系统被旧"内置 6 人设"流程绑死。目标：Skill 路径与内置人设路径解耦——选 Skill 即抛弃内置人设流程，但保留面试结束后的评价/报告流程。

## What I already know

- **必选校验**：`interview-setup-form.tsx:103-107` 的 `canCreate` 含 `selectedInterviewers.length > 0`；按钮 `disabled={!canCreate}`（:397）+ `handleCreate` 开头 `if (!canCreate) return`（:134）双重阻止。
- **system_prompt 已是覆盖关系**：`ai.rs:3090-3099` 已实现"有 Skill system_prompt 就用传入的，否则走 `build_interview_system_prompt` 默认 builder"。PR3 接入点本身已支持解耦，瓶颈在 setup-form 校验 + session 创建契约。
- **session 创建契约**：`createInterviewSession` 把 `interviewers: selectedInterviewers` 当必填（:141-146），Rust `create_interview_session` 序列化到 `selected_interviewers_json`（storage.rs:1854-1860）。
- **round 固化**：`interviewer_config` 在 session 创建时固化进每轮，面试中不可切换人设。`currentRound` 只能顺序推进。
- **结束后流程耦合弱**：报告生成（`ai.rs:546` generateInterviewReport + `build_interview_report_user_prompt`）主要依赖 transcript（rounds/messages）+ JD + jobTitle，**不依赖 `selectedInterviewers` 类型**。评价单答（`ai.rs:3359-3370`）用 `interviewer_config.focusAreas`，但这是 round 级数据，与是否内置人设无关。
- **Skill 路径现状**：setup-form 的 SkillSelector（:90-100）选 capability → `skillSelection` 持久化 → interview-room `buildInterviewSystemPromptForTurn`（:319）用 SkillRuntime 生成 system prompt → 传 `systemPrompt` 给 `startInterviewTurnStream`（:445-448）。
- **system_prompt 不持久化到 session**：每次运行时动态生成，只存 `skillSelection` 字符串。

## Assumptions (temporary)

- `selectedInterviewers` 改为可选空数组后，Rust `create_interview_session` + `build_interview_system_prompt` 能优雅处理空 `interviewer_config`（Skill 路径根本不调默认 builder，所以空数组在 Skill 路径下无害）。
- session 大厅卡片展示（interview-session-card）可能依赖 `selectedInterviewers` 显示人设名/头像——空时要 fallback 展示 Skill 名或"自定义人设"。

## Open Questions

- （已答）Skill 路径 session 创建时 interviewers 传什么 → **构造占位人设**：type='skill'、name=Skill 名、focusAreas=[]，复用现有展示/评价逻辑，不改 Rust 契约。
- （已答）setup-form 怎么表达二选一 → **互斥模式切换**：顶部 tab/开关切换"内置人设" vs "Skill 人设"，一次只走一条路。Skill 模式隐藏内置人设区。
- 面试中切换人设可能吗（现状不可，要不要顺便支持）？
- 既有 session（已用内置人设创建）重新进入 setup 时模式怎么默认？

## Decisions (ADR-lite, evolving)

- **Skill 路径 session 契约**：构造占位 InterviewerConfig（type='skill', name=Skill名, focusAreas=[]），不改 Rust 序列化契约。Context: 不动 Rust、复用展示/评价逻辑。Consequences: 占位人设语义略跳，但工程量最小。
- **UI 互斥模式切换**：顶部 tab/开关二选一。Context: 心智模型清晰。Consequences: setup 布局要调，加模式切换组件。


## Requirements (evolving)

- 选了 Skill 人设后，可不选内置面试官即开始面试
- 保留面试结束后的评价 + 报告流程
- setup-form 顶部互斥模式切换："内置人设" / "Skill 人设"二选一
- Skill 路径 session 创建时构造占位 InterviewerConfig（type='skill', name=Skill 名, focusAreas=[]），复用现有 Rust 契约
- Skill 失效 fallback：Skill 被禁用/删除后重新进入 session，system_prompt 构建失败时提示"该 Skill 已不可用，请重选"并阻止继续
- Skill 空选校验：Skill 模式下 SkillSelector 选"默认助手"（未选具体 Skill）时拦截，提示"请选择一个 Skill 人设"
- 老 session 模式默认：重启既有内置人设 session 进 setup 时，依据 selectedInterviewers 是否含 skill 占位人设自动判定模式（老 session 默认"内置人设"）

## Acceptance Criteria (evolving)

- [ ] setup-form 顶部可切换"内置人设"/"Skill 人设"模式，一次只显一区
- [ ] Skill 模式 + 选具体 Skill + 不选内置人设 → 能开始面试，首轮用 Skill system_prompt
- [ ] Skill 模式 + SkillSelector 选"默认助手" → 不能开始，提示选择 Skill
- [ ] 内置人设模式行为与现状完全一致（向后兼容）
- [ ] 面试结束后评价/报告流程正常产出（focusAreas 为空时评价 prompt "本轮重点"留空，不报错）
- [ ] session 卡片对 skill 占位人设展示 Skill 名 + 通用图标，不显示空
- [ ] 既有内置人设 session 重启进 setup → 默认"内置人设"模式
- [ ] Skill 被禁用/删除后重新进入 session → 提示不可用并阻止继续

## Definition of Done

- Tests added/updated（setup-form 模式切换/校验、占位人设构造、Skill 失效 fallback）
- Lint / typecheck / CI green（`cargo build` + `tsc -b` + `cargo test --lib`）
- 既有"选内置人设"路径行为不变（向后兼容）
- i18n 文案（模式切换 tab、提示语）补齐 zh/en

## Out of Scope (explicit)

- **报告人设维度适配**：Skill 模式面试结束后，报告里"面试官评价"维度（原本按人设 focusAreas）在无 focusAreas 时的呈现调整。MVP 接受 focusAreas 留空、评价 prompt "本轮重点"为空白，评价仍正常产出。
- 面试中切换人设（现状 round 固化不可切，本次不改）
- Skill 驱动多轮不同人设（单 Skill 单 system_prompt，远期）
- AI Chat 场景的 SkillSelector UX 统一（两场景语义不同，不统一）

## Technical Notes

- 关键文件：interview-setup-form.tsx / interview-room.tsx / interview-session-card.tsx / lib/interviewers.ts / lib/desktop-api.ts / types/interview.ts / ai.rs / storage.rs
- Skill 系统已落地（PR1-5），system_prompt 覆盖关系已就位
- 内置人设数据纯前端硬编码（interviewers.ts presets），Rust 不存人设定义只存 config
- **类型障碍已确认**：前端 `InterviewerType`（types/interview.ts:1-7）是固定联合类型，不含 "skill"，需扩展加 "skill"。Rust 端 `interviewer_type` 是 String（storage.rs:1564/1624）非 enum，SQLite 列 TEXT，对 "skill" 完全透明，无需改 Rust。
- **评价安全性已确认**：`build_interview_answer_evaluation_user_prompt`（ai.rs:3359-3370）读 focusAreas 用 `unwrap_or_default()`，空数组 join 得空串，不报错，只是 prompt "本轮重点"留空。`interviewer_display_name` 读占位人设 name 正常展示。
- **system_prompt 不持久化**：每次运行时动态生成，只存 skillSelection 字符串。Skill 失效时 SkillRuntime.getCapability 返回 null，需 interview-room 检测并提示。

