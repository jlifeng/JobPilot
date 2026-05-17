#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const SETTINGS_DIR: &str = "settings";
const SETTINGS_FILE: &str = "workspace-settings.json";
const SECRETS_DIR: &str = "secrets";
const SECRETS_MANIFEST_FILE: &str = "secrets-manifest.json";
const VAULT_FILE_FALLBACK: &str = "vault-fallback.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettingsDocument {
    pub schema_version: u32,
    pub locale: String,
    pub theme: String,
    pub ai: WorkspaceAiSettings,
    pub editor: WorkspaceEditorSettings,
    pub window: WorkspaceWindowSettings,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAiSettings {
    pub default_provider: String,
    pub provider_configs: BTreeMap<String, ProviderRuntimeSettings>,
    pub exa_pool_base_url: String,
    #[serde(default)]
    pub resume_import_vision_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderRuntimeSettings {
    pub base_url: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEditorSettings {
    pub auto_save: bool,
    pub auto_save_interval_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceWindowSettings {
    pub remember_window_state: bool,
    pub restore_last_workspace: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretKeyDescriptor {
    pub key: String,
    pub provider: Option<String>,
    pub purpose: String,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretsManifestDocument {
    pub schema_version: u32,
    pub vault_backend: SecretVaultBackend,
    pub encrypted_at_rest: bool,
    pub key_descriptors: Vec<SecretKeyDescriptor>,
    pub warnings: Vec<String>,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretVaultBackend {
    Unconfigured,
    OsKeyring,
    Stronghold,
    FileFallback,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretVaultStatus {
    pub backend: SecretVaultBackend,
    pub encrypted_at_rest: bool,
    pub status: SecretVaultReadiness,
    pub warnings: Vec<String>,
    pub manifest_path: String,
    pub fallback_path: String,
    pub registered_secret_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretInventoryEntry {
    pub key: String,
    pub provider: Option<String>,
    pub purpose: String,
    pub updated_at_epoch_ms: u64,
    pub is_configured: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretInventorySnapshot {
    pub backend: SecretVaultBackend,
    pub encrypted_at_rest: bool,
    pub warnings: Vec<String>,
    pub updated_at_epoch_ms: u64,
    pub entries: Vec<SecretInventoryEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretVaultReadiness {
    Ready,
    NeedsConfiguration,
    Degraded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySecureSettingEntry {
    encrypted: bool,
    value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum VaultFallbackEncoding {
    Utf8Plaintext,
    LegacySafeStorageBase64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultFallbackEntry {
    encoding: VaultFallbackEncoding,
    encrypted: bool,
    value: String,
    imported_from: String,
    imported_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultFallbackDocument {
    schema_version: u32,
    entries: BTreeMap<String, VaultFallbackEntry>,
    updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecureSettingsImportResult {
    pub imported_secret_count: u32,
    pub opaque_secret_count: u32,
    pub imported_keys: Vec<String>,
    pub opaque_keys: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfigUpdateInput {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub set_as_default: bool,
    pub resume_import_vision_model: Option<String>,
    pub exa_pool_base_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAppearanceSettingsUpdateInput {
    pub locale: String,
    pub theme: String,
    pub auto_save: bool,
    pub auto_save_interval_ms: Option<u32>,
    pub remember_window_state: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretValueWriteInput {
    pub key: String,
    pub provider: Option<String>,
    pub purpose: Option<String>,
    pub value: String,
}

pub fn settings_file_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SETTINGS_DIR).join(SETTINGS_FILE)
}

pub fn secrets_manifest_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SECRETS_DIR).join(SECRETS_MANIFEST_FILE)
}

pub fn vault_fallback_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SECRETS_DIR).join(VAULT_FILE_FALLBACK)
}

pub fn load_or_initialize_settings(
    workspace_root: &Path,
) -> Result<WorkspaceSettingsDocument, String> {
    let path = settings_file_path(workspace_root);
    if path.exists() {
        return read_json_file::<WorkspaceSettingsDocument>(&path);
    }

    let default_doc = default_settings_document()?;
    persist_settings(workspace_root, default_doc.clone())?;
    Ok(default_doc)
}

pub fn persist_settings(
    workspace_root: &Path,
    mut document: WorkspaceSettingsDocument,
) -> Result<(), String> {
    document.updated_at_epoch_ms = now_epoch_ms()?;
    let path = settings_file_path(workspace_root);
    ensure_parent(&path)?;
    write_json_file(&path, &document)
}

pub fn load_or_initialize_secrets_manifest(
    workspace_root: &Path,
) -> Result<SecretsManifestDocument, String> {
    let path = secrets_manifest_path(workspace_root);
    if path.exists() {
        return read_json_file::<SecretsManifestDocument>(&path);
    }

    let default_doc = default_secrets_manifest()?;
    persist_secrets_manifest(workspace_root, default_doc.clone())?;
    Ok(default_doc)
}

pub fn persist_secrets_manifest(
    workspace_root: &Path,
    mut document: SecretsManifestDocument,
) -> Result<(), String> {
    document.updated_at_epoch_ms = now_epoch_ms()?;
    let path = secrets_manifest_path(workspace_root);
    ensure_parent(&path)?;
    write_json_file(&path, &document)
}

pub fn inspect_vault_status(workspace_root: &Path) -> Result<SecretVaultStatus, String> {
    let manifest = load_or_initialize_secrets_manifest(workspace_root)?;
    let fallback = load_or_initialize_vault_fallback(workspace_root)?;
    let has_fallback_file = vault_fallback_path(workspace_root).exists();
    let runtime = evaluate_runtime_vault_state(&manifest, &fallback)?;

    let mut warnings = runtime.warnings;
    if has_fallback_file {
        warnings.push("vault-fallback.json detected; plaintext fallback path exists".into());
    }

    Ok(SecretVaultStatus {
        backend: runtime.backend,
        encrypted_at_rest: runtime.encrypted_at_rest,
        status: runtime.readiness,
        warnings,
        manifest_path: path_to_string(&secrets_manifest_path(workspace_root)),
        fallback_path: path_to_string(&vault_fallback_path(workspace_root)),
        registered_secret_count: manifest.key_descriptors.len(),
    })
}

pub fn get_secret_inventory_snapshot(
    workspace_root: &Path,
) -> Result<SecretInventorySnapshot, String> {
    let manifest = load_or_initialize_secrets_manifest(workspace_root)?;
    let fallback = load_or_initialize_vault_fallback(workspace_root)?;
    let runtime = evaluate_runtime_vault_state(&manifest, &fallback)?;
    let mut entries = manifest
        .key_descriptors
        .iter()
        .map(|descriptor| {
            let storage_state = resolve_secret_storage_state(&descriptor.key, &fallback)?;
            Ok(SecretInventoryEntry {
                key: descriptor.key.clone(),
                provider: descriptor.provider.clone(),
                purpose: descriptor.purpose.clone(),
                updated_at_epoch_ms: descriptor.updated_at_epoch_ms,
                is_configured: !matches!(storage_state, SecretStorageState::Missing),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    let descriptor_keys = manifest
        .key_descriptors
        .iter()
        .map(|descriptor| descriptor.key.as_str())
        .collect::<Vec<_>>();

    for (key, fallback_entry) in &fallback.entries {
        if descriptor_keys
            .iter()
            .any(|descriptor_key| *descriptor_key == key)
        {
            continue;
        }

        entries.push(SecretInventoryEntry {
            key: key.clone(),
            provider: infer_provider_from_secret_key(key),
            purpose: "Secret value present in vault fallback without a manifest descriptor.".into(),
            updated_at_epoch_ms: fallback_entry.imported_at_epoch_ms,
            is_configured: true,
        });
    }

    entries.sort_by(|left, right| left.key.cmp(&right.key));

    Ok(SecretInventorySnapshot {
        backend: runtime.backend,
        encrypted_at_rest: runtime.encrypted_at_rest,
        warnings: runtime.warnings,
        updated_at_epoch_ms: manifest
            .updated_at_epoch_ms
            .max(fallback.updated_at_epoch_ms),
        entries,
    })
}

pub fn update_ai_provider_settings(
    workspace_root: &Path,
    input: ProviderConfigUpdateInput,
) -> Result<WorkspaceSettingsDocument, String> {
    let normalized_provider = normalize_provider_key(&input.provider)
        .ok_or_else(|| format!("unsupported provider '{}'", input.provider.trim()))?;
    let base_url = input.base_url.trim();
    if base_url.is_empty() {
        return Err("provider baseUrl is required".into());
    }

    let model = input.model.trim();
    if model.is_empty() {
        return Err("provider model is required".into());
    }

    let mut document = load_or_initialize_settings(workspace_root)?;
    document.ai.provider_configs.insert(
        normalized_provider.into(),
        ProviderRuntimeSettings {
            base_url: base_url.into(),
            model: model.into(),
        },
    );

    if input.set_as_default {
        document.ai.default_provider = normalized_provider.into();
    }

    if let Some(vision_model) = input.resume_import_vision_model {
        let trimmed = vision_model.trim();
        document.ai.resume_import_vision_model = if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.into())
        };
    }

    if let Some(exa_base_url) = input.exa_pool_base_url {
        let trimmed = exa_base_url.trim();
        document.ai.exa_pool_base_url = trimmed.into();
    }

    persist_settings(workspace_root, document.clone())?;
    load_or_initialize_settings(workspace_root)
}

pub fn update_workspace_appearance_settings(
    workspace_root: &Path,
    input: WorkspaceAppearanceSettingsUpdateInput,
) -> Result<WorkspaceSettingsDocument, String> {
    let locale = input.locale.trim();
    if !matches!(locale, "en" | "zh") {
        return Err(format!("unsupported locale '{}'", input.locale.trim()));
    }

    let theme = input.theme.trim();
    if !matches!(theme, "light" | "dark" | "system") {
        return Err(format!("unsupported theme '{}'", input.theme.trim()));
    }

    let mut document = load_or_initialize_settings(workspace_root)?;
    document.locale = locale.into();
    document.theme = theme.into();
    document.editor.auto_save = input.auto_save;
    if let Some(interval) = input.auto_save_interval_ms {
        document.editor.auto_save_interval_ms = interval;
    }
    document.window.remember_window_state = input.remember_window_state;

    persist_settings(workspace_root, document.clone())?;
    load_or_initialize_settings(workspace_root)
}

pub fn write_secret_value(
    workspace_root: &Path,
    input: SecretValueWriteInput,
) -> Result<SecretInventorySnapshot, String> {
    let secret_key = input.key.trim();
    if secret_key.is_empty() {
        return Err("secret key is required".into());
    }

    let mut manifest = load_or_initialize_secrets_manifest(workspace_root)?;
    let mut fallback = load_or_initialize_vault_fallback(workspace_root)?;
    let timestamp = now_epoch_ms()?;
    let trimmed_value = input.value.trim().to_string();
    let provider = input
        .provider
        .as_deref()
        .and_then(normalize_provider_key)
        .map(ToString::to_string)
        .or_else(|| infer_provider_from_secret_key(secret_key));
    let purpose = input
        .purpose
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("Desktop AI runtime credential.");

    if trimmed_value.is_empty() {
        if let Err(error) = delete_secret_from_os_keyring(secret_key) {
            if os_keyring_backend_supported() {
                return Err(error);
            }
        }

        fallback.entries.remove(secret_key);
        manifest
            .key_descriptors
            .retain(|descriptor| descriptor.key != secret_key);
    } else {
        match write_secret_to_os_keyring(secret_key, &trimmed_value) {
            Ok(()) => {
                fallback.entries.remove(secret_key);
            }
            Err(error) => {
                if os_keyring_backend_supported() {
                    return Err(error);
                }

                fallback.entries.insert(
                    secret_key.into(),
                    VaultFallbackEntry {
                        encoding: VaultFallbackEncoding::Utf8Plaintext,
                        encrypted: false,
                        value: trimmed_value,
                        imported_from: "desktop-runtime".into(),
                        imported_at_epoch_ms: timestamp,
                    },
                );
            }
        }

        manifest
            .key_descriptors
            .retain(|descriptor| descriptor.key != secret_key);
        manifest.key_descriptors.push(SecretKeyDescriptor {
            key: secret_key.into(),
            provider,
            purpose: purpose.into(),
            updated_at_epoch_ms: timestamp,
        });
        manifest
            .key_descriptors
            .sort_by(|left, right| left.key.cmp(&right.key));
    }

    apply_runtime_vault_state(&mut manifest, &fallback)?;
    persist_secrets_manifest(workspace_root, manifest)?;
    if fallback.entries.is_empty() {
        let path = vault_fallback_path(workspace_root);
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|error| format!("failed to remove {}: {error}", path.display()))?;
        }
    } else {
        persist_vault_fallback(workspace_root, fallback)?;
    }

    get_secret_inventory_snapshot(workspace_root)
}

pub fn read_secret_value(workspace_root: &Path, key: &str) -> Result<Option<String>, String> {
    let secret_key = key.trim();
    if secret_key.is_empty() {
        return Ok(None);
    }

    match read_secret_from_os_keyring(secret_key) {
        Ok(Some(value)) => return Ok(Some(value)),
        Ok(None) => {}
        Err(error) => {
            if os_keyring_backend_supported() && !vault_fallback_path(workspace_root).exists() {
                return Err(error);
            }
        }
    }

    let mut fallback = load_or_initialize_vault_fallback(workspace_root)?;
    let Some(entry) = fallback.entries.get(secret_key).cloned() else {
        return Ok(None);
    };

    match entry.encoding {
        VaultFallbackEncoding::Utf8Plaintext => {
            let plaintext_value = entry.value.clone();
            if write_secret_to_os_keyring(secret_key, &plaintext_value).is_ok() {
                fallback.entries.remove(secret_key);

                if fallback.entries.is_empty() {
                    let path = vault_fallback_path(workspace_root);
                    if path.exists() {
                        let _ = fs::remove_file(&path);
                    }
                } else {
                    let _ = persist_vault_fallback(workspace_root, fallback.clone());
                }

                if let Ok(mut manifest) = load_or_initialize_secrets_manifest(workspace_root) {
                    if apply_runtime_vault_state(&mut manifest, &fallback).is_ok() {
                        let _ = persist_secrets_manifest(workspace_root, manifest);
                    }
                }
            }

            Ok(Some(plaintext_value))
        }
        VaultFallbackEncoding::LegacySafeStorageBase64 => Ok(None),
    }
}

pub fn import_legacy_secure_settings(
    workspace_root: &Path,
    legacy_settings_path: &Path,
) -> Result<SecureSettingsImportResult, String> {
    let legacy_store =
        read_json_file::<BTreeMap<String, LegacySecureSettingEntry>>(legacy_settings_path)?;
    let imported_at_epoch_ms = now_epoch_ms()?;
    let mut fallback_entries = BTreeMap::new();
    let mut key_descriptors = Vec::new();
    let mut imported_keys = Vec::new();
    let mut opaque_keys = Vec::new();
    let mut warnings = Vec::new();

    for (legacy_key, entry) in legacy_store {
        match legacy_key.as_str() {
            "jade_secure_provider_api_keys" => {
                import_provider_map_entry(
                    &legacy_key,
                    &entry,
                    imported_at_epoch_ms,
                    &mut fallback_entries,
                    &mut key_descriptors,
                    &mut imported_keys,
                    &mut opaque_keys,
                    &mut warnings,
                )?;
            }
            "jade_secure_exa_pool_api_key" => {
                import_single_secret_entry(
                    &legacy_key,
                    "provider.exa_pool.api_key",
                    Some("exa_pool"),
                    "Imported Exa Pool API key from the legacy desktop secure settings store.",
                    &entry,
                    imported_at_epoch_ms,
                    &mut fallback_entries,
                    &mut key_descriptors,
                    &mut imported_keys,
                    &mut opaque_keys,
                    &mut warnings,
                )?;
            }
            "jade_api_key" => {
                import_single_secret_entry(
                    &legacy_key,
                    "provider.openai.api_key",
                    Some("openai"),
                    "Imported legacy OpenAI API key from desktop compatibility storage.",
                    &entry,
                    imported_at_epoch_ms,
                    &mut fallback_entries,
                    &mut key_descriptors,
                    &mut imported_keys,
                    &mut opaque_keys,
                    &mut warnings,
                )?;
            }
            _ => {
                carry_forward_opaque_secret(
                    &legacy_key,
                    &entry,
                    imported_at_epoch_ms,
                    &mut fallback_entries,
                    &mut key_descriptors,
                    &mut opaque_keys,
                    &mut warnings,
                    "Unrecognized legacy secure settings key was preserved for later inspection.",
                );
            }
        }
    }

    if fallback_entries.is_empty() && key_descriptors.is_empty() {
        warnings.push(
            "Legacy secure settings file existed, but it did not contain any importable or preservable entries."
                .into(),
        );
        return Ok(SecureSettingsImportResult {
            imported_secret_count: 0,
            opaque_secret_count: 0,
            imported_keys,
            opaque_keys,
            warnings,
        });
    }

    let mut manifest = load_or_initialize_secrets_manifest(workspace_root)?;
    manifest.vault_backend = SecretVaultBackend::FileFallback;
    manifest.encrypted_at_rest = false;
    manifest.key_descriptors = key_descriptors;
    manifest.warnings = build_import_manifest_warnings(
        imported_keys.len() as u32,
        opaque_keys.len() as u32,
        &warnings,
    );
    persist_secrets_manifest(workspace_root, manifest)?;

    let fallback_doc = VaultFallbackDocument {
        schema_version: 1,
        entries: fallback_entries,
        updated_at_epoch_ms: imported_at_epoch_ms,
    };
    let fallback_path = vault_fallback_path(workspace_root);
    ensure_parent(&fallback_path)?;
    write_json_file(&fallback_path, &fallback_doc)?;

    Ok(SecureSettingsImportResult {
        imported_secret_count: imported_keys.len() as u32,
        opaque_secret_count: opaque_keys.len() as u32,
        imported_keys,
        opaque_keys,
        warnings,
    })
}

fn default_settings_document() -> Result<WorkspaceSettingsDocument, String> {
    let mut provider_configs = BTreeMap::new();
    provider_configs.insert(
        "openai".into(),
        ProviderRuntimeSettings {
            base_url: "https://api.openai.com/v1".into(),
            model: "gpt-4o".into(),
        },
    );
    provider_configs.insert(
        "anthropic".into(),
        ProviderRuntimeSettings {
            base_url: "https://api.anthropic.com".into(),
            model: "claude-sonnet-4-20250514".into(),
        },
    );
    provider_configs.insert(
        "gemini".into(),
        ProviderRuntimeSettings {
            base_url: "https://generativelanguage.googleapis.com/v1beta".into(),
            model: "gemini-2.0-flash".into(),
        },
    );

    Ok(WorkspaceSettingsDocument {
        schema_version: 1,
        locale: "zh".into(),
        theme: "system".into(),
        ai: WorkspaceAiSettings {
            default_provider: "openai".into(),
            provider_configs,
            exa_pool_base_url: String::new(),
            resume_import_vision_model: None,
        },
        editor: WorkspaceEditorSettings {
            auto_save: true,
            auto_save_interval_ms: 500,
        },
        window: WorkspaceWindowSettings {
            remember_window_state: true,
            restore_last_workspace: true,
        },
        updated_at_epoch_ms: now_epoch_ms()?,
    })
}

fn load_or_initialize_vault_fallback(
    workspace_root: &Path,
) -> Result<VaultFallbackDocument, String> {
    let path = vault_fallback_path(workspace_root);
    if path.exists() {
        return read_json_file::<VaultFallbackDocument>(&path);
    }

    default_vault_fallback_document()
}

fn persist_vault_fallback(
    workspace_root: &Path,
    mut document: VaultFallbackDocument,
) -> Result<(), String> {
    document.updated_at_epoch_ms = now_epoch_ms()?;
    let path = vault_fallback_path(workspace_root);
    ensure_parent(&path)?;
    write_json_file(&path, &document)
}

fn default_secrets_manifest() -> Result<SecretsManifestDocument, String> {
    Ok(SecretsManifestDocument {
        schema_version: 1,
        vault_backend: SecretVaultBackend::Unconfigured,
        encrypted_at_rest: false,
        key_descriptors: Vec::new(),
        warnings: vec![
            "Vault backend is not configured yet; secret persistence must be wired before production use."
                .into(),
            "No plaintext secret values are stored in this manifest.".into(),
        ],
        updated_at_epoch_ms: now_epoch_ms()?,
    })
}

fn default_vault_fallback_document() -> Result<VaultFallbackDocument, String> {
    Ok(VaultFallbackDocument {
        schema_version: 1,
        entries: BTreeMap::new(),
        updated_at_epoch_ms: now_epoch_ms()?,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SecretStorageState {
    Keyring,
    FallbackPlaintext,
    FallbackOpaque,
    Missing,
}

#[derive(Debug, Clone)]
struct RuntimeVaultState {
    backend: SecretVaultBackend,
    encrypted_at_rest: bool,
    readiness: SecretVaultReadiness,
    warnings: Vec<String>,
}

fn resolve_secret_storage_state(
    secret_key: &str,
    fallback: &VaultFallbackDocument,
) -> Result<SecretStorageState, String> {
    match read_secret_from_os_keyring(secret_key) {
        Ok(Some(_)) => return Ok(SecretStorageState::Keyring),
        Ok(None) => {}
        Err(_) => {}
    }

    let Some(entry) = fallback.entries.get(secret_key) else {
        return Ok(SecretStorageState::Missing);
    };

    Ok(match entry.encoding {
        VaultFallbackEncoding::Utf8Plaintext => SecretStorageState::FallbackPlaintext,
        VaultFallbackEncoding::LegacySafeStorageBase64 => SecretStorageState::FallbackOpaque,
    })
}

fn evaluate_runtime_vault_state(
    manifest: &SecretsManifestDocument,
    fallback: &VaultFallbackDocument,
) -> Result<RuntimeVaultState, String> {
    let descriptor_keys = manifest
        .key_descriptors
        .iter()
        .map(|descriptor| descriptor.key.as_str())
        .collect::<BTreeSet<_>>();

    let mut keyring_active_count = 0usize;
    let mut fallback_plaintext_active_count = 0usize;
    let mut fallback_opaque_active_count = 0usize;
    let mut missing_active_count = 0usize;
    for descriptor in &manifest.key_descriptors {
        match resolve_secret_storage_state(&descriptor.key, fallback)? {
            SecretStorageState::Keyring => keyring_active_count += 1,
            SecretStorageState::FallbackPlaintext => fallback_plaintext_active_count += 1,
            SecretStorageState::FallbackOpaque => fallback_opaque_active_count += 1,
            SecretStorageState::Missing => missing_active_count += 1,
        }
    }

    let mut orphan_plaintext_count = 0usize;
    let mut orphan_opaque_count = 0usize;
    for (key, entry) in &fallback.entries {
        if descriptor_keys.contains(key.as_str()) {
            continue;
        }

        match entry.encoding {
            VaultFallbackEncoding::Utf8Plaintext => orphan_plaintext_count += 1,
            VaultFallbackEncoding::LegacySafeStorageBase64 => orphan_opaque_count += 1,
        }
    }

    let descriptor_count = manifest.key_descriptors.len();
    let fallback_entry_count = fallback.entries.len();

    let backend = if keyring_active_count > 0 {
        SecretVaultBackend::OsKeyring
    } else if fallback_entry_count > 0 {
        SecretVaultBackend::FileFallback
    } else {
        SecretVaultBackend::Unconfigured
    };

    let readiness = if descriptor_count == 0 {
        if fallback_entry_count > 0 {
            SecretVaultReadiness::Degraded
        } else {
            SecretVaultReadiness::NeedsConfiguration
        }
    } else if keyring_active_count == descriptor_count {
        SecretVaultReadiness::Ready
    } else if keyring_active_count > 0
        || fallback_plaintext_active_count > 0
        || fallback_opaque_active_count > 0
    {
        SecretVaultReadiness::Degraded
    } else {
        SecretVaultReadiness::NeedsConfiguration
    };

    let encrypted_at_rest = descriptor_count > 0 && keyring_active_count == descriptor_count;

    let mut warnings = Vec::new();
    if descriptor_count == 0 && fallback_entry_count == 0 {
        warnings.push(
            "Vault backend is not configured yet; secret persistence must be wired before production use."
                .into(),
        );
        warnings.push("No plaintext secret values are stored in this manifest.".into());
    } else {
        if missing_active_count > 0 {
            warnings.push(format!(
                "{missing_active_count} active secret descriptor(s) are missing values and require re-entry."
            ));
        }
        if fallback_plaintext_active_count + orphan_plaintext_count > 0 {
            warnings.push(
                "Plaintext secret values remain in vault-fallback.json; migrate or clear them to remove degraded storage."
                    .into(),
            );
        }
        let opaque_total = fallback_opaque_active_count + orphan_opaque_count;
        if opaque_total > 0 {
            warnings.push(format!(
                "{opaque_total} opaque legacy safeStorage payload(s) remain in fallback storage and still require manual migration."
            ));
        }
        if warnings.is_empty() && keyring_active_count > 0 {
            #[cfg(target_os = "windows")]
            warnings.push("Active secret descriptors are backed by Windows Credential Manager.".into());
            #[cfg(target_os = "macos")]
            warnings.push("Active secret descriptors are backed by macOS Keychain.".into());
            #[cfg(not(any(target_os = "windows", target_os = "macos")))]
            warnings.push("Active secret descriptors are backed by OS keyring.".into());
        }
    }

    Ok(RuntimeVaultState {
        backend,
        encrypted_at_rest,
        readiness,
        warnings,
    })
}

fn apply_runtime_vault_state(
    manifest: &mut SecretsManifestDocument,
    fallback: &VaultFallbackDocument,
) -> Result<(), String> {
    let runtime = evaluate_runtime_vault_state(manifest, fallback)?;
    manifest.vault_backend = runtime.backend;
    manifest.encrypted_at_rest = runtime.encrypted_at_rest;
    manifest.warnings = runtime.warnings;
    Ok(())
}

fn import_provider_map_entry(
    legacy_key: &str,
    entry: &LegacySecureSettingEntry,
    imported_at_epoch_ms: u64,
    fallback_entries: &mut BTreeMap<String, VaultFallbackEntry>,
    key_descriptors: &mut Vec<SecretKeyDescriptor>,
    imported_keys: &mut Vec<String>,
    opaque_keys: &mut Vec<String>,
    warnings: &mut Vec<String>,
) -> Result<(), String> {
    let decoded = match decode_legacy_entry_to_utf8(legacy_key, entry) {
        Ok(Some(decoded)) => decoded,
        Ok(None) => {
            carry_forward_opaque_secret(
                legacy_key,
                entry,
                imported_at_epoch_ms,
                fallback_entries,
                key_descriptors,
                opaque_keys,
                warnings,
                "Legacy provider API key map is still encrypted by Electron safeStorage and was preserved as an opaque payload.",
            );
            return Ok(());
        }
        Err(error) => {
            warnings.push(error);
            return Ok(());
        }
    };

    let parsed = serde_json::from_str::<BTreeMap<String, String>>(&decoded).map_err(|error| {
        format!("failed to parse {legacy_key} as a provider API key map during import: {error}")
    })?;

    for (provider, value) in parsed {
        let Some(normalized_provider) = normalize_provider_key(&provider) else {
            warnings.push(format!(
                "unsupported provider key '{provider}' was skipped during legacy secure settings import."
            ));
            continue;
        };

        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }

        let target_key = format!("provider.{normalized_provider}.api_key");
        upsert_plaintext_secret(
            target_key,
            Some(normalized_provider.to_string()),
            format!("Imported {normalized_provider} API key from the legacy secure provider map."),
            trimmed.to_string(),
            legacy_key.to_string(),
            imported_at_epoch_ms,
            fallback_entries,
            key_descriptors,
            imported_keys,
            warnings,
        );
    }

    Ok(())
}

fn import_single_secret_entry(
    legacy_key: &str,
    target_key: &str,
    provider: Option<&str>,
    purpose: &str,
    entry: &LegacySecureSettingEntry,
    imported_at_epoch_ms: u64,
    fallback_entries: &mut BTreeMap<String, VaultFallbackEntry>,
    key_descriptors: &mut Vec<SecretKeyDescriptor>,
    imported_keys: &mut Vec<String>,
    opaque_keys: &mut Vec<String>,
    warnings: &mut Vec<String>,
) -> Result<(), String> {
    let decoded = match decode_legacy_entry_to_utf8(legacy_key, entry) {
        Ok(Some(decoded)) => decoded,
        Ok(None) => {
            carry_forward_opaque_secret(
                legacy_key,
                entry,
                imported_at_epoch_ms,
                fallback_entries,
                key_descriptors,
                opaque_keys,
                warnings,
                "Legacy secure setting is still encrypted by Electron safeStorage and was preserved as an opaque payload.",
            );
            return Ok(());
        }
        Err(error) => {
            warnings.push(error);
            return Ok(());
        }
    };

    let trimmed = decoded.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    upsert_plaintext_secret(
        target_key.to_string(),
        provider.map(ToString::to_string),
        purpose.to_string(),
        trimmed.to_string(),
        legacy_key.to_string(),
        imported_at_epoch_ms,
        fallback_entries,
        key_descriptors,
        imported_keys,
        warnings,
    );

    Ok(())
}

fn upsert_plaintext_secret(
    target_key: String,
    provider: Option<String>,
    purpose: String,
    plaintext_value: String,
    imported_from: String,
    imported_at_epoch_ms: u64,
    fallback_entries: &mut BTreeMap<String, VaultFallbackEntry>,
    key_descriptors: &mut Vec<SecretKeyDescriptor>,
    imported_keys: &mut Vec<String>,
    warnings: &mut Vec<String>,
) {
    if fallback_entries.contains_key(&target_key) {
        warnings.push(format!(
            "duplicate secret target '{target_key}' was overwritten by the latest imported legacy entry."
        ));
    }

    fallback_entries.insert(
        target_key.clone(),
        VaultFallbackEntry {
            encoding: VaultFallbackEncoding::Utf8Plaintext,
            encrypted: false,
            value: plaintext_value,
            imported_from,
            imported_at_epoch_ms,
        },
    );
    imported_keys.push(target_key.clone());

    key_descriptors.retain(|descriptor| descriptor.key != target_key);
    key_descriptors.push(SecretKeyDescriptor {
        key: target_key,
        provider,
        purpose,
        updated_at_epoch_ms: imported_at_epoch_ms,
    });
}

fn carry_forward_opaque_secret(
    legacy_key: &str,
    entry: &LegacySecureSettingEntry,
    imported_at_epoch_ms: u64,
    fallback_entries: &mut BTreeMap<String, VaultFallbackEntry>,
    key_descriptors: &mut Vec<SecretKeyDescriptor>,
    opaque_keys: &mut Vec<String>,
    warnings: &mut Vec<String>,
    warning_message: &str,
) {
    let target_key = format!("legacy.{legacy_key}");
    fallback_entries.insert(
        target_key.clone(),
        VaultFallbackEntry {
            encoding: VaultFallbackEncoding::LegacySafeStorageBase64,
            encrypted: entry.encrypted,
            value: entry.value.clone(),
            imported_from: legacy_key.to_string(),
            imported_at_epoch_ms,
        },
    );
    opaque_keys.push(target_key.clone());
    key_descriptors.push(SecretKeyDescriptor {
        key: target_key,
        provider: None,
        purpose: "Opaque legacy secure payload preserved for later migration tooling.".into(),
        updated_at_epoch_ms: imported_at_epoch_ms,
    });
    warnings.push(format!("{warning_message} ({legacy_key})"));
}

fn build_import_manifest_warnings(
    imported_secret_count: u32,
    opaque_secret_count: u32,
    import_warnings: &[String],
) -> Vec<String> {
    let mut warnings = vec![
        "Secrets were imported into vault-fallback.json because an encrypted desktop vault backend is not wired yet."
            .into(),
    ];

    if imported_secret_count == 0 {
        warnings.push(
            "No plaintext secret values were recoverable from the legacy secure settings store."
                .into(),
        );
    }

    if opaque_secret_count > 0 {
        warnings.push(format!(
            "{opaque_secret_count} encrypted legacy secret payload(s) were preserved as opaque safeStorage blobs and still require follow-up decryption or manual re-entry."
        ));
    }

    warnings.extend(import_warnings.iter().cloned());
    warnings
}

fn decode_legacy_entry_to_utf8(
    legacy_key: &str,
    entry: &LegacySecureSettingEntry,
) -> Result<Option<String>, String> {
    if entry.encrypted {
        return Ok(None);
    }

    let bytes = decode_base64(&entry.value).map_err(|error| {
        format!("failed to decode base64 payload for legacy secure setting {legacy_key}: {error}")
    })?;
    String::from_utf8(bytes).map(Some).map_err(|error| {
        format!(
            "legacy secure setting {legacy_key} was not valid UTF-8 after base64 decoding: {error}"
        )
    })
}

fn os_keyring_backend_supported() -> bool {
    cfg!(target_os = "windows") || cfg!(target_os = "macos")
}

fn secret_keyring_target(secret_key: &str) -> String {
    format!("RoleRoverDesktop/{secret_key}")
}

fn read_secret_from_os_keyring(secret_key: &str) -> Result<Option<String>, String> {
    let target = secret_keyring_target(secret_key);
    #[cfg(target_os = "windows")]
    {
        windows_credential::read(&target)
    }
    #[cfg(target_os = "macos")]
    {
        macos_keychain::read(&target)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = target;
        Ok(None)
    }
}

fn write_secret_to_os_keyring(secret_key: &str, value: &str) -> Result<(), String> {
    let target = secret_keyring_target(secret_key);
    #[cfg(target_os = "windows")]
    {
        windows_credential::write(&target, value)
    }
    #[cfg(target_os = "macos")]
    {
        macos_keychain::write(&target, value)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = target;
        let _ = value;
        Err("OS keyring backend is only available on Windows and macOS.".into())
    }
}

fn delete_secret_from_os_keyring(secret_key: &str) -> Result<(), String> {
    let target = secret_keyring_target(secret_key);
    #[cfg(target_os = "windows")]
    {
        windows_credential::delete(&target)
    }
    #[cfg(target_os = "macos")]
    {
        macos_keychain::delete(&target)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = target;
        Ok(())
    }
}

#[cfg(target_os = "windows")]
mod windows_credential {
    use std::{ffi::c_void, ptr};

    const CRED_TYPE_GENERIC: u32 = 1;
    const CRED_PERSIST_LOCAL_MACHINE: u32 = 2;
    const ERROR_NOT_FOUND: u32 = 1168;

    #[repr(C)]
    struct FileTime {
        low_date_time: u32,
        high_date_time: u32,
    }

    #[repr(C)]
    struct CredentialAttributeW {
        keyword: *mut u16,
        flags: u32,
        value_size: u32,
        value: *mut u8,
    }

    #[repr(C)]
    struct CredentialW {
        flags: u32,
        type_: u32,
        target_name: *mut u16,
        comment: *mut u16,
        last_written: FileTime,
        credential_blob_size: u32,
        credential_blob: *mut u8,
        persist: u32,
        attribute_count: u32,
        attributes: *mut CredentialAttributeW,
        target_alias: *mut u16,
        user_name: *mut u16,
    }

    #[link(name = "Advapi32")]
    extern "system" {
        fn CredWriteW(credential: *const CredentialW, flags: u32) -> i32;
        fn CredReadW(
            target_name: *const u16,
            type_: u32,
            flags: u32,
            credential: *mut *mut CredentialW,
        ) -> i32;
        fn CredDeleteW(target_name: *const u16, type_: u32, flags: u32) -> i32;
        fn CredFree(buffer: *mut c_void);
    }

    #[link(name = "Kernel32")]
    extern "system" {
        fn GetLastError() -> u32;
    }

    fn to_wide_null(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn read(target: &str) -> Result<Option<String>, String> {
        let target_wide = to_wide_null(target);
        let mut credential_ptr: *mut CredentialW = ptr::null_mut();
        let read_ok = unsafe {
            // SAFETY: target_wide is null-terminated and lives for the call.
            CredReadW(
                target_wide.as_ptr(),
                CRED_TYPE_GENERIC,
                0,
                &mut credential_ptr,
            )
        };

        if read_ok == 0 {
            let error_code = unsafe { GetLastError() };
            if error_code == ERROR_NOT_FOUND {
                return Ok(None);
            }

            return Err(format!(
                "failed to read secret from Windows Credential Manager ({target}): error {error_code}"
            ));
        }

        if credential_ptr.is_null() {
            return Ok(None);
        }

        let value = unsafe {
            // SAFETY: credential_ptr is owned by CredReadW success path and valid until CredFree.
            let credential_ref = &*credential_ptr;
            let value_bytes = std::slice::from_raw_parts(
                credential_ref.credential_blob as *const u8,
                credential_ref.credential_blob_size as usize,
            )
            .to_vec();
            CredFree(credential_ptr as *mut c_void);
            value_bytes
        };

        if value.is_empty() {
            return Ok(Some(String::new()));
        }

        String::from_utf8(value).map(Some).map_err(|error| {
            format!("secret from Windows Credential Manager for {target} is not UTF-8: {error}")
        })
    }

    pub fn write(target: &str, value: &str) -> Result<(), String> {
        let mut target_wide = to_wide_null(target);
        let mut credential_blob = value.as_bytes().to_vec();
        let credential_blob_size = u32::try_from(credential_blob.len()).map_err(|_| {
            format!(
                "secret value for {target} exceeded supported Credential Manager blob size limits"
            )
        })?;

        let credential = CredentialW {
            flags: 0,
            type_: CRED_TYPE_GENERIC,
            target_name: target_wide.as_mut_ptr(),
            comment: ptr::null_mut(),
            last_written: FileTime {
                low_date_time: 0,
                high_date_time: 0,
            },
            credential_blob_size,
            credential_blob: if credential_blob.is_empty() {
                ptr::null_mut()
            } else {
                credential_blob.as_mut_ptr()
            },
            persist: CRED_PERSIST_LOCAL_MACHINE,
            attribute_count: 0,
            attributes: ptr::null_mut(),
            target_alias: ptr::null_mut(),
            user_name: ptr::null_mut(),
        };

        let write_ok = unsafe {
            // SAFETY: pointers in credential reference stack/local buffers alive for the duration of the call.
            CredWriteW(&credential, 0)
        };

        if write_ok == 0 {
            let error_code = unsafe { GetLastError() };
            return Err(format!(
                "failed to write secret to Windows Credential Manager ({target}): error {error_code}"
            ));
        }

        Ok(())
    }

    pub fn delete(target: &str) -> Result<(), String> {
        let target_wide = to_wide_null(target);
        let delete_ok = unsafe {
            // SAFETY: target_wide is null-terminated and lives for the call.
            CredDeleteW(target_wide.as_ptr(), CRED_TYPE_GENERIC, 0)
        };

        if delete_ok == 0 {
            let error_code = unsafe { GetLastError() };
            if error_code == ERROR_NOT_FOUND {
                return Ok(());
            }

            return Err(format!(
                "failed to delete secret from Windows Credential Manager ({target}): error {error_code}"
            ));
        }

        Ok(())
    }
}

#[cfg(target_os = "macos")]
mod macos_keychain {
    pub fn read(target: &str) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new("RoleRoverDesktop", target)
            .map_err(|error| format!("failed to create keyring entry for read ({target}): {error}"))?;
        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(format!(
                "failed to read secret from macOS Keychain ({target}): {error}"
            )),
        }
    }

    pub fn write(target: &str, value: &str) -> Result<(), String> {
        let entry = keyring::Entry::new("RoleRoverDesktop", target)
            .map_err(|error| format!("failed to create keyring entry for write ({target}): {error}"))?;
        entry.set_password(value).map_err(|error| {
            format!("failed to write secret to macOS Keychain ({target}): {error}")
        })
    }

    pub fn delete(target: &str) -> Result<(), String> {
        let entry = keyring::Entry::new("RoleRoverDesktop", target)
            .map_err(|error| format!("failed to create keyring entry for delete ({target}): {error}"))?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!(
                "failed to delete secret from macOS Keychain ({target}): {error}"
            )),
        }
    }
}

fn normalize_provider_key(provider: &str) -> Option<&'static str> {
    match provider.trim().to_ascii_lowercase().as_str() {
        "openai" | "custom" | "azure" => Some("openai"),
        "anthropic" => Some("anthropic"),
        "gemini" => Some("gemini"),
        _ => None,
    }
}

fn infer_provider_from_secret_key(key: &str) -> Option<String> {
    key.strip_prefix("provider.")
        .and_then(|value| value.strip_suffix(".api_key"))
        .map(|value| value.to_string())
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let mut sextets = Vec::new();
    for ch in input.chars().filter(|ch| !ch.is_ascii_whitespace()) {
        match ch {
            '=' => break,
            'A'..='Z' => sextets.push((ch as u8) - b'A'),
            'a'..='z' => sextets.push((ch as u8) - b'a' + 26),
            '0'..='9' => sextets.push((ch as u8) - b'0' + 52),
            '+' => sextets.push(62),
            '/' => sextets.push(63),
            _ => return Err(format!("invalid base64 character '{ch}'")),
        }
    }

    if sextets.is_empty() {
        return Ok(Vec::new());
    }

    let remainder = sextets.len() % 4;
    if remainder == 1 {
        return Err("base64 payload has an invalid length".into());
    }

    let mut bytes = Vec::with_capacity((sextets.len() * 3) / 4);
    let mut index = 0;
    while index < sextets.len() {
        let a = sextets[index];
        let b = *sextets.get(index + 1).unwrap_or(&0);
        let c = *sextets.get(index + 2).unwrap_or(&0);
        let d = *sextets.get(index + 3).unwrap_or(&0);

        bytes.push((a << 2) | (b >> 4));
        if index + 2 < sextets.len() {
            bytes.push(((b & 0x0F) << 4) | (c >> 2));
        }
        if index + 3 < sextets.len() {
            bytes.push(((c & 0x03) << 6) | d);
        }

        index += 4;
    }

    Ok(bytes)
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("path has no parent: {}", path.display()))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create directory {}: {error}", parent.display()))
}

fn read_json_file<T>(path: &Path) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", path.display()))
}

fn write_json_file<T>(path: &Path, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let payload = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize {}: {error}", path.display()))?;
    fs::write(path, payload).map_err(|error| format!("failed to write {}: {error}", path.display()))
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
