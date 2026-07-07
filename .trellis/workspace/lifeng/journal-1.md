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
