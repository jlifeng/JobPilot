import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlignLeft,
  Braces,
  CheckCircle2,
  FileCode2,
  FileDown,
  Globe,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateHtml,
  generateMarkdown,
  generatePlainText,
} from "@/lib/export";
import { save as openSaveDialog } from "@tauri-apps/plugin-dialog";
import { useResumeStore } from "../../stores/resume-store";
import {
  writeExportFile,
  writePdfExport,
} from "../../lib/desktop-api";
import { prepareDesktopPdfHtml, toSharedResume } from "../../lib/resume-export";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

type ExportFormat = "pdf" | "pdf-one-page" | "html" | "txt" | "markdown" | "json";
type ExportState = "idle" | "exporting" | "success" | "error" | "cancelled";

interface NativeDialogSaveOptions {
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

interface FormatOption {
  value: ExportFormat;
  icon: typeof FileDown;
  labelKey: string;
  descKey: string;
  fallbackLabel: string;
  fallbackDescription: string;
  tooltipKey?: string;
  tooltipFallback?: string;
  supported: boolean;
  extension: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "pdf",
    icon: FileDown,
    labelKey: "pdf",
    descKey: "pdfDescription",
    fallbackLabel: "PDF",
    fallbackDescription: "Print-ready document",
    supported: true,
    extension: "pdf",
  },
  {
    value: "pdf-one-page",
    icon: Sparkles,
    labelKey: "pdfOnePage",
    descKey: "pdfOnePageDescription",
    fallbackLabel: "Smart One-Page",
    fallbackDescription: "Auto-fit to one page",
    tooltipKey: "pdfOnePageTooltip",
    tooltipFallback: "Very long resumes may fail to fit on one page",
    supported: true,
    extension: "pdf",
  },
  {
    value: "html",
    icon: Globe,
    labelKey: "html",
    descKey: "htmlDescription",
    fallbackLabel: "HTML",
    fallbackDescription: "Web page format",
    supported: true,
    extension: "html",
  },
  {
    value: "txt",
    icon: AlignLeft,
    labelKey: "txt",
    descKey: "txtDescription",
    fallbackLabel: "Plain Text",
    fallbackDescription: "Simple text file",
    supported: true,
    extension: "txt",
  },
  {
    value: "markdown",
    icon: FileCode2,
    labelKey: "markdown",
    descKey: "markdownDescription",
    fallbackLabel: "Markdown",
    fallbackDescription: "Portable markdown document",
    supported: true,
    extension: "md",
  },
  {
    value: "json",
    icon: Braces,
    labelKey: "json",
    descKey: "jsonDescription",
    fallbackLabel: "JSON",
    fallbackDescription: "Structured data",
    supported: true,
    extension: "json",
  },
];

function sanitizeFileName(raw: string): string {
  const sanitized = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
  return sanitized || "resume";
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function encodeText(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

async function openNativeSaveDialog(
  options: NativeDialogSaveOptions,
): Promise<string | string[] | null> {
  try {
    return await openSaveDialog(options);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Native save dialog is unavailable: ${reason}`);
  }
}

export function ExportDialog({ open, onClose, resumeId }: ExportDialogProps) {
  const { t, i18n } = useTranslation();
  const { currentResume, isDirty, save, sections } = useResumeStore();

  const translateKey = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return typeof value === "string" && value !== key ? value : fallback;
    },
    [t],
  );

  const translateExport = useCallback(
    (key: string, fallback: string) => {
      const namespacedKey = `export.${key}`;
      const value = t(namespacedKey);
      return typeof value === "string" && value !== namespacedKey
        ? value
        : fallback;
    },
    [t],
  );

  const isZh = i18n.language.startsWith("zh");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [state, setState] = useState<ExportState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedPath, setSavedPath] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedFormat("pdf");
      setState("idle");
      setStatusMessage("");
      setSavedPath("");
    }
  }, [open]);

  const selectedOption = useMemo(
    () =>
      FORMAT_OPTIONS.find((option) => option.value === selectedFormat) ??
      FORMAT_OPTIONS[0],
    [selectedFormat],
  );

  const capabilityMessage = selectedOption.supported
    ? isZh
      ? "当前 desktop runtime 已经能真实写出这个格式文件，并通过原生保存路径落盘。"
      : "The current desktop runtime can write this format for real and save it through the native file picker."
    : isZh
      ? "这个格式在 web 有完整出口，但当前 desktop runtime 还没有对应原生导出链路，所以这里只展示状态，不会伪成功。"
      : "This format exists in the web product, but the current desktop runtime does not have a native export pipeline for it yet, so the dialog reports the gap instead of faking success.";

  const exportActionLabel =
    state === "exporting"
      ? translateExport("exporting", "Exporting...")
      : translateExport("export", "Export");

  const closeLabel =
    state === "success" || state === "cancelled"
      ? translateKey("common.close", "Close")
      : translateExport("cancel", "Cancel");

  const handleExport = useCallback(async () => {
    if (!currentResume) {
      setState("error");
      setStatusMessage(
        isZh ? "当前还没有可导出的简历内容。" : "There is no loaded resume to export yet.",
      );
      return;
    }

    if (!selectedOption.supported) {
      setState("error");
      setStatusMessage(capabilityMessage);
      return;
    }

    setState("exporting");
    setStatusMessage("");
    setSavedPath("");

    try {
      if (isDirty) {
        await save();
      }

      const resume = toSharedResume(
        {
          ...currentResume,
          id: resumeId,
          sections,
        },
        sections,
      );

      const fileBase = `${sanitizeFileName(currentResume.title || "resume")}-${formatTimestamp(
        new Date(),
      )}`;

      const defaultPath = `${fileBase}.${selectedOption.extension}`;
      const selectedOutputPath = await openNativeSaveDialog({
        defaultPath,
        filters: [
          {
            name: translateExport(
              selectedOption.labelKey,
              selectedOption.fallbackLabel,
            ),
            extensions: [selectedOption.extension],
          },
        ],
      });

      const resolvedOutputPath = Array.isArray(selectedOutputPath)
        ? selectedOutputPath[0] ?? null
        : selectedOutputPath;

      if (!resolvedOutputPath) {
        setState("cancelled");
        setStatusMessage(
          isZh ? "保存对话框已关闭，没有写入任何文件。" : "The save dialog was closed and no file was written.",
        );
        return;
      }

      const receipt =
        selectedFormat === "pdf" || selectedFormat === "pdf-one-page"
          ? await writePdfExport({
              outputPath: resolvedOutputPath,
              html: prepareDesktopPdfHtml(
                await generateHtml(resume, true),
                { fitOnePage: selectedFormat === "pdf-one-page" },
              ),
            })
          : await writeExportFile({
              outputPath: resolvedOutputPath,
              expectedExtension: selectedOption.extension,
              bytes:
                selectedFormat === "html"
                  ? encodeText(await generateHtml(resume))
                  : selectedFormat === "markdown"
                    ? encodeText(generateMarkdown(resume))
                  : selectedFormat === "json"
                    ? encodeText(JSON.stringify(resume, null, 2))
                    : encodeText(generatePlainText(resume)),
            });

      setState("success");
      setSavedPath(receipt.outputPath);
      setStatusMessage(
        isZh ? "文件已成功写入桌面导出路径。" : "The file was written successfully.",
      );
    } catch (error) {
      setState("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : isZh
            ? "导出失败，请重试。"
            : "Export failed. Please try again.",
      );
    }
  }, [
    capabilityMessage,
    currentResume,
    isDirty,
    isZh,
    resumeId,
    save,
    sections,
    selectedFormat,
    selectedOption.extension,
    selectedOption.fallbackLabel,
    selectedOption.labelKey,
    selectedOption.supported,
    translateExport,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={state !== "exporting" ? onClose : undefined}>
      <div
        className="dialog-content dialog-content--lg overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <div>
              <h2 className="dialog-title">
                {translateExport("title", "Export Resume")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {translateExport(
                  "description",
                  "Choose a format to export your resume",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            disabled={state === "exporting"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-5">
          {state === "idle" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.value === selectedFormat;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFormat(option.value)}
                      className={`cursor-pointer flex min-h-[128px] flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all duration-150 ${
                        isSelected
                          ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800"
                          : "border-zinc-200 bg-white border-zinc-300 hover:bg-zinc-50/50"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-700"
                        }`}
                        title={
                          option.tooltipKey
                            ? translateExport(
                                option.tooltipKey,
                                option.tooltipFallback ?? "",
                              )
                            : undefined
                        }
                      >
                        {translateExport(option.labelKey, option.fallbackLabel)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {translateExport(option.descKey, option.fallbackDescription)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!selectedOption.supported ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
                  <div className="flex items-start gap-2 text-sm leading-6 text-amber-900">
                    <Info className="mt-1 h-4 w-4 shrink-0" />
                    <span>{capabilityMessage}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {state === "exporting" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100" />
              <p className="text-sm font-medium text-zinc-700">
                {translateExport("exporting", "Exporting...")}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                {isZh
                  ? "正在保存到你选择的桌面路径。"
                  : "Saving to the desktop path you selected."}
              </p>
            </div>
          ) : null}

          {state === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-3 h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-zinc-700">
                {statusMessage || translateExport("success", "Export successful!")}
              </p>
              {savedPath ? (
                <p className="mt-2 max-w-md break-all text-xs text-zinc-500">
                  {savedPath}
                </p>
              ) : null}
            </div>
          ) : null}

          {state === "cancelled" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Info className="mb-3 h-8 w-8 text-amber-500" />
              <p className="text-sm font-medium text-zinc-700">{statusMessage}</p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
              <p className="max-w-md text-sm font-medium text-red-600">
                {statusMessage}
              </p>
            </div>
          ) : null}
        </div>

        <div className="dialog-footer border-t border-zinc-100">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={state === "exporting"}
          >
            {closeLabel}
          </Button>
          {(state === "idle" || state === "error") && (
            <Button
              onClick={() => void handleExport()}
              disabled={!selectedOption.supported}
            >
              {exportActionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
