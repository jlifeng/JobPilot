//! JobPilot Skill system backend.
//!
//! This module exposes Tauri commands for managing Skill entities and SkillSettings
//! persisted in SQLite. Skill content (capabilities, references, variables, etc.) is
//! stored as JSON fields to keep CRUD simple — the number of Skills is expected to
//! stay in the dozens.
//!
//! PR1 scope: data model + storage + CRUD only.
//! PR4 scope: `.skill` zip 包导入（`import_skill_package` 预览 + `confirm_import_skill_package`
//! 入库），含路径遍历防护、frontmatter 解析、冲突检测。
//! - `export_skill_package` 仍为 TODO（PRD 明确列为 Out of Scope，Phase 6 再评估）。
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
// Phase 4: Skill package import (.skill zip 解包 + 预览)
// =====================================================

/// 导入预览返回结构：解析出的 Skill（不入库的预览副本）+ references 数量 + 冲突检测结果。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillPackagePreview {
    /// 解析出的完整 Skill 结构（不入库的预览副本）。
    pub skill: Skill,
    /// 包内 references/*.md 文件数。
    pub references_count: usize,
    /// 冲突检测结果（skill.id 是否已存在于库）。
    pub conflict: SkillConflict,
}

/// 冲突检测结果：skill.id 是否已存在于库，已存在时附带现有版本。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConflict {
    /// skill.id 是否已存在于库。
    pub has_conflict: bool,
    /// 已存在时的版本（不存在时为 None）。
    pub existing_version: Option<String>,
}

/// 解析 `.skill` zip 包，返回预览结构（不落库）。
///
/// 流程：打开 zip → 路径遍历防护 → 读 SKILL.md → 解析 frontmatter + body →
/// 扫描 references/*.md 读取全文构造 SkillReference → 构造 Skill（source="imported"）→
/// 冲突检测 → 返回预览。
pub fn import_skill_package(app: AppHandle, file_path: String) -> Result<SkillPackagePreview, String> {
    let file_path = file_path.trim().to_string();
    if file_path.is_empty() {
        return Err("filePath is required".into());
    }

    // 扩展名校验：接受 .skill 或 .zip（不区分大小写）。
    let path = std::path::Path::new(&file_path);
    let accepted = match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => ext.eq_ignore_ascii_case("skill") || ext.eq_ignore_ascii_case("zip"),
        None => false,
    };
    if !accepted {
        return Err(format!(
            "invalid skill package extension: {file_path} (expected .skill or .zip)"
        ));
    }

    // 打开 zip 文件。
    let file = std::fs::File::open(&file_path)
        .map_err(|error| format!("failed to open skill package {file_path}: {error}"))?;
    let reader = std::io::BufReader::new(file);
    let mut archive = zip::ZipArchive::new(reader)
        .map_err(|error| format!("failed to read skill package as zip: {error}"))?;

    // 路径遍历防护：遍历每个 entry，校验 name 不含 `..` 且不是绝对路径。
    // 任何违反 → 拒绝整个导入。
    for index in 0..archive.len() {
        let entry = archive
            .by_index(index)
            .map_err(|error| format!("failed to read zip entry {index}: {error}"))?;
        let name = entry.name().to_string();
        if !is_safe_entry_path(&name) {
            return Err(format!("skill package contains unsafe path: {name}"));
        }
    }

    // 找到 SKILL.md entry（精确匹配，只认 `SKILL.md`）。
    let skill_md_index = archive
        .file_names()
        .position(|name| name == "SKILL.md")
        .ok_or_else(|| "SKILL.md not found in package".to_string())?;

    // 读 SKILL.md 全文。
    let mut skill_md_content = String::new();
    {
        let mut entry = archive
            .by_index(skill_md_index)
            .map_err(|error| format!("failed to open SKILL.md entry: {error}"))?;
        use std::io::Read;
        entry
            .read_to_string(&mut skill_md_content)
            .map_err(|error| format!("failed to read SKILL.md content: {error}"))?;
    }

    // 解析 frontmatter + body。
    let (frontmatter, body) = parse_frontmatter(&skill_md_content)?;

    // frontmatter 字段：name（必填）、description（可选，默认空串）、
    // version（可选，默认 "1.0.0"）、author（可选）、id（可选，缺省则 slugify name 或用文件名 stem）。
    let skill_name = frontmatter
        .get("name")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "SKILL.md frontmatter missing required field: name".to_string())?;
    let skill_description = frontmatter
        .get("description")
        .map(|value| value.to_string())
        .unwrap_or_default();
    let skill_version = frontmatter
        .get("version")
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "1.0.0".to_string());
    let skill_author = frontmatter
        .get("author")
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty());
    let skill_id = frontmatter
        .get("id")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            // 缺省 id：slugify name；若 slugify 后为空，则用文件名 stem。
            let slug = slugify(&skill_name);
            if !slug.is_empty() {
                slug
            } else {
                path.file_stem()
                    .and_then(|stem| stem.to_str())
                    .map(|stem| slugify(stem))
                    .unwrap_or_else(|| "imported-skill".to_string())
            }
        });

    // 构造单个 capability：body 作为 prompt，matchOn 留空（本期不解析 frontmatter 的
    // scenarios 扩展字段，Out of Scope）。
    let capability = serde_json::json!([{
        "id": "default",
        "name": skill_name,
        "description": skill_description,
        "matchOn": {
            "scenarios": [],
            "categories": [],
            "keywords": []
        },
        "prompt": body,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    // references：扫描包内 references/*.md，读取每个文件全文构造 SkillReference。
    let references_vec = collect_reference_entries(&mut archive)?;
    let references_count = references_vec.len();

    // 构造 Skill 结构（source="imported"，enabled=true）。
    let now = now_epoch_ms()? as i64;
    let skill = Skill {
        id: skill_id,
        name: skill_name,
        description: skill_description,
        version: skill_version,
        author: skill_author,
        source: "imported".into(),
        icon: None,
        tags: serde_json::json!([]),
        capabilities: capability,
        references: Value::Array(references_vec),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now,
        updated_at_epoch_ms: now,
    };

    // 冲突检测：list_skills 查是否已有同 id，填 conflict 字段。
    let conflict = detect_skill_conflict(&app, &skill.id)?;

    Ok(SkillPackagePreview {
        skill,
        references_count,
        conflict,
    })
}

/// 扫描 zip archive 中顶层 `references/*.md` 条目，读取每个文件全文构造
/// `SkillReference` 等价的 JSON 对象（key/label/filename/content）。
///
/// 先收集匹配条目的 (index, normalized_name) 列表，避免在 archive 迭代中
/// 产生借用冲突（zip archive 的 `by_index` 借用是排他的）。只匹配顶层
/// `references/<name>.md`（单层，无嵌套），路径遍历防护已在前序代码中校验。
fn collect_reference_entries<R: std::io::Read + std::io::Seek>(
    archive: &mut zip::ZipArchive<R>,
) -> Result<Vec<Value>, String> {
    let mut references_entries: Vec<(usize, String)> = Vec::new();
    for index in 0..archive.len() {
        let entry = archive
            .by_index(index)
            .map_err(|error| format!("failed to read zip entry {index}: {error}"))?;
        let name = entry.name().to_string();
        let normalized = name.replace('\\', "/");
        if normalized.starts_with("references/")
            && normalized.ends_with(".md")
            && normalized.matches('/').count() == 1
        {
            references_entries.push((index, normalized));
        }
    }

    let mut references_vec: Vec<Value> = Vec::new();
    for (index, normalized_name) in &references_entries {
        let mut content = String::new();
        {
            let mut entry = archive
                .by_index(*index)
                .map_err(|error| format!("failed to open reference entry: {error}"))?;
            use std::io::Read;
            entry
                .read_to_string(&mut content)
                .map_err(|error| format!("failed to read reference content: {error}"))?;
        }
        // 文件名 stem：去掉目录前缀和 .md 后缀（如 "references/topic-a.md" → "topic-a"）。
        let stem = normalized_name
            .strip_prefix("references/")
            .and_then(|rest| rest.strip_suffix(".md"))
            .unwrap_or(normalized_name);
        let key = slugify(stem);
        references_vec.push(serde_json::json!({
            "key": key,
            "label": stem,
            "filename": normalized_name,
            "content": content
        }));
    }
    Ok(references_vec)
}

/// 预览确认后真正入库（upsert）。
///
/// 若 `use_new_id` 非空，覆盖 skill.id（用户选"作为新 id 导入"时前端传新 id）。
/// 调 save_skill 入库，返回入库后的 Skill。
pub fn confirm_import_skill_package(
    app: AppHandle,
    mut skill: Skill,
    use_new_id: Option<String>,
) -> Result<Skill, String> {
    if let Some(new_id) = use_new_id {
        let new_id = new_id.trim().to_string();
        if !new_id.is_empty() {
            skill.id = new_id;
        }
    }
    // 确保 source 保持 imported（防止前端误传 custom）。
    skill.source = "imported".into();
    save_skill(app, skill)
}

/// 校验 zip entry 路径安全：不含 `..` 且不是绝对路径，规范化后仍在根内。
///
/// 单测可读：`is_safe_entry_path("references/a.md")` 为 true，
/// `is_safe_entry_path("../escape.md")` 为 false。
fn is_safe_entry_path(name: &str) -> bool {
    // 绝对路径（Unix 以 / 开头，Windows 以盘符或 \ 开头）一律拒绝。
    let path = std::path::Path::new(name);
    if path.is_absolute() {
        return false;
    }
    // 任一组件为 `..` 或 `.` 之外的特殊形式一律拒绝。
    // 逐组件校验：不含 `..`。
    for component in path.components() {
        use std::path::Component;
        match component {
            Component::CurDir | Component::Normal(_) => {}
            Component::ParentDir => return false,
            Component::RootDir | Component::Prefix(_) => return false,
        }
    }
    // 额外防御：字符串层面也不允许连续的 `..` 片段（防止 Windows 风格的反斜杠绕过）。
    let normalized = name.replace('\\', "/");
    !normalized.contains("..")
}

/// 检测 skill.id 是否已存在于库，返回冲突结构。
fn detect_skill_conflict(app: &AppHandle, skill_id: &str) -> Result<SkillConflict, String> {
    let existing = get_skill(app.clone(), skill_id.to_string())?;
    Ok(match existing {
        Some(skill) => SkillConflict {
            has_conflict: true,
            existing_version: Some(skill.version),
        },
        None => SkillConflict {
            has_conflict: false,
            existing_version: None,
        },
    })
}

/// 解析 SKILL.md 的 frontmatter + body。
///
/// frontmatter 格式：`---` 包裹的头部，内部按行 `key: value`。
/// 返回 (frontmatter map, body)。
fn parse_frontmatter(content: &str) -> Result<(std::collections::HashMap<String, String>, String), String> {
    let mut map: std::collections::HashMap<String, String> = Default::default();

    // 找到首行 `---`。允许 content 以 `---\n` 或 `---`（无换行，仅 frontmatter）开头。
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return Ok((map, String::new()));
    }

    // 首行非 `---` → 无 frontmatter，body 为全文。
    if lines[0].trim() != "---" {
        return Ok((map, content.to_string()));
    }

    // 收集 `---` 之间的内容，定位闭合的 `---`。
    // 支持多行值：缩进行追加到上一个 key 的 value（YAML 续行风格）。
    let mut closed = false;
    let mut body_start_line: usize = 0;
    let mut last_key: Option<String> = None;
    for (index, line) in lines.iter().enumerate().skip(1) {
        if line.trim() == "---" {
            closed = true;
            body_start_line = index + 1;
            break;
        }
        // 缩进行（比顶层多缩进）→ 追加到上一个 key 的 value。
        if line.starts_with(' ') || line.starts_with('\t') {
            if let Some(ref key) = last_key {
                let continued = line.trim();
                if !continued.is_empty() {
                    if let Some(existing) = map.get_mut(key) {
                        existing.push('\n');
                        existing.push_str(continued);
                    }
                }
            }
            // 无 last_key 的孤立缩进行忽略。
            continue;
        }
        if let Some((key, value)) = parse_frontmatter_line(line) {
            last_key = Some(key.clone());
            map.insert(key, value);
        } else {
            // 非空非注释的非 key 行 → 重置 last_key（不再续行）。
            if !line.trim().is_empty() {
                last_key = None;
            }
        }
    }
    if !closed {
        return Err("SKILL.md frontmatter not closed: missing closing `---`".into());
    }

    // body 为闭合 `---` 行之后的所有行（用换行符重新拼接）。
    let body = lines[body_start_line..].join("\n");
    // 去掉开头可能残留的空行（保留正文内部换行结构）。
    let body = body.trim_start_matches('\n').to_string();

    Ok((map, body))
}

/// 解析 frontmatter 单行 `key: value`，返回 (key, value)。
/// value 含引号则去引号。忽略空行与注释行（# 开头）。
fn parse_frontmatter_line(line: &str) -> Option<(String, String)> {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('#') {
        return None;
    }
    let colon = trimmed.find(':')?;
    let key = trimmed[..colon].trim().to_string();
    let mut value = trimmed[colon + 1..].trim().to_string();
    // 去引号（单引号或双引号）。
    if (value.starts_with('"') && value.ends_with('"') && value.len() >= 2)
        || (value.starts_with('\'') && value.ends_with('\'') && value.len() >= 2)
    {
        value = value[1..value.len() - 1].to_string();
    }
    if key.is_empty() {
        return None;
    }
    Some((key, value))
}

/// 简易 slugify：小写、非字母数字转为 `-`、合并连续 `-`、去首尾 `-`。
fn slugify(input: &str) -> String {
    let slug: String = input
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c
            } else {
                '-'
            }
        })
        .collect();
    let mut result = String::new();
    let mut prev_dash = false;
    for c in slug.chars() {
        if c == '-' {
            if !prev_dash {
                result.push(c);
            }
            prev_dash = true;
        } else {
            result.push(c);
            prev_dash = false;
        }
    }
    result.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_safe_entry_path_accepts_normal_paths() {
        assert!(is_safe_entry_path("SKILL.md"));
        assert!(is_safe_entry_path("references/a.md"));
        assert!(is_safe_entry_path("references/sub/a.md"));
    }

    #[test]
    fn is_safe_entry_path_rejects_parent_dir() {
        assert!(!is_safe_entry_path("../escape.md"));
        assert!(!is_safe_entry_path("references/../../escape.md"));
        assert!(!is_safe_entry_path("foo/../bar.md"));
    }

    #[test]
    fn is_safe_entry_path_rejects_absolute() {
        assert!(!is_safe_entry_path("/etc/passwd"));
        assert!(!is_safe_entry_path("C:\\Windows\\system32"));
    }

    #[test]
    fn is_safe_entry_path_rejects_backslash_traversal() {
        assert!(!is_safe_entry_path("..\\escape.md"));
    }

    #[test]
    fn parse_frontmatter_extracts_fields_and_body() {
        let content = "---\nname: my-skill\ndescription: \"A skill\"\nversion: 2.0.0\n---\n# Body\n\nHello.";
        let (fm, body) = parse_frontmatter(content).unwrap();
        assert_eq!(fm.get("name").map(|s| s.as_str()), Some("my-skill"));
        assert_eq!(fm.get("description").map(|s| s.as_str()), Some("A skill"));
        assert_eq!(fm.get("version").map(|s| s.as_str()), Some("2.0.0"));
        assert_eq!(body, "# Body\n\nHello.");
    }

    #[test]
    fn parse_frontmatter_handles_missing_frontmatter() {
        let content = "# No frontmatter\n\nBody.";
        let (fm, body) = parse_frontmatter(content).unwrap();
        assert!(fm.is_empty());
        assert_eq!(body, content);
    }

    #[test]
    fn parse_frontmatter_rejects_unclosed() {
        let content = "---\nname: my-skill\n# no closing dashes";
        assert!(parse_frontmatter(content).is_err());
    }

    #[test]
    fn parse_frontmatter_multiline_value() {
        // Indented continuation lines append to the previous key's value.
        let content = "---\nname: my-skill\ndescription: 这是一个\n  多行描述\n  第三行\nversion: 1.0.0\n---\nBody";
        let (fm, body) = parse_frontmatter(content).unwrap();
        assert_eq!(fm.get("name").map(|s| s.as_str()), Some("my-skill"));
        assert_eq!(
            fm.get("description").map(|s| s.as_str()),
            Some("这是一个\n多行描述\n第三行")
        );
        assert_eq!(fm.get("version").map(|s| s.as_str()), Some("1.0.0"));
        assert_eq!(body, "Body");
    }

    #[test]
    fn parse_frontmatter_line_strips_quotes() {
        let (k, v) = parse_frontmatter_line(r#"name: "quoted value""#).unwrap();
        assert_eq!(k, "name");
        assert_eq!(v, "quoted value");
    }

    #[test]
    fn parse_frontmatter_line_ignores_comments() {
        assert!(parse_frontmatter_line("# comment").is_none());
        assert!(parse_frontmatter_line("").is_none());
    }

    #[test]
    fn slugify_normalizes_input() {
        assert_eq!(slugify("My Skill"), "my-skill");
        // CJK 字符在 Rust `char::is_alphanumeric()` 中视为字母数字，予以保留。
        assert_eq!(slugify("中文 Skill!!!"), "中文-skill");
        assert_eq!(slugify("---leading and trailing---"), "leading-and-trailing");
    }

    /// 在内存中构建一个 zip 包，返回完整字节。`entries` 为 (filename, content) 列表。
    fn build_test_zip(entries: &[(&str, &str)]) -> Vec<u8> {
        use std::io::{Seek, Write};
        let mut buffer: Vec<u8> = Vec::new();
        {
            let mut writer = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            for (name, content) in entries {
                writer.start_file(*name, options).expect("start_file failed");
                writer.write_all(content.as_bytes()).expect("write_all failed");
            }
            writer.finish().expect("finish failed");
        }
        // Cursor seek 位置不影响读取，返回 buffer 即可。这里显式 seek 回 0 以防万一。
        let _ = std::io::Seek::seek(
            &mut std::io::Cursor::new(&mut buffer),
            std::io::SeekFrom::Start(0),
        );
        buffer
    }

    #[test]
    fn collect_reference_entries_loads_top_level_md() {
        let bytes = build_test_zip(&[
            ("SKILL.md", "---\nname: Test Skill\n---\nbody"),
            ("references/topic-a.md", "# Topic A\n\ncontent A"),
            ("references/topic-b.md", "content B"),
        ]);
        let reader = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(reader).expect("zip open failed");

        let references = collect_reference_entries(&mut archive).expect("collect failed");
        assert_eq!(references.len(), 2);

        let first = references[0].as_object().expect("first is object");
        assert_eq!(first.get("key").and_then(|v| v.as_str()), Some("topic-a"));
        assert_eq!(first.get("label").and_then(|v| v.as_str()), Some("topic-a"));
        assert_eq!(
            first.get("filename").and_then(|v| v.as_str()),
            Some("references/topic-a.md"),
        );
        assert_eq!(
            first.get("content").and_then(|v| v.as_str()),
            Some("# Topic A\n\ncontent A"),
        );

        let second = references[1].as_object().expect("second is object");
        assert_eq!(second.get("key").and_then(|v| v.as_str()), Some("topic-b"));
        assert_eq!(second.get("content").and_then(|v| v.as_str()), Some("content B"));
    }

    #[test]
    fn collect_reference_entries_skips_nested_and_non_md() {
        // 只匹配顶层 references/*.md；嵌套子目录与非 .md 文件应被跳过。
        let bytes = build_test_zip(&[
            ("references/a.md", "top"),
            ("references/sub/b.md", "nested"),
            ("references/notes.txt", "not markdown"),
            ("other.md", "outside references"),
        ]);
        let reader = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(reader).expect("zip open failed");

        let references = collect_reference_entries(&mut archive).expect("collect failed");
        assert_eq!(references.len(), 1);
        let only = references[0].as_object().expect("only is object");
        assert_eq!(only.get("key").and_then(|v| v.as_str()), Some("a"));
        assert_eq!(only.get("content").and_then(|v| v.as_str()), Some("top"));
    }

    #[test]
    fn collect_reference_entries_empty_when_none() {
        let bytes = build_test_zip(&[("SKILL.md", "---\nname: x\n---\nbody")]);
        let reader = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(reader).expect("zip open failed");

        let references = collect_reference_entries(&mut archive).expect("collect failed");
        assert!(references.is_empty());
    }
}

// =====================================================
// TODO (Phase 6): Skill package export
// =====================================================
//
// #[tauri::command]
// pub fn export_skill_package(app: AppHandle, skill_id: String, output_path: String) -> Result<(), String>;
//
// 导出需要将 Skill 的 capability prompt 写回 SKILL.md + frontmatter，
// 并把 references 数组还原为 references/*.md 文件。Phase 4 PRD 明确将导出
// 列为 Out of Scope（无自建产物可导出），Phase 6 再评估。

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

const BUILTIN_RESUME_ASSISTANT_VERSION: &str = "1.1.0";
const BUILTIN_INTERVIEW_PERSONAS_VERSION: &str = "1.1.0";
const BUILTIN_COVER_LETTER_VERSION: &str = "1.1.0";
const BUILTIN_TRANSLATE_VERSION: &str = "1.1.0";
const BUILTIN_GRAMMAR_CHECK_VERSION: &str = "1.1.0";
const BUILTIN_JD_ANALYSIS_VERSION: &str = "1.1.0";
const BUILTIN_GENERATE_RESUME_VERSION: &str = "1.1.0";
const BUILTIN_INTERVIEW_EVALUATION_VERSION: &str = "1.1.0";
const BUILTIN_INTERVIEW_REPORT_VERSION: &str = "1.1.0";

pub fn bootstrap_builtin_skills(app: &AppHandle) -> Result<(), String> {
    let resume_version = read_skill_version(app, "builtin-resume-assistant")?;
    if resume_version.as_deref() != Some(BUILTIN_RESUME_ASSISTANT_VERSION) {
        let capability = serde_json::json!([{
            "id": "resume-edit",
            "name": "简历编辑",
            "description": "对话式简历编辑，支持工具辅助的文本片段修改。",
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
            name: "简历助手".into(),
            description: "JobPilot 内置的简历编辑助手。".into(),
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

    // PR5：注册剩余 7 个 builtin Skill，每个对应一个 AI 场景，prompt 包装现有硬编码值。
    // 与现有两个 builtin 一致：source="builtin"，含 1 个 capability，matchOn.scenarios 设为对应场景 id。
    if read_skill_version(app, "builtin-cover-letter")?.as_deref() != Some(BUILTIN_COVER_LETTER_VERSION) {
        save_skill(app.clone(), build_builtin_cover_letter_skill()?)?;
    }
    if read_skill_version(app, "builtin-translate")?.as_deref() != Some(BUILTIN_TRANSLATE_VERSION) {
        save_skill(app.clone(), build_builtin_translate_skill()?)?;
    }
    if read_skill_version(app, "builtin-grammar-check")?.as_deref() != Some(BUILTIN_GRAMMAR_CHECK_VERSION) {
        save_skill(app.clone(), build_builtin_grammar_check_skill()?)?;
    }
    if read_skill_version(app, "builtin-jd-analysis")?.as_deref() != Some(BUILTIN_JD_ANALYSIS_VERSION) {
        save_skill(app.clone(), build_builtin_jd_analysis_skill()?)?;
    }
    if read_skill_version(app, "builtin-generate-resume")?.as_deref() != Some(BUILTIN_GENERATE_RESUME_VERSION) {
        save_skill(app.clone(), build_builtin_generate_resume_skill()?)?;
    }
    if read_skill_version(app, "builtin-interview-evaluation")?.as_deref()
        != Some(BUILTIN_INTERVIEW_EVALUATION_VERSION)
    {
        save_skill(app.clone(), build_builtin_interview_evaluation_skill()?)?;
    }
    if read_skill_version(app, "builtin-interview-report")?.as_deref()
        != Some(BUILTIN_INTERVIEW_REPORT_VERSION)
    {
        save_skill(app.clone(), build_builtin_interview_report_skill()?)?;
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
        name: "面试官人设".into(),
        description: "JobPilot 内置面试官人设（HR / 技术 / 架构师 / HRBP / 负责人 / VP）。".into(),
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

// =====================================================
// PR5 builtin Skills（剩余 7 场景）
// =====================================================
//
// 每个函数构造一个 builtin Skill，prompt 原样搬入对应场景的现有硬编码值。
// cover-letter / translate / generate-resume 的 prompt 来自前端 .tsx 内联字符串；
// grammar-check / jd-analysis 原组件只传 prompt（无独立 systemPrompt），这里构造一份
// 合理的 system prompt 描述角色；interview-evaluation / interview-report 的 prompt 来自
// ai.rs 的 build_*_system_prompt 函数体返回字符串，含 JSON 输出格式约束块。

/// `builtin-cover-letter`：scenarioId="cover-letter"。
/// prompt 来自 `cover-letter-dialog.tsx:105` 的内联 systemPrompt，原样搬入（英文）。
fn build_builtin_cover_letter_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "求职信撰写",
        "description": "基于简历与岗位 JD 生成定制求职信。",
        "matchOn": {
            "scenarios": ["cover-letter"],
            "categories": ["resume", "writing"]
        },
        "prompt": BUILTIN_COVER_LETTER_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-cover-letter".into(),
        name: "求职信撰写".into(),
        description: "JobPilot 内置求职信撰写助手。".into(),
        version: BUILTIN_COVER_LETTER_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("mail".into()),
        tags: serde_json::json!(["cover-letter", "writing", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-translate`：scenarioId="translate"。
/// prompt 来自 `translate-dialog.tsx:254` 的内联 systemPrompt，原样搬入（英文）。
fn build_builtin_translate_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "简历翻译",
        "description": "在语言间翻译简历各部分，保持 JSON 结构不变。",
        "matchOn": {
            "scenarios": ["translate"],
            "categories": ["resume", "translate"]
        },
        "prompt": BUILTIN_TRANSLATE_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-translate".into(),
        name: "简历翻译".into(),
        description: "JobPilot 内置简历翻译助手。".into(),
        version: BUILTIN_TRANSLATE_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("languages".into()),
        tags: serde_json::json!(["translate", "resume", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-grammar-check`：scenarioId="grammar-check"。
/// 原组件只传单一 prompt（内联 systemPrompt 与输出约束混合），这里构造一份合理的
/// system prompt 描述语法检查助手角色，并保留 JSON 输出格式约束块。
fn build_builtin_grammar_check_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "语法检查",
        "description": "审查简历内容的语法与文风问题，输出结构化 JSON。",
        "matchOn": {
            "scenarios": ["grammar-check"],
            "categories": ["resume", "review"]
        },
        "prompt": BUILTIN_GRAMMAR_CHECK_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-grammar-check".into(),
        name: "语法检查".into(),
        description: "JobPilot 内置简历语法与文风检查器。".into(),
        version: BUILTIN_GRAMMAR_CHECK_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("spell-check".into()),
        tags: serde_json::json!(["grammar-check", "review", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-jd-analysis`：scenarioId="jd-analysis"。
/// 原组件 `buildAnalysisPrompt` 把角色设定 + 输出约束 + 简历/JD 拼在一条 prompt 里。
/// 这里抽取角色设定与输出约束部分作为 system prompt，简历/JD 由 SkillRuntime 在
/// prompt-build 时作为 user content 拼接。
fn build_builtin_jd_analysis_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "JD 分析",
        "description": "分析简历与岗位 JD 的匹配度，输出结构化建议 JSON。",
        "matchOn": {
            "scenarios": ["jd-analysis"],
            "categories": ["resume", "analysis"]
        },
        "prompt": BUILTIN_JD_ANALYSIS_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-jd-analysis".into(),
        name: "JD 分析".into(),
        description: "JobPilot 内置简历-JD 匹配分析助手。".into(),
        version: BUILTIN_JD_ANALYSIS_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("target".into()),
        tags: serde_json::json!(["jd-analysis", "analysis", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-generate-resume`：scenarioId="generate-resume"。
/// prompt 来自 `generate-resume-dialog.tsx:132` 的 `buildAiGenerateSystemPrompt`，
/// 采用英文版默认（language="en"）作为静态字符串（MVP 接受单语言）。
fn build_builtin_generate_resume_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "简历生成",
        "description": "基于最小输入生成专业起步简历 JSON。",
        "matchOn": {
            "scenarios": ["generate-resume"],
            "categories": ["resume", "generation"]
        },
        "prompt": BUILTIN_GENERATE_RESUME_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-generate-resume".into(),
        name: "简历生成".into(),
        description: "JobPilot 内置起步简历生成器。".into(),
        version: BUILTIN_GENERATE_RESUME_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("file-plus".into()),
        tags: serde_json::json!(["generate-resume", "generation", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-interview-evaluation`：scenarioId="interview-evaluation"。
/// prompt 来自 `ai.rs:build_interview_answer_evaluation_system_prompt` 的中文版返回字符串，
/// 并附上原 user prompt 中的 JSON 输出格式约束块（自定义 prompt 必须保留，否则解析失败）。
fn build_builtin_interview_evaluation_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "面试回答评估",
        "description": "评估单个面试回答并输出结构化 JSON。",
        "matchOn": {
            "scenarios": ["interview-evaluation"],
            "categories": ["interview", "evaluation"]
        },
        "prompt": BUILTIN_INTERVIEW_EVALUATION_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-interview-evaluation".into(),
        name: "面试回答评估".into(),
        description: "JobPilot 内置面试回答评估器。".into(),
        version: BUILTIN_INTERVIEW_EVALUATION_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("clipboard-check".into()),
        tags: serde_json::json!(["interview", "evaluation", "builtin"]),
        capabilities: capability,
        references: serde_json::json!([]),
        required_context: serde_json::json!([]),
        variables: serde_json::json!([]),
        enabled: true,
        created_at_epoch_ms: now_epoch_ms()? as i64,
        updated_at_epoch_ms: now_epoch_ms()? as i64,
    })
}

/// `builtin-interview-report`：scenarioId="interview-report"。
/// prompt 来自 `ai.rs:build_interview_report_system_prompt` 的中文版返回字符串，
/// 并附上原 user prompt 中的 JSON 输出格式约束块（自定义 prompt 必须保留，否则解析失败）。
fn build_builtin_interview_report_skill() -> Result<Skill, String> {
    let capability = serde_json::json!([{
        "id": "default",
        "name": "面试报告",
        "description": "基于面试记录生成结构化面试练习报告 JSON。",
        "matchOn": {
            "scenarios": ["interview-report"],
            "categories": ["interview", "report"]
        },
        "prompt": BUILTIN_INTERVIEW_REPORT_PROMPT,
        "outputFormat": "stream",
        "requiresTools": []
    }]);

    Ok(Skill {
        id: "builtin-interview-report".into(),
        name: "面试报告".into(),
        description: "JobPilot 内置面试报告生成器。".into(),
        version: BUILTIN_INTERVIEW_REPORT_VERSION.into(),
        author: Some("JobPilot".into()),
        source: "builtin".into(),
        icon: Some("file-text".into()),
        tags: serde_json::json!(["interview", "report", "builtin"]),
        capabilities: capability,
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

// PR5 builtin Skill prompts（原样搬入对应场景的现有硬编码值）。
// cover-letter / translate / generate-resume 为英文原 prompt；grammar-check / jd-analysis
// 为构造的合理 system prompt；interview-evaluation / interview-report 含 JSON 输出格式约束块。

const BUILTIN_COVER_LETTER_PROMPT: &str = "\
You are an expert cover letter writer. Write a tailored cover letter in English.

Requirements:
- Keep the letter professional, persuasive, and specific
- Open with a strong hook instead of generic filler
- Tie concrete resume evidence to the job requirements
- Mention the company and role naturally
- Keep the result concise and ready to send

Output format:
TITLE: <your title here>
---CONTENT---
<the full cover letter body>";

const BUILTIN_TRANSLATE_PROMPT: &str = "\
You are a professional resume translator. Translate the given resume section from the source language to the target language.

Rules:
- Use professional, resume-appropriate language
- Preserve the exact JSON structure and all field names
- Keep IDs, URLs, emails, phone numbers, and dates unchanged
- Keep technical terms in their standard form when appropriate
- Return a single valid JSON object with keys: sectionId, title, content
- Do not add markdown or code fences";

const BUILTIN_GRAMMAR_CHECK_PROMPT: &str = "\
You are a professional resume grammar and style reviewer.

Review resume content for grammar and style issues.

Return two parts:
1. A concise human-readable summary.
2. A JSON array wrapped exactly between these markers:
<<<GRAMMAR_JSON_START>>>
...json...
<<<GRAMMAR_JSON_END>>>

Each JSON item must follow:
{
  \"sectionId\": string,
  \"sectionTitle\": string,
  \"type\": \"grammar\" | \"spelling\" | \"weak-verb\" | \"vague\",
  \"original\": string,
  \"suggestion\": string
}

Rules:
- only include issues when the original text exists verbatim in the provided section content
- keep suggestions concise
- sectionId must match one of the provided section ids";

const BUILTIN_JD_ANALYSIS_PROMPT: &str = "\
You are an expert resume analyst and career coach.

Analyze how well the resume matches the job description.

Output language: English.
All human-readable analysis text and every JSON string value must be written in English.
Keep proper nouns and technology names in their original spelling when appropriate.

Return two things in one response:
1. A concise human-readable analysis with sections for overall fit, matching keywords, missing keywords, and improvement suggestions.
2. A final JSON object wrapped exactly between these markers:
<<<JD_ANALYSIS_JSON_START>>>
...json...
<<<JD_ANALYSIS_JSON_END>>>

The JSON shape must be:
{
  \"overallScore\": number,
  \"atsScore\": number,
  \"summary\": string,
  \"keywordMatches\": string[],
  \"missingKeywords\": string[],
  \"suggestions\": [
    {
      \"sectionId\": string,
      \"section\": string,
      \"current\": string,
      \"suggested\": string
    }
  ]
}

Requirements:
- scores are 0-100 integers
- suggestions should be specific and actionable
- suggestions[].sectionId must match one of the provided section ids when the suggestion targets a specific section
- only include suggestions when you have a clear before/after recommendation
- when filling suggestions[].section, prefer the exact section title from the provided resume data";

const BUILTIN_GENERATE_RESUME_PROMPT: &str = "\
You are JobPilot's resume generation assistant.
Generate a professional starter resume in English.
Return one valid JSON object only. Do not use markdown or code fences.
All user-facing text, section content, summaries, bullets, placeholders, and skill category names must use the requested language.
Do not invent real company names, school names, emails, phone numbers, or personal identities. Use clear placeholders when information is missing.
You must fill the provided JobPilot ImportDocumentInput JSON template.
Keep sectionType values exactly as provided. Keep arrays as arrays. Keep themeJson as a JSON string.
Return the filled template object itself, starting with { and ending with }.";

// interview-evaluation 的 builtin prompt：角色设定（中文版）+ JSON 输出格式约束块。
// 角色设定来自 ai.rs:build_interview_answer_evaluation_system_prompt 的 zh 分支返回字符串；
// JSON 约束块来自 build_interview_answer_evaluation_user_prompt 的 zh 分支中的 JSON schema 部分。
// 自定义 evaluation system_prompt 必须保留 JSON 约束，否则 Rust 侧 serde 解析会失败。
const BUILTIN_INTERVIEW_EVALUATION_PROMPT: &str = "\
你是一位严谨的面试回答教练。你只评估候选人刚刚这一次回答，并输出合法 JSON。不要安慰式泛泛评价，不要虚构候选人没说过的细节。

输出 JSON，字段且仅字段如下：
{
  \"overallScore\": <0-100 整数>,
  \"summary\": <1-2 句简短评价>,
  \"dimensions\": [
    { \"id\": \"structure\", \"label\": \"结构完整度\", \"score\": <0-100>, \"feedback\": <一句话> },
    { \"id\": \"contribution\", \"label\": \"个人贡献\", \"score\": <0-100>, \"feedback\": <一句话> },
    { \"id\": \"quantification\", \"label\": \"结果量化\", \"score\": <0-100>, \"feedback\": <一句话> },
    { \"id\": \"jdRelevance\", \"label\": \"岗位相关性\", \"score\": <0-100>, \"feedback\": <一句话> },
    { \"id\": \"clarity\", \"label\": \"表达清晰度\", \"score\": <0-100>, \"feedback\": <一句话> }
  ],
  \"strengths\": [<字符串>, ...],
  \"riskPoints\": [<字符串>, ...],
  \"followUpQuestion\": <建议面试官继续追问的一个具体问题，若无则 null>,
  \"trainingSuggestions\": [<候选人下一次可练习的具体动作>, ...]
}

要求：
- 如果是行为/项目回答，按 STAR 关注背景、任务、行动、结果是否完整。
- 如果是技术回答，关注原理、权衡、边界、排障和落地指标。
- `riskPoints` 指出面试官可能质疑的点。
- `followUpQuestion` 必须基于这次回答的缺口，不要泛泛而谈。
- 只基于给定内容判断。";

// interview-report 的 builtin prompt：角色设定（中文版）+ JSON 输出格式约束块。
// 角色设定来自 ai.rs:build_interview_report_system_prompt 的 zh 分支返回字符串；
// JSON 约束块来自 build_interview_report_user_prompt 的 zh 分支中的 JSON schema 部分。
// 自定义 report system_prompt 必须保留 JSON 约束，否则 Rust 侧 serde 解析会失败。
const BUILTIN_INTERVIEW_REPORT_PROMPT: &str = "\
你是一位专业的人才评估与面试训练教练。你会根据面试记录产出可信、结构化、可执行的 JSON 复盘报告，只输出合法 JSON，不要附加解释。

输出 JSON，字段且仅字段如下：
{
  \"overallScore\": <0-100 整数>,
  \"summary\": <2-4 句总结>,
  \"overallFeedback\": <2-5 句整体反馈>,
  \"improvementSuggestions\": [<字符串>, ...],
  \"weakPoints\": [
    { \"title\": <薄弱点标题>, \"evidence\": <来自面试记录的证据>, \"severity\": \"low\" | \"medium\" | \"high\", \"trainingFocus\": <训练重点> }
  ],
  \"trainingPlan\": [
    { \"title\": <训练项标题>, \"description\": <训练目标>, \"priority\": \"low\" | \"medium\" | \"high\", \"drills\": [<具体练习动作>, ...] }
  ]
}

要求：
- 只基于给定记录做判断，不要虚构没有发生的细节。
- `improvementSuggestions` 返回 3-6 条可执行建议。
- `weakPoints` 返回 2-5 条，必须包含证据和训练重点。
- `trainingPlan` 返回 2-4 个训练项，每个训练项包含 2-4 个 drills。
- 如果轮次不完整，也要如实反映在反馈里。";

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
