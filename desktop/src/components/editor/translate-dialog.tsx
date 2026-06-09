import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  FileEdit,
  FilePlus2,
  Languages,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";
import { toResumeDocument } from "../../lib/desktop-document-mappers";
import { duplicateDocument, saveDocument } from "../../lib/desktop-api";
import { useResumeStore } from "../../stores/resume-store";
import type { ResumeSection } from "../../types/resume";
import {
  extractJsonObject,
  generateRequestId,
  getDesktopAiRuntimeConfig,
  LANGUAGE_OPTIONS,
  runPromptStream,
} from "./ai-dialog-helpers";

interface TranslateDialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

type TranslateState = "idle" | "translating" | "completed" | "error";
type TranslateMode = "overwrite" | "copy";

interface ProgressState {
  completed: number;
  total: number;
  currentSectionTitle: string;
}

interface ParsedTranslatedSection {
  sectionId: string;
  title: string;
  content: Record<string, unknown>;
}

interface TranslatedSection {
  sourceSectionId: string;
  sectionType: string;
  sortOrder: number;
  title: string;
  content: Record<string, unknown>;
}

const STRIP_FIELDS: Record<string, string[]> = {
  personal_info: ["avatar"],
};

function getLanguageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((language) => language.code === code)?.label ?? code;
}

function collectPreviewLines(value: unknown, collector: string[]) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      collector.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPreviewLines(item, collector));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectPreviewLines(item, collector));
  }
}

function buildPreviewText(section: TranslatedSection): string {
  const lines: string[] = [];
  collectPreviewLines(section.content, lines);

  if (lines.length === 0) {
    return JSON.stringify(section.content, null, 2);
  }

  return lines.slice(0, 8).join("\n");
}

function stripSectionPayload(section: ResumeSection) {
  const fields = STRIP_FIELDS[section.type] ?? [];
  const content =
    typeof section.content === "object" && section.content !== null
      ? { ...(section.content as unknown as Record<string, unknown>) }
      : {} as Record<string, unknown>;
  const stripped: Record<string, unknown> = {};

  for (const field of fields) {
    if (field in content) {
      stripped[field] = content[field];
      delete content[field];
    }
  }

  return {
    payload: {
      sectionId: section.id,
      type: section.type,
      title: section.title,
      content,
    },
    stripped,
  };
}

function restoreStrippedFields(
  content: Record<string, unknown>,
  stripped: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(stripped).length === 0) {
    return content;
  }

  return {
    ...content,
    ...stripped,
  };
}

function buildTranslatedCopyTitle(baseTitle: string, languageCode: string): string {
  const suffix = getLanguageLabel(languageCode);

  if (baseTitle.toLowerCase().includes(suffix.toLowerCase())) {
    return baseTitle;
  }

  return `${baseTitle} (${suffix})`;
}

function serializeSectionsForSave(
  resumeId: string,
  sections: ResumeSection[],
) {
  return sections.map((section) => ({
    id: section.id,
    documentId: section.resumeId || resumeId,
    sectionType: section.type,
    title: section.title,
    sortOrder: section.sortOrder,
    visible: section.visible,
    content: section.content as unknown as Record<string, unknown>,
    createdAtEpochMs: typeof section.createdAt === "string"
      ? new Date(section.createdAt).getTime()
      : Date.now(),
    updatedAtEpochMs: typeof section.updatedAt === "string"
      ? new Date(section.updatedAt).getTime()
      : Date.now(),
  }));
}

export function TranslateDialog({ open, onClose, resumeId }: TranslateDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentResume, sections, setResume } = useResumeStore();

  const currentLanguage = currentResume?.language || "en";
  const isZh = i18n.language.startsWith("zh");

  const [sourceLang, setSourceLang] = useState(currentLanguage);
  const [targetLang, setTargetLang] = useState(currentLanguage === "zh" ? "en" : "zh");
  const [mode, setMode] = useState<TranslateMode>("overwrite");
  const [state, setState] = useState<TranslateState>("idle");
  const [translatedSections, setTranslatedSections] = useState<TranslatedSection[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [failedCount, setFailedCount] = useState(0);
  const [progress, setProgress] = useState<ProgressState>({
    completed: 0,
    total: 0,
    currentSectionTitle: "",
  });

  const sortedSections = useMemo(
    () => [...sections].sort((left, right) => left.sortOrder - right.sortOrder),
    [sections],
  );
  const previewSections = useMemo(
    () => [...translatedSections].sort((left, right) => left.sortOrder - right.sortOrder),
    [translatedSections],
  );
  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  const isLoading = state === "translating";
  const applyButtonLabel = mode === "copy" ? t("commonCreate") : t("translateApply");

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextSourceLanguage = currentResume?.language || "en";
    setSourceLang(nextSourceLanguage);
    setTargetLang(nextSourceLanguage === "zh" ? "en" : "zh");
    setMode("overwrite");
    setState("idle");
    setTranslatedSections([]);
    setErrorMessage("");
    setFailedCount(0);
    setProgress({
      completed: 0,
      total: 0,
      currentSectionTitle: "",
    });
  }, [currentResume?.language, open]);

  const handleTranslate = async () => {
    if (!currentResume || sortedSections.length === 0 || sourceLang === targetLang) {
      return;
    }

    setState("translating");
    setTranslatedSections([]);
    setErrorMessage("");
    setFailedCount(0);
    setProgress({
      completed: 0,
      total: sortedSections.length,
      currentSectionTitle: "",
    });

    try {
      const runtime = await getDesktopAiRuntimeConfig();
      const translated: TranslatedSection[] = [];
      let sectionFailures = 0;

      for (const [index, section] of sortedSections.entries()) {
        setProgress({
          completed: index,
          total: sortedSections.length,
          currentSectionTitle: section.title,
        });

        try {
          const { payload, stripped } = stripSectionPayload(section);
          const rawResponse = await runPromptStream({
            provider: runtime.provider,
            model: runtime.model,
            baseUrl: runtime.baseUrl,
            requestId: generateRequestId("translate"),
            systemPrompt: `You are a professional resume translator. Translate the given resume section from ${getLanguageLabel(sourceLang)} to ${getLanguageLabel(targetLang)}.

Rules:
- Use professional, resume-appropriate language
- Preserve the exact JSON structure and all field names
- Keep IDs, URLs, emails, phone numbers, and dates unchanged
- Keep technical terms in their standard form when appropriate
- Return a single valid JSON object with keys: sectionId, title, content
- Do not add markdown or code fences`,
            prompt: `Translate this resume section:\n${JSON.stringify(payload)}`,
          });

          const parsed = extractJsonObject<ParsedTranslatedSection>(rawResponse);
          translated.push({
            sourceSectionId: section.id,
            sectionType: section.type,
            sortOrder: section.sortOrder,
            title: parsed.title,
            content: restoreStrippedFields(parsed.content, stripped),
          });
          setTranslatedSections([...translated]);
        } catch {
          sectionFailures += 1;
        }

        setProgress({
          completed: index + 1,
          total: sortedSections.length,
          currentSectionTitle: section.title,
        });
      }

      if (translated.length === 0) {
        throw new Error(isZh ? "没有成功翻译任何内容。" : "No sections were translated successfully.");
      }

      setFailedCount(sectionFailures);
      setState("completed");
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("aiErrorMessage"),
      );
    }
  };

  const handleApply = async () => {
    if (!currentResume || translatedSections.length === 0) {
      return;
    }

    setState("translating");

    try {
      const translatedBySourceId = new Map(
        translatedSections.map((section) => [section.sourceSectionId, section]),
      );

      if (mode === "overwrite") {
        const nextSections = sortedSections.map((section) => {
          const translated = translatedBySourceId.get(section.id);
          if (!translated) {
            return section;
          }

          return {
            ...section,
            title: translated.title,
            content: translated.content as unknown as import("../../types/resume").SectionContent,
          };
        });

        const saved = await saveDocument({
          id: currentResume.id,
          title: currentResume.title,
          template: currentResume.template,
          language: targetLang,
          themeJson: JSON.stringify(currentResume.themeConfig),
          targetJobTitle: currentResume.targetJobTitle,
          targetCompany: currentResume.targetCompany,
          sections: serializeSectionsForSave(currentResume.id, nextSections),
        });

        const mapped = toResumeDocument(saved);
        setResume(mapped);
        onClose();
        return;
      }

      const duplicated = await duplicateDocument(resumeId);
      const duplicatedResume = toResumeDocument(duplicated);
      const translatedByPosition = sortedSections.map((section) => translatedBySourceId.get(section.id));
      const duplicatedSections = [...duplicatedResume.sections]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((section, index) => {
          const translated = translatedByPosition[index];
          if (!translated) {
            return section;
          }

          return {
            ...section,
            title: translated.title,
            content: translated.content as unknown as import("../../types/resume").SectionContent,
          };
        });

      const saved = await saveDocument({
        id: duplicatedResume.id,
        title: buildTranslatedCopyTitle(currentResume.title, targetLang),
        template: duplicatedResume.template,
        language: targetLang,
        themeJson: JSON.stringify(duplicatedResume.themeConfig),
        targetJobTitle: duplicatedResume.targetJobTitle,
        targetCompany: duplicatedResume.targetCompany,
        sections: serializeSectionsForSave(duplicatedResume.id, duplicatedSections),
      });

      const mapped = toResumeDocument(saved);
      setResume(mapped);
      onClose();
      navigate({ to: "/editor/$id", params: { id: mapped.id } });
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("aiErrorMessage"),
      );
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={!isLoading ? onClose : undefined}>
      <div className="dialog-content dialog-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <h2 className="dialog-title">{t("translateTitle")}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-4">
          {state === "idle" && (
            <>
              <p className="text-sm text-zinc-500">{t("translateDescription")}</p>

              <div className="flex items-center gap-4">
                <div className="form-field flex-1">
                  <label className="form-label">{t("translateSourceLang")}</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="select-input"
                  >
                    {LANGUAGE_OPTIONS.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-6">
                  <span className="text-zinc-400">→</span>
                </div>

                <div className="form-field flex-1">
                  <label className="form-label">{t("translateTargetLang")}</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="select-input"
                  >
                    {LANGUAGE_OPTIONS.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("overwrite")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition-all",
                    mode === "overwrite"
                      ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      mode === "overwrite" ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white" : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    <FileEdit className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{t("translateApply")}</span>
                  <span className="text-xs text-zinc-400">
                    {isZh ? "直接更新当前简历" : "Update the current resume"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("copy")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition-all",
                    mode === "copy"
                      ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      mode === "copy" ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white" : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    <FilePlus2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{t("commonCreate")}</span>
                  <span className="text-xs text-zinc-400">
                    {isZh ? "创建一份翻译后的副本" : "Create a translated duplicate"}
                  </span>
                </button>
              </div>

              {sourceLang === targetLang && (
                <p className="text-sm text-amber-600">{t("translateSameLanguage")}</p>
              )}
            </>
          )}

          {(state === "translating" || state === "completed" || state === "error") && (
            <div className="space-y-3">
              {state === "translating" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("translateTranslating")}</span>
                    {progress.total > 0 && (
                      <span className="text-xs text-zinc-400">
                        {progress.completed}/{progress.total}
                      </span>
                    )}
                  </div>
                  {progress.currentSectionTitle ? (
                    <p className="text-xs text-zinc-500">{progress.currentSectionTitle}</p>
                  ) : null}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {state === "completed" && (
                <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-green-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <span className="block text-sm font-medium">{t("translateComplete")}</span>
                    {failedCount > 0 ? (
                      <span className="block text-xs text-green-700">
                        {isZh
                          ? `${failedCount} 个 section 未成功翻译，应用时会保留原文。`
                          : `${failedCount} sections failed and will keep their original content.`}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {state === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                {previewSections.length > 0 ? (
                  previewSections.map((section) => (
                    <div key={section.sourceSectionId} className="rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-zinc-900">{section.title}</span>
                        <span className="text-xs text-zinc-400">{section.sectionType}</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-zinc-600">
                        {buildPreviewText(section)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-32 items-center justify-center text-sm text-zinc-400">
                    {state === "translating"
                      ? (isZh ? "正在逐段翻译..." : "Translating section by section...")
                      : "..."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t("commonCancel")}
          </Button>
          {state === "idle" && (
            <Button onClick={() => void handleTranslate()} disabled={sourceLang === targetLang}>
              {t("translateStart")}
            </Button>
          )}
          {state === "completed" && (
            <>
              <Button variant="secondary" onClick={() => void handleTranslate()}>
                {t("translateRetry")}
              </Button>
              <Button onClick={() => void handleApply()}>
                {applyButtonLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
