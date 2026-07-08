# Skill 系统 Phase 4-5：管理页面 + 导入预览 + 剩余 7 场景接入

## Goal

在 Phase 1-3 已交付的 Skill 基础设施之上，并行推进两块剩余工作：

- **Phase 4**：独立 `/skills` 管理页面（浏览/启用禁用/变量配置/导入预览，不含自定义编辑器、不含导出）+ `.skill` zip 导入（含预览弹窗 + 冲突处理）
- **Phase 5**：剩余 7 个 AI 场景接入 Skill 系统，并为每个场景建内置 Skill 包装现有 prompt

## Requirements

### Phase 4 — 管理页面 + 导入
- [ ] 4.1 新增 `/skills` 路由 + 主导航入口（dashboard 侧边栏/快捷区）
- [ ] 4.2 Skill 列表页：展示已安装 Skill（builtin + imported），双栏布局（列表 + 详情）
- [ ] 4.3 Skill 详情卡：name/description/version/source 标签、capabilities 列表、references、变量配置（复用 SkillVariableForm）、启用/禁用开关
- [ ] 4.4 源区分：builtin 只能禁用不能删；imported 可删除
- [ ] 4.5 Rust 加 `zip` crate，新增 `import_skill_package` 命令：解压 → 解析 SKILL.md frontmatter + capabilities/references → 返回预览结构（不落库）
- [ ] 4.6 导入预览弹窗：展示 name/description/capabilities 列表 + 冲突检测（id 已存在时给"覆盖/跳过/作为新 id 导入"选择）→ 用户确认后才入库
- [ ] 4.7 Rust 新增 `delete_skill` 已存在（Phase 1 建过），管理页接删除按钮（仅 imported）
- [ ] 4.8 lib.rs 注册 `import_skill_package`；desktop-core.toml ACL 加白名单
- [ ] 4.9 前端 `skill-api.importSkillPackage(path)` 封装 + 文件选择对话框
- [ ] 4.10 i18n 文案 zh/en

### Phase 5 — 7 场景接入 + 内置 Skill
- [ ] 5.1 `cover-letter-dialog.tsx` 挂 SkillSelector(scenarioId="cover-letter")，选 Skill 用 SkillRuntime.buildSystemPrompt 替换内联 systemPrompt，否则走原 `"You are an expert cover letter writer..."`
- [ ] 5.2 `translate-dialog.tsx` 接入（scenarioId="translate"）
- [ ] 5.3 `grammar-check-dialog.tsx` 接入（scenarioId="grammar-check"，原组件只传 prompt，需重构出 systemPrompt 分支）
- [ ] 5.4 `jd-analysis-dialog.tsx` 接入（scenarioId="jd-analysis"）
- [ ] 5.5 `generate-resume-dialog.tsx` 接入（scenarioId="generate-resume"，替换 buildAiGenerateSystemPrompt）
- [ ] 5.6 Rust `evaluate_interview_answer` 加可选 `system_prompt` 参数（走 PR3 同款模式），前端 interview-room runTurn 传 evaluationSystemPrompt
- [ ] 5.7 Rust `generate_interview_report` 加可选 `system_prompt` 参数，前端 interview-report 路由传 reportSystemPrompt
- [ ] 5.8 为 7 场景建对应内置 Skill（在 `skills.rs` 的 `bootstrap_builtin_skills` 注册，每个 Skill 含 1 个 capability 包装现有 prompt），保持与 builtin-resume-assistant / builtin-interview-personas 模式一致
- [ ] 5.9 各场景 Skill prompt 保留输出格式约束（interview-evaluation 的 JSON schema、interview-report 的 JSON 格式）
- [ ] 5.10 i18n 文案 zh/en

## Acceptance Criteria

- [ ] 不安装/不启用任何 Skill 时，7 个场景行为与改造前完全一致（向后兼容）
- [ ] `/skills` 页面可浏览已安装 Skill、切换启用状态、配置变量
- [ ] builtin Skill 不可删除只能禁用；imported Skill 可删除
- [ ] `.skill` zip 导入：选文件 → 预览弹窗展示 capabilities → 冲突时给选择 → 确认后入库并出现在列表
- [ ] 导入包内含 `../` 路径遍历时被拒绝
- [ ] 5 个前端 dialog 选 Skill 后 systemPrompt 正确切换；切回默认恢复正常
- [ ] interview-evaluation/report 选 Skill 后 JSON 输出格式不破坏（解析仍通过）
- [ ] 各场景内置 Skill 包装的 prompt 与原硬编码行为等价
- [ ] Lint / typecheck / cargo check / CI green

## Definition of Done

- Tests added/updated：zip 解析单测（含路径遍历拒绝）、buildSystemPrompt 在 7 场景的行为、冲突检测逻辑
- Lint / typecheck / cargo check / CI green
- i18n 文案 zh/en 更新
- 向后兼容：不传 system_prompt / 不启用 Skill 时走默认逻辑
- desktop-core.toml ACL 同步新命令

## Technical Approach

### Phase 4 导入解析
- `.skill` = zip，结构：`SKILL.md`（YAML frontmatter: name/description/version/author + 可选 scenarios 扩展字段本期不解析）+ `references/*.md`
- Rust 用 `zip` crate 解压到临时目录 → 读 `SKILL.md` → 解析 frontmatter（YAML）+ body → 构造 Skill 结构返回预览（不入库）
- 路径遍历防护：校验每个 entry path 不含 `..` 且不绝对
- 冲突检测：预览返回的 id 与 `list_skills()` 比对，前端弹窗据结果给三选项
- 入库走现有 `save_skill`（Phase 1 已建 upsert）

### Phase 5 接入模式（前端 dialog）
复用 PR2 ai-chat-panel 模式：
1. dialog 挂载时 `useSkillStore.loadSkills()/loadSettings()`
2. 工具栏挂 `SkillSelector scenarioId=<场景>`
3. 选 Skill → `SkillRuntime.buildSystemPrompt(scenarioId, capability, skill, {jdContent, variables})` 替换 systemPrompt
4. 未选 → 走原内联 prompt
5. grammar-check/jd-analysis 现状只传 `prompt`，需把 systemPrompt 抽成独立字段传入（流式 API 已支持 systemPrompt）

### Phase 5 接入模式（后端面试）
复用 PR3 模式：
- `evaluate_interview_answer` / `generate_interview_report` 签名加 `system_prompt: Option<&str>`
- 内部 `resolved_system_prompt` 三元：传入非空 → 用传入；否则 → 原 `build_*_system_prompt`
- 前端 interview-room runTurn / interview-report 路由读 session.skillSelection 重建 systemPrompt 传入
- Skill prompt 末尾保留 JSON 输出格式约束块

### 内置 Skill 注册
`bootstrap_builtin_skills` 扩展为循环注册 9 个内置 Skill（resume-assistant / interview-personas 已有，新增 7 个对应 7 场景），每个含 1 capability，prompt = 现有硬编码 prompt 原样搬入，source="builtin"

## Decision (ADR-lite)

**Context**：Phase 1-3 验证了管道通畅但只有 2 个内置 Skill 可选、无管理入口、7 场景未接入，"切换能力"无实际收益。Phase 4-5 要把基础设施验证转为用户可感知的能力。

**Decision**：
- Phase 4/5 并行同任务推进
- 管理页只做"管理"不做"手建"（自定义 Skill 仍非 MVP，用户改 Skill 靠删后重导入）
- 导入带预览弹窗 + 冲突三选项，不做导出（无自建产物可导出）
- 独立 `/skills` 路由（不并入 settings tab）
- 7 场景全接（含后端 evaluation/report），为每场景建内置 Skill 包装现有 prompt
- builtin 不可删只能禁、imported 可删，源标签区分

**Consequences**：
- ✅ 用户在所有 9 个 AI 入口获得 Skill 切换能力，且有管理页安装第三方包
- ✅ 向后兼容性强，每场景独立交付
- ⚠️ 9 个内置 Skill 首次启动批量注册，bootstrap 时间略增（可接受）
- ⚠️ zip 导入的社区 Skill matchOn 推断不准仍是根本性权衡（frontmatter scenarios 扩展字段本期不解析，进 Out of Scope）
- ⚠️ 后端 evaluation/report 接入需谨慎保留 JSON 输出约束，否则解析失败
- ⚠️ "只管理不手建"意味着用户改 Skill 必须删后重导入，体验受限——Phase 6 评估

## Out of Scope (explicit)

- 自定义 Skill 从零创建/编辑表单 —— 用户改 Skill 靠删后重导入
- `.skill` 导出功能 —— 无自建产物可导出
- 社区 Skill 预置（一键安装外部仓库）—— Phase 6
- 导入 frontmatter 的 `scenarios` 扩展字段解析（结构化匹配）—— Phase 6，本期 matchOn 走规则推断
- 自动匹配（输入关键词命中 Skill 自动触发）—— 可选增强
- 自定义输出 schema + 动态 UI 组件渲染 —— 远期
- Skill 评分/审核/市场 —— 远期

## Technical Notes

### 新增依赖
- `desktop/src-tauri/Cargo.toml`：`zip` crate（Phase 4 导入解析）

### 复用现有
- `SkillSelector` / `SkillVariableForm`（Phase 2）
- `skill-store` / `skill-runtime` / `skill-api`（Phase 1）
- `save_skill` / `list_skills` / `delete_skill`（Phase 1 Rust）
- PR3 的 Rust `system_prompt` 参数模式（evaluation/report 直接复用）

### 新增文件
- `desktop/src/routes/skills.tsx`（/skills 路由）
- `desktop/src/components/skill/skill-management-page.tsx`
- `desktop/src/components/skill/skill-import-preview-dialog.tsx`
- `desktop/src/components/skill/skill-detail-panel.tsx`

### 修改文件
- `desktop/src/router.tsx`（注册 skillsRoute）
- `desktop/src/routes/dashboard.tsx`（加入口）
- `desktop/src-tauri/Cargo.toml`（zip crate）
- `desktop/src-tauri/src/skills.rs`（import_skill_package + 7 个 builtin Skill 注册）
- `desktop/src-tauri/src/lib.rs`（注册 import_skill_package）
- `desktop/src-tauri/capabilities/desktop-core.toml`（ACL 白名单）
- `desktop/src-tauri/src/ai.rs`（evaluate_interview_answer / generate_interview_report 加 system_prompt）
- `desktop/src/lib/desktop-api.ts`（importSkillPackage + evaluation/report systemPrompt）
- `desktop/src/components/editor/{cover-letter,grammar-check,jd-analysis,translate}-dialog.tsx`
- `desktop/src/components/dashboard/generate-resume-dialog.tsx`
- `desktop/src/components/interview/interview-room.tsx`（evaluation systemPrompt）
- `desktop/src/components/interview/interview-report-summary.tsx` 或 interview-report 路由（report systemPrompt）
- `messages/zh.json` / `messages/en.json`

### 风险
- zip 路径遍历 → 校验 entry path
- 社区 Skill matchOn 推断不准 → 根本性权衡，本期接受
- 后端 JSON 输出被 Skill prompt 破坏 → Skill prompt 保留输出格式约束块
- 9 个内置 Skill bootstrap 批量注册 → 性能可接受

## Implementation Plan (small PRs)

- **PR4**：Phase 4 — /skills 路由 + 管理页（列表/详情/启用禁用/变量配置/源区分）+ zip 导入（含预览弹窗 + 冲突处理 + 路径遍历防护）+ ACL
- **PR5**：Phase 5 — 5 前端 dialog 接入 + 2 后端面试场景接入 + 7 个 builtin Skill 注册 + i18n

PR4 与 PR5 编号独立、可分别 review，但在本任务内连续交付。
