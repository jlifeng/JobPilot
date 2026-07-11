# Journal - lifeng (Part 1)

> AI development session journal
> Started: 2026-05-19

---



## Session 1: ContactInfo refactor and Modern Minimal template

**Date**: 2026-05-19
**Task**: ContactInfo refactor and Modern Minimal template
**Branch**: `main`

### Summary

Added shared ContactInfo component with grid/icon layout, new Modern Minimal template, migrated Classic/Minimal/Professional templates, fixed Euro label overlap, added missing contact fields to Modern template

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `da8bbcc` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Add labels to work experience and release v1.1.5

**Date**: 2026-05-21
**Task**: Add labels to work experience and release v1.1.5
**Branch**: `main`

### Summary

为所有模板的工作经历模块添加职责/成就标签，修复字体主题和macOS更新重启问题，发布v1.1.5版本，改进Release Notes生成逻辑从CHANGELOG.md读取

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `accf422` | (see git log) |
| `34ff927` | (see git log) |
| `fd61b9e` | (see git log) |
| `bdb04a8` | (see git log) |
| `cb223c6` | (see git log) |
| `0721a33` | (see git log) |
| `75d6ac9` | (see git log) |
| `ea15d33` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Skill 系统 MVP：Phase 1-3 全量交付

**Date**: 2026-07-07
**Task**: Skill 系统 MVP：Phase 1-3 全量交付
**Branch**: `feature/skills-pack`

### Summary

为 JobPilot 引入通用 AI Skill 系统，MVP 锁定 Phase 1-3。PR1 核心基础设施：Skill/SkillCapability 类型、SQLite skills+skill_settings 表、Rust skills.rs CRUD、前端 skill-api/runtime/store/scenarios、SkillRuntime 匹配引擎 + 21 单测。PR2 AI Chat 接入：SkillSelector/SkillVariableForm 组件、改造 ai-chat-panel、注册 builtin-resume-assistant。PR3 面试接入：Rust StartInterviewTurnStreamInput.system_prompt 字段（向后兼容）、interview_sessions.skill_selection 列、interview-setup-form 挂 SkillSelector、interview-room runTurn 用 SkillRuntime 构建 prompt、注册 builtin-interview-personas（6 个 preset interviewer capability）。trellis-check 抓到两个跨层缺陷：PR1 的 Tauri ACL 漏注册 6 个 skill 命令（静默拒绝+浏览器 fallback 掩盖）、PR3 的 interview-room 深链进入时 Skill catalog 未加载导致静默回退默认 prompt——均自修。设计权衡写入 PRD ADR：自定义 Skill 不作为 MVP 目标，规则驱动 matchOn 与 Anthropic Skills 自然语言 description 的架构张力是根本性权衡。验收标准全达成：不装 Skill 行为不变、Skill 切换生效、[ROUND_COMPLETE] 标记保留、lint/typecheck/CI green。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `21f4877` | (see git log) |
| `ac40728` | (see git log) |
| `bb7e8c5` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Skill 系统 Phase 4-5：管理页 + 导入 + 7 场景接入

**Date**: 2026-07-09
**Task**: Skill 系统 Phase 4-5：管理页 + 导入 + 7 场景接入
**Branch**: `feature/skills-pack`

### Summary

在 Phase 1-3 基础设施之上并行交付 Phase 4（/skills 管理页双栏布局 + .skill zip 导入预览弹窗 + 冲突三选项 + 路径遍历三重防护）与 Phase 5（5 个前端 dialog 挂 SkillSelector 走 PR2 模式 + interview-evaluation/report 后端加 system_prompt 走 PR3 三元 resolve + 9 个 builtin Skill 全量注册）。单次提交 26 文件 +2471/-50。两轮 trellis-check 跨层审查：PR4 修 1 个 SkillSource 类型缺陷，PR5 零缺陷，9 项跨层/安全审查全过。验证全绿：cargo check（15 既有警告）/ cargo test 25/25 / tsc -b / eslint / vite build。trellis-update-spec 跳过（全量复用 PR2/PR3 模式，无新模式涌现）。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `193b99b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Skill 管理入口侧栏化 + 内置中文化 + 导入可用性修复

**Date**: 2026-07-09
**Task**: Skill 管理入口侧栏化 + 内置中文化 + 导入可用性修复
**Branch**: `feature/skills-pack`

### Summary

Skill 管理 UX 收尾：工作台左侧 sidebar「设置」下方加 Skill 管理入口（Puzzle 图标，navSkills i18n）；/skills 页面去掉重复的紫色小标题与页内大标题，标题统一由顶栏 navbar 承担；9 个内置 Skill name/description 全中文化（version 1.1.0 触发 bootstrap 覆盖）。修复导入 Skill 不可用：import_skill_package 真正加载 references/*.md 内容到 skill.references（新增 collect_reference_entries 纯函数 + 3 单元测试）；imported Skill 详情面板新增「适用场景」多选控件，手动指派 matchOn.scenarios 后该 Skill 出现在对应场景的 SkillSelector 中。trellis-check 7 维度全绿。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `468c21a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: 面试 Skill 人设与内置流程解耦

**Date**: 2026-07-11
**Task**: 面试 Skill 人设与内置流程解耦
**Branch**: `feature/skills-pack`

### Summary

实现模拟面试 Skill 人设与内置面试官流程解耦：InterviewerType 扩展 skill、占位人设构造、setup-form 互斥模式切换、canCreate OR 逻辑、Skill 失效 fallback、session 卡片展示、restart draft skillSelection round-trip、i18n 5 key。trellis-check 发现并修复 5 个问题（含 TS2741 类型遗漏、disabled Skill 不触发 fallback、auto-start effect 未 guard、handleModeChange 泄漏 skill 占位、consumeInterviewRestartDraft 丢失 skillSelection）。验证 tsc -b/cargo build/28 Rust tests/21 vitest 全过。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4104f35` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
