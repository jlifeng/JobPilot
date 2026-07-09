# Skill 管理入口接入侧栏 + 内置 Skill 中文化

## 背景

Phase 4-5 已交付 Skill 管理页（`/skills`）+ 9 个内置 Skill，但存在三个收尾缺口：

1. **侧栏无入口**：`/skills` 路由已建，dashboard 卡片也接了入口，但工作台左侧 sidebar（`root.tsx` 的 `<nav>` 区，只有 Home + Settings 两个 Link）没有 Skill 管理入口，用户在非 dashboard 页面无法直达。
2. **页面标题重复**：`routes/skills.tsx` 渲染了一个紫色小标题 `t("skill.management.title")`，`SkillManagementPage` 内部又渲染了同样的大标题 + 副标题。页面上"Skill 管理"文字出现两次，冗余。
3. **内置 Skill 全英文**：9 个 builtin Skill 的顶层 `name`/`description` 及各 capability 的 `name`/`description` 都是英文（如 "Resume Assistant" / "Cover Letter Writer"），与产品中文优先定位不符。人设类 capability 内部已是中文，但 Skill 顶层展示名仍是英文。

## 范围（3 项改动）

### 1. 侧栏加 Skill 管理入口

文件：`desktop/src/routes/root.tsx`

在 `<nav>` 区设置 Link（`/settings`）**下方**新增一个 `/skills` Link，样式与现有 Home/Settings Link 一致（`h-12 w-12` 圆角图标按钮 + activeProps 高亮 + `aria-label`/`title`）。图标用 lucide `Puzzle`（dashboard 卡片已用 `Puzzle` 表示 Skill，保持一致）。

需新增 i18n key `navSkills`（zh="Skill 管理"，en="Skill Management"）。同时更新 `activeWorkspaceLabel` 的 pathname 判定，让 `/skills` 路径下的顶栏标题显示"Skill 管理"。

### 2. 去掉重复的页面标题

文件：`desktop/src/routes/skills.tsx`

删掉 `SkillsRoute` 里渲染的紫色小标题块（`<p className="...text-violet-600...">{t("skill.management.title")}</p>` 及其外层 `<div>`），让 `SkillManagementPage` 自身的大标题（`<h1>` + 副标题）成为页面唯一标题。`SkillsRoute` 简化为只渲染 `<SkillManagementPage />`，去掉外层多余的 `max-w-6xl` 包裹（`SkillManagementPage` 自带）。

### 3. 内置 Skill 中文化

文件：`desktop/src-tauri/src/skills.rs`

将 9 个 builtin Skill 的：
- 顶层 `name`（如 "Resume Assistant" → "简历助手"）
- 顶层 `description`
- 各 capability 的 `name` / `description`

改为中文。prompt 内容不动（prompt 是给 LLM 的指令，本次只改用户可见的展示名）。

**关键：bump version 常量** `1.0.0` → `1.1.0`（全部 9 个）。`bootstrap_builtin_skills` 通过 `read_skill_version` 比对版本决定是否覆盖；不 bump 的话老用户 SQLite 里仍是旧英文文案，新文案只在全新安装时生效。

中文文案对照（顶层 name / description）：

| id | name (zh) | description (zh) |
|---|---|---|
| builtin-resume-assistant | 简历助手 | JobPilot 内置的简历编辑助手。 |
| builtin-interview-personas | 面试官人设 | JobPilot 内置面试官人设（HR / 技术 / 架构师 / HRBP / 负责人 / VP）。 |
| builtin-cover-letter | 求职信撰写 | JobPilot 内置求职信撰写助手。 |
| builtin-translate | 简历翻译 | JobPilot 内置简历翻译助手。 |
| builtin-grammar-check | 语法检查 | JobPilot 内置简历语法与文风检查器。 |
| builtin-jd-analysis | JD 分析 | JobPilot 内置简历-JD 匹配分析助手。 |
| builtin-generate-resume | 简历生成 | JobPilot 内置起步简历生成器。 |
| builtin-interview-evaluation | 面试回答评估 | JobPilot 内置面试回答评估器。 |
| builtin-interview-report | 面试报告 | JobPilot 内置面试报告生成器。 |

capability 的 name/description 同步中文化（如 "Resume Edit" → "简历编辑"）。

## 新增范围：导入 Skill 可用性修复

用户导入一个 Skill 包后出现两个症状，根因都在 `skills.rs` 的 `import_skill_package`：

**症状 1：管理页详情显示"引用 0"**
导入时 `skill.references` 被故意存成空数组 `[]`（`skills.rs:577`），只数了 `references/*.md` 的数量填到预览弹窗的 `referencesCount`。详情面板读 `skill.references.length` 永远是 0。references 内容从不加载。

**症状 2：SkillSelector 看不到导入的 Skill**
导入时 capability 的 `matchOn.scenarios` 被故意设为空数组 `[]`（`skills.rs:543`）。`SkillRuntime.matchesScenario`（`skill-runtime.ts:159`）是严格 `includes` 判断——空数组不匹配任何场景，导入的 Skill 在所有场景 selector 都不出现，等于完全不可用。

### 方案 A：场景手动指派（修复症状 2）

文件：`desktop/src/components/skill/skill-detail-panel.tsx`

对 **imported** Skill（builtin 不显示，其 scenarios 固定不该改），在详情面板加"适用场景"多选控件：
- 选项来自 `AI_SCENARIOS`（`skill-scenarios.ts` 的 `listScenarios()`，9 个场景）
- 用可点击 badge 标签实现多选（无 checkbox 组件，badge 切换选中态，符合现有 source-badge 设计语言）：选中=填充色，未选中=描边
- 勾选/取消时，更新该 Skill **第一个 capability** 的 `matchOn.scenarios`，构造完整 Skill 调 `saveSkill`（store 已支持全量 upsert）
- 显示当前已选场景 + 提示文案"勾选后该 Skill 会出现在对应场景的选择器中"
- builtin Skill 不渲染此控件（加 `isImported` 守卫）

### 方案 B：references 真实加载（修复症状 1）

文件：`desktop/src-tauri/src/skills.rs` 的 `import_skill_package`

把 `references/*.md` 内容真正读进 `skill.references`（而非存空数组）：
- 遍历匹配的 `references/*.md` 条目，`read_to_string` 读内容
- 每个 reference 构造 `SkillReference`：`key`=文件名 stem（slugify），`label`=文件名 stem，`filename`="references/xxx.md"，`content`=文件全文，`whenScenario`/`whenVariable`=None
- 填到 `skill.references`（JSON 数组）
- 预览弹窗的 `referencesCount` 仍可保留（= references 数量），或前端改为读 `skill.references.length`——保持 `referencesCount` 字段不变以免破坏 `SkillPackagePreview` 契约
- bump 导入逻辑无 version 概念（导入包自带 version），无需 version 变更

这样详情面板显示真实引用数，且 `SkillRuntime.buildSystemPrompt`（`skill-runtime.ts:139`）的 references 懒加载逻辑能真正把引用内容拼进 prompt。

### 不做

- 不解析 SKILL.md frontmatter 的 scenarios 扩展字段（仍 Out of Scope，靠手动指派）
- 不动 builtin Skill 的 scenarios
- 不加 references 的 whenScenario/whenVariable 编辑 UI（高级，后续）

### 验证

1. `cargo build` + `cargo test --lib skills::` 通过
2. `tsc -b` 类型检查通过
3. 导入一个含 references/*.md 的 Skill 包：管理页详情显示真实引用数（非 0）
4. 导入的 imported Skill 详情面板出现"适用场景"多选，勾选 ai-chat 后，AI Chat 助手 SkillSelector 出现该 Skill
5. builtin Skill 详情面板不出现"适用场景"控件

## 不做（Out of Scope）

- 不改 prompt 内容（仅改展示文案）
- 不动 Skill 数据模型 / 存储 / 运行时
- 不动 dashboard 卡片入口（已接 `/skills`，保留）
- 不加新的 i18n 文案体系（builtin 文案是 Rust 端硬编码，不走前端 i18n）
- interview-personas 的人设 capability 内部已是中文，不动

## 验证

1. `cargo build` 通过
2. 前端 `pnpm typecheck` 通过
3. 启动应用：sidebar 设置按钮下方出现 Skill 管理入口（Puzzle 图标），点击进 `/skills`
4. `/skills` 页面只有一个大标题"Skill 管理"，无重复小标题
5. Skill 列表 9 个内置项 name/description 显示中文（已安装用户因 version bump 触发覆盖更新）
6. `cargo test --lib` skills 模块测试通过

## ADR

- **version bump 是必须的**：bootstrap 用 version 比对决定覆盖。文案变更属于内容更新，bump minor（1.0.0→1.1.0）符合语义。
- **侧栏入口图标选 Puzzle**：与 dashboard 卡片入口图标一致，用户跨入口认知统一。
- **不改 `translate` fallback 机制**：`SkillManagementPage` 用 `translate(key, fallback)` 模式，中文 fallback 已写好，无需动 i18n.ts。
