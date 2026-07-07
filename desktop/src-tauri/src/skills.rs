//! JobPilot Skill system backend.
//!
//! This module exposes Tauri commands for managing Skill entities and SkillSettings
//! persisted in SQLite. Skill content (capabilities, references, variables, etc.) is
//! stored as JSON fields to keep CRUD simple — the number of Skills is expected to
//! stay in the dozens.
//!
//! PR1 scope: data model + storage + CRUD only.
//! - `import_skill_package` / `export_skill_package` are intentionally not implemented
//!   here (Phase 4 scope, needs the `zip` crate). They are left as TODO markers.
//! - Built-in Skill registration on first launch is implemented in
//!   `bootstrap_builtin_skills` (Phase 2; `builtin-interview-personas` arrives in Phase 3).

use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;

use crate::storage::open_initialized_connection;

// =====================================================
// Skill data models (mirror SQLite columns, JSON fields
// are passed through as serde_json::Value so the front
// end can parse them into typed TS interfaces).
// =====================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default = "default_source")]
    pub source: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub tags: Value,
    #[serde(default)]
    pub capabilities: Value,
    #[serde(default)]
    pub references: Value,
    #[serde(default)]
    pub required_context: Value,
    #[serde(default)]
    pub variables: Value,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

fn default_source() -> String {
    "custom".to_string()
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSettings {
    pub default_selections: Value,
    pub variable_values: Value,
    pub updated_at_epoch_ms: i64,
}

impl Default for SkillSettings {
    fn default() -> Self {
        Self {
            default_selections: Value::Object(Default::default()),
            variable_values: Value::Object(Default::default()),
            updated_at_epoch_ms: 0,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDefaultSkillSelectionInput {
    pub scenario_id: String,
    pub selection: Option<String>,
}

// =====================================================
// Tauri commands
// =====================================================

/// List all stored Skills ordered by `created_at_epoch_ms` ascending.
pub fn list_skills(app: AppHandle) -> Result<Vec<Skill>, String> {
    let connection = open_initialized_connection(&app)?;
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              name,
              description,
              version,
              author,
              source,
              icon,
              tags_json,
              capabilities_json,
              references_json,
              required_context_json,
              variables_json,
              enabled,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM skills
            ORDER BY created_at_epoch_ms ASC, id ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare skill list query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(Skill {
                id: row.get::<_, String>(0)?,
                name: row.get::<_, String>(1)?,
                description: row.get::<_, String>(2)?,
                version: row.get::<_, String>(3)?,
                author: row.get::<_, Option<String>>(4)?,
                source: row.get::<_, String>(5)?,
                icon: row.get::<_, Option<String>>(6)?,
                tags: parse_json_value(&row.get::<_, String>(7)?, "[]"),
                capabilities: parse_json_value(&row.get::<_, String>(8)?, "[]"),
                references: parse_json_value(&row.get::<_, String>(9)?, "[]"),
                required_context: parse_json_value(&row.get::<_, String>(10)?, "[]"),
                variables: parse_json_value(&row.get::<_, String>(11)?, "[]"),
                enabled: row.get::<_, i64>(12)? != 0,
                created_at_epoch_ms: row.get::<_, i64>(13)?,
                updated_at_epoch_ms: row.get::<_, i64>(14)?,
            })
        })
        .map_err(|error| format!("failed to query skills: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map skill row: {error}"))
}

/// Fetch a single Skill by id.
pub fn get_skill(app: AppHandle, skill_id: String) -> Result<Option<Skill>, String> {
    let skill_id = skill_id.trim().to_string();
    if skill_id.is_empty() {
        return Err("skillId is required".into());
    }

    let connection = open_initialized_connection(&app)?;
    let skill = connection
        .query_row(
            r#"
            SELECT
              id,
              name,
              description,
              version,
              author,
              source,
              icon,
              tags_json,
              capabilities_json,
              references_json,
              required_context_json,
              variables_json,
              enabled,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM skills
            WHERE id = ?1
            "#,
            params![&skill_id],
            |row| {
                Ok(Skill {
                    id: row.get::<_, String>(0)?,
                    name: row.get::<_, String>(1)?,
                    description: row.get::<_, String>(2)?,
                    version: row.get::<_, String>(3)?,
                    author: row.get::<_, Option<String>>(4)?,
                    source: row.get::<_, String>(5)?,
                    icon: row.get::<_, Option<String>>(6)?,
                    tags: parse_json_value(&row.get::<_, String>(7)?, "[]"),
                    capabilities: parse_json_value(&row.get::<_, String>(8)?, "[]"),
                    references: parse_json_value(&row.get::<_, String>(9)?, "[]"),
                    required_context: parse_json_value(&row.get::<_, String>(10)?, "[]"),
                    variables: parse_json_value(&row.get::<_, String>(11)?, "[]"),
                    enabled: row.get::<_, i64>(12)? != 0,
                    created_at_epoch_ms: row.get::<_, i64>(13)?,
                    updated_at_epoch_ms: row.get::<_, i64>(14)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query skill {skill_id}: {error}"))?;

    Ok(skill)
}

/// Upsert a Skill (INSERT OR REPLACE by id). `createdAt` is preserved on update
/// via COALESCE; `updatedAt` is always refreshed.
pub fn save_skill(app: AppHandle, skill: Skill) -> Result<Skill, String> {
    let skill_id = skill.id.trim().to_string();
    if skill_id.is_empty() {
        return Err("skill.id is required".into());
    }
    let name = skill.name.trim().to_string();
    if name.is_empty() {
        return Err("skill.name is required".into());
    }

    let connection = open_initialized_connection(&app)?;
    let now = now_epoch_ms()? as i64;

    let tags_json = serde_json::to_string(&skill.tags)
        .map_err(|error| format!("failed to serialize skill tags: {error}"))?;
    let capabilities_json = serde_json::to_string(&skill.capabilities)
        .map_err(|error| format!("failed to serialize skill capabilities: {error}"))?;
    let references_json = serde_json::to_string(&skill.references)
        .map_err(|error| format!("failed to serialize skill references: {error}"))?;
    let required_context_json = serde_json::to_string(&skill.required_context)
        .map_err(|error| format!("failed to serialize skill requiredContext: {error}"))?;
    let variables_json = serde_json::to_string(&skill.variables)
        .map_err(|error| format!("failed to serialize skill variables: {error}"))?;

    connection
        .execute(
            r#"
            INSERT INTO skills (
              id,
              name,
              description,
              version,
              author,
              source,
              icon,
              tags_json,
              capabilities_json,
              references_json,
              required_context_json,
              variables_json,
              enabled,
              created_at_epoch_ms,
              updated_at_epoch_ms
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              version = excluded.version,
              author = excluded.author,
              source = excluded.source,
              icon = excluded.icon,
              tags_json = excluded.tags_json,
              capabilities_json = excluded.capabilities_json,
              references_json = excluded.references_json,
              required_context_json = excluded.required_context_json,
              variables_json = excluded.variables_json,
              enabled = excluded.enabled,
              created_at_epoch_ms = skills.created_at_epoch_ms,
              updated_at_epoch_ms = excluded.updated_at_epoch_ms
            "#,
            params![
                &skill_id,
                &name,
                skill.description,
                skill.version,
                skill.author,
                skill.source,
                skill.icon,
                tags_json,
                capabilities_json,
                references_json,
                required_context_json,
                variables_json,
                skill.enabled as i64,
                now,
                now,
            ],
        )
        .map_err(|error| format!("failed to save skill {skill_id}: {error}"))?;

    get_skill(app, skill_id.clone())?
        .ok_or_else(|| format!("skill not found after save: {skill_id}"))
}

/// Delete a Skill by id. Returns true when a row was removed.
pub fn delete_skill(app: AppHandle, skill_id: String) -> Result<bool, String> {
    let skill_id = skill_id.trim().to_string();
    if skill_id.is_empty() {
        return Err("skillId is required".into());
    }

    let connection = open_initialized_connection(&app)?;
    let rows_affected = connection
        .execute("DELETE FROM skills WHERE id = ?1", params![&skill_id])
        .map_err(|error| format!("failed to delete skill {skill_id}: {error}"))?;

    Ok(rows_affected > 0)
}

/// Read the singleton SkillSettings row (id=1). Returns defaults if the row
/// is missing or the table is empty, so callers always get a usable object.
pub fn get_skill_settings(app: AppHandle) -> Result<SkillSettings, String> {
    let connection = open_initialized_connection(&app)?;
    let raw = connection
        .query_row(
            r#"
            SELECT default_selections_json, variable_values_json, updated_at_epoch_ms
            FROM skill_settings
            WHERE id = 1
            "#,
            [],
            |row| {
                Ok(SkillSettings {
                    default_selections: parse_json_value(&row.get::<_, String>(0)?, "{}"),
                    variable_values: parse_json_value(&row.get::<_, String>(1)?, "{}"),
                    updated_at_epoch_ms: row.get::<_, i64>(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query skill settings: {error}"))?;

    Ok(raw.unwrap_or_default())
}

/// Update the default Skill selection for a scenario. Passing `None` (or an
/// empty string) clears the selection for that scenario.
pub fn set_default_skill_selection(
    app: AppHandle,
    input: SetDefaultSkillSelectionInput,
) -> Result<SkillSettings, String> {
    let scenario_id = input.scenario_id.trim().to_string();
    if scenario_id.is_empty() {
        return Err("scenarioId is required".into());
    }

    let connection = open_initialized_connection(&app)?;
    let now = now_epoch_ms()? as i64;

    // Ensure the singleton settings row exists so the UPDATE below has a target.
    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO skill_settings (id, default_selections_json, variable_values_json, updated_at_epoch_ms)
            VALUES (1, '{}', '{}', ?1)
            "#,
            params![now],
        )
        .map_err(|error| format!("failed to seed skill settings row: {error}"))?;

    let existing = connection
        .query_row(
            "SELECT default_selections_json FROM skill_settings WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load skill settings before update: {error}"))?
        .unwrap_or_else(|| "{}".to_string());

    let mut selections: Value = serde_json::from_str(&existing)
        .map_err(|error| format!("failed to parse skill default selections JSON: {error}"))?;
    let selections_map = match &mut selections {
        Value::Object(map) => map,
        _ => {
            return Err(
                "skill default selections JSON is not an object; refusing to mutate".into(),
            );
        }
    };

    match input.selection.as_deref().map(str::trim) {
        Some(value) if !value.is_empty() => {
            selections_map.insert(scenario_id, Value::String(value.to_string()));
        }
        _ => {
            selections_map.remove(&scenario_id);
        }
    }

    let serialized = serde_json::to_string(&selections)
        .map_err(|error| format!("failed to serialize updated skill selections: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE skill_settings
            SET default_selections_json = ?1, updated_at_epoch_ms = ?2
            WHERE id = 1
            "#,
            params![serialized, now],
        )
        .map_err(|error| format!("failed to update skill default selection: {error}"))?;

    get_skill_settings(app)
}

// =====================================================
// TODO (Phase 4): Skill package import / export
// =====================================================
//
// #[tauri::command]
// pub fn import_skill_package(app: AppHandle, file_path: String) -> Result<Skill, String>;
//
// #[tauri::command]
// pub fn export_skill_package(app: AppHandle, skill_id: String, output_path: String) -> Result<(), String>;
//
// These require the `zip` crate and the frontmatter / capability-splitting
// parser described in docs/skill-system-implementation-plan.md §6.2. They are
// intentionally out of PR1 scope.

// =====================================================
// Built-in Skill registration on first launch (Phase 2)
// =====================================================
//
// On bootstrap, check if `builtin-resume-assistant` is already present at the
// current version; if not, insert it. The capability prompt mirrors the
// hardcoded `buildResumeEditSystemPrompt` from ai-chat-panel.tsx so that
// selecting this built-in Skill produces a system prompt equivalent to the
// default behavior — keeping the "wrap existing prompt, fall back on disable"
// contract from the PRD ADR. The dynamic `sectionList` line is replaced with a
// pointer to the resume context that SkillRuntime appends at prompt-build time.

const BUILTIN_RESUME_ASSISTANT_VERSION: &str = "1.0.0";
const BUILTIN_INTERVIEW_PERSONAS_VERSION: &str = "1.0.0";

pub fn bootstrap_builtin_skills(app: &AppHandle) -> Result<(), String> {
    let resume_version = read_skill_version(app, "builtin-resume-assistant")?;
    if resume_version.as_deref() != Some(BUILTIN_RESUME_ASSISTANT_VERSION) {
        let capability = serde_json::json!([{
            "id": "resume-edit",
            "name": "Resume Edit",
            "description": "Conversational resume editing with tool-assisted text patches.",
            "matchOn": {
                "scenarios": ["ai-chat"],
                "categories": ["resume"]
            },
            "prompt": BUILTIN_RESUME_ASSISTANT_PROMPT,
            "outputFormat": "stream",
            "requiresTools": ["replaceResumeText", "updateResumeMetadata"]
        }]);

        let skill = Skill {
            id: "builtin-resume-assistant".into(),
            name: "Resume Assistant".into(),
            description: "JobPilot built-in resume editing assistant.".into(),
            version: BUILTIN_RESUME_ASSISTANT_VERSION.into(),
            author: Some("JobPilot".into()),
            source: "builtin".into(),
            icon: Some("sparkles".into()),
            tags: serde_json::json!(["resume", "builtin"]),
            capabilities: capability,
            references: serde_json::json!([]),
            required_context: serde_json::json!([
                {"type": "resume", "required": true, "description": "Current resume sections"}
            ]),
            variables: serde_json::json!([]),
            enabled: true,
            created_at_epoch_ms: now_epoch_ms()? as i64,
            updated_at_epoch_ms: now_epoch_ms()? as i64,
        };
        save_skill(app.clone(), skill)?;
    }

    let interview_version = read_skill_version(app, "builtin-interview-personas")?;
    if interview_version.as_deref() != Some(BUILTIN_INTERVIEW_PERSONAS_VERSION) {
        save_skill(app.clone(), build_builtin_interview_personas_skill()?)?;
    }

    Ok(())
}

/// Build the `builtin-interview-personas` Skill: six capabilities, one per
/// preset interviewer (hr/technical/scenario/behavioral/project_deep_dive/leader).
/// Each capability prompt inlines that interviewer's bio/personality/style and
/// the shared interview conduct guidelines (including the `[ROUND_COMPLETE]`
/// state-machine marker that `run_interview_turn_stream` depends on). The JD
/// context is appended at prompt-build time by `SkillRuntime`, mirroring the
/// structure of `build_interview_system_prompt` so selecting a built-in
/// persona produces an equivalent system prompt.
fn build_builtin_interview_personas_skill() -> Result<Skill, String> {
    const CONDUCT_GUIDELINES: &str = "\
# 面试执行规范

- 每次只提出一个问题，等待候选人完整作答后再回应。
- 先对候选人的回答做出简短反应，再继续追问或切换到下一个问题。
- 说话像一个真实、资深的面试官，不要像 AI 助手。
- 当问题差不多结束时，给出一段简短、真实的本轮评价，并在最后单独一行写 [ROUND_COMPLETE]。
- 不使用 emoji，不使用模板化寒暄，不质疑候选人提到的新技术是否存在。

用中文交流。";

    const INTERVIEWERS: &[(&str, &str, &str, &str, &str, &str, &str)] = &[
        (
            "hr",
            "HR总监·李雯",
            "李雯",
            "HR总监",
            "10年人力资源管理经验，先后在互联网大厂和独角兽公司负责技术团队招聘。精通结构化面试和胜任力模型评估，对候选人的职业动机、文化适配度和长期发展潜力有敏锐的判断力。面过的候选人超过两千人，善于在轻松的氛围中捕捉关键信息。",
            "以开放式问题切入，通过层层递进的追问了解候选人的真实动机和价值取向。善于从候选人描述的细节中发现不一致之处，会温和但精准地追问。不喜欢假大空的回答，更看重真诚和自我认知。",
            "亲切专业，善于倾听和共情，但在关键问题上不会放水。会用看似随意的闲聊来考察候选人的真实状态。",
        ),
        (
            "technical",
            "技术专家·张明",
            "张明",
            "技术专家",
            "15年软件开发经验，曾在一线互联网公司主导过千万级DAU系统的架构设计与性能优化。对技术原理有近乎偏执的追求，反感只会背概念不懂本质的候选人。自己就是从一线写代码成长起来的，所以特别能分辨谁是真正动手做过的。",
            "由浅入深的递进式提问，先从基础概念入手确认底线，再逐步深入到实现原理和边界情况。如果候选人某个点回答得好，会直接跳到更有挑战性的问题。遇到含糊的回答会直接要求举具体例子或画出流程。",
            "严谨直接，逻辑驱动。不满意的回答会继续追问直到满意或确认候选人确实不会。对真正有技术深度的候选人会表现出明显的欣赏。",
        ),
        (
            "scenario",
            "架构师·王强",
            "王强",
            "架构师",
            "12年架构设计经验，专注于高并发、分布式系统和云原生架构。经历过多次系统从0到1再到大规模扩展的全过程，踩过无数生产事故的坑。坚信好的架构是在约束条件下做出最优权衡，而不是堆砌技术方案。",
            "以真实业务场景为载体进行考察。先描述一个具体的业务需求或技术挑战，让候选人现场做方案设计。然后层层追问，流量估算、数据模型、故障容忍、扩展策略、技术选型的理由。重点考察候选人是否能在不确定条件下做出合理的工程判断。",
            "沉稳务实，注重方案的可落地性。不喜欢大而全的教科书式回答，更看重候选人能说出为什么不用其他方案以及这个方案最大的风险是什么。",
        ),
        (
            "behavioral",
            "HRBP·刘芳",
            "刘芳",
            "HRBP",
            "8年HRBP经验，服务过多个百人以上技术团队。专精行为面试法（STAR/CAR），擅长通过候选人过往的真实经历来预测未来的工作表现。接受过专业的面试官认证培训，对常见的编故事技巧有很强的识别能力。",
            "引导候选人用 STAR 法则描述过往经历。重点关注候选人在具体情境中的实际行为和决策过程，而非假设性的如果我会怎样。遇到泛泛而谈会要求给出具体的时间、人物、结果数据。如果候选人不熟悉 STAR 法则，会先做简单说明再开始。",
            "专业干练、有引导性，能让候选人放松下来讲出真实故事。但对明显编造或过度美化的回答会敏锐察觉并深入追问。",
        ),
        (
            "project_deep_dive",
            "技术Leader·陈刚",
            "陈刚",
            "技术Leader",
            "10年技术管理经验，带过从5人到50人的技术团队。自己是从一线研发成长起来的，写过上百万行代码，所以对简历上写的和实际做过的之间的差距有极强的辨别力。面试中最反感的就是把团队成果包装成个人贡献。",
            "以候选人简历上的项目经历为主线逐层剖析。你在项目中的具体角色是什么？这个技术决策是谁做的？为什么选这个方案？遇到最大的技术挑战是什么？你是怎么解决的？结果如何度量？通过这些追问判断候选人的真实参与度和技术决策能力。",
            "务实老练，追问细节不留情面。能通过三两个追问就分辨出候选人到底是核心贡献者还是边缘参与者。对真正啃过硬骨头的候选人会给予高度认可。",
        ),
        (
            "leader",
            "技术VP·赵总",
            "赵总",
            "技术VP",
            "20年技术行业经验，从工程师到CTO的完整成长路径。管理过200+人的技术团队，主导过多次技术体系重构和组织架构调整。面试高级别候选人时不再关注具体技术细节，而是考察技术视野、商业嗅觉和带团队的格局。",
            "高层视角提问。如何看待当前技术趋势对业务的影响？你带团队的核心理念是什么？遇到技术投入和业务需求冲突时怎么权衡？职业规划的下一步是什么？不追问技术细节，但会从回答中判断思考的深度和格局。",
            "高管气场，全局视野，提问精炼但每个问题背后都在考察候选人的思维层次。不喜欢长篇大论，欣赏能用简练语言说清楚复杂问题的候选人。",
        ),
    ];

    let capabilities: Vec<Value> = INTERVIEWERS
        .iter()
        .map(|(type_id, name, person_name, title, bio, style, personality)| {
            let prompt = format!(
                "# 角色设定\n\n你是{}，{}。\n\n## 个人背景\n{}\n\n## 性格特征\n{}\n\n## 提问风格\n{}\n\n---\n\n# 面试上下文\n\n## 本轮考察重点\n综合评估候选人与岗位的匹配度\n\n## 招聘岗位 JD\n见下方岗位描述。\n\n---\n{}",
                person_name, title, bio, personality, style, CONDUCT_GUIDELINES
            );
            serde_json::json!({
                "id": type_id,
                "name": name,
                "description": format!("{} 面试官人设", title),
                "matchOn": {
                    "scenarios": ["interview-persona"],
                    "categories": ["interview"],
                    "keywords": [type_id]
                },
                "prompt": prompt,
                "outputFormat": "stream",
                "requiresTools": []
            })
        })
        .collect();

    Ok(Skill {
        id: "builtin-interview-personas".into(),
        name: "Interview Personas".into(),
        description: "JobPilot built-in interviewer personas (HR / Technical / Architect / HRBP / Leader / VP).".into(),
        version: BUILTIN_INTERVIEW_PERSONAS_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("users".into()),
        tags: serde_json::json!(["interview", "builtin"]),
        capabilities: Value::Array(capabilities),
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// Read only the `version` column for a Skill, returning `None` when the row
/// is absent. Used by `bootstrap_builtin_skills` to skip re-inserting when the
/// installed built-in already matches the current version.
fn read_skill_version(app: &AppHandle, skill_id: &str) -> Result<Option<String>, String> {
    let connection = open_initialized_connection(app)?;
    let version = connection
        .query_row(
            "SELECT version FROM skills WHERE id = ?1",
            params![skill_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to read skill version for {skill_id}: {error}"))?;
    Ok(version)
}

const BUILTIN_RESUME_ASSISTANT_PROMPT: &str = "\
You are JobPilot's desktop resume assistant.
Keep answers concise, actionable, and in the user's language.
If fetched webpage content or search results are included in the prompt, use them directly, cite the URLs you relied on, and do not say you cannot access the link or browse the web.
When the user asks to update, rewrite, optimize, add, or directly modify the resume, you MUST use the available resume-editing tools instead of outputting raw resume JSON.
Never dump the full resume JSON unless the user explicitly asks for raw JSON.
For section edits, use the exact sectionId values provided in the resume context appended below.
When calling replaceResumeText, send patches with exact originalText values copied verbatim from the resume context and replacementText values. Do not send full section JSON.
After a resume-edit tool succeeds, briefly confirm what changed.
Available resume sections: see the resume context appended below.";

// =====================================================
// Internal helpers
// =====================================================

fn parse_json_value(raw: &str, fallback: &str) -> Value {
    serde_json::from_str::<Value>(raw).unwrap_or_else(|_| {
        serde_json::from_str::<Value>(fallback)
            .unwrap_or_else(|_| Value::Object(Default::default()))
    })
}

fn now_epoch_ms() -> Result<u64, String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("clock drift detected: {error}"))?;
    Ok(duration.as_millis() as u64)
}
