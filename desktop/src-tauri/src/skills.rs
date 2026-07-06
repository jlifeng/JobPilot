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
//! - Built-in Skill registration on first launch is also deferred to Phase 2/3.

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
// TODO (Phase 2/3): Built-in Skill registration on first launch
// =====================================================
//
// On bootstrap, check if built-in Skills (builtin-resume-assistant,
// builtin-interview-personas, etc.) are already present; if not, insert them
// wrapping the existing hardcoded prompts. This keeps the upgrade path
// backward-compatible — disabling a built-in Skill makes the corresponding
// scenario fall back to the hardcoded default prompt.

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
