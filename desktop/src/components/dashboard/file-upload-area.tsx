import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, X, FileIcon, Loader2 } from "lucide-react";
import {
  detectResumeImportFileType,
  isSupportedResumeImportFile,
  MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  type ResumeImportFileType,
} from "../../lib/resume-import";

export interface FileUploadAreaProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  isDisabled?: boolean;
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
  acceptedExtensions?: string;
  maxFileSizeBytes?: number;
  showFileType?: boolean;
  className?: string;
}

export function FileUploadArea({
  file,
  onFileSelect,
  onFileClear,
  isDisabled = false,
  isDragging = false,
  onDragStateChange,
  acceptedExtensions = ".json,.md,.markdown,.pdf,.png,.jpg,.jpeg,.webp",
  maxFileSizeBytes = MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  showFileType = true,
  className = "",
}: FileUploadAreaProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragStateChange?.(true);
    },
    [onDragStateChange]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragStateChange?.(false);
    },
    [onDragStateChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragStateChange?.(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onDragStateChange, onFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClick = () => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  };

  const fileType = file ? detectResumeImportFileType(file) : null;

  return (
    <div
      className={`upload-area ${isDragging ? "upload-area--dragging" : ""} ${file ? "upload-area--has-file" : ""} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        className="hidden"
        onChange={handleInputChange}
        disabled={isDisabled}
      />
      {file ? (
        <div className="upload-file-info">
          {fileType === "json" ? (
            <FileText className="h-8 w-8 text-zinc-900 dark:text-zinc-100" />
          ) : fileType === "markdown" ? (
            <FileIcon className="h-8 w-8 text-emerald-500" />
          ) : fileType === "pdf" ? (
            <FileText className="h-8 w-8 text-red-500" />
          ) : fileType === "image" ? (
            <FileIcon className="h-8 w-8 text-blue-500" />
          ) : (
            <FileText className="h-8 w-8 text-zinc-900 dark:text-zinc-100" />
          )}
          <span className="upload-file-name">{file.name}</span>
          {showFileType && fileType && fileType !== "unsupported" && (
            <span className="text-xs text-zinc-400">
              ({fileType.toUpperCase()})
            </span>
          )}
          <button
            type="button"
            className="upload-file-remove"
            onClick={(e) => {
              e.stopPropagation();
              onFileClear();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="h-12 w-12 text-zinc-400" />
          <p className="upload-hint">{t("dashboardUploadDropzone")}</p>
          <p className="upload-subhint">{t("dashboardUploadAcceptedTypes")}</p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// File Validation Hook
// ============================================================================

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function useFileValidation(maxFileSizeBytes = MAX_RESUME_IMPORT_FILE_SIZE_BYTES) {
  const { t } = useTranslation();

  const validateFile = useCallback(
    (file: File): FileValidationResult => {
      if (!isSupportedResumeImportFile(file)) {
        return { isValid: false, error: t("dashboardUploadInvalidType") };
      }

      if (file.size > maxFileSizeBytes) {
        return { isValid: false, error: t("dashboardUploadFileTooLarge") };
      }

      return { isValid: true };
    },
    [t, maxFileSizeBytes]
  );

  return { validateFile };
}

// ============================================================================
// Import Progress Display Component
// ============================================================================

export interface ImportProgressDisplayProps {
  fileName: string;
  stage: string;
  completed: number;
  total: number;
  progressPercent: number;
}

export function ImportProgressDisplay({
  fileName,
  stage,
  completed,
  total,
  progressPercent,
}: ImportProgressDisplayProps) {
  const { t } = useTranslation();

  const stageLabel = t(`dashboard.upload.progress.${stage}`);
  const stageDescription =
    stage === "extracting" || stage === "rendering"
      ? t("dashboard.upload.progress.pageProgress", { completed, total })
      : t(`dashboard.upload.progress.${stage}Description`);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {fileName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {stageDescription}
          </p>
        </div>
        <span className="text-xs font-medium text-zinc-400">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {stageLabel}
          </span>
          <span className="text-xs text-zinc-400">
            {completed}/{total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Import Stage Indicators Component
// ============================================================================

import { IMPORT_STAGE_SEQUENCE } from "./import-progress-stages";
import type { ResumeImportStage } from "../../lib/resume-import";

export interface ImportStageIndicatorsProps {
  currentStage: ResumeImportStage;
}

export function ImportStageIndicators({ currentStage }: ImportStageIndicatorsProps) {
  const { t } = useTranslation();

  const getStageStatus = (
    current: ResumeImportStage,
    stage: ResumeImportStage
  ): "completed" | "current" | "pending" => {
    const currentIndex = IMPORT_STAGE_SEQUENCE.indexOf(current);
    const stageIndex = IMPORT_STAGE_SEQUENCE.indexOf(stage);

    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      {IMPORT_STAGE_SEQUENCE.map((stage) => {
        const stageStatus = getStageStatus(currentStage, stage);

        return (
          <div
            key={stage}
            className={`rounded-xl border px-3 py-3 text-sm transition-all ${
              stageStatus === "completed"
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
                : stageStatus === "current"
                  ? "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
            }`}
          >
            <div className="font-medium">{t(`dashboard.upload.progress.${stage}`)}</div>
          </div>
        );
      })}
    </div>
  );
}
