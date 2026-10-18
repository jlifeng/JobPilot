use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;
use tauri::AppHandle;
use tauri::Manager;

use crate::storage::{
    ensure_storage_directory, now_epoch_ms, read_validated_pdf_output, resolve_pdf_browser_path,
    run_browser_pdf_print, wait_for_pdf_export_output, PDF_SCRATCH_DIR_NAME,
};

/// Sub-directory of the app cache dir holding print-preview scratch artifacts.
const PREVIEW_SCRATCH_DIR_NAME: &str = "previews";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPreviewReceipt {
    bytes_written: usize,
    bytes: Vec<u8>,
}

/// Everything the preview pipeline has to clean up, on success and on failure.
struct PreviewScratch {
    html_path: PathBuf,
    pdf_path: PathBuf,
    user_data_dir: PathBuf,
}

impl PreviewScratch {
    fn remove_all(&self) {
        let _ = fs::remove_file(&self.html_path);
        let _ = fs::remove_file(&self.pdf_path);
        let _ = fs::remove_dir_all(&self.user_data_dir);
    }
}

/// Scratch directory for preview artifacts, always inside the app cache dir.
pub(crate) fn preview_scratch_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("failed to resolve app cache dir: {error}"))?
        .join(PDF_SCRATCH_DIR_NAME)
        .join(PREVIEW_SCRATCH_DIR_NAME);
    ensure_storage_directory(&cache_dir)?;
    Ok(cache_dir)
}

/// Paths of the three scratch artifacts for one preview run, all inside `directory`.
fn preview_scratch_paths(directory: &Path, request_id: &str) -> PreviewScratch {
    PreviewScratch {
        html_path: directory.join(format!("preview-{request_id}.html")),
        pdf_path: directory.join(format!("preview-{request_id}.pdf")),
        user_data_dir: directory.join(format!("preview-render-profile-{request_id}")),
    }
}

/// Renders preview HTML into a PDF and returns its bytes.
///
/// Nothing is written outside the app cache dir; the scratch HTML, the scratch PDF and the
/// Chrome profile directory are removed on both success and failure.
pub(crate) async fn generate_pdf_preview(
    app: AppHandle,
    html: String,
) -> Result<PdfPreviewReceipt, String> {
    let scratch_dir = preview_scratch_dir(&app)?;
    let request_id = format!("{}-{}", now_epoch_ms()?, uuid::Uuid::new_v4());
    let scratch = preview_scratch_paths(&scratch_dir, &request_id);

    let result = render_preview_pdf(&html, &scratch).await;
    // Cleanup runs on both paths: the existing export only cleaned up after success.
    scratch.remove_all();
    result
}

async fn render_preview_pdf(
    html: &str,
    scratch: &PreviewScratch,
) -> Result<PdfPreviewReceipt, String> {
    fs::write(&scratch.html_path, html.as_bytes()).map_err(|error| {
        format!(
            "failed to write temporary preview html {}: {error}",
            scratch.html_path.display()
        )
    })?;

    ensure_storage_directory(&scratch.user_data_dir)?;

    let browser_path = resolve_pdf_browser_path()?;
    run_browser_pdf_print(
        &browser_path,
        &scratch.html_path,
        &scratch.pdf_path,
        &scratch.user_data_dir,
    )
    .await?;

    let bytes_written = wait_for_pdf_export_output(&scratch.pdf_path)?;
    let bytes = read_validated_pdf_output(&scratch.pdf_path, "pdf preview")?;

    if bytes.len() != bytes_written {
        return Err(format!(
            "pdf preview output changed while reading {}",
            scratch.pdf_path.display()
        ));
    }

    Ok(PdfPreviewReceipt {
        bytes_written,
        bytes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::storage::path_to_string;

    fn scratch_dir(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("jobpilot-pdf-preview-tests-{name}"))
    }

    #[test]
    fn preview_scratch_paths_stay_inside_the_preview_directory() {
        let directory = scratch_dir("paths");
        let scratch = preview_scratch_paths(&directory, "1700000000000-abc");

        assert_eq!(
            scratch.html_path,
            directory.join("preview-1700000000000-abc.html")
        );
        assert_eq!(
            scratch.pdf_path,
            directory.join("preview-1700000000000-abc.pdf")
        );
        assert_eq!(
            scratch.user_data_dir,
            directory.join("preview-render-profile-1700000000000-abc")
        );

        for path in [
            &scratch.html_path,
            &scratch.pdf_path,
            &scratch.user_data_dir,
        ] {
            assert!(
                path.starts_with(&directory),
                "{} must stay inside the preview scratch directory",
                path.display()
            );
        }
    }

    #[test]
    fn preview_scratch_paths_are_unique_per_request_id() {
        let directory = scratch_dir("unique");
        let first = preview_scratch_paths(&directory, "1700000000000-abc");
        let second = preview_scratch_paths(&directory, "1700000000000-def");

        assert_ne!(first.html_path, second.html_path);
        assert_ne!(first.pdf_path, second.pdf_path);
        assert_ne!(first.user_data_dir, second.user_data_dir);
    }

    #[test]
    fn preview_scratch_paths_reject_parent_dir_escape_in_request_id() {
        let directory = scratch_dir("escape");
        let scratch = preview_scratch_paths(&directory, "..");

        for path in [
            &scratch.html_path,
            &scratch.pdf_path,
            &scratch.user_data_dir,
        ] {
            let components = path
                .components()
                .filter_map(|component| match component {
                    std::path::Component::Normal(value) => {
                        Some(value.to_string_lossy().to_string())
                    }
                    _ => None,
                })
                .collect::<Vec<_>>();
            assert!(
                !components.iter().any(|component| component == ".."),
                "{} must not contain a parent directory component",
                path.display()
            );
        }
    }

    #[test]
    fn preview_receipt_serialises_bytes_as_camel_case() {
        let receipt = PdfPreviewReceipt {
            bytes_written: 9,
            bytes: b"%PDF-1.4\n".to_vec(),
        };

        let json = serde_json::to_value(&receipt).expect("serialize receipt");

        assert_eq!(json["bytesWritten"], 9);
        assert_eq!(
            json["bytes"],
            serde_json::Value::from(vec![
                0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,
            ])
        );
        assert!(json.get("bytes_written").is_none(), "no snake_case keys");
    }

    #[test]
    fn preview_scratch_remove_all_removes_files_and_profile_dir() {
        let directory = scratch_dir("cleanup");
        fs::create_dir_all(&directory).expect("create scratch dir");
        let scratch = preview_scratch_paths(&directory, "1700000000000-cleanup");

        fs::write(&scratch.html_path, b"<html></html>").expect("write html");
        fs::write(&scratch.pdf_path, b"%PDF-1.4").expect("write pdf");
        fs::create_dir_all(&scratch.user_data_dir).expect("create profile dir");
        fs::write(scratch.user_data_dir.join("Preferences"), b"{}")
            .expect("write profile file");

        scratch.remove_all();

        assert!(!scratch.html_path.exists(), "temp html must be removed");
        assert!(!scratch.pdf_path.exists(), "temp pdf must be removed");
        assert!(
            !scratch.user_data_dir.exists(),
            "chrome profile dir must be removed"
        );
        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn preview_scratch_remove_all_tolerates_missing_artifacts() {
        let directory = scratch_dir("cleanup-missing");
        fs::create_dir_all(&directory).expect("create scratch dir");
        let scratch = preview_scratch_paths(&directory, "1700000000000-missing");

        scratch.remove_all();

        assert!(!scratch.html_path.exists());
        assert!(!scratch.pdf_path.exists());
        assert!(!scratch.user_data_dir.exists());
        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn preview_scratch_dir_is_nested_inside_the_export_scratch_dir() {
        let app_cache_dir = scratch_dir("cache");
        let expected_dir = app_cache_dir
            .join(PDF_SCRATCH_DIR_NAME)
            .join(PREVIEW_SCRATCH_DIR_NAME);
        let resolved = preview_scratch_paths(&expected_dir, "id");

        for path in [
            &resolved.html_path,
            &resolved.pdf_path,
            &resolved.user_data_dir,
        ] {
            assert!(
                path.starts_with(&expected_dir),
                "{} must stay inside the preview scratch directory",
                path.display()
            );
            assert!(
                path.starts_with(&app_cache_dir),
                "{} must stay inside the app cache dir",
                path.display()
            );
            assert_eq!(
                path_to_string(path),
                path.to_string_lossy().replace('\\', "/")
            );
        }
    }

    #[test]
    fn preview_scratch_dir_names_use_the_documented_segments() {
        assert_eq!(PDF_SCRATCH_DIR_NAME, "exports");
        assert_eq!(PREVIEW_SCRATCH_DIR_NAME, "previews");
    }
}
