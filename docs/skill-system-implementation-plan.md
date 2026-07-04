# JobPilot Skill 系统实施计划

## 一、目标与原则

### 目标

为 JobPilot 引入通用的 AI Skill 系统，使用户可以自由安装、切换、自定义不同 AI 能力包（Skill），覆盖简历优化、面试模拟、求职信生成、翻译等所有 AI 场景。

### 设计原则

1. **纯增量，不破坏现有体验** — 不装任何 Skill 时，应用行为与现在完全一致
2. **完全通用，不针对特定 Skill 写逻辑** — interview-master-skill、yupi-skill、或任何社区 Skill，都通过同一套机制导入和生效
3. **用户主导** — Skill 的使用完全由用户主动选择，不做隐式覆盖
4. **渐进式迁移** — 先建基础设施，再逐个场景接入，每个阶段都可独立交付

### 交互模式

每个 AI 场景入口提供 Skill 选择器，用户行为分三种：

| 模式 | 触发方式 | prompt 来源 |
|------|---------|------------|
| 默认 | 不选 Skill，直接用 | 原系统硬编码的 prompt（现状不变） |
| 手动选择 | 用户从选择器选一个 Skill 能力 | 选中 Skill 的 capability prompt |
| 自动匹配（可选增强） | 输入关键词命中已安装 Skill | 匹配 Skill 的 prompt + 提示用户确认 |

### Skill 解析策略：规则驱动，不依赖 AI

Skill 的导入、拆分、匹配、prompt 组装全流程**不依赖 AI 调用**，采用纯规则解析。AI 只在最终调用 LLM 生成内容时使用，与现有架构一致。

**为什么不用 AI 解析：**

1. **确定性** — 同一个 Skill 包每次导入结果必须完全一致，AI 解析有随机性
2. **成本** — 导入时调用 AI 增加延迟和 token 消耗
3. **离线可用** — 导入 Skill 不需要联网，不依赖 API key
4. **用户可控** — 规则解析的结果用户能在预览界面看到并手动修正

**三种处理策略，按 Skill 复杂度自动选择：**

| 策略 | 适用场景 | 判断条件 | prompt 塞入方式 |
|------|---------|---------|---------------|
| A：全量塞入 | 单文件 Skill（如 yupi-skill） | SKILL.md body 中阶段标题 < 2 个 | 整个 body + 相关 references 全部拼入 systemPrompt |
| B：按阶段拆分 | 多阶段 Skill（如 interview-master-skill） | SKILL.md body 中阶段标题 ≥ 2 个 | 只把用户选中的阶段 prompt 塞入，其他阶段不包含 |
| C：references 条件加载 | 所有 Skill | references 标记了加载条件 | 按 whenScenario / whenVariable 条件判断是否加载 |

**阶段标题检测规则（正则匹配）：**

```
检测 SKILL.md body 中是否有以下标题模式：
  - "## 阶段X" / "## 阶段一" / "## 阶段二"...（中文）
  - "## Stage X" / "## Phase X" / "## Step X"（英文）
  - "## 模块X" / "## Module X"（中英文变体）

≥ 2 个匹配 → 策略 B（拆分为多个 capability）
< 2 个匹配 → 策略 A（整体作为一个 capability）
```

**matchOn 推断规则（关键词匹配）：**

```
description 包含 "面试" / "interview" → 匹配 interview-persona、jd-analysis 场景
description 包含 "简历" / "resume"     → 匹配 ai-chat 场景
description 包含 "翻译" / "translate"  → 匹配 translate 场景
description 包含 "求职信" / "cover letter" → 匹配 cover-letter 场景
body 中出现 "模拟面试"                  → 关键词加入 "模拟面试"
body 中出现 "公司调研"                  → 关键词加入 "公司调研"
```

**各环节解析方式总览：**

| 环节 | 是否用 AI | 方法 |
|------|----------|------|
| Skill 包解压 | 否 | Rust zip 库 |
| frontmatter 解析 | 否 | YAML 解析器 |
| capabilities 拆分 | 否 | 正则匹配标题模式 |
| matchOn 推断 | 否 | 关键词匹配规则 |
| references 条件加载 | 否 | 字段条件判断 |
| 运行时 prompt 组装 | 否 | 字符串拼接 + 变量插值 |
| 自动匹配（可选增强，不在 Phase 1-6 范围内） | 是（可选） | 轻量 AI 判断用户意图 |

---

## 二、核心数据模型

### 2.1 Skill（技能包）

一个 Skill 是一个完整的 AI 能力包，可包含多个 capability（能力）。

```typescript
interface Skill {
  id: string;                        // 唯一标识 e.g. "interview-master"
  name: string;                      // 展示名 e.g. "Interview Master"
  description: string;               // 简短描述
  version: string;                   // 语义版本 e.g. "1.0.0"
  author?: string;                   // 作者
  source: "builtin" | "community" | "custom";  // 来源
  icon?: string;                     // 图标标识
  tags: string[];                    // 标签 e.g. ["面试", "interview"]

  capabilities: SkillCapability[];   // 能力列表（至少一个）
  references: SkillReference[];      // 关联参考文档
  requiredContext: ContextRequirement[];  // 上下文需求声明
  variables: SkillVariable[];        // 变量定义

  createdAt: number;                 // 创建时间（epoch ms）
  updatedAt: number;                 // 更新时间
  enabled: boolean;                  // 是否启用
}
```

### 2.2 SkillCapability（能力）

一个 Skill 可包含多个能力，每个能力对应一段独立的 prompt，可匹配不同场景。

```typescript
interface SkillCapability {
  id: string;                        // e.g. "resume-polish", "interview-persona"
  name: string;                      // 展示名 e.g. "简历优化"
  description: string;               // 能力描述

  matchOn: {
    scenarios: string[];             // 适用的场景 ID e.g. ["ai-chat"]
    keywords?: string[];             // 用户输入关键词触发 e.g. ["简历优化", "改简历"]
    categories?: string[];           // 分类粗粒度匹配 e.g. ["resume-polish", "interview"]
  };

  prompt: string;                    // system prompt 内容，支持 {{variable}} 插值

  outputFormat?: "text" | "json" | "stream";
  outputSchema?: object;             // JSON schema（JSON 输出时）
  outputDelimiters?: {               // 结构化输出分隔符
    start: string;
    end: string;
  };

  requiresTools?: string[];          // 需要的工具 e.g. ["replaceResumeText"]
}
```

### 2.3 SkillReference（参考文档）

Skill 关联的参考文档，按条件加载到 prompt 中。

```typescript
interface SkillReference {
  key: string;                       // e.g. "role_product_operations"
  label: string;                     // 展示标签
  filename: string;                  // 原始文件名
  content: string;                   // 文档内容

  // 条件加载（满足任一条件时加载）
  whenScenario?: string;             // 仅在指定场景加载 e.g. "jd-analysis"
  whenVariable?: string;             // 变量条件 e.g. "jobCategory=product"
}
```

### 2.4 其他辅助类型

```typescript
interface ContextRequirement {
  type: "resume" | "jd" | "conversation" | "interview_session" | "interview_answer" | "interview_transcript";
  required: boolean;
  description: string;
}

interface SkillVariable {
  key: string;                       // e.g. "jobCategory"
  label: string;                     // e.g. "岗位方向"
  type: "text" | "select" | "textarea";
  required: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
}
```

---

## 三、场景注册表

JobPilot 的每个 AI 入口注册自己的"需求画像"。这是连接 Skill 和具体功能的桥梁。

### 3.1 AIScenario 定义

```typescript
interface AIScenario {
  id: string;                        // 场景唯一 ID
  name: string;                      // 展示名
  description: string;               // 场景描述
  providesContext: ContextType[];    // 能提供的上下文
  availableTools: string[];          // 支持的工具
  expectedOutput: "stream" | "json";
  defaultSystemPrompt: string | (() => string);  // 默认 prompt（fallback）
}
```

### 3.2 JobPilot 场景清单

基于对现有 14 个 AI 入口的梳理，注册以下场景：

| 场景 ID | 名称 | 提供上下文 | 可用工具 | 输出格式 | 当前默认 prompt 位置 |
|---------|------|----------|---------|---------|-------------------|
| `ai-chat` | AI 简历助手 | resume, conversation | replaceResumeText, updateResumeMetadata | stream | `ai-chat-panel.tsx:buildResumeEditSystemPrompt` |
| `cover-letter` | 求职信生成 | resume, jd | (无) | stream | `cover-letter-dialog.tsx` 内联 |
| `grammar-check` | 语法检查 | resume | (无) | stream | (无 systemPrompt) |
| `jd-analysis` | JD 匹配分析 | resume, jd | (无) | stream | `jd-analysis-dialog.tsx:buildAnalysisPrompt` |
| `translate` | 简历翻译 | resume | (无) | stream | `translate-dialog.tsx` 内联 |
| `generate-resume` | 简历生成 | (模板) | (无) | stream | `generate-resume-dialog.tsx:buildAiGenerateSystemPrompt` |
| `interview-persona` | 模拟面试-面试官 | resume, jd, interview_session | (无) | stream | `ai.rs:build_interview_system_prompt` |
| `interview-evaluation` | 面试答案评估 | resume, jd, interview_answer | (无) | json | `ai.rs:build_interview_answer_evaluation_system_prompt` |
| `interview-report` | 面试报告 | interview_transcript | (无) | json | `ai.rs:build_interview_report_system_prompt` |

---

## 四、运行时匹配引擎

### 4.1 SkillRuntime 职责

```typescript
class SkillRuntime {
  // 获取适用于某场景的所有 Skill 能力（用于填充选择器）
  getCapabilitiesForScenario(scenarioId: string): AvailableCapability[];

  // 精确查找（用户选定了某个 Skill 能力时）
  getCapability(skillId: string, capabilityId: string): { capability, skill } | null;

  // 自动匹配（根据用户输入关键词）
  findMatchingCapability(scenarioId: string, userInput: string): AvailableCapability | null;

  // 构建最终 systemPrompt
  buildSystemPrompt(
    scenarioId: string,
    capability: SkillCapability,
    skill: Skill,
    context: { resumeContent?, jdContent?, variables? }
  ): string;
}

interface AvailableCapability {
  skillId: string;
  skillName: string;
  capabilityId: string;
  capabilityName: string;
  capabilityDescription: string;
  skillIcon?: string;
}
```

### 4.2 匹配评分逻辑

```
匹配评分 = 场景精确匹配(100分) + 分类匹配(50分) + 关键词匹配(10分/个)
         - 未满足的上下文需求(20分/个)

得分 > 0 的能力才作为候选
```

### 4.3 systemPrompt 构建流程

```
1. 取 capability.prompt 作为基础
2. 变量插值：{{variable}} → 实际值
3. 条件加载 references：
   - whenScenario 匹配当前场景 → 加载
   - whenVariable 匹配当前变量值 → 加载
   - 无条件限制的 → 加载
4. 注入上下文：简历内容、JD 内容等（追加到 prompt 末尾）
```

---

## 五、SQLite 存储设计

### 5.1 表结构

```sql
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  author TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  icon TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  references_json TEXT NOT NULL DEFAULT '[]',
  required_context_json TEXT NOT NULL DEFAULT '[]',
  variables_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at_epoch_ms INTEGER NOT NULL,
  updated_at_epoch_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  -- 每个场景默认选中的 skill capability
  -- JSON: { "ai-chat": "interview-master:resume-polish", "interview-persona": "interview-master:interview-persona" }
  default_selections_json TEXT NOT NULL DEFAULT '{}',
  -- 用户自定义变量值
  -- JSON: { "interview-master": { "jobCategory": "technical" } }
  variable_values_json TEXT NOT NULL DEFAULT '{}',
  updated_at_epoch_ms INTEGER NOT NULL
);
```

### 5.2 存储模式

- Skill 完整内容（capabilities、references 等）以 JSON 字段存储，简化 CRUD
- 参照现有 `storage.rs` 的 `bootstrap_schema()` 模式，在同一个函数中创建表
- 内置 Skill 首次启动时自动注册（通过 version 检查是否需要更新）

---

## 六、后端 Rust 改造

### 6.1 新增 skills.rs 模块

```rust
// desktop/src-tauri/src/skills.rs

#[derive(Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    // ... 其他字段
}

// Skill 包导入（支持 .skill zip 包 / 目录 / 单 .md 文件）
#[tauri::command]
pub fn import_skill_package(app: AppHandle, file_path: String) -> Result<Skill, String>;

// Skill 包导出（导出为 .skill zip 包）
#[tauri::command]
pub fn export_skill_package(app: AppHandle, skill_id: String, output_path: String) -> Result<(), String>;

#[tauri::command]
pub fn get_skill_settings(app: AppHandle) -> Result<SkillSettings, String>;

#[tauri::command]
pub fn set_default_skill_selection(app: AppHandle, scenario_id: String, selection: Option<String>) -> Result<(), String>;
```

### 6.2 Skill 包格式与导入导出

#### 标准格式

Skill 包是一个 `.skill` 扩展名的 zip 文件，内部结构如下：

```
my-skill.skill (zip)
├── SKILL.md              # 必需，frontmatter + 主体内容
└── references/           # 可选，参考文档目录
    ├── guide-a.md
    ├── guide-b.md
    └── role-specific.md
```

`SKILL.md` 的 frontmatter 遵循 Cowork Skill 标准：

```yaml
---
name: interview-master          # Skill ID，kebab-case
description: 全流程面试准备...   # 简短描述
---
```

#### Rust 端导入流程（skills.rs）

```rust
use zip::ZipArchive;
use std::fs::File;
use std::io::Read;

pub fn import_skill_package(app: &AppHandle, file_path: &str) -> Result<Skill, String> {
    let path = std::path::Path::new(file_path);

    // 1. 根据扩展名判断导入方式
    if path.extension().map(|e| e == "skill" || e == "zip").unwrap_or(false) {
        // .skill zip 包导入
        Self::import_from_zip(path)
    } else if path.is_dir() {
        // 目录导入（开发调试用）
        Self::import_from_dir(path)
    } else if path.extension().map(|e| e == "md").unwrap_or(false) {
        // 单 .md 文件导入（无 references 的简单 Skill）
        Self::import_from_single_md(path)
    } else {
        Err("Unsupported file format. Expected .skill, .zip, directory, or .md".into())
    }
}

fn import_from_zip(path: &Path) -> Result<Skill, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {e}"))?;

    let mut skill_md_content: Option<String> = None;
    let mut references: Vec<(String, String)> = vec![];  // (filename, content)

    // 2. 遍历 zip 内所有文件
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Failed to read entry: {e}"))?;
        let entry_name = entry.name().to_string();

        // 跳过目录条目
        if entry.is_dir() { continue; }

        // 读取文件内容
        let mut content = String::new();
        entry.read_to_string(&mut content).map_err(|e| format!("Failed to read content: {e}"))?;

        // 3. 识别 SKILL.md（支持根目录或一级子目录）
        let normalized = entry_name.trim_start_matches("./");
        if normalized == "SKILL.md" || normalized.ends_with("/SKILL.md") {
            skill_md_content = Some(content);
        } else if normalized.starts_with("references/") {
            // 4. 收集 references/ 目录下的 .md 文件
            let ref_name = normalized.strip_prefix("references/")
                .unwrap_or(normalized);
            if ref_name.ends_with(".md") {
                references.push((ref_name.to_string(), content));
            }
        }
    }

    let skill_md = skill_md_content.ok_or("SKILL.md not found in package")?;

    // 5. 解析 frontmatter + 构建 Skill
    Self::parse_skill_from_markdown(&skill_md, &references)
}

fn parse_skill_from_markdown(
    skill_md: &str,
    references: &[(String, String)],
) -> Result<Skill, String> {
    // 解析 YAML frontmatter (name, description)
    let (frontmatter, body) = parse_frontmatter(skill_md)?;

    // 构建 SkillReference 列表
    let skill_references: Vec<SkillReferenceJson> = references.iter()
        .map(|(filename, content)| SkillReferenceJson {
            key: filename.replace(".md", ""),
            label: extract_title(content).unwrap_or(filename.clone()),
            filename: filename.clone(),
            content: content.clone(),
            when_scenario: None,
            when_variable: None,
        })
        .collect();

    // 自动推断 capabilities 和 matchOn（逻辑同前端 importer）
    let capabilities = infer_capabilities(&frontmatter, body, &skill_references);
    let match_on = infer_match_on(&frontmatter, body);

    Ok(Skill {
        id: frontmatter.name,
        name: frontmatter.name,
        description: frontmatter.description,
        source: "community",
        capabilities,
        references: skill_references,
        // ...
    })
}
```

#### Rust 端导出流程

```rust
pub fn export_skill_package(skill_id: &str, output_path: &str) -> Result<(), String> {
    let skill = load_skill_from_db(skill_id)?;

    // 1. 创建 zip 文件
    let file = File::create(output_path).map_err(|e| format!("Failed to create file: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 2. 写入 SKILL.md（重建 frontmatter + body）
    let skill_md = rebuild_skill_md(&skill);
    zip.start_file("SKILL.md", options).map_err(|e| format!("Failed to write SKILL.md: {e}"))?;
    zip.write_all(skill_md.as_bytes()).map_err(|e| format!("Failed to write content: {e}"))?;

    // 3. 写入 references/ 目录下的文件
    for reference in &skill.references {
        let path = format!("references/{}", reference.filename);
        zip.start_file(&path, options).map_err(|e| format!("Failed to write reference: {e}"))?;
        zip.write_all(reference.content.as_bytes()).map_err(|e| format!("Failed to write content: {e}"))?;
    }

    zip.finish().map_err(|e| format!("Failed to finalize zip: {e}"))?;
    Ok(())
}
```

#### 前端导入交互

用户在 Skill 管理页面点击"导入"按钮后：

```typescript
// 1. 调用 Tauri 文件选择对话框（已有 tauri_plugin_dialog）
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  filters: [
    { name: 'Skill Package', extensions: ['skill', 'zip'] },
    { name: 'Markdown', extensions: ['md'] },
  ],
  multiple: false,
});

if (selected) {
  // 2. 调用后端导入
  const skill = await importSkillPackage(selected as string);

  // 3. 导入预览（展示解析出的 capabilities 和 matchOn）
  showImportPreview(skill);

  // 4. 用户确认后保存
  await saveSkill(skill);
}
```

#### Cargo 依赖

在 `desktop/src-tauri/Cargo.toml` 中新增：

```toml
[dependencies]
zip = "2.2"          # Skill 包的 zip 解压/压缩
```

### 6.2 面试场景改造（ai.rs）

在 `StartInterviewTurnStreamInput` 中新增可选的 `system_prompt` 字段：

```rust
pub struct StartInterviewTurnStreamInput {
    pub session_id: String,
    pub round_id: Option<String>,
    pub kind: String,
    pub message: Option<String>,
    pub provider: String,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub request_id: Option<String>,
    pub locale: String,
    pub system_prompt: Option<String>,  // 新增
}
```

在 `run_interview_turn_stream` 中：

```rust
let system_prompt = match &input.system_prompt {
    Some(sp) if !sp.is_empty() => sp.clone(),
    _ => build_interview_system_prompt(&interviewer_config, jd, resume_content, max_questions, locale),
};
```

**向后兼容**：前端不传 `system_prompt` 时，走原有逻辑，行为完全不变。

### 6.3 lib.rs 命令注册

```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有命令 ...
    skills::list_skills,
    skills::get_skill,
    skills::save_skill,
    skills::delete_skill,
    skills::import_skill_package,
    skills::export_skill_package,
    skills::get_skill_settings,
    skills::set_default_skill_selection,
])
```

---

## 七、前端改造

### 7.1 新增文件清单

```
desktop/src/
├── types/
│   └── skill.ts                          # Skill 相关 TypeScript 类型定义
├── lib/
│   ├── skill-api.ts                      # Skill 相关的 Tauri invoke 封装
│   ├── skill-runtime.ts                  # SkillRuntime 匹配引擎
│   └── skill-importer.ts                 # Cowork Skill 格式导入器
├── stores/
│   └── skill-store.ts                    # Zustand store
├── components/
│   └── skill/
│       ├── skill-selector.tsx            # Skill 选择器组件（通用，嵌入各场景）
│       ├── skill-variable-form.tsx       # Skill 变量配置表单
│       └── skill-capability-badge.tsx    # 能力标签展示
└── routes/
    └── skills.tsx                         # Skill 管理页面
```

### 7.2 Skill 选择器组件

`skill-selector.tsx` 是一个通用组件，嵌入到每个 AI 场景入口：

```typescript
interface SkillSelectorProps {
  scenarioId: string;                    // 当前场景 ID
  selectedCapabilityId?: string;         // 当前选中的能力
  onSelect: (selection: { skillId: string; capabilityId: string } | null) => void;
  compact?: boolean;                     // 紧凑模式（嵌入工具栏）
}
```

UI 形态：一个下拉菜单，列出当前场景可用的所有 Skill 能力 + "默认"选项。

### 7.3 AI Chat 面板改造

在 `ai-chat-panel.tsx` 的 `handleSubmit` 中：

```typescript
// 现有代码
const systemPrompt = buildResumeEditSystemPrompt(sections);

// 改造后
let systemPrompt: string;
if (selectedSkillCapability) {
  // 用户选了 Skill → 用 SkillRuntime 构建
  systemPrompt = skillRuntime.buildSystemPrompt(
    "ai-chat",
    selectedSkillCapability.capability,
    selectedSkillCapability.skill,
    { resumeContent: JSON.stringify(resumeContext), variables: skillVariables }
  );
} else {
  // 默认 → 现有逻辑
  systemPrompt = buildResumeEditSystemPrompt(sections);
}
```

**改动范围**：仅在 `handleSubmit` 中增加一个条件分支，新增 SkillSelector 组件挂载点。现有逻辑作为 else 分支完整保留。

### 7.4 面试设置表单改造

在 `interview-setup-form.tsx` 中，增加"面试官 Skill"选择：

```typescript
// 现有：presetInterviewers 硬编码列表
const presetInterviewers = getPresetInterviewers(language);

// 改造后：presetInterviewers + Skill 提供的面试官人设
const skillPersonas = skillRuntime.getCapabilitiesForScenario("interview-persona");
// presetInterviewers 仍保留为默认选项，Skill 人设作为额外选项
```

选中的 Skill 人设 capability 的 prompt 会通过 `startInterviewTurnStream` 的新 `systemPrompt` 参数传入 Rust 端。

### 7.5 Skill 管理页面

路由：`/skills`，从设置页或侧边栏入口进入。

UI 布局（参照现有 settings 页面的 tab + section 模式）：

```
┌─────────────────────────────────────────────┐
│  Skill 管理                          [导入] │
├──────────┬──────────────────────────────────┤
│ 全部     │  ┌────────────────────────────┐ │
│ 简历     │  │ Interview Master    v1.0   │ │
│ 面试     │  │ 全流程面试准备系统          │ │
│ 翻译     │  │ 作者: chen3tu  来源: 社区   │ │
│ 自定义   │  │ 标签: 面试, 求职            │ │
│          │  │                            │ │
│          │  │ 能力 (6):                  │ │
│          │  │ • 岗位分析 + 公司调研       │ │
│          │  │ • 面试导向简历优化          │ │
│          │  │ • 面试官人设               │ │
│          │  │ • 问题准备                 │ │
│          │  │ • 面试复盘                 │ │
│          │  │ • 薪资谈判                 │ │
│          │  │                            │ │
│          │  │ [编辑] [删除] [导出]        │ │
│          │  └────────────────────────────┘ │
│          │  ┌────────────────────────────┐ │
│          │  │ 程序员鱼皮          v1.0   │ │
│          │  │ ...                        │ │
│          │  └────────────────────────────┘ │
└──────────┴──────────────────────────────────┘
```

功能：浏览已安装 Skill、查看详情、编辑自定义 Skill、删除、导入新 Skill、导出 Skill。

---

## 八、Skill 包格式与导入导出

### 8.1 标准包格式

Skill 包是一个 `.skill` 扩展名的 zip 文件，内部结构遵循 Cowork Skill 标准：

```
my-skill.skill (zip)
├── SKILL.md              # 必需，YAML frontmatter + Markdown 主体
└── references/           # 可选，参考文档目录
    ├── guide-a.md
    ├── guide-b.md
    └── role-specific.md
```

`SKILL.md` 的 frontmatter 格式：

```yaml
---
name: interview-master          # Skill ID，kebab-case，必填
description: 全流程面试准备...   # 简短描述，必填
---

# 主体内容...
```

### 8.2 支持的导入格式

| 格式 | 扩展名 | 来源 | 导入逻辑 |
|------|--------|------|---------|
| **Skill 包（主要）** | `.skill` / `.zip` | Cowork 生态标准格式 | Rust 端解压 → 解析 SKILL.md + references/ |
| Markdown 文件 | `.md` | 简单单文件 Skill | 直接解析 frontmatter + body，无 references |
| 目录（调试用） | — | 本地开发 | 遍历目录读取 SKILL.md + references/ |

### 8.3 导入流程（Rust 端，见 6.2 节详细代码）

```
1. 判断输入类型：.skill/.zip → 解压；.md → 直接读取；目录 → 遍历
2. 从 zip 中提取 SKILL.md（支持根目录或一级子目录）
3. 从 zip 中提取 references/ 目录下所有 .md 文件
4. 解析 SKILL.md 的 YAML frontmatter（name, description）
5. SKILL.md body 作为主 capability 的 prompt
6. 自动推断 capabilities 拆分：
   - 检测 "## 阶段X" / "## Stage X" / "## Step X" / "## Phase X" 等标题
   - 有明确阶段划分 → 拆分为多个 capability
   - 无明确划分 → 整体作为一个 capability
7. 自动推断 matchOn：
   - 从 description 提取关键词（"面试" → interview 场景，"简历" → ai-chat 场景等）
   - 从 body 中的触发条件描述提取场景和关键词
8. references 自动关联为无条件的 SkillReference（导入后用户可手动编辑加载条件）
9. 返回完整的 Skill 对象，前端展示导入预览
10. 用户确认后保存到 SQLite
```

### 8.4 导出流程

将已安装的 Skill 导出为标准 `.skill` zip 包：

```
1. 从 SQLite 加载 Skill 完整数据
2. 重建 SKILL.md（frontmatter + 主 capability 的 prompt）
3. 将 references 写入 references/ 目录
4. 用 zip 压缩为 .skill 文件
5. 用户选择保存路径
```

### 8.5 前端导入交互

用户在 Skill 管理页面点击"导入"按钮后：

```typescript
import { open } from '@tauri-apps/plugin-dialog';

// 1. 文件选择对话框
const selected = await open({
  filters: [
    { name: 'Skill Package', extensions: ['skill', 'zip'] },
    { name: 'Markdown', extensions: ['md'] },
  ],
  multiple: false,
});

if (selected) {
  // 2. 调用后端解析（不解压到磁盘，直接在内存中解析）
  const skill = await importSkillPackage(selected as string);

  // 3. 导入预览弹窗
  //    展示：Skill 名称、描述、解析出的 capabilities 列表、推断的 matchOn、references 列表
  //    用户可在此修正 matchOn 和 references 的加载条件
  const confirmed = await showImportPreview(skill);

  // 4. 确认后保存
  if (confirmed) {
    await saveSkill(skill);
  }
}
```

### 8.6 导入预览界面

```
┌──────────────────────────────────────────────────┐
│  导入预览: interview-master.skill                │
├──────────────────────────────────────────────────┤
│                                                  │
│  名称: Interview Master                          │
│  描述: 全流程面试准备与求职决策系统              │
│  来源: 社区 (从 .skill 包导入)                   │
│                                                  │
│  解析出的能力 (6):                               │
│  ┌────────────────────────────────────────────┐  │
│  │ #1  阶段一：岗位分析 + 公司调研            │  │
│  │     匹配场景: jd-analysis ✓                │  │
│  │     关键词: 面试准备, 岗位分析, 公司调研   │  │
│  │     [编辑匹配条件]                         │  │
│  ├────────────────────────────────────────────┤  │
│  │ #2  阶段二：简历优化                       │  │
│  │     匹配场景: ai-chat ✓                    │  │
│  │     关键词: 简历优化, 简历改写             │  │
│  │     [编辑匹配条件]                         │  │
│  ├────────────────────────────────────────────┤  │
│  │ ...                                        │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  参考文档 (15):                                  │
│  • company_research_guide.md                    │
│  • competency_answer_template.md                │
│  • role_product_operations.md                   │
│  • ...                                          │
│                                                  │
│  ⚠️ 导入后可在管理页面编辑各能力的匹配条件       │
│                                                  │
│              [取消]  [确认导入]                   │
└──────────────────────────────────────────────────┘
```

### 8.7 分享 Skill

用户可以导出自己的 Skill 为 `.skill` 包，分享给其他用户。其他用户导入后即可使用，无需手动配置。这是 Skill 生态传播的基础。

---

## 九、内置 Skill

首次启动时自动注册以下内置 Skill（source: "builtin"）：

| Skill ID | 名称 | 能力 | 对应现有功能 |
|----------|------|------|------------|
| `builtin-resume-assistant` | 简历助手（默认） | 1 个能力：resume-edit | 现有 ai-chat-panel 的默认行为 |
| `builtin-cover-letter` | 求职信生成 | 1 个能力：generate | 现有 cover-letter-dialog 的默认行为 |
| `builtin-grammar-check` | 语法检查 | 1 个能力：check | 现有 grammar-check-dialog 的默认行为 |
| `builtin-jd-analysis` | JD 分析 | 1 个能力：analyze | 现有 jd-analysis-dialog 的默认行为 |
| `builtin-translate` | 简历翻译 | 1 个能力：translate | 现有 translate-dialog 的默认行为 |
| `builtin-interview-personas` | 面试官人设（默认） | 多个能力：hr, technical, behavioral | 现有 getPresetInterviewers 的内容 |

**作用**：让现有功能以 Skill 形式可见、可管理、可禁用。用户禁用某个内置 Skill 后，对应场景回退到硬编码默认 prompt。

---

## 十、实施阶段

### Phase 1：核心基础设施（2-3 天）

**目标**：建立 Skill 数据模型、存储、运行时引擎，不改动任何现有 UI。

**任务清单**：

- [ ] 1.1 定义 TypeScript 类型（`types/skill.ts`）
  - Skill, SkillCapability, SkillReference, SkillVariable, ContextRequirement
  - AIScenario, AvailableCapability
- [ ] 1.2 创建 SQLite 表结构（`storage.rs` 的 `bootstrap_schema` 中新增 skills + skill_settings 表）
- [ ] 1.3 新建 `skills.rs` 模块
  - Skill CRUD（list / get / save / delete）
  - SkillSettings 读写
  - 首次启动注册内置 Skill
- [ ] 1.4 在 `lib.rs` 注册新 Tauri 命令
- [ ] 1.5 前端 `skill-api.ts`（Tauri invoke 封装）
- [ ] 1.6 前端 `skill-runtime.ts`（匹配引擎核心逻辑）
  - getCapabilitiesForScenario
  - getCapability
  - findMatchingCapability
  - buildSystemPrompt（含变量插值 + references 条件加载）
- [ ] 1.7 前端 `skill-store.ts`（Zustand store）
  - 加载/缓存已安装 Skill 列表
  - 当前各场景选中的 Skill capability
  - Skill 变量值

**交付物**：后端可存取 Skill 数据，前端可调用 SkillRuntime 做匹配和 prompt 构建。无 UI 变化，无功能变化。

**验证**：单元测试 SkillRuntime 的匹配逻辑和 prompt 构建。

---

### Phase 2：AI Chat 场景接入（1-2 天）

**目标**：在 AI Chat 面板接入 Skill 选择器，这是最简单的场景（systemPrompt 已从前端传入）。

**任务清单**：

- [ ] 2.1 实现 `SkillSelector` 组件（通用选择器，下拉菜单形态）
- [ ] 2.2 实现 `SkillVariableForm` 组件（变量配置表单，select/textarea）
- [ ] 2.3 改造 `ai-chat-panel.tsx`
  - 在输入区工具栏增加 SkillSelector 挂载点
  - 改造 `handleSubmit`：选了 Skill 用 SkillRuntime 构建 prompt，否则走现有逻辑
  - 选了 Skill 时，变量值通过 SkillVariableForm 收集
- [ ] 2.4 注册 `ai-chat` 场景到场景注册表
- [ ] 2.5 创建内置 Skill：`builtin-resume-assistant`（将现有 `buildResumeEditSystemPrompt` 内容包装为 Skill）

**交付物**：AI Chat 面板出现 Skill 选择器。不选时行为不变；选了 Skill 能力时使用对应 prompt。

**验证**：手动测试 — 不选 Skill 时简历编辑功能正常；选了一个 Skill 后 prompt 正确切换；切换回来恢复正常。

---

### Phase 3：面试场景接入（2-3 天）

**目标**：改造模拟面试，支持 Skill 提供的面试官人设。这是价值最高的场景。

**任务清单**：

- [ ] 3.1 Rust 端：`StartInterviewTurnStreamInput` 新增 `system_prompt` 字段
- [ ] 3.2 Rust 端：`run_interview_turn_stream` 优先使用传入的 system_prompt，否则走现有 `build_interview_system_prompt`
- [ ] 3.3 前端：`StartInterviewTurnStreamInput` 类型新增 `systemPrompt` 字段
- [ ] 3.4 改造 `interview-setup-form.tsx`
  - 在现有 presetInterviewers 基础上，增加 Skill 提供的面试官人设选项
  - 选中 Skill 人设时，记录 skillId + capabilityId
- [ ] 3.5 改造 `interview-room.tsx` 的 `runTurn`
  - 如果 session 中记录了 Skill 人设，用 SkillRuntime 构建 systemPrompt 并传入
  - 否则不传 systemPrompt，走 Rust 默认逻辑
- [ ] 3.6 注册 `interview-persona` 场景
- [ ] 3.7 创建内置 Skill：`builtin-interview-personas`（将现有 getPresetInterviewers 内容包装为 Skill）

**交付物**：面试设置页面可选择 Skill 提供的面试官人设。不选时行为不变。

**验证**：手动测试 — 不选 Skill 时面试模拟正常；选了 Skill 人设后面试官风格变化；答案评估和报告功能不受影响。

---

### Phase 4：Skill 管理页面（1-2 天）

**目标**：提供 Skill 的管理界面，用户可浏览、导入、删除、启用/禁用 Skill。

**任务清单**：

- [ ] 4.1 实现 `skills.tsx` 路由页面
  - 左侧分类筛选（全部/简历/面试/翻译/自定义）
  - 右侧 Skill 卡片列表（名称、描述、能力数、来源、操作按钮）
- [ ] 4.2 Skill 详情面板
  - 展示能力列表、变量定义、references
  - 编辑自定义 Skill 的 prompt 和变量
- [ ] 4.3 Skill 导入功能
  - 文件选择器 → 支持 `.skill` / `.zip` / `.md` 格式
  - 调用 `import_skill_package`（Rust 端解压解析）
  - 导入预览弹窗（展示解析出的 capabilities、推断的 matchOn、references 列表）
  - 用户可在预览中修正匹配条件后确认导入
- [ ] 4.4 Skill 启用/禁用开关
- [ ] 4.5 Skill 导出功能（导出为 `.skill` zip 包，含 SKILL.md + references/）
- [ ] 4.6 在设置页或侧边栏添加入口

**交付物**：用户可通过 UI 管理所有 Skill。

**验证**：导入 interview-master-skill 和 yupi-skill，确认解析正确、能力展示正确。

---

### Phase 5：其他场景接入（2-3 天）

**目标**：将剩余 AI 场景（Grammar Check、Cover Letter、JD Analysis、Translate）接入 Skill 系统。

**任务清单**：

- [ ] 5.1 注册场景：`grammar-check`, `cover-letter`, `jd-analysis`, `translate`, `generate-resume`
- [ ] 5.2 在各 dialog 中增加 SkillSelector（可选，部分 dialog 可能不适合放选择器）
- [ ] 5.3 创建对应内置 Skill（将现有 prompt 包装为 Skill）
- [ ] 5.4 面试答案评估和报告场景接入（`interview-evaluation`, `interview-report`）
  - 这两个是 Rust 端构建 prompt 的非流式调用
  - 改造方式：在 input 中新增可选 system_prompt 字段，优先使用

**交付物**：所有 AI 场景都支持 Skill 切换。

**验证**：每个场景手动测试默认行为和 Skill 切换行为。

---

### Phase 6：导入器完善与内置 Skill 丰富（2-3 天）

**目标**：完善 Skill 包导入器的自动推断逻辑，预置 interview-master-skill 和 yupi-skill 作为推荐安装。

**任务清单**：

- [ ] 6.1 完善 Rust 端 `skills.rs` 的导入解析逻辑
  - `.skill` zip 包导入的边界情况处理（空 zip、无 SKILL.md、嵌套目录等）
  - capabilities 阶段自动拆分逻辑（检测 "## 阶段X" / "## Stage X" / "## Step X" / "## Phase X"）
  - matchOn 自动推断逻辑（从 description 和 body 关键词推断场景匹配）
  - references 条件加载的自动推断（根据 references 文件名和内容推断 whenScenario）
- [ ] 6.2 内置推荐 Skill
  - 将 interview-master-skill 打包为 `.skill` 文件，内置到应用资源中
  - 将 yupi-skill 打包为 `.skill` 文件，内置到应用资源中
  - Skill 管理页面增加"推荐 Skill"区域，提供"一键安装"
- [ ] 6.3 导入预览界面的匹配条件编辑
  - 用户可在预览中手动修正每个 capability 的 matchOn（场景、关键词、分类）
  - 用户可编辑 references 的加载条件（whenScenario、whenVariable）
- [ ] 6.4 导出功能完善
  - 确保导出的 `.skill` 包可被重新导入（round-trip 一致性）
  - 导出时重建标准 SKILL.md frontmatter

**交付物**：用户可一键安装社区 Skill。

**验证**：导入 interview-master-skill，确认 6 个阶段正确拆分为 6 个 capability，场景匹配正确。

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| Skill prompt 过长导致 token 超限 | AI 调用失败或截断 | references 条件加载 + prompt 长度检查 + 超限时提示用户 |
| 社区 Skill 质量参差 | 用户体验差 | 内置 Skill 审核机制 + 用户评分（后续）+ 清晰的来源标识 |
| Skill 与场景不匹配 | 输出不符合预期 | matchOn 机制 + 用户手动选择优先 + 自动匹配仅作提示 |
| 面试状态机被 Skill prompt 破坏 | 面试流程异常 | 面试 Skill 的 prompt 中保留状态机关键指令（如 `[ROUND_COMPLETE]` 标记） |
| 向后兼容性 | 升级后旧数据丢失 | 内置 Skill 首次启动自动注册 + 不传 system_prompt 时走默认逻辑 |
| Skill 变量插值安全 | prompt 注入 | 只做字符串替换，不执行代码；对变量值做长度限制 |

---

## 十二、技术决策记录

### 决策 1：Skill 内容以 JSON 存储，非关系型拆分

**选择**：capabilities、references、variables 等以 JSON 字段存储在 skills 表中。

**原因**：Skill 的结构是树形的，关系型拆分会增加 5-6 张表和复杂的 JOIN，而 Skill 数量不会很大（几十个量级），JSON 完全够用。查询场景主要是"列出所有 Skill"和"按 ID 取详情"，不需要按 capability 或 reference 做关系查询。

### 决策 2：面试场景通过新增 system_prompt 字段接入，而非完全前端化

**选择**：Rust 端保留 `build_interview_system_prompt` 作为默认逻辑，新增可选的 `system_prompt` 输入字段。

**原因**：面试是复杂状态机（多轮、上下文管理、答案评估副作用），完全前端化风险太大。新增字段的方式改动最小，且完全向后兼容。

### 决策 3：内置 Skill 包装现有 prompt，而非重写

**选择**：将现有的 `buildResumeEditSystemPrompt`、`getPresetInterviewers` 等内容原样包装为内置 Skill。

**原因**：确保向后兼容 — 内置 Skill 的 prompt 内容与现有硬编码 prompt 完全一致，用户禁用内置 Skill 后回退到硬编码逻辑，体验不变。

### 决策 4：Skill 导入器自动推断，不要求 Skill 作者手动声明 matchOn

**选择**：导入器从 SKILL.md 的 frontmatter 和 body 自动推断 capabilities 拆分和 matchOn。

**原因**：社区 Skill 不是为 JobPilot 写的，不能要求作者了解 matchOn 格式。自动推断 + 用户手动修正的组合更实际。

### 决策 5：Skill 包采用标准 zip 格式，Rust 端解析

**选择**：Skill 包是 `.skill` 扩展名的 zip 文件（内含 SKILL.md + references/），由 Rust 端解压解析。

**原因**：(1) 与 Cowork Skill 生态标准格式一致，社区已有的 Skill 包可直接导入；(2) Rust 端处理 zip 比前端更可靠，避免 JS 大文件解压性能问题；(3) 导出时也由 Rust 端压缩，保证跨平台一致性。新增 `zip` crate 依赖。

### 决策 6：导入解析在 Rust 端完成，前端只做预览和保存

**选择**：`.skill` zip 包的解压、frontmatter 解析、capabilities 推断全部在 Rust 端完成，前端只接收解析好的 Skill 对象做预览。

**原因**：Rust 端已有 `zip` crate 和文件系统访问能力，解析逻辑集中在一处便于维护。前端不需要引入额外的 zip 解析库。

---

## 十三、文件变更清单（总览）

### 新增文件

| 文件 | 说明 |
|------|------|
| `desktop/src/types/skill.ts` | Skill TypeScript 类型定义 |
| `desktop/src/lib/skill-api.ts` | Tauri invoke 封装 |
| `desktop/src/lib/skill-runtime.ts` | 匹配引擎 |
| `desktop/src/lib/skill-importer.ts` | 前端导入预览辅助逻辑（匹配条件编辑、预览数据准备） |
| `desktop/src/lib/skill-scenarios.ts` | 场景注册表 |
| `desktop/src/stores/skill-store.ts` | Zustand store |
| `desktop/src/components/skill/skill-selector.tsx` | Skill 选择器组件 |
| `desktop/src/components/skill/skill-variable-form.tsx` | 变量配置表单 |
| `desktop/src/components/skill/skill-capability-badge.tsx` | 能力标签 |
| `desktop/src/routes/skills.tsx` | Skill 管理页面 |
| `desktop/src-tauri/src/skills.rs` | Rust 后端 Skill 模块 |

### 修改文件

| 文件 | 改动说明 |
|------|---------|
| `desktop/src-tauri/Cargo.toml` | 新增 `zip` crate 依赖（Skill 包解压/压缩） |
| `desktop/src-tauri/src/storage.rs` | `bootstrap_schema` 中新增 skills + skill_settings 表 |
| `desktop/src-tauri/src/lib.rs` | 注册 skills 相关 Tauri 命令 |
| `desktop/src-tauri/src/ai.rs` | `StartInterviewTurnStreamInput` 新增 system_prompt 字段 |
| `desktop/src/lib/desktop-api.ts` | 新增 skill 相关 invoke 函数 + interview input 新增 systemPrompt |
| `desktop/src/components/ai/ai-chat-panel.tsx` | 增加 SkillSelector + handleSubmit 条件分支 |
| `desktop/src/components/interview/interview-setup-form.tsx` | 增加 Skill 人设选项 |
| `desktop/src/components/interview/interview-room.tsx` | runTurn 支持传入 systemPrompt |
| `desktop/src/routes/router.tsx`（或等效路由文件） | 新增 /skills 路由 |
| `desktop/src/components/editor/settings-dialog.tsx` | 设置页增加 Skill 管理入口 |
| `messages/en.json` | Skill 相关 i18n 文案 |
| `messages/zh.json` | Skill 相关 i18n 文案 |

---

## 十四、验收标准

### 整体验收

1. 不安装任何 Skill 时，所有现有功能行为与改造前完全一致
2. 安装 interview-master-skill 后，AI Chat 面板可选择其能力，prompt 正确切换
3. 安装 yupi-skill 后，AI Chat 面板可选择"鱼皮风格"，回答风格正确变化
4. 面试模拟可选择 Skill 提供的面试官人设，面试流程正常完成
5. Skill 管理页面可浏览、导入、删除、启用/禁用 Skill
6. 内置 Skill 可见、可禁用，禁用后对应场景回退默认行为

### 各 Phase 验收

- **Phase 1**：`skillRuntime.buildSystemPrompt()` 单元测试通过；Skill 数据可正确存取
- **Phase 2**：AI Chat 选 Skill 后 prompt 正确切换；不选时行为不变
- **Phase 3**：面试选 Skill 人设后面试官风格变化；不选时行为不变
- **Phase 4**：导入 interview-master-skill 和 yupi-skill 成功，能力展示正确
- **Phase 5**：所有场景 Skill 切换正常
- **Phase 6**：一键安装推荐 Skill 成功，自动推断的 matchOn 合理
