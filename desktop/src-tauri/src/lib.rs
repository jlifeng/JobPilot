mod ai;
mod domain;
mod importer;
mod legacy_import_contract;
mod release;
mod settings;
mod storage;
mod workspace;

use ai::{ConnectivityTestResult, FetchAiModelsResult, ParseMarkdownResumeInput, ParsedResumeData, ParsePdfResumeInput};
use domain::DomainContractSummary;
use importer::{
    ImporterExecutionPlan, ImporterRunResult, ImporterState, LegacyDiscoveryInput, LegacyImporter,
    MigrationExecutionResult, StagingExecutionResult,
};
use legacy_import_contract::LegacyImportContract;
use release::{AppUpdateCheckResult, ReleaseReadinessSnapshot};
use serde::Serialize;
use settings::{
    ProviderConfigUpdateInput, SecretInventorySnapshot, SecretValueWriteInput, SecretVaultStatus,
    WorkspaceAppearanceSettingsUpdateInput, WorkspaceSettingsDocument,
};
use storage::{
    CreateDocumentInput, CreateInterviewSessionInput, DocumentDetail, DocumentListItem,
    ImportDocumentInput, InterviewMessageItem, InterviewReportRecord,
    InterviewSessionDetail, InterviewSessionListItem, SaveDocumentInput, StorageSnapshot,
    TemplateValidationExportWriteResult, TemplateValidationSnapshot, UpdateDocumentInput,
    UpdateInterviewMessageMetadataInput,
};
use tauri::Manager;
use workspace::WorkspaceSnapshot;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapContext {
    app_name: String,
    app_version: String,
    frontend_shell: String,
    runtime: String,
    platform: String,
    build_channel: String,
    branch: String,
    runtime_mode: String,
    supports_native_commands: bool,
    limitations: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImporterDryRunSnapshot {
    plan: ImporterExecutionPlan,
    result: ImporterRunResult,
    staging_execution: Option<StagingExecutionResult>,
    migration_execution: Option<MigrationExecutionResult>,
}

enum ImporterExecutionMode {
    DryRun,
    Staging,
    Migration,
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn get_bootstrap_context(app: tauri::AppHandle) -> BootstrapContext {
    BootstrapContext {
        app_name: app.package_info().name.clone(),
        app_version: app.package_info().version.to_string(),
        frontend_shell: "React + Vite + TanStack Router + react-i18next".into(),
        runtime: "Tauri + Rust bootstrap shell".into(),
        platform: std::env::consts::OS.into(),
        build_channel: if cfg!(debug_assertions) {
            "development".into()
        } else {
            "production".into()
        },
        branch: "tauri-rust-desktop-rewrite".into(),
        runtime_mode: "tauri".into(),
        supports_native_commands: true,
        limitations: Vec::new(),
    }
}

#[tauri::command]
fn get_workspace_snapshot(app: tauri::AppHandle) -> Result<WorkspaceSnapshot, String> {
    workspace::get_workspace_snapshot(&app)
}

#[tauri::command]
fn get_domain_contract_summary() -> DomainContractSummary {
    domain::domain_contract_summary()
}

#[tauri::command]
fn get_legacy_import_contract() -> LegacyImportContract {
    legacy_import_contract::build_legacy_import_contract()
}

#[tauri::command]
fn get_storage_snapshot(app: tauri::AppHandle) -> Result<StorageSnapshot, String> {
    storage::get_storage_snapshot(&app)
}

#[tauri::command]
fn list_documents(app: tauri::AppHandle) -> Result<Vec<DocumentListItem>, String> {
    storage::list_documents(&app)
}

#[tauri::command]
fn get_document(
    app: tauri::AppHandle,
    document_id: String,
) -> Result<Option<DocumentDetail>, String> {
    storage::get_document(&app, &document_id)
}

#[tauri::command]
fn create_document(
    app: tauri::AppHandle,
    input: CreateDocumentInput,
) -> Result<DocumentDetail, String> {
    storage::create_document(&app, input)
}

#[tauri::command]
fn update_document_metadata(
    app: tauri::AppHandle,
    input: UpdateDocumentInput,
) -> Result<DocumentDetail, String> {
    storage::update_document(&app, input)
}

#[tauri::command]
fn save_document(app: tauri::AppHandle, input: SaveDocumentInput) -> Result<DocumentDetail, String> {
    storage::save_document(&app, input)
}

#[tauri::command]
fn delete_document(app: tauri::AppHandle, document_id: String) -> Result<bool, String> {
    storage::delete_document(&app, &document_id)
}

#[tauri::command]
fn duplicate_document(
    app: tauri::AppHandle,
    document_id: String,
) -> Result<DocumentDetail, String> {
    storage::duplicate_document(&app, &document_id)
}

#[tauri::command]
fn import_document(
    app: tauri::AppHandle,
    input: ImportDocumentInput,
) -> Result<DocumentDetail, String> {
    storage::import_document(&app, input)
}

#[tauri::command]
fn rename_document(
    app: tauri::AppHandle,
    document_id: String,
    new_title: String,
) -> Result<DocumentDetail, String> {
    storage::rename_document(&app, &document_id, &new_title)
}

#[tauri::command]
fn get_template_validation_snapshot(
    app: tauri::AppHandle,
) -> Result<TemplateValidationSnapshot, String> {
    storage::get_template_validation_snapshot(&app)
}

#[tauri::command]
fn write_template_validation_export(
    app: tauri::AppHandle,
    file_name: Option<String>,
    output_path: Option<String>,
    html: String,
) -> Result<TemplateValidationExportWriteResult, String> {
    storage::write_template_validation_export(&app, file_name, output_path, html)
}

#[tauri::command]
fn write_export_file(
    output_path: String,
    expected_extension: String,
    bytes: Vec<u8>,
) -> Result<TemplateValidationExportWriteResult, String> {
    storage::write_export_file(output_path, expected_extension, bytes)
}

#[tauri::command]
fn write_pdf_export(
    app: tauri::AppHandle,
    output_path: String,
    html: String,
) -> Result<TemplateValidationExportWriteResult, String> {
    storage::write_pdf_export(&app, output_path, html)
}

#[tauri::command]
fn get_workspace_settings_snapshot(
    app: tauri::AppHandle,
) -> Result<WorkspaceSettingsDocument, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::load_or_initialize_settings(&workspace_root)
}

#[tauri::command]
fn get_secret_vault_status(app: tauri::AppHandle) -> Result<SecretVaultStatus, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::inspect_vault_status(&workspace_root)
}

#[tauri::command]
fn get_secret_inventory_snapshot(app: tauri::AppHandle) -> Result<SecretInventorySnapshot, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::get_secret_inventory_snapshot(&workspace_root)
}

#[tauri::command]
fn get_release_readiness_snapshot(
    app: tauri::AppHandle,
) -> Result<ReleaseReadinessSnapshot, String> {
    release::get_release_readiness_snapshot(&app)
}

#[tauri::command]
async fn check_for_app_update(app: tauri::AppHandle) -> Result<AppUpdateCheckResult, String> {
    release::check_for_app_update(&app).await
}

#[tauri::command]
fn update_ai_provider_settings(
    app: tauri::AppHandle,
    input: ProviderConfigUpdateInput,
) -> Result<WorkspaceSettingsDocument, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::update_ai_provider_settings(&workspace_root, input)
}

#[tauri::command]
fn update_workspace_appearance_settings(
    app: tauri::AppHandle,
    input: WorkspaceAppearanceSettingsUpdateInput,
) -> Result<WorkspaceSettingsDocument, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::update_workspace_appearance_settings(&workspace_root, input)
}

#[tauri::command]
fn write_secret_value(
    app: tauri::AppHandle,
    input: SecretValueWriteInput,
) -> Result<SecretInventorySnapshot, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::write_secret_value(&workspace_root, input)
}

#[tauri::command]
fn read_secret_value(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    settings::read_secret_value(&workspace_root, &key)
}

#[tauri::command]
fn start_ai_prompt_stream(
    app: tauri::AppHandle,
    input: ai::StartAiPromptStreamInput,
) -> Result<ai::AiStreamStartReceipt, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::start_ai_prompt_stream(&app, &workspace_root, input)
}

#[tauri::command]
fn list_interview_sessions(
    app: tauri::AppHandle,
) -> Result<Vec<InterviewSessionListItem>, String> {
    storage::list_interview_sessions(&app)
}

#[tauri::command]
fn get_interview_session(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<Option<InterviewSessionDetail>, String> {
    storage::get_interview_session(&app, &session_id)
}

#[tauri::command]
fn create_interview_session(
    app: tauri::AppHandle,
    input: CreateInterviewSessionInput,
) -> Result<InterviewSessionDetail, String> {
    storage::create_interview_session(&app, input)
}

#[tauri::command]
fn update_interview_message_metadata(
    app: tauri::AppHandle,
    input: UpdateInterviewMessageMetadataInput,
) -> Result<InterviewMessageItem, String> {
    storage::update_interview_message_metadata(&app, input)
}

#[tauri::command]
fn get_interview_report(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<Option<InterviewReportRecord>, String> {
    storage::get_interview_report(&app, &session_id)
}

#[tauri::command]
async fn generate_interview_report(
    app: tauri::AppHandle,
    input: ai::GenerateInterviewReportInput,
) -> Result<InterviewReportRecord, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::generate_interview_report(&app, &workspace_root, input).await
}

#[tauri::command]
fn start_interview_turn_stream(
    app: tauri::AppHandle,
    input: ai::StartInterviewTurnStreamInput,
) -> Result<ai::AiStreamStartReceipt, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::start_interview_turn_stream(&app, &workspace_root, input)
}

#[tauri::command]
async fn fetch_ai_models(
    app: tauri::AppHandle,
    input: ai::FetchAiModelsInput,
) -> Result<FetchAiModelsResult, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::fetch_ai_models(&workspace_root, input).await
}

#[tauri::command]
async fn test_ai_connectivity(
    app: tauri::AppHandle,
    provider: Option<String>,
) -> Result<ConnectivityTestResult, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::test_ai_connectivity(&workspace_root, provider.as_deref()).await
}

#[tauri::command]
async fn test_exa_connectivity(
    app: tauri::AppHandle,
) -> Result<ConnectivityTestResult, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::test_exa_connectivity(&workspace_root).await
}

#[tauri::command]
fn get_importer_dry_run(app: tauri::AppHandle) -> Result<ImporterDryRunSnapshot, String> {
    build_importer_snapshot(&app, ImporterExecutionMode::DryRun)
}

#[tauri::command]
fn execute_importer_staging(app: tauri::AppHandle) -> Result<ImporterDryRunSnapshot, String> {
    build_importer_snapshot(&app, ImporterExecutionMode::Staging)
}

#[tauri::command]
fn execute_importer_migration(app: tauri::AppHandle) -> Result<ImporterDryRunSnapshot, String> {
    build_importer_snapshot(&app, ImporterExecutionMode::Migration)
}

#[tauri::command]
async fn parse_markdown_resume(
    app: tauri::AppHandle,
    input: ParseMarkdownResumeInput,
) -> Result<ParsedResumeData, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::parse_markdown_resume(&workspace_root, input).await
}

#[tauri::command]
async fn parse_pdf_resume(
    app: tauri::AppHandle,
    input: ParsePdfResumeInput,
) -> Result<ParsedResumeData, String> {
    let workspace_root = resolve_workspace_root(&app)?;
    ai::parse_pdf_resume(&workspace_root, input).await
}

fn build_importer_snapshot(
    app: &tauri::AppHandle,
    mode: ImporterExecutionMode,
) -> Result<ImporterDryRunSnapshot, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    let workspace_root = resolve_workspace_root(app)?;
    let database_path = workspace_root.join("rolerover.db");

    let plan = LegacyImporter::build_plan(
        &path_to_string(&workspace_root),
        &path_to_string(&database_path),
        LegacyDiscoveryInput {
            app_data_root: path_to_string(&app_data_root),
            allow_local_storage_fallback: true,
        },
        false,
    );
    let result = LegacyImporter::evaluate_plan(&plan);

    let (staging_execution, migration_execution) = match mode {
        ImporterExecutionMode::DryRun => (None, None),
        ImporterExecutionMode::Staging => {
            if !matches!(result.state, ImporterState::ReadyForExecution) {
                return Err(format!(
                    "importer staging is blocked until dry-run passes: {}",
                    result.summary
                ));
            }

            (
                Some(LegacyImporter::execute_staging_and_audit(&plan, true)?),
                None,
            )
        }
        ImporterExecutionMode::Migration => {
            if !matches!(result.state, ImporterState::ReadyForExecution) {
                return Err(format!(
                    "importer migration is blocked until dry-run passes: {}",
                    result.summary
                ));
            }

            storage::get_storage_snapshot(app)?;
            let (staging_execution, migration_execution) =
                LegacyImporter::execute_document_migration(&plan)?;
            (Some(staging_execution), Some(migration_execution))
        }
    };

    Ok(ImporterDryRunSnapshot {
        plan,
        result,
        staging_execution,
        migration_execution,
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            restart_app,
            get_bootstrap_context,
            get_workspace_snapshot,
            get_domain_contract_summary,
            get_legacy_import_contract,
            get_storage_snapshot,
            list_documents,
            get_document,
            create_document,
            update_document_metadata,
            save_document,
            delete_document,
            duplicate_document,
            import_document,
            rename_document,
            get_template_validation_snapshot,
            write_template_validation_export,
            write_export_file,
            write_pdf_export,
            get_workspace_settings_snapshot,
            get_secret_vault_status,
            get_secret_inventory_snapshot,
            get_release_readiness_snapshot,
            check_for_app_update,
            update_ai_provider_settings,
            update_workspace_appearance_settings,
            write_secret_value,
            read_secret_value,
            start_ai_prompt_stream,
            list_interview_sessions,
            get_interview_session,
            create_interview_session,
            update_interview_message_metadata,
            get_interview_report,
            generate_interview_report,
            start_interview_turn_stream,
            fetch_ai_models,
            test_ai_connectivity,
            test_exa_connectivity,
            get_importer_dry_run,
            execute_importer_staging,
            execute_importer_migration,
            parse_markdown_resume,
            parse_pdf_resume
        ])
        .run(tauri::generate_context!())
        .expect("failed to run JobPilot desktop shell");
}

fn resolve_workspace_root(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    Ok(app_data_dir.join("workspace"))
}

fn path_to_string(path: &std::path::Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
