import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEMPLATES } from "@/lib/constants";
import { FileText, X, Loader2, Check } from "lucide-react";
import { TemplateThumbnail } from "@/components/dashboard/template-thumbnail";
import { templateLabelsMap } from "../../lib/template-labels";
import type { DesktopDocumentDetail } from "../../lib/desktop-api";
import { getDesktopAiRuntimeConfig } from "../editor/ai-dialog-helpers";
import {
  importResumeFromFile,
  detectResumeImportFileType,
  resolveImportLanguage,
  MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  RESUME_IMPORT_ACCEPTED_EXTENSIONS,
  ResumeImportError,
  type ResumeImportProgress,
  type ResumeImportStage,
} from "../../lib/resume-import";
import {
  FileUploadArea,
  useFileValidation,
  ImportProgressDisplay,
  ImportStageIndicators,
} from "./file-upload-area";
import {
  IMPORT_STAGE_SEQUENCE,
  calculateImportProgressPercent,
} from "./import-progress-stages";

interface CreateResumeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title?: string;
    template?: string;
    language?: string;
  }) => Promise<DesktopDocumentDetail | null>;
  onCreated?: (document: DesktopDocumentDetail) => void;
}

type Tab = "template" | "upload";

function normalizeCreateErrorMessage(
  error: unknown,
  fallback: string,
  options?: {
    visionModelRequiredForImage?: string;
    visionModelRequiredForScannedPdf?: string;
  },
): string {
  if (error instanceof ResumeImportError) {
    if (error.code === "vision_model_required_for_image") {
      return options?.visionModelRequiredForImage || fallback;
    }

    if (error.code === "vision_model_required_for_scanned_pdf") {
      return options?.visionModelRequiredForScannedPdf || fallback;
    }
  }

  if (typeof error === "string") {
    if (error.includes("__TAURI_INTERNALS__")) {
      return "当前不是 Tauri 桌面运行时，不能创建本地简历。请在桌面应用窗口中操作。";
    }
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes("__TAURI_INTERNALS__")) {
      return "当前不是 Tauri 桌面运行时，不能创建本地简历。请在桌面应用窗口中操作。";
    }
    return error.message;
  }

  return fallback;
}

export function CreateResumeDialog({
  open,
  onClose,
  onCreate,
  onCreated,
}: CreateResumeDialogProps) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("template");
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<string>("classic");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState<ResumeImportProgress | null>(null);
  const [resumeImportVisionModel, setResumeImportVisionModel] = useState("");
  const [isLoadingImportConfig, setIsLoadingImportConfig] = useState(false);

  const { validateFile } = useFileValidation();

  useEffect(() => {
    if (!open) {
      return;
    }

    setIsLoadingImportConfig(true);
    void (async () => {
      try {
        const runtimeConfig = await getDesktopAiRuntimeConfig();
        setResumeImportVisionModel(runtimeConfig.resumeImportVisionModel || "");
      } catch {
        setResumeImportVisionModel("");
      } finally {
        setIsLoadingImportConfig(false);
      }
    })();
  }, [open]);

  const resetAndClose = () => {
    setTitle("");
    setTemplate("classic");
    setFile(null);
    setParseError("");
    setCreateError("");
    setImportProgress(null);
    setTab("template");
    onClose();
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateError("");
    try {
      const document = await onCreate({ title: title || undefined, template });
      if (document) {
        resetAndClose();
        onCreated?.(document);
      } else {
        setCreateError(t("importError"));
      }
    } catch (error) {
      console.error("Failed to create desktop document:", error);
      setCreateError(normalizeCreateErrorMessage(error, t("importError")));
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setParseError("");
    setImportProgress(null);
    const validation = validateFile(selectedFile);
    if (!validation.isValid) {
      setParseError(validation.error || "Invalid file");
      return;
    }
    setFile(selectedFile);
  };

  const handleFileClear = () => {
    setFile(null);
    setParseError("");
    setImportProgress(null);
  };

  const handleUploadParse = async () => {
    if (!file) return;
    setIsParsing(true);
    setParseError("");

    try {
      const document = await importResumeFromFile({
        file,
        template,
        language: resolveImportLanguage(i18n.language),
        onProgress: setImportProgress,
      });

      if (document) {
        resetAndClose();
        onCreated?.(document);
      }
    } catch (error) {
      setParseError(
        normalizeCreateErrorMessage(error, t("dashboardUploadParseFailed"), {
          visionModelRequiredForImage: t("dashboard.upload.imageNeedsVisionModel"),
          visionModelRequiredForScannedPdf: t(
            "dashboard.upload.scannedPdfNeedsVisionModel",
          ),
        }),
      );
    } finally {
      setIsParsing(false);
      setImportProgress(null);
    }
  };

  // Vision model check
  const fileType = file ? detectResumeImportFileType(file) : null;
  const hasVisionModel = resumeImportVisionModel.trim().length > 0;
  const isImageFile = fileType === "image";
  const uploadBlockedByMissingVisionModel =
    isImageFile && !hasVisionModel && !isLoadingImportConfig;

  const progressPercent = calculateImportProgressPercent(importProgress);

  const currentStageLabel = importProgress
    ? t(`dashboard.upload.progress.${importProgress.stage}`)
    : "";
  const currentStageDescription = importProgress
    ? importProgress.stage === "extracting" || importProgress.stage === "rendering"
      ? t("dashboard.upload.progress.pageProgress", {
          completed: importProgress.completed,
          total: importProgress.total,
        })
      : t(`dashboard.upload.progress.${importProgress.stage}Description`)
    : "";

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={!isCreating && !isParsing ? resetAndClose : undefined}>
      <div
        className="dialog-content flex max-h-[90vh] max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">{t("dashboardCreateResume")}</h2>
          <button
            type="button"
            className="dialog-close"
            onClick={resetAndClose}
            disabled={isCreating || isParsing}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="dialog-tabs">
          <button
            type="button"
            className={`dialog-tab ${tab === "template" ? "dialog-tab--active" : ""}`}
            onClick={() => setTab("template")}
            disabled={isCreating || isParsing}
          >
            <FileText className="h-4 w-4" />
            {t("dashboardUploadFromTemplate")}
          </button>
          <button
            type="button"
            className={`dialog-tab ${tab === "upload" ? "dialog-tab--active" : ""}`}
            onClick={() => setTab("upload")}
            disabled={isCreating || isParsing}
          >
            <FileText className="h-4 w-4" />
            {t("dashboardUploadFromFile")}
          </button>
        </div>

        {/* Content */}
        <div className="dialog-body flex-1 overflow-y-auto">
          {tab === "template" ? (
            <div className="space-y-4">
              {/* Title input */}
              <div className="form-field">
                <label className="form-label">{t("editorFieldsFullName")}</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("dashboardCreateResumeDescription")}
                  onKeyDown={(e) => e.key === "Enter" && !isCreating && void handleCreate()}
                />
              </div>

              {/* Template selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("templatesTitle")}</label>
                <div className="max-h-[400px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-5">
                    {TEMPLATES.map((tId) => (
                      <button
                        key={tId}
                        type="button"
                        className={`relative flex flex-col items-center overflow-hidden rounded-lg border-2 p-2 transition-all ${
                          template === tId
                            ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                        }`}
                        onClick={() => setTemplate(tId)}
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden rounded">
                          <TemplateThumbnail template={tId} className="h-full w-full" />
                        </div>
                        <span className="mt-1.5 truncate text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          {t(templateLabelsMap[tId] || "templateClassic")}
                        </span>
                        {template === tId && (
                          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {createError ? <p className="form-error">{createError}</p> : null}
            </div>
          ) : (
            <div className="space-y-4">
              {isParsing && importProgress ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {t("dashboard.upload.progress.title")}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {t("dashboard.upload.progress.description")}
                        </p>
                      </div>
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-900 dark:text-zinc-100" />
                    </div>

                    <ImportProgressDisplay
                      fileName={importProgress.fileName}
                      stage={importProgress.stage}
                      completed={importProgress.completed}
                      total={importProgress.total}
                      progressPercent={progressPercent}
                    />
                  </div>

                  <ImportStageIndicators currentStage={importProgress.stage} />
                </div>
              ) : (
                <>
                  {/* File upload area */}
                  <FileUploadArea
                    file={file}
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    isDragging={isDragging}
                    onDragStateChange={setIsDragging}
                    isDisabled={isParsing}
                    acceptedExtensions={RESUME_IMPORT_ACCEPTED_EXTENSIONS}
                  />

                  {/* Vision model hint */}
                  {file && (fileType === "image" || fileType === "pdf") && (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                        {isLoadingImportConfig
                          ? t("dashboard.upload.loadingImportConfig")
                          : fileType === "pdf"
                            ? t("dashboard.upload.pdfVisionHint")
                            : uploadBlockedByMissingVisionModel
                              ? t("dashboard.upload.imageNeedsVisionModel")
                              : t("dashboard.upload.imageWillUseVisionModel", {
                                  model: resumeImportVisionModel,
                                })}
                      </div>

                      {uploadBlockedByMissingVisionModel ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {t("dashboard.upload.configureVisionModelHint")}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {parseError && <p className="form-error">{parseError}</p>}

                  {/* Template for upload */}
                  {file && (
                    <div className="form-field">
                      <label className="form-label">{t("templatesTitle")}</label>
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-5">
                        {TEMPLATES.slice(0, 10).map((tId) => (
                          <button
                            key={tId}
                            type="button"
                            className={`template-option ${template === tId ? "template-option--active" : ""}`}
                            onClick={() => setTemplate(tId)}
                          >
                            <TemplateThumbnail template={tId} className="mx-auto" />
                            <span className="template-option-label">
                              {t(templateLabelsMap[tId] || "templateClassic")}
                            </span>
                            {template === tId && (
                              <div className="template-option-check">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={resetAndClose} disabled={isCreating || isParsing}>
            {t("commonCancel")}
          </Button>
          {tab === "template" ? (
            <Button onClick={() => void handleCreate()} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? t("commonLoading") : t("commonCreate")}
            </Button>
          ) : (
            <Button
              onClick={() => void handleUploadParse()}
              disabled={!file || isParsing || uploadBlockedByMissingVisionModel}
            >
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isParsing ? t("dashboardUploadParsing") : t("dashboardUploadUploadAndParse")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
