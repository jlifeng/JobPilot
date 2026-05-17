use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const STORAGE_SCHEMA_VERSION: u32 = 2;
const WORKSPACE_ROOT_DIR: &str = "workspace";
const DATABASE_FILE: &str = "rolerover.db";
const DEFAULT_WINDOW_WIDTH: i64 = 1480;
const DEFAULT_WINDOW_HEIGHT: i64 = 960;
const MIN_WINDOW_WIDTH: i64 = 1200;
const MIN_WINDOW_HEIGHT: i64 = 760;
const MAX_WINDOW_WIDTH: i64 = 4096;
const MAX_WINDOW_HEIGHT: i64 = 2160;
const MIN_WINDOW_COORDINATE: i64 = -16_384;
const MAX_WINDOW_COORDINATE: i64 = 16_384;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableCountSnapshot {
    table: String,
    row_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSnapshot {
    schema_version: u32,
    bootstrap_status: String,
    workspace_root: String,
    database_path: String,
    workspace_id: String,
    initialized: bool,
    sqlite_version: String,
    table_counts: Vec<TableCountSnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValidationSection {
    id: String,
    document_id: String,
    section_type: String,
    title: String,
    sort_order: i32,
    visible: bool,
    content: Value,
    created_at_epoch_ms: i64,
    updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValidationMetadata {
    id: String,
    title: String,
    template: String,
    language: String,
    target_job_title: Option<String>,
    target_company: Option<String>,
    is_default: bool,
    is_sample: bool,
    created_at_epoch_ms: i64,
    updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValidationSnapshot {
    source: String,
    representative_templates: Vec<String>,
    documents: Vec<TemplateValidationDocument>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValidationDocument {
    metadata: TemplateValidationMetadata,
    theme: Value,
    sections: Vec<TemplateValidationSection>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValidationExportWriteResult {
    file_name: String,
    output_path: String,
    bytes_written: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceWindowState {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
    #[serde(default)]
    pub maximized: bool,
    #[serde(default)]
    pub fullscreen: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredWorkspaceWindowState {
    width: Option<i64>,
    height: Option<i64>,
    x: Option<i64>,
    y: Option<i64>,
    #[serde(alias = "isMaximized")]
    maximized: Option<bool>,
    #[serde(alias = "isFullscreen")]
    fullscreen: Option<bool>,
}

struct StoragePaths {
    workspace_root: PathBuf,
    database_path: PathBuf,
}

pub fn get_storage_snapshot(app: &AppHandle) -> Result<StorageSnapshot, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;

    let already_existed = paths.database_path.exists();
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;

    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    let workspace_id = seed_workspace_defaults(&connection, &app_version)?;

    let sqlite_version = connection
        .query_row("SELECT sqlite_version()", [], |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query sqlite version: {error}"))?;

    let table_counts = collect_table_counts(&connection)?;

    Ok(StorageSnapshot {
        schema_version: STORAGE_SCHEMA_VERSION,
        bootstrap_status: if already_existed {
            "reused".into()
        } else {
            "created".into()
        },
        workspace_root: path_to_string(&paths.workspace_root),
        database_path: path_to_string(&paths.database_path),
        workspace_id,
        initialized: true,
        sqlite_version,
        table_counts,
    })
}

pub fn get_template_validation_snapshot(
    app: &AppHandle,
) -> Result<TemplateValidationSnapshot, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let mut workspace_docs = load_workspace_template_documents(&connection)?;
    let mut used_sample_templates = Vec::new();

    for template in ["classic", "modern"] {
        if !workspace_docs
            .iter()
            .any(|document| document.metadata.template == template)
        {
            workspace_docs.push(build_sample_template_document(template));
            used_sample_templates.push(template.to_string());
        }
    }

    let source = if used_sample_templates.is_empty() {
        "workspace_documents".to_string()
    } else if used_sample_templates.len() == 2 {
        "native_sample_documents".to_string()
    } else {
        "workspace_plus_native_sample_documents".to_string()
    };

    Ok(TemplateValidationSnapshot {
        source,
        representative_templates: vec!["classic".to_string(), "modern".to_string()],
        documents: workspace_docs,
    })
}

pub fn write_template_validation_export(
    app: &AppHandle,
    file_name: Option<String>,
    output_path: Option<String>,
    html: String,
) -> Result<TemplateValidationExportWriteResult, String> {
    let (resolved_name, resolved_output_path) = if let Some(requested_output_path) = output_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let explicit_output_path = normalize_requested_output_path(requested_output_path)?;
        let Some(explicit_file_name) = explicit_output_path.file_name() else {
            return Err("requested export output path must include a file name".into());
        };
        (
            explicit_file_name.to_string_lossy().to_string(),
            explicit_output_path,
        )
    } else {
        let paths = resolve_storage_paths(app)?;
        let exports_dir = paths.workspace_root.join("exports");
        ensure_storage_directory(&exports_dir)?;

        let sanitized = sanitize_export_file_name(file_name.as_deref().unwrap_or(""));
        let preferred_name = if sanitized.is_empty() {
            "template-validation-export.html".to_string()
        } else {
            sanitized
        };
        let output_name = resolve_non_conflicting_name(&exports_dir, &preferred_name)?;
        (output_name.clone(), exports_dir.join(output_name))
    };

    if let Some(parent_dir) = resolved_output_path.parent() {
        if !parent_dir.as_os_str().is_empty() {
            ensure_storage_directory(&parent_dir.to_path_buf())?;
        }
    } else {
        return Err("requested export output path must include a parent directory".into());
    }

    let bytes = html.into_bytes();
    let bytes_written = bytes.len();

    fs::write(&resolved_output_path, bytes).map_err(|error| {
        format!(
            "failed to write template validation export {}: {error}",
            resolved_output_path.display()
        )
    })?;

    Ok(TemplateValidationExportWriteResult {
        file_name: resolved_name,
        output_path: path_to_string(&resolved_output_path),
        bytes_written,
    })
}

pub fn write_export_file(
    output_path: String,
    expected_extension: String,
    bytes: Vec<u8>,
) -> Result<TemplateValidationExportWriteResult, String> {
    let resolved_output_path =
        normalize_requested_output_path_with_extension(&output_path, &expected_extension)?;
    write_export_bytes(&resolved_output_path, bytes)
}

pub fn write_pdf_export(
    app: &AppHandle,
    output_path: String,
    html: String,
) -> Result<TemplateValidationExportWriteResult, String> {
    let resolved_output_path = normalize_requested_output_path_with_extension(&output_path, "pdf")?;
    ensure_parent_directory(&resolved_output_path)?;

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("failed to resolve app cache dir: {error}"))?
        .join("exports");
    ensure_storage_directory(&cache_dir)?;

    let timestamp = now_epoch_ms()?;
    let temp_html_path = cache_dir.join(format!("pdf-export-{timestamp}.html"));
    fs::write(&temp_html_path, html.into_bytes()).map_err(|error| {
        format!(
            "failed to write temporary pdf html {}: {error}",
            temp_html_path.display()
        )
    })?;

    let browser_path = resolve_pdf_browser_path()?;
    let print_argument = format!(
        "--print-to-pdf={}",
        resolved_output_path.to_string_lossy()
    );

    let mut command = Command::new(&browser_path);
    command
        .arg("--headless")
        .arg("--disable-gpu")
        .arg("--allow-file-access-from-files")
        .arg("--run-all-compositor-stages-before-draw")
        .arg("--virtual-time-budget=12000")
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg("--no-pdf-header-footer")
        .arg(print_argument)
        .arg(path_to_string(&temp_html_path));

    #[cfg(target_os = "linux")]
    command.arg("--no-sandbox");

    let output = command.output().map_err(|error| {
        format!(
            "failed to launch browser {} for pdf export: {error}",
            browser_path.display()
        )
    })?;

    let _ = fs::remove_file(&temp_html_path);

    if !output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "pdf export browser command failed (status: {}). stdout: {} stderr: {}",
            output
                .status
                .code()
                .map(|code| code.to_string())
                .unwrap_or_else(|| "terminated".into()),
            if stdout.is_empty() { "<empty>" } else { &stdout },
            if stderr.is_empty() { "<empty>" } else { &stderr },
        ));
    }

    let metadata = fs::metadata(&resolved_output_path).map_err(|error| {
        format!(
            "pdf export did not produce {}: {error}",
            resolved_output_path.display()
        )
    })?;

    Ok(TemplateValidationExportWriteResult {
        file_name: file_name_from_path(&resolved_output_path)?,
        output_path: path_to_string(&resolved_output_path),
        bytes_written: metadata.len() as usize,
    })
}

pub fn load_workspace_window_state(
    app: &AppHandle,
) -> Result<Option<WorkspaceWindowState>, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let raw_window_state = connection
        .query_row(
            "SELECT window_state_json FROM workspace_settings WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to query workspace window state: {error}"))?
        .unwrap_or_else(|| "{}".into());

    parse_workspace_window_state(&raw_window_state)
}

pub fn persist_workspace_window_state(
    app: &AppHandle,
    state: &WorkspaceWindowState,
) -> Result<(), String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let serialized = serde_json::to_string(state)
        .map_err(|error| format!("failed to serialize workspace window state: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE workspace_settings
            SET window_state_json = ?, updated_at_epoch_ms = ?
            WHERE id = 1
            "#,
            params![serialized, now_epoch_ms()? as i64],
        )
        .map_err(|error| format!("failed to persist workspace window state: {error}"))?;

    Ok(())
}

fn resolve_storage_paths(app: &AppHandle) -> Result<StoragePaths, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    let workspace_root = app_data_dir.join(WORKSPACE_ROOT_DIR);
    let database_path = workspace_root.join(DATABASE_FILE);

    Ok(StoragePaths {
        workspace_root,
        database_path,
    })
}

fn open_initialized_connection(app: &AppHandle) -> Result<Connection, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;
    Ok(connection)
}

fn load_workspace_template_documents(
    connection: &Connection,
) -> Result<Vec<TemplateValidationDocument>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              title,
              template,
              language,
              theme_json,
              is_default,
              target_job_title,
              target_company,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM documents
            WHERE template IN ('classic', 'modern')
            ORDER BY updated_at_epoch_ms DESC
            "#,
        )
        .map_err(|error| format!("failed to prepare template document query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)? != 0,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, i64>(8)?,
                row.get::<_, i64>(9)?,
            ))
        })
        .map_err(|error| format!("failed to query template documents: {error}"))?;

    let mut newest_by_template: HashMap<String, TemplateValidationDocument> = HashMap::new();
    for row in rows {
        let (
            id,
            title,
            template,
            language,
            theme_json,
            is_default,
            target_job_title,
            target_company,
            created_at_epoch_ms,
            updated_at_epoch_ms,
        ) = row.map_err(|error| format!("failed to map template document row: {error}"))?;
        if newest_by_template.contains_key(&template) {
            continue;
        }

        newest_by_template.insert(
            template.clone(),
            TemplateValidationDocument {
                metadata: TemplateValidationMetadata {
                    id: id.clone(),
                    title,
                    template,
                    language,
                    target_job_title,
                    target_company,
                    is_default,
                    is_sample: false,
                    created_at_epoch_ms,
                    updated_at_epoch_ms,
                },
                theme: parse_json_or_default(&theme_json, "{}"),
                sections: load_document_sections(connection, &id)?,
            },
        );
    }

    let mut documents = Vec::new();
    for template in ["classic", "modern"] {
        if let Some(document) = newest_by_template.remove(template) {
            documents.push(document);
        }
    }

    Ok(documents)
}

fn load_document_sections(
    connection: &Connection,
    document_id: &str,
) -> Result<Vec<TemplateValidationSection>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              document_id,
              section_type,
              title,
              sort_order,
              visible,
              content_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM document_sections
            WHERE document_id = ?1
            ORDER BY sort_order ASC, created_at_epoch_ms ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare section query: {error}"))?;

    let rows = statement
        .query_map(params![document_id], |row| {
            Ok(TemplateValidationSection {
                id: row.get::<_, String>(0)?,
                document_id: row.get::<_, String>(1)?,
                section_type: row.get::<_, String>(2)?,
                title: row.get::<_, String>(3)?,
                sort_order: row.get::<_, i32>(4)?,
                visible: row.get::<_, i64>(5)? != 0,
                content: parse_json_or_default(&row.get::<_, String>(6)?, "{}"),
                created_at_epoch_ms: row.get::<_, i64>(7)?,
                updated_at_epoch_ms: row.get::<_, i64>(8)?,
            })
        })
        .map_err(|error| format!("failed to query sections for {document_id}: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map sections for {document_id}: {error}"))
}

fn build_sample_template_document(template: &str) -> TemplateValidationDocument {
    let is_modern = template == "modern";
    let document_id = format!("native-sample-{template}");
    let now = now_epoch_ms().unwrap_or_default() as i64;

    let theme_config = if is_modern {
        json!({
            "primaryColor": "#0f172a",
            "accentColor": "#e11d48",
            "fontFamily": "Inter",
            "fontSize": "medium",
            "lineSpacing": 1.6,
            "margin": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
            "sectionSpacing": 16,
            "avatarStyle": "circle"
        })
    } else {
        json!({
            "primaryColor": "#111827",
            "accentColor": "#2563eb",
            "fontFamily": "Inter",
            "fontSize": "medium",
            "lineSpacing": 1.5,
            "margin": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
            "sectionSpacing": 16,
            "avatarStyle": "oneInch"
        })
    };

    let sections = vec![
        TemplateValidationSection {
            id: format!("{document_id}-personal-info"),
            document_id: document_id.clone(),
            section_type: "personal_info".to_string(),
            title: "Personal Info".to_string(),
            sort_order: 0,
            visible: true,
            content: json!({
                "fullName": if is_modern { "Modern Candidate" } else { "Classic Candidate" },
                "jobTitle": "Desktop Migration Engineer",
                "email": "candidate@rolerover.local",
                "phone": "+1-555-0100",
                "location": "Desktop Runtime"
            }),
            created_at_epoch_ms: now,
            updated_at_epoch_ms: now,
        },
        TemplateValidationSection {
            id: format!("{document_id}-summary"),
            document_id: document_id.clone(),
            section_type: "summary".to_string(),
            title: "Summary".to_string(),
            sort_order: 1,
            visible: true,
            content: json!({
                "text": "Native desktop sample used to validate unified template preview/export for representative templates."
            }),
            created_at_epoch_ms: now,
            updated_at_epoch_ms: now,
        },
        TemplateValidationSection {
            id: format!("{document_id}-work-experience"),
            document_id: document_id.clone(),
            section_type: "work_experience".to_string(),
            title: "Work Experience".to_string(),
            sort_order: 2,
            visible: true,
            content: json!({
                "items": [
                    {
                        "id": format!("{document_id}-work-item-1"),
                        "company": "RoleRover",
                        "position": "Desktop Rewrite Owner",
                        "location": "Native Shell",
                        "startDate": "2025-01",
                        "endDate": null,
                        "current": true,
                        "description": "Unified template contract between preview and export.",
                        "technologies": ["Tauri", "Rust", "TypeScript"],
                        "highlights": [
                            "Validated classic and modern template slices in desktop shell."
                        ]
                    }
                ]
            }),
            created_at_epoch_ms: now,
            updated_at_epoch_ms: now,
        },
    ];

    TemplateValidationDocument {
        metadata: TemplateValidationMetadata {
            id: document_id,
            title: if is_modern {
                "Native Sample - Modern Template Validation"
            } else {
                "Native Sample - Classic Template Validation"
            }
            .to_string(),
            template: template.to_string(),
            language: "en".to_string(),
            target_job_title: Some("Desktop Migration Engineer".to_string()),
            target_company: Some("RoleRover".to_string()),
            is_default: false,
            is_sample: true,
            created_at_epoch_ms: now,
            updated_at_epoch_ms: now,
        },
        theme: theme_config,
        sections,
    }
}

fn parse_workspace_window_state(raw: &str) -> Result<Option<WorkspaceWindowState>, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let parsed: StoredWorkspaceWindowState = serde_json::from_str(trimmed)
        .map_err(|error| format!("failed to parse workspace window state JSON: {error}"))?;

    if parsed.width.is_none()
        && parsed.height.is_none()
        && parsed.x.is_none()
        && parsed.y.is_none()
        && parsed.maximized.is_none()
        && parsed.fullscreen.is_none()
    {
        return Ok(None);
    }

    Ok(Some(WorkspaceWindowState {
        width: normalize_window_dimension(
            parsed.width,
            DEFAULT_WINDOW_WIDTH,
            MIN_WINDOW_WIDTH,
            MAX_WINDOW_WIDTH,
        ) as u32,
        height: normalize_window_dimension(
            parsed.height,
            DEFAULT_WINDOW_HEIGHT,
            MIN_WINDOW_HEIGHT,
            MAX_WINDOW_HEIGHT,
        ) as u32,
        x: normalize_window_coordinate(parsed.x).map(|value| value as i32),
        y: normalize_window_coordinate(parsed.y).map(|value| value as i32),
        maximized: parsed.maximized.unwrap_or(false),
        fullscreen: parsed.fullscreen.unwrap_or(false),
    }))
}

fn normalize_window_dimension(value: Option<i64>, fallback: i64, min: i64, max: i64) -> i64 {
    value.unwrap_or(fallback).clamp(min, max)
}

fn normalize_window_coordinate(value: Option<i64>) -> Option<i64> {
    value.map(|raw| raw.clamp(MIN_WINDOW_COORDINATE, MAX_WINDOW_COORDINATE))
}

fn parse_json_or_default(raw: &str, fallback: &str) -> Value {
    serde_json::from_str::<Value>(raw).unwrap_or_else(|_| {
        serde_json::from_str::<Value>(fallback)
            .unwrap_or_else(|_| Value::Object(Default::default()))
    })
}

fn sanitize_export_file_name(raw: &str) -> String {
    let mut sanitized = raw
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric()
                || *character == '-'
                || *character == '_'
                || *character == '.'
        })
        .collect::<String>();
    if !sanitized.to_ascii_lowercase().ends_with(".html") {
        sanitized.push_str(".html");
    }
    if sanitized.starts_with('.') {
        sanitized = format!("export{sanitized}");
    }
    sanitized
}

fn normalize_requested_output_path(raw: &str) -> Result<PathBuf, String> {
    let mut candidate = PathBuf::from(raw);
    let extension = candidate
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase());

    if extension.as_deref() != Some("html") {
        candidate.set_extension("html");
    }

    Ok(candidate)
}

fn normalize_requested_output_path_with_extension(
    raw: &str,
    expected_extension: &str,
) -> Result<PathBuf, String> {
    let normalized_extension = normalize_export_extension(expected_extension)?;
    let mut candidate = PathBuf::from(raw.trim());

    if candidate.as_os_str().is_empty() {
        return Err("requested export output path must not be empty".into());
    }

    let extension = candidate
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase());

    if extension.as_deref() != Some(normalized_extension.as_str()) {
        candidate.set_extension(&normalized_extension);
    }

    Ok(candidate)
}

fn resolve_non_conflicting_name(
    directory: &PathBuf,
    preferred_name: &str,
) -> Result<String, String> {
    let preferred_path = directory.join(preferred_name);
    if !preferred_path.exists() {
        return Ok(preferred_name.to_string());
    }

    let timestamp = now_epoch_ms()?;
    let candidate = format!(
        "{}-{timestamp}.html",
        preferred_name.trim_end_matches(".html")
    );
    Ok(candidate)
}

fn normalize_export_extension(raw: &str) -> Result<String, String> {
    let normalized = raw.trim().trim_start_matches('.').to_ascii_lowercase();

    if normalized.is_empty()
        || !normalized
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
    {
        return Err(format!("invalid export extension: {raw}"));
    }

    Ok(normalized)
}

fn file_name_from_path(path: &Path) -> Result<String, String> {
    let Some(file_name) = path.file_name() else {
        return Err("requested export output path must include a file name".into());
    };

    Ok(file_name.to_string_lossy().to_string())
}

fn ensure_parent_directory(path: &Path) -> Result<(), String> {
    let Some(parent_dir) = path.parent() else {
        return Err("requested export output path must include a parent directory".into());
    };

    if parent_dir.as_os_str().is_empty() {
        return Err("requested export output path must include a parent directory".into());
    }

    ensure_storage_directory(&parent_dir.to_path_buf())
}

fn write_export_bytes(
    resolved_output_path: &Path,
    bytes: Vec<u8>,
) -> Result<TemplateValidationExportWriteResult, String> {
    ensure_parent_directory(resolved_output_path)?;

    let bytes_written = bytes.len();
    fs::write(resolved_output_path, bytes).map_err(|error| {
        format!(
            "failed to write export {}: {error}",
            resolved_output_path.display()
        )
    })?;

    Ok(TemplateValidationExportWriteResult {
        file_name: file_name_from_path(resolved_output_path)?,
        output_path: path_to_string(resolved_output_path),
        bytes_written,
    })
}

fn resolve_pdf_browser_path() -> Result<PathBuf, String> {
    for key in ["ROLEROVER_DESKTOP_BROWSER_PATH", "CHROME_PATH", "BROWSER_PATH"] {
        if let Ok(value) = std::env::var(key) {
            let candidate = PathBuf::from(value.trim());
            if candidate.exists() {
                return Ok(candidate);
            }
        }
    }

    #[cfg(target_os = "windows")]
    let candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ];

    #[cfg(target_os = "macos")]
    let candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/opt/homebrew/bin/google-chrome",
        "/opt/homebrew/bin/microsoft-edge",
        "/usr/local/bin/google-chrome",
        "/usr/local/bin/microsoft-edge",
    ];

    #[cfg(target_os = "linux")]
    let candidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/microsoft-edge",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ];

    for raw_candidate in candidates {
        let candidate = PathBuf::from(raw_candidate);
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(
        "No supported Chrome/Edge browser was found for PDF export. Set CHROME_PATH or ROLEROVER_DESKTOP_BROWSER_PATH to continue."
            .into(),
    )
}

fn ensure_storage_directory(path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| {
        format!(
            "failed to create storage directory {}: {error}",
            path.display()
        )
    })
}

fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA synchronous = NORMAL;
            "#,
        )
        .map_err(|error| format!("failed to configure sqlite connection: {error}"))
}

fn bootstrap_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS workspace_metadata (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              workspace_id TEXT NOT NULL,
              schema_version INTEGER NOT NULL,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              app_version TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workspace_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              language TEXT NOT NULL DEFAULT 'zh',
              theme TEXT NOT NULL DEFAULT 'system',
              ai_provider TEXT NOT NULL DEFAULT 'openai',
              ai_base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
              ai_model TEXT NOT NULL DEFAULT 'gpt-4o',
              auto_save INTEGER NOT NULL DEFAULT 1,
              auto_save_interval_ms INTEGER NOT NULL DEFAULT 500,
              window_state_json TEXT NOT NULL DEFAULT '{}',
              updated_at_epoch_ms INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              template TEXT NOT NULL,
              language TEXT NOT NULL,
              theme_json TEXT NOT NULL DEFAULT '{}',
              is_default INTEGER NOT NULL DEFAULT 0,
              target_job_title TEXT,
              target_company TEXT,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS document_sections (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              section_type TEXT NOT NULL,
              title TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0,
              visible INTEGER NOT NULL DEFAULT 1,
              content_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_chat_sessions (
              id TEXT PRIMARY KEY,
              document_id TEXT,
              title TEXT NOT NULL,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS ai_chat_messages (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              metadata_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_analysis_records (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              analysis_type TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              score INTEGER,
              issue_count INTEGER,
              target_job_title TEXT,
              target_company TEXT,
              created_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS interview_sessions (
              id TEXT PRIMARY KEY,
              resume_id TEXT,
              job_description TEXT NOT NULL,
              job_title TEXT NOT NULL DEFAULT '',
              selected_interviewers_json TEXT NOT NULL DEFAULT '[]',
              current_round INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'preparing',
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(resume_id) REFERENCES documents(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS interview_rounds (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              interviewer_type TEXT NOT NULL,
              interviewer_config_json TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'pending',
              question_count INTEGER NOT NULL DEFAULT 0,
              max_questions INTEGER NOT NULL DEFAULT 10,
              summary_json TEXT,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS interview_messages (
              id TEXT PRIMARY KEY,
              round_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              metadata_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(round_id) REFERENCES interview_rounds(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS interview_reports (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL UNIQUE,
              overall_score INTEGER NOT NULL,
              summary TEXT NOT NULL,
              overall_feedback TEXT NOT NULL,
              improvement_suggestions_json TEXT NOT NULL DEFAULT '[]',
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS migration_audit (
              id TEXT PRIMARY KEY,
              run_id TEXT NOT NULL,
              source_kind TEXT NOT NULL,
              source_path TEXT NOT NULL,
              status TEXT NOT NULL,
              imported_count INTEGER NOT NULL DEFAULT 0,
              dropped_count INTEGER NOT NULL DEFAULT 0,
              warning_count INTEGER NOT NULL DEFAULT 0,
              details_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_interview_rounds_session_sort
              ON interview_rounds(session_id, sort_order);
            CREATE INDEX IF NOT EXISTS idx_interview_messages_round_created
              ON interview_messages(round_id, created_at_epoch_ms);
            CREATE INDEX IF NOT EXISTS idx_interview_reports_session
              ON interview_reports(session_id);
            "#,
        )
        .map_err(|error| format!("failed to bootstrap storage schema: {error}"))
}

fn seed_workspace_defaults(connection: &Connection, app_version: &str) -> Result<String, String> {
    let now = now_epoch_ms()? as i64;
    let workspace_id = connection
        .query_row(
            "SELECT workspace_id FROM workspace_metadata WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load workspace metadata: {error}"))?
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workspace_metadata (
              id, workspace_id, schema_version, created_at_epoch_ms, updated_at_epoch_ms, app_version
            ) VALUES (1, ?, ?, ?, ?, ?)
            "#,
            params![
                workspace_id,
                STORAGE_SCHEMA_VERSION as i64,
                now,
                now,
                app_version
            ],
        )
        .map_err(|error| format!("failed to seed workspace metadata: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE workspace_metadata
            SET schema_version = ?, updated_at_epoch_ms = ?, app_version = ?
            WHERE id = 1
            "#,
            params![STORAGE_SCHEMA_VERSION as i64, now, app_version],
        )
        .map_err(|error| format!("failed to update workspace metadata: {error}"))?;

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workspace_settings (
              id, language, theme, ai_provider, ai_base_url, ai_model, auto_save, auto_save_interval_ms,
              window_state_json, updated_at_epoch_ms
            ) VALUES (
              1, 'zh', 'system', 'openai', 'https://api.openai.com/v1', 'gpt-4o', 1, 500, '{}', ?
            )
            "#,
            params![now],
        )
        .map_err(|error| format!("failed to seed workspace settings: {error}"))?;

    Ok(workspace_id)
}

fn collect_table_counts(connection: &Connection) -> Result<Vec<TableCountSnapshot>, String> {
    let tables = [
        "workspace_metadata",
        "workspace_settings",
        "documents",
        "document_sections",
        "ai_chat_sessions",
        "ai_chat_messages",
        "ai_analysis_records",
        "interview_sessions",
        "interview_rounds",
        "interview_messages",
        "interview_reports",
        "migration_audit",
    ];

    tables
        .iter()
        .map(|table| {
            let query = format!("SELECT COUNT(*) FROM {table}");
            let row_count = connection
                .query_row(&query, [], |row| row.get::<_, i64>(0))
                .map_err(|error| format!("failed to count table {table}: {error}"))?;
            Ok(TableCountSnapshot {
                table: (*table).into(),
                row_count,
            })
        })
        .collect()
}

fn now_epoch_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("clock drift detected: {error}"))?;
    Ok(duration.as_millis() as u64)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

// =====================================================
// Interview native storage models
// =====================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewSessionListItem {
    pub id: String,
    pub resume_id: Option<String>,
    pub job_description: String,
    pub job_title: Option<String>,
    pub selected_interviewers: Vec<Value>,
    pub current_round: i32,
    pub total_rounds: i32,
    pub status: String,
    pub has_report: bool,
    pub overall_score: Option<i32>,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewSessionDetail {
    pub id: String,
    pub resume_id: Option<String>,
    pub job_description: String,
    pub job_title: Option<String>,
    pub selected_interviewers: Vec<Value>,
    pub current_round: i32,
    pub total_rounds: i32,
    pub status: String,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
    pub rounds: Vec<InterviewRoundDetail>,
    pub report: Option<InterviewReportRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewRoundDetail {
    pub id: String,
    pub session_id: String,
    pub interviewer_type: String,
    pub interviewer_config: Value,
    pub sort_order: i32,
    pub status: String,
    pub question_count: i32,
    pub max_questions: i32,
    pub summary: Option<Value>,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
    pub messages: Vec<InterviewMessageItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewMessageItem {
    pub id: String,
    pub round_id: String,
    pub role: String,
    pub content: String,
    pub metadata: Value,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewReportRecord {
    pub id: String,
    pub session_id: String,
    pub overall_score: i32,
    pub summary: String,
    pub overall_feedback: String,
    pub improvement_suggestions: Vec<String>,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInterviewRoundInput {
    pub interviewer_type: String,
    pub interviewer_config: Value,
    pub max_questions: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInterviewSessionInput {
    pub resume_id: Option<String>,
    pub job_description: String,
    pub job_title: Option<String>,
    pub rounds: Vec<CreateInterviewRoundInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInterviewMessageMetadataInput {
    pub message_id: String,
    pub metadata: Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddInterviewMessageInput {
    pub round_id: String,
    pub role: String,
    pub content: String,
    pub metadata: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveInterviewReportInput {
    pub session_id: String,
    pub overall_score: i32,
    pub summary: String,
    pub overall_feedback: String,
    pub improvement_suggestions: Vec<String>,
}

pub fn list_interview_sessions(app: &AppHandle) -> Result<Vec<InterviewSessionListItem>, String> {
    let connection = open_initialized_connection(app)?;
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              sessions.id,
              sessions.resume_id,
              sessions.job_description,
              sessions.job_title,
              sessions.selected_interviewers_json,
              sessions.current_round,
              sessions.status,
              COALESCE(round_counts.total_rounds, 0),
              reports.id,
              reports.overall_score,
              sessions.created_at_epoch_ms,
              sessions.updated_at_epoch_ms
            FROM interview_sessions AS sessions
            LEFT JOIN (
              SELECT session_id, COUNT(*) AS total_rounds
              FROM interview_rounds
              GROUP BY session_id
            ) AS round_counts
              ON round_counts.session_id = sessions.id
            LEFT JOIN interview_reports AS reports
              ON reports.session_id = sessions.id
            ORDER BY sessions.updated_at_epoch_ms DESC, sessions.created_at_epoch_ms DESC
            "#,
        )
        .map_err(|error| format!("failed to prepare interview session list query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let job_title = row.get::<_, String>(3)?;
            let report_id = row.get::<_, Option<String>>(8)?;
            Ok(InterviewSessionListItem {
                id: row.get::<_, String>(0)?,
                resume_id: row.get::<_, Option<String>>(1)?,
                job_description: row.get::<_, String>(2)?,
                job_title: empty_string_to_none(job_title),
                selected_interviewers: parse_json_array_or_default(&row.get::<_, String>(4)?, "[]"),
                current_round: row.get::<_, i32>(5)?,
                status: row.get::<_, String>(6)?,
                total_rounds: row.get::<_, i32>(7)?,
                has_report: report_id.is_some(),
                overall_score: row.get::<_, Option<i32>>(9)?,
                created_at_epoch_ms: row.get::<_, i64>(10)?,
                updated_at_epoch_ms: row.get::<_, i64>(11)?,
            })
        })
        .map_err(|error| format!("failed to query interview sessions: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map interview session list row: {error}"))
}

pub fn get_interview_session(
    app: &AppHandle,
    session_id: &str,
) -> Result<Option<InterviewSessionDetail>, String> {
    let connection = open_initialized_connection(app)?;
    load_interview_session_detail(&connection, session_id)
}

pub fn create_interview_session(
    app: &AppHandle,
    input: CreateInterviewSessionInput,
) -> Result<InterviewSessionDetail, String> {
    eprintln!("[DEBUG] create_interview_session called with {} rounds", input.rounds.len());
    for (i, round) in input.rounds.iter().enumerate() {
        eprintln!("[DEBUG] Round {}: interviewerType={}", i + 1, round.interviewer_type);
    }

    let job_description = input.job_description.trim().to_string();
    if job_description.is_empty() {
        return Err("jobDescription is required".into());
    }
    if input.rounds.is_empty() {
        return Err("at least one interview round is required".into());
    }

    let mut connection = open_initialized_connection(app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("failed to start interview session transaction: {error}"))?;

    if let Some(resume_id) = input
        .resume_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let resume_exists = transaction
            .query_row(
                "SELECT 1 FROM documents WHERE id = ?1",
                params![resume_id],
                |_| Ok(true),
            )
            .optional()
            .map_err(|error| format!("failed to validate resume for interview session: {error}"))?
            .unwrap_or(false);
        if !resume_exists {
            return Err(format!("resume not found: {resume_id}"));
        }
    }

    let now = now_epoch_ms()? as i64;
    let session_id = Uuid::new_v4().to_string();
    let selected_interviewers = input
        .rounds
        .iter()
        .map(|round| round.interviewer_config.clone())
        .collect::<Vec<_>>();
    let selected_interviewers_json = serde_json::to_string(&selected_interviewers)
        .map_err(|error| format!("failed to serialize interviewer config list: {error}"))?;
    let resume_id = normalize_optional_string(input.resume_id);
    let job_title = input.job_title.unwrap_or_default().trim().to_string();

    transaction
        .execute(
            r#"
            INSERT INTO interview_sessions (
              id,
              resume_id,
              job_description,
              job_title,
              selected_interviewers_json,
              current_round,
              status,
              created_at_epoch_ms,
              updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, 'preparing', ?6, ?6)
            "#,
            params![
                &session_id,
                &resume_id,
                &job_description,
                &job_title,
                &selected_interviewers_json,
                now
            ],
        )
        .map_err(|error| format!("failed to create interview session: {error}"))?;

    for (index, round) in input.rounds.iter().enumerate() {
        let interviewer_type = round.interviewer_type.trim().to_string();
        eprintln!("[DEBUG] Round {}: interviewerType='{}'", index + 1, interviewer_type);
        if interviewer_type.is_empty() {
            return Err(format!("round {} is missing interviewerType", index + 1));
        }

        let interviewer_config_json = serde_json::to_string(&round.interviewer_config)
            .map_err(|error| format!("failed to serialize round interviewer config: {error}"))?;
        eprintln!("[DEBUG] Round {}: interviewerConfig length={}", index + 1, interviewer_config_json.len());
        let round_id = Uuid::new_v4().to_string();
        let max_questions = round.max_questions.unwrap_or(8).clamp(1, 20);

        transaction
            .execute(
                r#"
                INSERT INTO interview_rounds (
                  id,
                  session_id,
                  interviewer_type,
                  interviewer_config_json,
                  sort_order,
                  status,
                  question_count,
                  max_questions,
                  summary_json,
                  created_at_epoch_ms,
                  updated_at_epoch_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 0, ?6, NULL, ?7, ?7)
                "#,
                params![
                    &round_id,
                    &session_id,
                    &interviewer_type,
                    &interviewer_config_json,
                    index as i32,
                    max_questions,
                    now
                ],
            )
            .map_err(|error| format!("failed to create interview round {}: {error}", index + 1))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("failed to commit interview session transaction: {error}"))?;

    get_interview_session(app, &session_id)?
        .ok_or_else(|| format!("created interview session not found: {session_id}"))
}

pub fn update_interview_message_metadata(
    app: &AppHandle,
    input: UpdateInterviewMessageMetadataInput,
) -> Result<InterviewMessageItem, String> {
    if !input.metadata.is_object() {
        return Err("metadata must be a JSON object".into());
    }

    let connection = open_initialized_connection(app)?;
    let existing = connection
        .query_row(
            "SELECT metadata_json, round_id FROM interview_messages WHERE id = ?1",
            params![&input.message_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| format!("failed to load interview message metadata: {error}"))?
        .ok_or_else(|| format!("interview message not found: {}", input.message_id))?;

    let merged_metadata = merge_json_objects(parse_json_or_default(&existing.0, "{}"), input.metadata)?;
    let now = now_epoch_ms()? as i64;
    connection
        .execute(
            r#"
            UPDATE interview_messages
            SET metadata_json = ?2, updated_at_epoch_ms = ?3
            WHERE id = ?1
            "#,
            params![
                &input.message_id,
                serde_json::to_string(&merged_metadata)
                    .map_err(|error| format!("failed to serialize merged interview metadata: {error}"))?,
                now
            ],
        )
        .map_err(|error| format!("failed to update interview message metadata: {error}"))?;
    touch_interview_round_and_session(&connection, &existing.1, now)?;

    load_interview_message(&connection, &input.message_id)?
        .ok_or_else(|| format!("interview message not found after update: {}", input.message_id))
}

pub fn get_interview_report(
    app: &AppHandle,
    session_id: &str,
) -> Result<Option<InterviewReportRecord>, String> {
    let connection = open_initialized_connection(app)?;
    load_interview_report(&connection, session_id)
}

pub fn add_interview_message(
    app: &AppHandle,
    input: AddInterviewMessageInput,
) -> Result<InterviewMessageItem, String> {
    let round_id = input.round_id.trim().to_string();
    if round_id.is_empty() {
        return Err("roundId is required".into());
    }

    let role = normalize_interview_message_role(&input.role)?;
    let content = input.content.trim().to_string();
    if content.is_empty() {
        return Err("content is required".into());
    }

    let connection = open_initialized_connection(app)?;
    let round_exists = connection
        .query_row(
            "SELECT 1 FROM interview_rounds WHERE id = ?1",
            params![&round_id],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("failed to validate interview round before insert: {error}"))?
        .unwrap_or(false);
    if !round_exists {
        return Err(format!("interview round not found: {round_id}"));
    }

    let now = now_epoch_ms()? as i64;
    let message_id = Uuid::new_v4().to_string();
    let metadata = normalize_metadata_value(input.metadata.unwrap_or_else(|| json!({})))?;

    connection
        .execute(
            r#"
            INSERT INTO interview_messages (
              id,
              round_id,
              role,
              content,
              metadata_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
            "#,
            params![
                &message_id,
                &round_id,
                role,
                &content,
                serde_json::to_string(&metadata)
                    .map_err(|error| format!("failed to serialize interview metadata: {error}"))?,
                now
            ],
        )
        .map_err(|error| format!("failed to insert interview message: {error}"))?;
    touch_interview_round_and_session(&connection, &round_id, now)?;

    load_interview_message(&connection, &message_id)?
        .ok_or_else(|| format!("interview message not found after insert: {message_id}"))
}

pub fn mark_interview_round_in_progress(
    app: &AppHandle,
    session_id: &str,
    round_id: &str,
) -> Result<(), String> {
    let connection = open_initialized_connection(app)?;
    let now = now_epoch_ms()? as i64;

    connection
        .execute(
            r#"
            UPDATE interview_rounds
            SET status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
                updated_at_epoch_ms = ?2
            WHERE id = ?1
            "#,
            params![round_id, now],
        )
        .map_err(|error| format!("failed to mark interview round in progress: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE interview_sessions
            SET status = CASE WHEN status IN ('preparing', 'paused') THEN 'in_progress' ELSE status END,
                updated_at_epoch_ms = ?2
            WHERE id = ?1
            "#,
            params![session_id, now],
        )
        .map_err(|error| format!("failed to mark interview session in progress: {error}"))?;

    Ok(())
}

pub fn increment_interview_round_question_count(
    app: &AppHandle,
    round_id: &str,
) -> Result<(), String> {
    let connection = open_initialized_connection(app)?;
    let now = now_epoch_ms()? as i64;
    connection
        .execute(
            r#"
            UPDATE interview_rounds
            SET question_count = question_count + 1,
                updated_at_epoch_ms = ?2
            WHERE id = ?1
            "#,
            params![round_id, now],
        )
        .map_err(|error| format!("failed to increment interview round question count: {error}"))?;
    touch_interview_round_and_session(&connection, round_id, now)?;
    Ok(())
}

pub fn complete_interview_round(
    app: &AppHandle,
    session_id: &str,
    round_id: &str,
    summary_text: Option<String>,
    skipped: bool,
) -> Result<InterviewSessionDetail, String> {
    let connection = open_initialized_connection(app)?;
    let now = now_epoch_ms()? as i64;
    let rounds = load_interview_rounds(&connection, session_id)?;
    let current_index = rounds
        .iter()
        .position(|round| round.id == round_id)
        .ok_or_else(|| format!("interview round not found for session {session_id}: {round_id}"))?;

    let next_round = rounds.get(current_index + 1);
    let round_status = if skipped { "skipped" } else { "completed" };
    let summary_json = summary_text
        .map(|summary| json!({ "feedback": summary }))
        .map(|value| {
            serde_json::to_string(&value)
                .map_err(|error| format!("failed to serialize interview round summary: {error}"))
        })
        .transpose()?;

    connection
        .execute(
            r#"
            UPDATE interview_rounds
            SET status = ?2,
                summary_json = ?3,
                updated_at_epoch_ms = ?4
            WHERE id = ?1
            "#,
            params![round_id, round_status, summary_json, now],
        )
        .map_err(|error| format!("failed to complete interview round: {error}"))?;

    if let Some(next_round) = next_round {
        connection
            .execute(
                r#"
                UPDATE interview_sessions
                SET current_round = ?2,
                    status = 'in_progress',
                    updated_at_epoch_ms = ?3
                WHERE id = ?1
                "#,
                params![session_id, next_round.sort_order, now],
            )
            .map_err(|error| format!("failed to advance interview session round: {error}"))?;
    } else {
        connection
            .execute(
                r#"
                UPDATE interview_sessions
                SET status = 'completed',
                    updated_at_epoch_ms = ?2
                WHERE id = ?1
                "#,
                params![session_id, now],
            )
            .map_err(|error| format!("failed to complete interview session: {error}"))?;
    }

    load_interview_session_detail(&connection, session_id)?
        .ok_or_else(|| format!("interview session not found after completing round: {session_id}"))
}

pub fn save_interview_report(
    app: &AppHandle,
    input: SaveInterviewReportInput,
) -> Result<InterviewReportRecord, String> {
    let connection = open_initialized_connection(app)?;
    let session_exists = connection
        .query_row(
            "SELECT 1 FROM interview_sessions WHERE id = ?1",
            params![&input.session_id],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("failed to validate interview session before saving report: {error}"))?
        .unwrap_or(false);
    if !session_exists {
        return Err(format!("interview session not found: {}", input.session_id));
    }

    let summary = input.summary.trim().to_string();
    let overall_feedback = input.overall_feedback.trim().to_string();
    if summary.is_empty() {
        return Err("report summary is required".into());
    }
    if overall_feedback.is_empty() {
        return Err("report overallFeedback is required".into());
    }

    let now = now_epoch_ms()? as i64;
    let report_id = load_interview_report(&connection, &input.session_id)?
        .map(|report| report.id)
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let improvement_suggestions_json = serde_json::to_string(&input.improvement_suggestions)
        .map_err(|error| format!("failed to serialize interview improvement suggestions: {error}"))?;

    connection
        .execute(
            r#"
            INSERT INTO interview_reports (
              id,
              session_id,
              overall_score,
              summary,
              overall_feedback,
              improvement_suggestions_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
            ON CONFLICT(session_id) DO UPDATE SET
              id = excluded.id,
              overall_score = excluded.overall_score,
              summary = excluded.summary,
              overall_feedback = excluded.overall_feedback,
              improvement_suggestions_json = excluded.improvement_suggestions_json,
              updated_at_epoch_ms = excluded.updated_at_epoch_ms
            "#,
            params![
                report_id,
                input.session_id,
                input.overall_score.clamp(0, 100),
                summary,
                overall_feedback,
                improvement_suggestions_json,
                now
            ],
        )
        .map_err(|error| format!("failed to save interview report: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE interview_sessions
            SET updated_at_epoch_ms = ?2
            WHERE id = ?1
            "#,
            params![&input.session_id, now],
        )
        .map_err(|error| format!("failed to touch interview session after report save: {error}"))?;

    load_interview_report(&connection, &input.session_id)?
        .ok_or_else(|| format!("interview report not found after save: {}", input.session_id))
}

fn load_interview_session_detail(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<InterviewSessionDetail>, String> {
    let session = connection
        .query_row(
            r#"
            SELECT
              id,
              resume_id,
              job_description,
              job_title,
              selected_interviewers_json,
              current_round,
              status,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM interview_sessions
            WHERE id = ?1
            "#,
            params![session_id],
            |row| {
                let job_title = row.get::<_, String>(3)?;
                Ok(InterviewSessionDetail {
                    id: row.get::<_, String>(0)?,
                    resume_id: row.get::<_, Option<String>>(1)?,
                    job_description: row.get::<_, String>(2)?,
                    job_title: empty_string_to_none(job_title),
                    selected_interviewers: parse_json_array_or_default(
                        &row.get::<_, String>(4)?,
                        "[]",
                    ),
                    current_round: row.get::<_, i32>(5)?,
                    total_rounds: 0,
                    status: row.get::<_, String>(6)?,
                    created_at_epoch_ms: row.get::<_, i64>(7)?,
                    updated_at_epoch_ms: row.get::<_, i64>(8)?,
                    rounds: Vec::new(),
                    report: None,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query interview session {session_id}: {error}"))?;

    let Some(mut session) = session else {
        return Ok(None);
    };

    session.rounds = load_interview_rounds(connection, session_id)?;
    session.total_rounds = session.rounds.len() as i32;
    session.report = load_interview_report(connection, session_id)?;
    Ok(Some(session))
}

fn load_interview_rounds(
    connection: &Connection,
    session_id: &str,
) -> Result<Vec<InterviewRoundDetail>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              session_id,
              interviewer_type,
              interviewer_config_json,
              sort_order,
              status,
              question_count,
              max_questions,
              summary_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM interview_rounds
            WHERE session_id = ?1
            ORDER BY sort_order ASC, created_at_epoch_ms ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare interview round query: {error}"))?;

    let rows = statement
        .query_map(params![session_id], |row| {
            Ok(InterviewRoundDetail {
                id: row.get::<_, String>(0)?,
                session_id: row.get::<_, String>(1)?,
                interviewer_type: row.get::<_, String>(2)?,
                interviewer_config: parse_json_or_default(&row.get::<_, String>(3)?, "{}"),
                sort_order: row.get::<_, i32>(4)?,
                status: row.get::<_, String>(5)?,
                question_count: row.get::<_, i32>(6)?,
                max_questions: row.get::<_, i32>(7)?,
                summary: row
                    .get::<_, Option<String>>(8)?
                    .map(|raw| parse_json_or_default(&raw, "{}")),
                created_at_epoch_ms: row.get::<_, i64>(9)?,
                updated_at_epoch_ms: row.get::<_, i64>(10)?,
                messages: Vec::new(),
            })
        })
        .map_err(|error| format!("failed to query interview rounds for {session_id}: {error}"))?;

    let mut rounds = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map interview rounds for {session_id}: {error}"))?;

    for round in &mut rounds {
        round.messages = load_interview_messages(connection, &round.id)?;
    }

    Ok(rounds)
}

fn load_interview_messages(
    connection: &Connection,
    round_id: &str,
) -> Result<Vec<InterviewMessageItem>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              round_id,
              role,
              content,
              metadata_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM interview_messages
            WHERE round_id = ?1
            ORDER BY created_at_epoch_ms ASC, id ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare interview message query: {error}"))?;

    let rows = statement
        .query_map(params![round_id], |row| {
            Ok(InterviewMessageItem {
                id: row.get::<_, String>(0)?,
                round_id: row.get::<_, String>(1)?,
                role: row.get::<_, String>(2)?,
                content: row.get::<_, String>(3)?,
                metadata: parse_json_or_default(&row.get::<_, String>(4)?, "{}"),
                created_at_epoch_ms: row.get::<_, i64>(5)?,
                updated_at_epoch_ms: row.get::<_, i64>(6)?,
            })
        })
        .map_err(|error| format!("failed to query interview messages for {round_id}: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to map interview messages for {round_id}: {error}"))
}

fn load_interview_message(
    connection: &Connection,
    message_id: &str,
) -> Result<Option<InterviewMessageItem>, String> {
    connection
        .query_row(
            r#"
            SELECT
              id,
              round_id,
              role,
              content,
              metadata_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM interview_messages
            WHERE id = ?1
            "#,
            params![message_id],
            |row| {
                Ok(InterviewMessageItem {
                    id: row.get::<_, String>(0)?,
                    round_id: row.get::<_, String>(1)?,
                    role: row.get::<_, String>(2)?,
                    content: row.get::<_, String>(3)?,
                    metadata: parse_json_or_default(&row.get::<_, String>(4)?, "{}"),
                    created_at_epoch_ms: row.get::<_, i64>(5)?,
                    updated_at_epoch_ms: row.get::<_, i64>(6)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query interview message {message_id}: {error}"))
}

fn load_interview_report(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<InterviewReportRecord>, String> {
    connection
        .query_row(
            r#"
            SELECT
              id,
              session_id,
              overall_score,
              summary,
              overall_feedback,
              improvement_suggestions_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM interview_reports
            WHERE session_id = ?1
            "#,
            params![session_id],
            |row| {
                Ok(InterviewReportRecord {
                    id: row.get::<_, String>(0)?,
                    session_id: row.get::<_, String>(1)?,
                    overall_score: row.get::<_, i32>(2)?,
                    summary: row.get::<_, String>(3)?,
                    overall_feedback: row.get::<_, String>(4)?,
                    improvement_suggestions: parse_string_array_or_default(
                        &row.get::<_, String>(5)?,
                        "[]",
                    ),
                    created_at_epoch_ms: row.get::<_, i64>(6)?,
                    updated_at_epoch_ms: row.get::<_, i64>(7)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query interview report for {session_id}: {error}"))
}

fn touch_interview_round_and_session(
    connection: &Connection,
    round_id: &str,
    now: i64,
) -> Result<(), String> {
    let session_id = connection
        .query_row(
            "SELECT session_id FROM interview_rounds WHERE id = ?1",
            params![round_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to resolve interview round session linkage: {error}"))?
        .ok_or_else(|| format!("interview round not found: {round_id}"))?;

    connection
        .execute(
            "UPDATE interview_rounds SET updated_at_epoch_ms = ?2 WHERE id = ?1",
            params![round_id, now],
        )
        .map_err(|error| format!("failed to touch interview round {round_id}: {error}"))?;
    connection
        .execute(
            "UPDATE interview_sessions SET updated_at_epoch_ms = ?2 WHERE id = ?1",
            params![session_id, now],
        )
        .map_err(|error| format!("failed to touch interview session for round {round_id}: {error}"))?;

    Ok(())
}

fn normalize_interview_message_role(role: &str) -> Result<&'static str, String> {
    match role.trim() {
        "interviewer" => Ok("interviewer"),
        "candidate" => Ok("candidate"),
        "system" => Ok("system"),
        other => Err(format!(
            "unsupported interview message role '{other}', expected interviewer|candidate|system"
        )),
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|inner| inner.trim().to_string())
        .filter(|inner| !inner.is_empty())
}

fn empty_string_to_none(value: String) -> Option<String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

fn normalize_metadata_value(value: Value) -> Result<Value, String> {
    if value.is_object() {
        Ok(value)
    } else {
        Err("metadata must be a JSON object".into())
    }
}

fn merge_json_objects(existing: Value, patch: Value) -> Result<Value, String> {
    let Some(existing_map) = existing.as_object() else {
        return Err("existing metadata is not a JSON object".into());
    };
    let Some(patch_map) = patch.as_object() else {
        return Err("patch metadata is not a JSON object".into());
    };

    let mut merged = existing_map.clone();
    for (key, value) in patch_map {
        merged.insert(key.clone(), value.clone());
    }
    Ok(Value::Object(merged))
}

fn parse_json_array_or_default(raw: &str, fallback: &str) -> Vec<Value> {
    parse_json_or_default(raw, fallback)
        .as_array()
        .cloned()
        .unwrap_or_default()
}

fn parse_string_array_or_default(raw: &str, fallback: &str) -> Vec<String> {
    parse_json_or_default(raw, fallback)
        .as_array()
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str().map(ToString::to_string))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

// =====================================================
// Document CRUD operations for Dashboard
// =====================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentListItem {
    pub id: String,
    pub title: String,
    pub template: String,
    pub language: String,
    pub theme_json: String,
    pub is_default: bool,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDetail {
    pub id: String,
    pub title: String,
    pub template: String,
    pub language: String,
    pub theme_json: String,
    pub is_default: bool,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
    pub sections: Vec<DocumentSectionItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSectionItem {
    pub id: String,
    pub document_id: String,
    pub section_type: String,
    pub title: String,
    pub sort_order: i32,
    pub visible: bool,
    pub content_json: String,
    pub created_at_epoch_ms: i64,
    pub updated_at_epoch_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDocumentInput {
    pub title: Option<String>,
    pub template: Option<String>,
    pub language: Option<String>,
    pub theme_json: Option<String>,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocumentInput {
    pub id: String,
    pub title: Option<String>,
    pub template: Option<String>,
    pub language: Option<String>,
    pub theme_json: Option<String>,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDocumentInput {
    pub title: String,
    pub template: Option<String>,
    pub theme_json: Option<String>,
    pub language: Option<String>,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
    pub sections: Vec<ImportSectionInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSectionInput {
    pub section_type: String,
    pub title: String,
    pub sort_order: Option<i32>,
    pub visible: Option<bool>,
    pub content: Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentSectionInput {
    pub id: String,
    pub document_id: String,
    pub section_type: String,
    pub title: String,
    pub sort_order: i32,
    pub visible: bool,
    pub content: Value,
    pub created_at_epoch_ms: Option<i64>,
    pub updated_at_epoch_ms: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentInput {
    pub id: String,
    pub title: String,
    pub template: String,
    pub language: String,
    pub theme_json: String,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
    pub sections: Vec<SaveDocumentSectionInput>,
}

pub fn list_documents(app: &AppHandle) -> Result<Vec<DocumentListItem>, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              title,
              template,
              language,
              theme_json,
              is_default,
              target_job_title,
              target_company,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM documents
            ORDER BY updated_at_epoch_ms DESC
            "#,
        )
        .map_err(|error| format!("failed to prepare document list query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(DocumentListItem {
                id: row.get::<_, String>(0)?,
                title: row.get::<_, String>(1)?,
                template: row.get::<_, String>(2)?,
                language: row.get::<_, String>(3)?,
                theme_json: row.get::<_, String>(4)?,
                is_default: row.get::<_, i64>(5)? != 0,
                target_job_title: row.get::<_, Option<String>>(6)?,
                target_company: row.get::<_, Option<String>>(7)?,
                created_at_epoch_ms: row.get::<_, i64>(8)?,
                updated_at_epoch_ms: row.get::<_, i64>(9)?,
            })
        })
        .map_err(|error| format!("failed to query documents: {error}"))?;

    let mut documents = Vec::new();
    for row in rows {
        documents.push(row.map_err(|error| format!("failed to map document row: {error}"))?);
    }

    Ok(documents)
}

pub fn get_document(app: &AppHandle, document_id: &str) -> Result<Option<DocumentDetail>, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let document = connection
        .query_row(
            r#"
            SELECT
              id,
              title,
              template,
              language,
              theme_json,
              is_default,
              target_job_title,
              target_company,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM documents
            WHERE id = ?1
            "#,
            params![document_id],
            |row| {
                Ok(DocumentDetail {
                    id: row.get::<_, String>(0)?,
                    title: row.get::<_, String>(1)?,
                    template: row.get::<_, String>(2)?,
                    language: row.get::<_, String>(3)?,
                    theme_json: row.get::<_, String>(4)?,
                    is_default: row.get::<_, i64>(5)? != 0,
                    target_job_title: row.get::<_, Option<String>>(6)?,
                    target_company: row.get::<_, Option<String>>(7)?,
                    created_at_epoch_ms: row.get::<_, i64>(8)?,
                    updated_at_epoch_ms: row.get::<_, i64>(9)?,
                    sections: Vec::new(),
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query document {document_id}: {error}"))?;

    let mut document = match document {
        Some(doc) => doc,
        None => return Ok(None),
    };

    document.sections = load_document_sections_for_detail(&connection, document_id)?;
    Ok(Some(document))
}

fn load_document_sections_for_detail(
    connection: &Connection,
    document_id: &str,
) -> Result<Vec<DocumentSectionItem>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT
              id,
              document_id,
              section_type,
              title,
              sort_order,
              visible,
              content_json,
              created_at_epoch_ms,
              updated_at_epoch_ms
            FROM document_sections
            WHERE document_id = ?1
            ORDER BY sort_order ASC, created_at_epoch_ms ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare section query: {error}"))?;

    let rows = statement
        .query_map(params![document_id], |row| {
            Ok(DocumentSectionItem {
                id: row.get::<_, String>(0)?,
                document_id: row.get::<_, String>(1)?,
                section_type: row.get::<_, String>(2)?,
                title: row.get::<_, String>(3)?,
                sort_order: row.get::<_, i32>(4)?,
                visible: row.get::<_, i64>(5)? != 0,
                content_json: row.get::<_, String>(6)?,
                created_at_epoch_ms: row.get::<_, i64>(7)?,
                updated_at_epoch_ms: row.get::<_, i64>(8)?,
            })
        })
        .map_err(|error| format!("failed to query sections for {document_id}: {error}"))?;

    let mut sections = Vec::new();
    for row in rows {
        sections.push(row.map_err(|error| format!("failed to map section row: {error}"))?);
    }

    Ok(sections)
}

pub fn create_document(
    app: &AppHandle,
    input: CreateDocumentInput,
) -> Result<DocumentDetail, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let now = now_epoch_ms()? as i64;
    let document_id = Uuid::new_v4().to_string();
    let title = input.title.unwrap_or_else(|| "Untitled Resume".to_string());
    let template = input.template.unwrap_or_else(|| "classic".to_string());
    let language = input.language.unwrap_or_else(|| "zh".to_string());
    let theme_json = input.theme_json.unwrap_or_else(|| "{}".to_string());

    connection
        .execute(
            r#"
            INSERT INTO documents (
              id, title, template, language, theme_json, is_default,
              target_job_title, target_company, created_at_epoch_ms, updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?8)
            "#,
            params![
                document_id,
                title,
                template,
                language,
                theme_json,
                input.target_job_title,
                input.target_company,
                now
            ],
        )
        .map_err(|error| format!("failed to create document: {error}"))?;

    // Create default sections for a new resume
    create_default_sections(&connection, &document_id, &language, now)?;

    Ok(DocumentDetail {
        id: document_id.clone(),
        title,
        template,
        language,
        theme_json,
        is_default: false,
        target_job_title: input.target_job_title,
        target_company: input.target_company,
        created_at_epoch_ms: now,
        updated_at_epoch_ms: now,
        sections: load_document_sections_for_detail(&connection, &document_id)?,
    })
}

fn create_default_sections(
    connection: &Connection,
    document_id: &str,
    language: &str,
    now: i64,
) -> Result<(), String> {
    let default_sections = [
        ("personal_info", "Personal Info", 0),
        ("summary", "Summary", 1),
        ("work_experience", "Work Experience", 2),
        ("education", "Education", 3),
        ("skills", "Skills", 4),
    ];

    let title_prefix = if language == "zh" {
        [("个人信息", 0), ("个人简介", 1), ("工作经历", 2), ("教育背景", 3), ("技能特长", 4)]
    } else {
        [("Personal Info", 0), ("Summary", 1), ("Work Experience", 2), ("Education", 3), ("Skills", 4)]
    };

    for (idx, (section_type, default_title, _sort_order)) in default_sections.iter().enumerate() {
        let section_id = Uuid::new_v4().to_string();
        let title = title_prefix.get(idx).map(|(t, _)| *t).unwrap_or(default_title);
        let sort_order = title_prefix.get(idx).map(|(_, s)| *s).unwrap_or(*_sort_order) as i32;

        connection
            .execute(
                r#"
                INSERT INTO document_sections (
                  id, document_id, section_type, title, sort_order, visible,
                  content_json, created_at_epoch_ms, updated_at_epoch_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, 1, '{}', ?6, ?6)
                "#,
                params![section_id, document_id, section_type, title, sort_order, now],
            )
            .map_err(|error| format!("failed to create default section: {error}"))?;
    }

    Ok(())
}

pub fn update_document(
    app: &AppHandle,
    input: UpdateDocumentInput,
) -> Result<DocumentDetail, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    // Check if document exists
    let exists: bool = connection
        .query_row(
            "SELECT 1 FROM documents WHERE id = ?1",
            params![input.id],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("failed to check document existence: {error}"))?
        .unwrap_or(false);

    if !exists {
        return Err(format!("document not found: {}", input.id));
    }

    let now = now_epoch_ms()? as i64;

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(title) = &input.title {
        updates.push("title = ?");
        params_vec.push(Box::new(title.clone()));
    }
    if let Some(template) = &input.template {
        updates.push("template = ?");
        params_vec.push(Box::new(template.clone()));
    }
    if let Some(language) = &input.language {
        updates.push("language = ?");
        params_vec.push(Box::new(language.clone()));
    }
    if let Some(theme_json) = &input.theme_json {
        updates.push("theme_json = ?");
        params_vec.push(Box::new(theme_json.clone()));
    }
    if input.target_job_title.is_some() {
        updates.push("target_job_title = ?");
        params_vec.push(Box::new(input.target_job_title.clone()));
    }
    if input.target_company.is_some() {
        updates.push("target_company = ?");
        params_vec.push(Box::new(input.target_company.clone()));
    }

    if !updates.is_empty() {
        updates.push("updated_at_epoch_ms = ?");
        params_vec.push(Box::new(now));

        let query = format!(
            "UPDATE documents SET {} WHERE id = ?",
            updates.join(", ")
        );

        params_vec.push(Box::new(input.id.clone()));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        connection
            .execute(&query, params_refs.as_slice())
            .map_err(|error| format!("failed to update document: {error}"))?;
    }

    get_document(app, &input.id)?.ok_or_else(|| format!("document not found after update: {}", input.id))
}

pub fn delete_document(app: &AppHandle, document_id: &str) -> Result<bool, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let rows_affected = connection
        .execute(
            "DELETE FROM documents WHERE id = ?1",
            params![document_id],
        )
        .map_err(|error| format!("failed to delete document: {error}"))?;

    Ok(rows_affected > 0)
}

pub fn duplicate_document(app: &AppHandle, document_id: &str) -> Result<DocumentDetail, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    // Get source document
    let source = connection
        .query_row(
            r#"
            SELECT
              title, template, language, theme_json, target_job_title, target_company
            FROM documents
            WHERE id = ?1
            "#,
            params![document_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to query source document: {error}"))?
        .ok_or_else(|| format!("source document not found: {document_id}"))?;

    let (title, template, language, theme_json, target_job_title, target_company) = source;
    let now = now_epoch_ms()? as i64;
    let new_document_id = Uuid::new_v4().to_string();
    let new_title = format!("{} (Copy)", title);

    // Create new document
    connection
        .execute(
            r#"
            INSERT INTO documents (
              id, title, template, language, theme_json, is_default,
              target_job_title, target_company, created_at_epoch_ms, updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?8)
            "#,
            params![
                new_document_id,
                new_title,
                template,
                language,
                theme_json,
                target_job_title,
                target_company,
                now
            ],
        )
        .map_err(|error| format!("failed to duplicate document: {error}"))?;

    // Copy sections
    let mut statement = connection
        .prepare(
            r#"
            SELECT section_type, title, sort_order, visible, content_json
            FROM document_sections
            WHERE document_id = ?1
            ORDER BY sort_order ASC
            "#,
        )
        .map_err(|error| format!("failed to prepare section copy query: {error}"))?;

    let sections = statement
        .query_map(params![document_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, i64>(3)? != 0,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|error| format!("failed to query sections for copy: {error}"))?;

    for section in sections {
        let (section_type, title, sort_order, visible, content_json) =
            section.map_err(|error| format!("failed to map section for copy: {error}"))?;
        let new_section_id = Uuid::new_v4().to_string();

        connection
            .execute(
                r#"
                INSERT INTO document_sections (
                  id, document_id, section_type, title, sort_order, visible,
                  content_json, created_at_epoch_ms, updated_at_epoch_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
                "#,
                params![
                    new_section_id,
                    new_document_id,
                    section_type,
                    title,
                    sort_order,
                    visible as i64,
                    content_json,
                    now
                ],
            )
            .map_err(|error| format!("failed to copy section: {error}"))?;
    }

    get_document(app, &new_document_id)?.ok_or_else(|| format!("duplicated document not found: {new_document_id}"))
}

pub fn import_document(
    app: &AppHandle,
    input: ImportDocumentInput,
) -> Result<DocumentDetail, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let now = now_epoch_ms()? as i64;
    let document_id = Uuid::new_v4().to_string();
    let template = input.template.unwrap_or_else(|| "classic".to_string());
    let language = input.language.unwrap_or_else(|| "zh".to_string());
    let theme_json = input.theme_json.unwrap_or_else(|| "{}".to_string());

    connection
        .execute(
            r#"
            INSERT INTO documents (
              id, title, template, language, theme_json, is_default,
              target_job_title, target_company, created_at_epoch_ms, updated_at_epoch_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?8)
            "#,
            params![
                document_id,
                input.title,
                template,
                language,
                theme_json,
                input.target_job_title,
                input.target_company,
                now
            ],
        )
        .map_err(|error| format!("failed to import document: {error}"))?;

    // Import sections
    for (idx, section_input) in input.sections.into_iter().enumerate() {
        let section_id = Uuid::new_v4().to_string();
        let sort_order = section_input.sort_order.unwrap_or(idx as i32);
        let visible = section_input.visible.unwrap_or(true);
        let content_json = serde_json::to_string(&section_input.content)
            .map_err(|error| format!("failed to serialize section content: {error}"))?;

        connection
            .execute(
                r#"
                INSERT INTO document_sections (
                  id, document_id, section_type, title, sort_order, visible,
                  content_json, created_at_epoch_ms, updated_at_epoch_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
                "#,
                params![
                    section_id,
                    document_id,
                    section_input.section_type,
                    section_input.title,
                    sort_order,
                    visible as i64,
                    content_json,
                    now
                ],
            )
            .map_err(|error| format!("failed to import section: {error}"))?;
    }

    get_document(app, &document_id)?.ok_or_else(|| format!("imported document not found: {document_id}"))
}

pub fn rename_document(
    app: &AppHandle,
    document_id: &str,
    new_title: &str,
) -> Result<DocumentDetail, String> {
    update_document(
        app,
        UpdateDocumentInput {
            id: document_id.to_string(),
            title: Some(new_title.to_string()),
            template: None,
            language: None,
            theme_json: None,
            target_job_title: None,
            target_company: None,
        },
    )
}

pub fn save_document(app: &AppHandle, input: SaveDocumentInput) -> Result<DocumentDetail, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;
    let app_version = app.package_info().version.to_string();

    let mut connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;
    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    seed_workspace_defaults(&connection, &app_version)?;

    let exists: bool = connection
        .query_row(
            "SELECT 1 FROM documents WHERE id = ?1",
            params![input.id],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("failed to check document existence: {error}"))?
        .unwrap_or(false);

    if !exists {
        return Err(format!("document not found: {}", input.id));
    }

    let now = now_epoch_ms()? as i64;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("failed to start save transaction: {error}"))?;

    transaction
        .execute(
            r#"
            UPDATE documents
            SET title = ?2,
                template = ?3,
                language = ?4,
                theme_json = ?5,
                target_job_title = ?6,
                target_company = ?7,
                updated_at_epoch_ms = ?8
            WHERE id = ?1
            "#,
            params![
                input.id,
                input.title,
                input.template,
                input.language,
                input.theme_json,
                input.target_job_title,
                input.target_company,
                now
            ],
        )
        .map_err(|error| format!("failed to update document during save: {error}"))?;

    transaction
        .execute(
            "DELETE FROM document_sections WHERE document_id = ?1",
            params![input.id],
        )
        .map_err(|error| format!("failed to clear existing sections during save: {error}"))?;

    for (index, section) in input.sections.iter().enumerate() {
        let content_json = serde_json::to_string(&section.content)
            .map_err(|error| format!("failed to serialize section content: {error}"))?;
        let section_id = if section.id.trim().is_empty() {
            Uuid::new_v4().to_string()
        } else {
            section.id.clone()
        };
        let document_id = if section.document_id.trim().is_empty() {
            input.id.clone()
        } else {
            section.document_id.clone()
        };
        let created_at_epoch_ms = section.created_at_epoch_ms.unwrap_or(now);
        let updated_at_epoch_ms = section.updated_at_epoch_ms.unwrap_or(now);

        transaction
            .execute(
                r#"
                INSERT INTO document_sections (
                  id,
                  document_id,
                  section_type,
                  title,
                  sort_order,
                  visible,
                  content_json,
                  created_at_epoch_ms,
                  updated_at_epoch_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                "#,
                params![
                    section_id,
                    document_id,
                    section.section_type,
                    section.title,
                    section.sort_order.max(index as i32),
                    section.visible as i64,
                    content_json,
                    created_at_epoch_ms,
                    updated_at_epoch_ms
                ],
            )
            .map_err(|error| format!("failed to save section {}: {error}", section.title))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("failed to commit save transaction: {error}"))?;

    get_document(app, &input.id)?
        .ok_or_else(|| format!("document not found after save: {}", input.id))
}
