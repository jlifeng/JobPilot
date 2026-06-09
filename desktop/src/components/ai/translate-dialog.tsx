import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Languages,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  FilePlus2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useResumeStore } from "../../stores/resume-store";
import {
  startAiPromptStream,
  listenToAiStreamEvents,
  type DesktopAiStreamEvent,
} from "../../lib/desktop-api";
import type { ResumeSection, SectionContent } from "../../types/resume";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

type TranslateMode = "overwrite" | "copy";
type TranslateState = "idle" | "translating" | "success" | "error";

const LANGUAGE_OPTIONS = [
  { value: "zh", label: "\u4E2D\u6587", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { value: "en", label: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { value: "ja", label: "\u65E5\u672C\u8A9E", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { value: "ko", label: "\uD55C\uAD6D\uC5B4", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { value: "fr", label: "Fran\u00E7ais", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { value: "de", label: "Deutsch", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { value: "es", label: "Espa\u00F1ol", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { value: "pt", label: "Portugu\u00EAs", flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  { value: "ru", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\uD83C\uDDF7\uD83C\uDDFA" },
  { value: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
] as const;

export function TranslateDialog({ open, onClose, resumeId }: DialogProps) {
  const { t } = useTranslation();
  const currentResume = useResumeStore((s) => s.currentResume);

  const currentLanguage = currentResume?.language || "en";
  const defaultTarget = currentLanguage === "zh" ? "en" : "zh";

  const [targetLanguage, setTargetLanguage] = useState(defaultTarget);
  const [mode, setMode] = useState<TranslateMode>("overwrite");
  const [state, setState] = useState<TranslateState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState("idle");
      setErrorMessage("");
      setProgress({ completed: 0, total: 0 });
      setMode("overwrite");
      const lang = useResumeStore.getState().currentResume?.language || "en";
      setTargetLanguage(lang === "zh" ? "en" : "zh");
    }
  }, [open]);

  const handleTranslate = useCallback(async () => {
    setState("translating");
    setErrorMessage("");
    setProgress({ completed: 0, total: 0 });

    try {
      const resume = useResumeStore.getState().currentResume;
      if (!resume) throw new Error("No resume loaded");

      const sections = resume.sections.filter((section) => section.visible !== false);
      const total = sections.length;
      setProgress({ completed: 0, total });

      const prompt = `You are a professional resume translator. Translate the following resume sections to ${targetLanguage}.

Resume sections (JSON): ${JSON.stringify(sections)}

Return a JSON array of objects, each with:
- "sectionId": the section id
- "title": translated title
- "content": translated content (same structure as input)

Return ONLY the JSON array, no markdown fences.`;

      const receipt = await startAiPromptStream({
        provider: "openai",
        prompt,
      });

      let accumulated = "";
      const unlisten = await listenToAiStreamEvents((event: DesktopAiStreamEvent) => {
        if (event.requestId !== receipt.requestId) return;
        if (event.kind === "delta" && event.deltaText) {
          accumulated += event.deltaText;
        }
        if (event.kind === "completed") {
          try {
            const text = event.accumulatedText || accumulated;
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const translated = JSON.parse(jsonMatch[0]) as Array<{
                sectionId: string;
                title: string;
                content: SectionContent;
              }>;

              if (mode === "overwrite") {
                const current = useResumeStore.getState().currentResume;
                if (current) {
                  useResumeStore.getState().setResume({
                    ...current,
                    language: targetLanguage,
                    sections: current.sections.map((section: ResumeSection) => {
                      const translatedSection = translated.find((tr) => tr.sectionId === section.id);
                      return translatedSection
                        ? {
                            ...section,
                            title: translatedSection.title,
                            content: translatedSection.content,
                          }
                        : section;
                    }),
                  });
                }
              }

              setProgress({ completed: total, total });
              setState("success");
              setTimeout(() => {
                onClose();
              }, 1500);
            } else {
              setErrorMessage("Failed to parse translation result");
              setState("error");
            }
          } catch {
            setErrorMessage("Failed to parse translation result");
            setState("error");
          } finally {
            unlisten();
          }
        }
        if (event.kind === "error") {
          setErrorMessage(event.errorMessage || t("translate.error"));
          setState("error");
          unlisten();
        }
      });
    } catch (err: unknown) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : t("translate.error"));
    }
  }, [targetLanguage, mode, onClose, t]);

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  const modeOptions: {
    value: TranslateMode;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "overwrite",
      label: t("translate.modeOverwrite"),
      desc: t("translate.modeOverwriteDesc"),
      icon: <FileEdit className="h-4 w-4" />,
    },
    {
      value: "copy",
      label: t("translate.modeCopy"),
      desc: t("translate.modeCopyDesc"),
      icon: <FilePlus2 className="h-4 w-4" />,
    },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => {
        if (state !== "translating") onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Languages className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t("translate.title")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("translate.description")}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 cursor-pointer"
          onClick={() => {
            if (state !== "translating") onClose();
          }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-5 space-y-4">
          {/* Language Selector */}
          {state === "idle" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("translate.targetLanguage")}
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="flex h-10 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-2.5">
                {modeOptions.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all cursor-pointer",
                        active
                          ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-blue-600 text-white dark:bg-blue-500"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
                        )}
                      >
                        {opt.icon}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          active
                            ? "text-zinc-700 dark:text-zinc-200"
                            : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[11px] leading-tight text-zinc-400 dark:text-zinc-500">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Translating State */}
          {state === "translating" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100 mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                {progress.total > 0
                  ? t("translate.progress", {
                      completed: progress.completed,
                      total: progress.total,
                    })
                  : t("translate.translating")}
              </p>
              {progress.total > 0 && (
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-700 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("translate.success")}
              </p>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {errorMessage || t("translate.error")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800 flex justify-end gap-2">
          {state === "idle" && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                {t("translate.close")}
              </Button>
              <Button
                onClick={() => void handleTranslate()}
                className="cursor-pointer bg-zinc-700 hover:bg-zinc-600"
              >
                {t("translate.translateAll")}
              </Button>
            </>
          )}
          {state === "error" && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                {t("translate.close")}
              </Button>
              <Button
                onClick={() => void handleTranslate()}
                className="cursor-pointer bg-zinc-700 hover:bg-zinc-600"
              >
                {t("translate.translateAll")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
