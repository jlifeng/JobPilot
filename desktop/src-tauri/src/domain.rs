#![allow(dead_code)]

use serde::Serialize;

pub const DESKTOP_DOMAIN_CONTRACT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainContractSummary {
    pub contract_version: u32,
    pub workspace_model: WorkspaceModel,
    pub supported_section_types: Vec<ResumeSectionType>,
    pub default_theme: ResumeThemeConfig,
    pub default_settings: WorkspaceSettings,
    pub migration_envelope_template: MigrationEnvelope,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeDocument {
    pub metadata: ResumeMetadata,
    pub theme: ResumeThemeConfig,
    pub sections: Vec<ResumeSectionDocument>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeMetadata {
    pub id: String,
    pub title: String,
    pub template: String,
    pub language: String,
    pub target_job_title: Option<String>,
    pub target_company: Option<String>,
    pub is_default: bool,
    pub created_at_epoch_ms: u64,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeSectionDocument {
    pub id: String,
    pub resume_id: String,
    pub section_type: ResumeSectionType,
    pub title: String,
    pub sort_order: i32,
    pub visible: bool,
    pub content: serde_json::Value,
    pub created_at_epoch_ms: u64,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeThemeConfig {
    pub primary_color: String,
    pub accent_color: String,
    pub font_family: String,
    pub font_size: String,
    pub line_spacing: f64,
    pub margin: ResumePageMargin,
    pub section_spacing: u32,
    pub avatar_style: AvatarStyle,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumePageMargin {
    pub top: u32,
    pub right: u32,
    pub bottom: u32,
    pub left: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ResumeSectionType {
    PersonalInfo,
    QrCodes,
    Summary,
    WorkExperience,
    Education,
    Skills,
    Projects,
    Certifications,
    Languages,
    Custom,
    Github,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AvatarStyle {
    Circle,
    OneInch,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub ai: AiProviderSettings,
    pub editor: EditorPreferences,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderSettings {
    pub default_provider: AiProvider,
    pub providers: Vec<ProviderRuntimeConfig>,
    pub exa_pool: ExaPoolSettings,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderRuntimeConfig {
    pub provider: AiProvider,
    pub base_url: String,
    pub model: String,
    pub api_key_secret_key: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExaPoolSettings {
    pub base_url: String,
    pub api_key_secret_key: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AiProvider {
    Openai,
    Anthropic,
    Gemini,
    Orcarouter,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorPreferences {
    pub auto_save: bool,
    pub auto_save_interval_ms: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationEnvelope {
    pub source: LegacySourceDescriptor,
    pub target_schema_version: u32,
    pub status: MigrationStatus,
    pub checkpoints: Vec<MigrationCheckpoint>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySourceDescriptor {
    pub kind: LegacySourceKind,
    pub path: String,
    pub storage_profile: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LegacySourceKind {
    Sqlite,
    SecureSettings,
    WindowState,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationCheckpoint {
    pub name: String,
    pub required: bool,
    pub status: MigrationCheckpointStatus,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationCheckpointStatus {
    Pending,
    Passed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationStatus {
    Pending,
    LegacySourcesDetected,
    ValidationFailed,
    Imported,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceModel {
    SingleWorkspace,
}

pub fn domain_contract_summary() -> DomainContractSummary {
    DomainContractSummary {
        contract_version: DESKTOP_DOMAIN_CONTRACT_VERSION,
        workspace_model: WorkspaceModel::SingleWorkspace,
        supported_section_types: vec![
            ResumeSectionType::PersonalInfo,
            ResumeSectionType::QrCodes,
            ResumeSectionType::Summary,
            ResumeSectionType::WorkExperience,
            ResumeSectionType::Education,
            ResumeSectionType::Skills,
            ResumeSectionType::Projects,
            ResumeSectionType::Certifications,
            ResumeSectionType::Languages,
            ResumeSectionType::Custom,
            ResumeSectionType::Github,
        ],
        default_theme: ResumeThemeConfig {
            primary_color: "#111827".into(),
            accent_color: "#2563eb".into(),
            font_family: "Inter".into(),
            font_size: "14px".into(),
            line_spacing: 1.6,
            margin: ResumePageMargin {
                top: 24,
                right: 24,
                bottom: 24,
                left: 24,
            },
            section_spacing: 16,
            avatar_style: AvatarStyle::Circle,
        },
        default_settings: WorkspaceSettings {
            ai: AiProviderSettings {
                default_provider: AiProvider::Openai,
                providers: vec![
                    ProviderRuntimeConfig {
                        provider: AiProvider::Openai,
                        base_url: "https://api.openai.com/v1".into(),
                        model: "gpt-4o".into(),
                        api_key_secret_key: "provider.openai.api_key".into(),
                    },
                    ProviderRuntimeConfig {
                        provider: AiProvider::Anthropic,
                        base_url: "https://api.anthropic.com".into(),
                        model: "claude-sonnet-4-20250514".into(),
                        api_key_secret_key: "provider.anthropic.api_key".into(),
                    },
                    ProviderRuntimeConfig {
                        provider: AiProvider::Gemini,
                        base_url: "https://generativelanguage.googleapis.com/v1beta".into(),
                        model: "gemini-2.0-flash".into(),
                        api_key_secret_key: "provider.gemini.api_key".into(),
                    },
                    ProviderRuntimeConfig {
                        provider: AiProvider::Orcarouter,
                        base_url: "https://api.orcarouter.ai/v1".into(),
                        model: "orcarouter/free".into(),
                        api_key_secret_key: "provider.orcarouter.api_key".into(),
                    },
                ],
                exa_pool: ExaPoolSettings {
                    base_url: String::new(),
                    api_key_secret_key: "provider.exa_pool.api_key".into(),
                },
            },
            editor: EditorPreferences {
                auto_save: true,
                auto_save_interval_ms: 500,
            },
        },
        migration_envelope_template: MigrationEnvelope {
            source: LegacySourceDescriptor {
                kind: LegacySourceKind::Sqlite,
                path: "workspace/imports/legacy/jade.db".into(),
                storage_profile: "electron-next-local".into(),
            },
            target_schema_version: 1,
            status: MigrationStatus::Pending,
            checkpoints: vec![
                MigrationCheckpoint {
                    name: "source-discovery".into(),
                    required: true,
                    status: MigrationCheckpointStatus::Pending,
                    notes: None,
                },
                MigrationCheckpoint {
                    name: "schema-validation".into(),
                    required: true,
                    status: MigrationCheckpointStatus::Pending,
                    notes: None,
                },
                MigrationCheckpoint {
                    name: "content-import".into(),
                    required: true,
                    status: MigrationCheckpointStatus::Pending,
                    notes: None,
                },
                MigrationCheckpoint {
                    name: "secure-settings-import".into(),
                    required: false,
                    status: MigrationCheckpointStatus::Pending,
                    notes: Some("Skipped when no secure settings store is detected.".into()),
                },
            ],
        },
    }
}
