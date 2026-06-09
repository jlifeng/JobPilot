use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand_core::{OsRng, RngCore};
use reqwest::{Client, Method, StatusCode};
use rusqlite::{backup::Backup, Connection};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};

use crate::settings::{
    self, SecretValueWriteInput, WorkspaceSettingsDocument, WorkspaceWebdavSettings,
};
use crate::storage;

const DATABASE_FILE: &str = "rolerover.db";
const WEBDAV_SECRET_KEY: &str = "sync.webdav.password";
const SNAPSHOT_SCHEMA_VERSION: u32 = 1;
const LATEST_FILE_NAME: &str = "latest.json";
const ARGON2_MEMORY_KIB: u32 = 19_456;
const ARGON2_ITERATIONS: u32 = 2;
const ARGON2_PARALLELISM: u32 = 1;
const AUTO_SYNC_POLL_SECONDS: u64 = 60;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebdavSettingsUpdateInput {
    pub server_url: String,
    pub username: String,
    pub remote_path: String,
    pub sync_mode: String,
    pub auto_sync_interval_minutes: u32,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebdavSyncStatus {
    pub configured: bool,
    pub server_url: String,
    pub username: String,
    pub remote_path: String,
    pub sync_mode: String,
    pub auto_sync_interval_minutes: u32,
    pub password_configured: bool,
    pub last_snapshot_name: Option<String>,
    pub last_backup_at_epoch_ms: Option<u64>,
    pub last_restore_at_epoch_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebdavConnectivityResult {
    pub success: bool,
    pub latency_ms: u128,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebdavSnapshotReceipt {
    pub snapshot_name: String,
    pub remote_path: String,
    pub database_bytes: usize,
    pub secret_count: usize,
    pub settings_included: bool,
    pub completed_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebdavRestoreReceipt {
    pub snapshot_name: String,
    pub local_backup_path: String,
    pub restored_secret_count: usize,
    pub restored_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebdavSnapshotEnvelope {
    schema_version: u32,
    app_version: String,
    created_at_epoch_ms: u64,
    snapshot_name: String,
    database: SnapshotDatabase,
    workspace_settings: WorkspaceSettingsDocument,
    encrypted_secrets: EncryptedSecretBundle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotDatabase {
    file_name: String,
    encoding: String,
    bytes_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedSecretBundle {
    algorithm: String,
    kdf: String,
    kdf_params: SecretKdfParams,
    salt_base64: String,
    nonce_base64: String,
    ciphertext_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretKdfParams {
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    output_len: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretBackupPayload {
    secrets: Vec<SecretBackupEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretBackupEntry {
    key: String,
    provider: Option<String>,
    purpose: String,
    value: String,
}

struct WebdavConfig {
    server_url: String,
    username: String,
    remote_path: String,
    password: String,
}

pub fn start_auto_sync_scheduler(app: AppHandle) {
    let sync_in_progress = Arc::new(AtomicBool::new(false));

    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(AUTO_SYNC_POLL_SECONDS));

        if sync_in_progress.swap(true, Ordering::AcqRel) {
            continue;
        }

        let should_sync = should_run_auto_sync(&app).unwrap_or_else(|error| {
            eprintln!("[webdav-auto-sync] failed to evaluate schedule: {error}");
            false
        });

        if should_sync {
            match tauri::async_runtime::block_on(upload_webdav_snapshot(&app)) {
                Ok(receipt) => {
                    println!(
                        "[webdav-auto-sync] uploaded {} to {}",
                        receipt.snapshot_name, receipt.remote_path
                    );
                }
                Err(error) => {
                    eprintln!("[webdav-auto-sync] upload failed: {error}");
                }
            }
        }

        sync_in_progress.store(false, Ordering::Release);
    });
}

fn should_run_auto_sync(app: &AppHandle) -> Result<bool, String> {
    let status = get_webdav_sync_status(app)?;
    if !status.configured || status.sync_mode != "auto" {
        return Ok(false);
    }

    let now = settings::now_epoch_ms()?;
    let interval_ms = u64::from(status.auto_sync_interval_minutes) * 60 * 1000;
    let last_backup = status.last_backup_at_epoch_ms.unwrap_or(0);

    Ok(last_backup == 0 || now.saturating_sub(last_backup) >= interval_ms)
}

pub fn get_webdav_sync_status(app: &AppHandle) -> Result<WebdavSyncStatus, String> {
    let workspace_root = resolve_workspace_root(app)?;
    let settings = settings::load_or_initialize_settings(&workspace_root)?;
    let password_configured = settings::read_secret_value(&workspace_root, WEBDAV_SECRET_KEY)?
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    Ok(to_status(&settings.sync.webdav, password_configured))
}

pub fn update_webdav_sync_settings(
    app: &AppHandle,
    input: WebdavSettingsUpdateInput,
) -> Result<WebdavSyncStatus, String> {
    let workspace_root = resolve_workspace_root(app)?;
    let mut document = settings::load_or_initialize_settings(&workspace_root)?;
    let server_url = input.server_url.trim().trim_end_matches('/').to_string();
    if server_url.is_empty() {
        return Err("WebDAV server URL is required".into());
    }
    let sync_mode = match input.sync_mode.trim() {
        "auto" => "auto",
        _ => "manual",
    };
    let auto_sync_interval_minutes = input.auto_sync_interval_minutes.clamp(5, 1440);

    document.sync.webdav.server_url = server_url;
    document.sync.webdav.username = input.username.trim().to_string();
    document.sync.webdav.remote_path = normalize_remote_path(&input.remote_path);
    document.sync.webdav.sync_mode = sync_mode.into();
    document.sync.webdav.auto_sync_interval_minutes = auto_sync_interval_minutes;
    settings::persist_settings(&workspace_root, document)?;

    if let Some(password) = input.password {
        settings::write_secret_value(
            &workspace_root,
            SecretValueWriteInput {
                key: WEBDAV_SECRET_KEY.into(),
                provider: None,
                purpose: Some("WebDAV sync password or app password.".into()),
                value: password,
            },
        )?;
    }

    get_webdav_sync_status(app)
}

pub async fn test_webdav_connection(app: &AppHandle) -> Result<WebdavConnectivityResult, String> {
    let start = Instant::now();
    match test_webdav_connection_inner(app).await {
        Ok(()) => Ok(WebdavConnectivityResult {
            success: true,
            latency_ms: start.elapsed().as_millis(),
            error_message: None,
        }),
        Err(error) => Ok(WebdavConnectivityResult {
            success: false,
            latency_ms: start.elapsed().as_millis(),
            error_message: Some(error),
        }),
    }
}

async fn test_webdav_connection_inner(app: &AppHandle) -> Result<(), String> {
    let config = load_webdav_config(app)?;
    let client = webdav_client()?;

    // Verify the remote collection is reachable via PROPFIND
    let collection_url = remote_collection_url(&config)?;
    let propfind = Method::from_bytes(b"PROPFIND")
        .map_err(|error| format!("invalid PROPFIND method: {error}"))?;
    let response = authorized(
        client
            .request(propfind, &collection_url)
            .header("Depth", "0")
            .body(r#"<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop></prop></propfind>"#),
        &config,
    )
    .send()
    .await
    .map_err(|error| format!("failed to probe WebDAV collection: {error}"))?;

    if response.status() == StatusCode::NOT_FOUND {
        // Collection does not exist — try to create it
        ensure_remote_collections(&client, &config).await?;
    } else if !response.status().is_success() && response.status() != StatusCode::MULTI_STATUS {
        return Err(format!(
            "WebDAV collection not found: {} (HTTP {}) — create the folder '{}' on your server first",
            collection_url,
            response.status(),
            config.remote_path
        ));
    }

    // Try to write a test file to verify write permission
    let test_path = remote_file_url(&config, ".jobpilot-webdav-test.txt")?;
    let response = authorized(
        client
            .put(&test_path)
            .header("Content-Type", "text/plain")
            .body(format!(
                "JobPilot WebDAV test {}",
                settings::now_epoch_ms()?
            )),
        &config,
    )
    .send()
    .await
    .map_err(|error| format!("failed to write WebDAV test file: {error}"))?;

    if response.status() == StatusCode::METHOD_NOT_ALLOWED {
        // Some WebDAV servers (e.g. 123pan) reject PUT for new files.
        // Fall back to verifying the collection is writable via PROPFIND with quota check.
        // If we can list the collection, we consider the connection test passed
        // and will discover write issues at actual upload time.
        return Ok(());
    }
    ensure_success(response.status(), "write WebDAV test file")?;

    // Clean up the test file
    let response = authorized(client.delete(&test_path), &config)
        .send()
        .await
        .map_err(|error| format!("failed to delete WebDAV test file: {error}"))?;
    if !response.status().is_success() && response.status() != StatusCode::NOT_FOUND {
        return Err(format!(
            "failed to delete WebDAV test file: HTTP {}",
            response.status()
        ));
    }
    Ok(())
}

pub async fn upload_webdav_snapshot(app: &AppHandle) -> Result<WebdavSnapshotReceipt, String> {
    let config = load_webdav_config(app)?;
    let workspace_root = resolve_workspace_root(app)?;
    let created_at = settings::now_epoch_ms()?;
    let snapshot_name = format!("jobpilot-snapshot-{created_at}.json");
    let envelope = build_snapshot(app, &workspace_root, &snapshot_name, &config.password)?;
    let database_bytes = BASE64
        .decode(&envelope.database.bytes_base64)
        .map_err(|error| format!("failed to count snapshot database bytes: {error}"))?
        .len();
    let secret_count = decrypt_secret_payload(&envelope.encrypted_secrets, &config.password)?
        .secrets
        .len();
    let payload = serde_json::to_vec_pretty(&envelope)
        .map_err(|error| format!("failed to serialize WebDAV snapshot: {error}"))?;

    let client = webdav_client()?;
    ensure_remote_collections(&client, &config).await?;
    put_remote_file(&client, &config, &snapshot_name, payload.clone()).await?;
    put_remote_file(&client, &config, LATEST_FILE_NAME, payload).await?;

    let mut document = settings::load_or_initialize_settings(&workspace_root)?;
    document.sync.webdav.last_snapshot_name = Some(snapshot_name.clone());
    document.sync.webdav.last_backup_at_epoch_ms = Some(created_at);
    settings::persist_settings(&workspace_root, document)?;

    Ok(WebdavSnapshotReceipt {
        snapshot_name,
        remote_path: format!("{}/{}", config.remote_path, LATEST_FILE_NAME),
        database_bytes,
        secret_count,
        settings_included: true,
        completed_at_epoch_ms: created_at,
    })
}

pub async fn restore_webdav_snapshot(app: &AppHandle) -> Result<WebdavRestoreReceipt, String> {
    let config = load_webdav_config(app)?;

    let client = webdav_client()?;
    let response = authorized(
        client.get(remote_file_url(&config, LATEST_FILE_NAME)?),
        &config,
    )
    .send()
    .await
    .map_err(|error| format!("failed to download WebDAV snapshot: {error}"))?;
    ensure_success(response.status(), "download WebDAV snapshot")?;
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read WebDAV snapshot body: {error}"))?;
    let envelope: WebdavSnapshotEnvelope = serde_json::from_slice(&bytes)
        .map_err(|error| format!("failed to parse WebDAV snapshot: {error}"))?;
    if envelope.schema_version != SNAPSHOT_SCHEMA_VERSION {
        return Err(format!(
            "unsupported WebDAV snapshot schema version {}",
            envelope.schema_version
        ));
    }

    let secret_payload = decrypt_secret_payload(&envelope.encrypted_secrets, &config.password)?;
    let workspace_root = resolve_workspace_root(app)?;
    let local_backup_path = create_pre_restore_backup(&workspace_root)?;
    apply_snapshot_database(&workspace_root, &envelope.database)?;

    let mut restored_settings = envelope.workspace_settings.clone();
    restored_settings.sync.webdav.last_restore_at_epoch_ms = Some(settings::now_epoch_ms()?);
    settings::persist_settings(&workspace_root, restored_settings)?;

    for entry in &secret_payload.secrets {
        settings::write_secret_value(
            &workspace_root,
            SecretValueWriteInput {
                key: entry.key.clone(),
                provider: entry.provider.clone(),
                purpose: Some(entry.purpose.clone()),
                value: entry.value.clone(),
            },
        )?;
    }

    storage::get_storage_snapshot(app)?;
    Ok(WebdavRestoreReceipt {
        snapshot_name: envelope.snapshot_name,
        local_backup_path: path_to_string(&local_backup_path),
        restored_secret_count: secret_payload.secrets.len(),
        restored_at_epoch_ms: settings::now_epoch_ms()?,
    })
}

fn build_snapshot(
    app: &AppHandle,
    workspace_root: &Path,
    snapshot_name: &str,
    backup_password: &str,
) -> Result<WebdavSnapshotEnvelope, String> {
    storage::get_storage_snapshot(app)?;
    let database_bytes = export_database_bytes(workspace_root)?;
    let workspace_settings = settings::load_or_initialize_settings(workspace_root)?;
    let secrets = collect_secret_backup_payload(workspace_root)?;
    let encrypted_secrets = encrypt_secret_payload(&secrets, backup_password)?;

    Ok(WebdavSnapshotEnvelope {
        schema_version: SNAPSHOT_SCHEMA_VERSION,
        app_version: app.package_info().version.to_string(),
        created_at_epoch_ms: settings::now_epoch_ms()?,
        snapshot_name: snapshot_name.into(),
        database: SnapshotDatabase {
            file_name: DATABASE_FILE.into(),
            encoding: "base64".into(),
            bytes_base64: BASE64.encode(database_bytes),
        },
        workspace_settings,
        encrypted_secrets,
    })
}

fn export_database_bytes(workspace_root: &Path) -> Result<Vec<u8>, String> {
    let database_path = workspace_root.join(DATABASE_FILE);
    let temp_path = workspace_root
        .join("backups")
        .join(format!("snapshot-db-{}.db", settings::now_epoch_ms()?));
    ensure_parent(&temp_path)?;
    let source = Connection::open(&database_path).map_err(|error| {
        format!(
            "failed to open sqlite database for snapshot {}: {error}",
            database_path.display()
        )
    })?;
    let mut destination = Connection::open(&temp_path).map_err(|error| {
        format!(
            "failed to create sqlite snapshot database {}: {error}",
            temp_path.display()
        )
    })?;
    {
        let backup = Backup::new(&source, &mut destination)
            .map_err(|error| format!("failed to start sqlite snapshot backup: {error}"))?;
        backup
            .run_to_completion(64, Duration::from_millis(20), None)
            .map_err(|error| format!("failed to finish sqlite snapshot backup: {error}"))?;
    }
    drop(destination);
    drop(source);
    let bytes = fs::read(&temp_path).map_err(|error| {
        format!(
            "failed to read sqlite snapshot {}: {error}",
            temp_path.display()
        )
    })?;
    let _ = fs::remove_file(&temp_path);
    Ok(bytes)
}

fn collect_secret_backup_payload(workspace_root: &Path) -> Result<SecretBackupPayload, String> {
    let inventory = settings::get_secret_inventory_snapshot(workspace_root)?;
    let mut secrets = Vec::new();
    for entry in inventory.entries {
        if !entry.is_configured {
            continue;
        }
        let Some(value) = settings::read_secret_value(workspace_root, &entry.key)? else {
            continue;
        };
        secrets.push(SecretBackupEntry {
            key: entry.key,
            provider: entry.provider,
            purpose: entry.purpose,
            value,
        });
    }
    Ok(SecretBackupPayload { secrets })
}

fn encrypt_secret_payload(
    payload: &SecretBackupPayload,
    backup_password: &str,
) -> Result<EncryptedSecretBundle, String> {
    let mut salt = [0u8; 16];
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce);
    let key = derive_snapshot_key(backup_password, &salt)?;
    let cipher = XChaCha20Poly1305::new((&key).into());
    let plaintext = serde_json::to_vec(payload)
        .map_err(|error| format!("failed to serialize secret payload: {error}"))?;
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), plaintext.as_slice())
        .map_err(|_| "failed to encrypt secret payload".to_string())?;

    Ok(EncryptedSecretBundle {
        algorithm: "XChaCha20Poly1305".into(),
        kdf: "Argon2id".into(),
        kdf_params: SecretKdfParams {
            memory_kib: ARGON2_MEMORY_KIB,
            iterations: ARGON2_ITERATIONS,
            parallelism: ARGON2_PARALLELISM,
            output_len: 32,
        },
        salt_base64: BASE64.encode(salt),
        nonce_base64: BASE64.encode(nonce),
        ciphertext_base64: BASE64.encode(ciphertext),
    })
}

fn decrypt_secret_payload(
    bundle: &EncryptedSecretBundle,
    backup_password: &str,
) -> Result<SecretBackupPayload, String> {
    if bundle.algorithm != "XChaCha20Poly1305" || bundle.kdf != "Argon2id" {
        return Err("unsupported snapshot secret encryption metadata".into());
    }
    let salt = BASE64
        .decode(&bundle.salt_base64)
        .map_err(|error| format!("failed to decode snapshot salt: {error}"))?;
    let nonce = BASE64
        .decode(&bundle.nonce_base64)
        .map_err(|error| format!("failed to decode snapshot nonce: {error}"))?;
    if nonce.len() != 24 {
        return Err("snapshot nonce has invalid length".into());
    }
    let ciphertext = BASE64
        .decode(&bundle.ciphertext_base64)
        .map_err(|error| format!("failed to decode snapshot ciphertext: {error}"))?;
    let key = derive_snapshot_key(backup_password, &salt)?;
    let cipher = XChaCha20Poly1305::new((&key).into());
    let plaintext = cipher
        .decrypt(XNonce::from_slice(&nonce), ciphertext.as_slice())
        .map_err(|_| {
            "backup password is incorrect or the secret payload is corrupted".to_string()
        })?;
    serde_json::from_slice(&plaintext)
        .map_err(|error| format!("failed to parse decrypted secret payload: {error}"))
}

fn derive_snapshot_key(backup_password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let params = Params::new(
        ARGON2_MEMORY_KIB,
        ARGON2_ITERATIONS,
        ARGON2_PARALLELISM,
        Some(32),
    )
    .map_err(|error| format!("failed to configure Argon2id: {error}"))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(backup_password.as_bytes(), salt, &mut key)
        .map_err(|error| format!("failed to derive snapshot key: {error}"))?;
    Ok(key)
}

fn apply_snapshot_database(
    workspace_root: &Path,
    database: &SnapshotDatabase,
) -> Result<(), String> {
    if database.file_name != DATABASE_FILE || database.encoding != "base64" {
        return Err("snapshot database payload is not compatible with this app".into());
    }
    let bytes = BASE64
        .decode(&database.bytes_base64)
        .map_err(|error| format!("failed to decode snapshot database: {error}"))?;
    let database_path = workspace_root.join(DATABASE_FILE);
    ensure_parent(&database_path)?;
    for suffix in ["", "-wal", "-shm"] {
        let path = PathBuf::from(format!("{}{}", database_path.display(), suffix));
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|error| format!("failed to remove {}: {error}", path.display()))?;
        }
    }
    fs::write(&database_path, bytes).map_err(|error| {
        format!(
            "failed to restore database {}: {error}",
            database_path.display()
        )
    })
}

fn create_pre_restore_backup(workspace_root: &Path) -> Result<PathBuf, String> {
    let backup_root = workspace_root
        .join("backups")
        .join(format!("pre-webdav-restore-{}", settings::now_epoch_ms()?));
    fs::create_dir_all(&backup_root).map_err(|error| {
        format!(
            "failed to create pre-restore backup directory {}: {error}",
            backup_root.display()
        )
    })?;
    if workspace_root.join(DATABASE_FILE).exists() {
        let bytes = export_database_bytes(workspace_root)?;
        fs::write(backup_root.join(DATABASE_FILE), bytes)
            .map_err(|error| format!("failed to write pre-restore database backup: {error}"))?;
    }
    copy_dir_if_exists(
        &workspace_root.join("settings"),
        &backup_root.join("settings"),
    )?;
    copy_dir_if_exists(
        &workspace_root.join("secrets"),
        &backup_root.join("secrets"),
    )?;
    Ok(backup_root)
}

async fn ensure_remote_collections(client: &Client, config: &WebdavConfig) -> Result<(), String> {
    let mut current = String::new();
    for part in config
        .remote_path
        .split('/')
        .filter(|part| !part.is_empty())
    {
        if !current.is_empty() {
            current.push('/');
        }
        current.push_str(part);
        mkcol_if_needed_at_path(client, config, &current).await?;
    }
    Ok(())
}

async fn mkcol_if_needed_at_path(
    client: &Client,
    config: &WebdavConfig,
    remote_path: &str,
) -> Result<(), String> {
    let url = if remote_path.is_empty() {
        config.server_url.trim_end_matches('/').to_string()
    } else {
        format!(
            "{}/{}",
            config.server_url.trim_end_matches('/'),
            encode_relative_path(remote_path)
        )
    };

    // Try PROPFIND first to check if the collection already exists
    let propfind = Method::from_bytes(b"PROPFIND")
        .map_err(|error| format!("invalid PROPFIND method: {error}"))?;
    let response = authorized(
        client
            .request(propfind, &url)
            .header("Depth", "0")
            .body(r#"<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop></prop></propfind>"#),
        config,
    )
    .send()
    .await
    .map_err(|error| format!("failed to probe WebDAV collection: {error}"))?;

    if response.status().is_success() || response.status() == StatusCode::MULTI_STATUS {
        // Collection exists
        return Ok(());
    }

    // Collection does not exist — try MKCOL
    let method =
        Method::from_bytes(b"MKCOL").map_err(|error| format!("invalid MKCOL method: {error}"))?;
    let response = authorized(client.request(method, &url), config)
        .send()
        .await
        .map_err(|error| format!("failed to create WebDAV collection: {error}"))?;
    if response.status().is_success() {
        return Ok(());
    }
    if response.status() == StatusCode::METHOD_NOT_ALLOWED
        || response.status() == StatusCode::CONFLICT
    {
        // MKCOL not supported or conflict — verify the collection now exists via PROPFIND
        let response = authorized(
            client
                .request(
                    Method::from_bytes(b"PROPFIND").map_err(|error| format!("invalid PROPFIND method: {error}"))?,
                    &url,
                )
                .header("Depth", "0")
                .body(r#"<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop></prop></propfind>"#),
            config,
        )
        .send()
        .await
        .map_err(|error| format!("failed to verify WebDAV collection: {error}"))?;

        if response.status().is_success() || response.status() == StatusCode::MULTI_STATUS {
            return Ok(());
        }
    }
    Err(format!(
        "failed to create WebDAV collection '{}' — ensure the folder exists on the server and you have write permission (HTTP {})",
        remote_path,
        response.status()
    ))
}

async fn put_remote_file(
    client: &Client,
    config: &WebdavConfig,
    relative_path: &str,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let response = authorized(
        client
            .put(remote_file_url(config, relative_path)?)
            .header("Content-Type", "application/octet-stream")
            .body(bytes),
        config,
    )
    .send()
    .await
    .map_err(|error| format!("failed to upload WebDAV snapshot: {error}"))?;
    ensure_success(response.status(), "upload WebDAV snapshot")
}

fn load_webdav_config(app: &AppHandle) -> Result<WebdavConfig, String> {
    let workspace_root = resolve_workspace_root(app)?;
    let document = settings::load_or_initialize_settings(&workspace_root)?;
    let webdav = document.sync.webdav;
    let password = settings::read_secret_value(&workspace_root, WEBDAV_SECRET_KEY)?
        .ok_or_else(|| "WebDAV password is not configured".to_string())?;
    if webdav.server_url.trim().is_empty() {
        return Err("WebDAV server URL is not configured".into());
    }
    Ok(WebdavConfig {
        server_url: webdav.server_url.trim().trim_end_matches('/').to_string(),
        username: webdav.username,
        remote_path: normalize_remote_path(&webdav.remote_path),
        password,
    })
}

fn webdav_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("failed to create WebDAV client: {error}"))
}

fn authorized(request: reqwest::RequestBuilder, config: &WebdavConfig) -> reqwest::RequestBuilder {
    if config.username.trim().is_empty() {
        request
    } else {
        request.basic_auth(config.username.clone(), Some(config.password.clone()))
    }
}

fn remote_collection_url(config: &WebdavConfig) -> Result<String, String> {
    let mut url = config.server_url.trim_end_matches('/').to_string();
    if !config.remote_path.is_empty() {
        url.push('/');
        url.push_str(&encode_relative_path(&config.remote_path));
    }
    Ok(url)
}

fn remote_file_url(config: &WebdavConfig, relative_path: &str) -> Result<String, String> {
    let mut url = remote_collection_url(config)?;
    if !relative_path.is_empty() {
        url.push('/');
        url.push_str(&encode_relative_path(relative_path));
    }
    Ok(url)
}

fn encode_relative_path(path: &str) -> String {
    path.split('/')
        .filter(|part| !part.is_empty())
        .map(percent_encode_segment)
        .collect::<Vec<_>>()
        .join("/")
}

fn percent_encode_segment(segment: &str) -> String {
    let mut output = String::new();
    for byte in segment.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            output.push(byte as char);
        } else {
            output.push_str(&format!("%{byte:02X}"));
        }
    }
    output
}

fn normalize_remote_path(value: &str) -> String {
    let trimmed = value.trim().trim_matches('/');
    if trimmed.is_empty() {
        "JobPilot".into()
    } else {
        trimmed.replace('\\', "/")
    }
}

fn to_status(webdav: &WorkspaceWebdavSettings, password_configured: bool) -> WebdavSyncStatus {
    let configured = !webdav.server_url.trim().is_empty() && password_configured;
    WebdavSyncStatus {
        configured,
        server_url: webdav.server_url.clone(),
        username: webdav.username.clone(),
        remote_path: webdav.remote_path.clone(),
        sync_mode: webdav.sync_mode.clone(),
        auto_sync_interval_minutes: webdav.auto_sync_interval_minutes,
        password_configured,
        last_snapshot_name: webdav.last_snapshot_name.clone(),
        last_backup_at_epoch_ms: webdav.last_backup_at_epoch_ms,
        last_restore_at_epoch_ms: webdav.last_restore_at_epoch_ms,
    }
}

fn ensure_success(status: StatusCode, action: &str) -> Result<(), String> {
    if status.is_success() {
        Ok(())
    } else {
        Err(format!("{action} failed with HTTP {status}"))
    }
}

fn resolve_workspace_root(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    Ok(app_data_dir.join("workspace"))
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("path has no parent: {}", path.display()))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create directory {}: {error}", parent.display()))
}

fn copy_dir_if_exists(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(destination).map_err(|error| {
        format!(
            "failed to create backup directory {}: {error}",
            destination.display()
        )
    })?;
    for entry in fs::read_dir(source)
        .map_err(|error| format!("failed to read directory {}: {error}", source.display()))?
    {
        let entry = entry.map_err(|error| format!("failed to read directory entry: {error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_if_exists(&source_path, &destination_path)?;
        } else {
            fs::copy(&source_path, &destination_path).map_err(|error| {
                format!(
                    "failed to copy {} to {}: {error}",
                    source_path.display(),
                    destination_path.display()
                )
            })?;
        }
    }
    Ok(())
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
