import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  X,
  SpellCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wand2,
  XCircle,
} from "lucide-react";
import { useResumeStore } from "../../stores/resume-store";
import { useEditorStore } from "../../stores/editor-store";
import {
  listenToAiStreamEvents,
  saveAiAnalysisRecord,
  startAiPromptStream,
} from "../../lib/desktop-api";
import { getDesktopAiRuntimeConfig, getNextStreamText } from "./ai-dialog-helpers";
import type { DesktopAiStreamEvent } from "../../lib/desktop-api";

interface GrammarCheckDialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

type CheckState = "idle" | "checking" | "completed" | "error";

interface GrammarIssue {
  sectionId: string;
  sectionTitle: string;
  type: "grammar" | "spelling" | "weak-verb" | "vague";
  original: string;
  suggestion: string;
}

interface TextPatchResult {
  value: unknown;
  replaced: boolean;
}

const JSON_START = "<<<GRAMMAR_JSON_START>>>";
const JSON_END = "<<<GRAMMAR_JSON_END>>>";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function replaceFirstTextDeep(
  value: unknown,
  original: string,
  suggestion: string,
): TextPatchResult {
  if (typeof value === "string") {
    const index = value.indexOf(original);

    if (index === -1) {
      return { value, replaced: false };
    }

    return {
      value: `${value.slice(0, index)}${suggestion}${value.slice(
        index + original.length,
      )}`,
      replaced: true,
    };
  }

  if (Array.isArray(value)) {
    let replaced = false;

    return {
      value: value.map((item) => {
        if (replaced) {
          return item;
        }

        const result = replaceFirstTextDeep(item, original, suggestion);
        replaced = result.replaced;
        return result.value;
      }),
      replaced,
    };
  }

  if (isRecord(value)) {
    let replaced = false;
    const nextEntries = Object.entries(value).map(([key, nested]) => {
      if (replaced) {
        return [key, nested] as const;
      }

      const result = replaceFirstTextDeep(nested, original, suggestion);
      replaced = result.replaced;
      return [key, result.value] as const;
    });

    return {
      value: Object.fromEntries(nextEntries),
      replaced,
    };
  }

  return { value, replaced: false };
}

function parseIssues(text: string): GrammarIssue[] {
  const startIndex = text.indexOf(JSON_START);
  const endIndex = text.indexOf(JSON_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return [];
  }

  const payload = text.slice(startIndex + JSON_START.length, endIndex).trim();
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }

        const type =
          item.type === "grammar" ||
          item.type === "spelling" ||
          item.type === "weak-verb" ||
          item.type === "vague"
            ? item.type
            : null;

        if (!type) {
          return null;
        }

        const original =
          typeof item.original === "string" ? item.original.trim() : "";
        const suggestion =
          typeof item.suggestion === "string" ? item.suggestion.trim() : "";
        const sectionId =
          typeof item.sectionId === "string" ? item.sectionId.trim() : "";
        const sectionTitle =
          typeof item.sectionTitle === "string" && item.sectionTitle.trim()
            ? item.sectionTitle.trim()
            : "Resume";

        if (!original || !suggestion || !sectionId) {
          return null;
        }

        return {
          sectionId,
          sectionTitle,
          type,
          original,
          suggestion,
        };
      })
      .filter((item): item is GrammarIssue => item !== null);
  } catch {
    return [];
  }
}

function stripStructuredPayload(text: string): string {
  const startIndex = text.indexOf(JSON_START);
  if (startIndex === -1) {
    return text.trim();
  }

  return text.slice(0, startIndex).trim();
}

export function GrammarCheckDialog({
  open,
  onClose,
  resumeId,
}: GrammarCheckDialogProps) {
  const { t } = useTranslation();
  const { currentResume, sections, updateSection } = useResumeStore();
  const { selectedSectionId } = useEditorStore();

  const [checkScope, setCheckScope] = useState<"all" | "current">("all");
  const [state, setState] = useState<CheckState>("idle");
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [rawAnalysis, setRawAnalysis] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [appliedIssues, setAppliedIssues] = useState<Set<number>>(new Set());
  const [rejectedIssues, setRejectedIssues] = useState<Set<number>>(new Set());
  const [failedIssues, setFailedIssues] = useState<Set<number>>(new Set());
  const requestIdRef = useRef<string | null>(null);
  const rawAnalysisRef = useRef("");
  const savedAnalysisSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      return;
    }

    requestIdRef.current = null;
    rawAnalysisRef.current = "";
    savedAnalysisSignatureRef.current = null;
    const resetTimer = setTimeout(() => {
      setState("idle");
      setIssues([]);
      setRawAnalysis("");
      setErrorMessage("");
      setAppliedIssues(new Set());
      setRejectedIssues(new Set());
      setFailedIssues(new Set());
    }, 0);

    return () => {
      clearTimeout(resetTimer);
    };
  }, [open]);

  useEffect(() => {
    if (state !== "completed") {
      return;
    }

    const signature = `${requestIdRef.current ?? "completed"}:${issues.length}:${rawAnalysis.length}`;
    if (savedAnalysisSignatureRef.current === signature) {
      return;
    }
    savedAnalysisSignatureRef.current = signature;

    void saveAiAnalysisRecord({
      documentId: resumeId,
      analysisType: "grammar",
      payload: {
        scope: checkScope,
        summary: stripStructuredPayload(rawAnalysis),
        issues: issues as unknown as Record<string, unknown>[],
      },
      score: issues.length === 0 ? 100 : null,
      issueCount: issues.length,
      targetJobTitle: currentResume?.targetJobTitle ?? null,
      targetCompany: currentResume?.targetCompany ?? null,
    }).catch((error) => {
      console.error("Failed to save grammar analysis record:", error);
    });
  }, [checkScope, currentResume, issues, rawAnalysis, resumeId, state]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listenToAiStreamEvents((event: DesktopAiStreamEvent) => {
        if (!requestIdRef.current || event.requestId !== requestIdRef.current) {
          return;
        }

        if (event.kind === "completed") {
          const finalText = event.accumulatedText ?? rawAnalysisRef.current;
          rawAnalysisRef.current = finalText;
          setRawAnalysis(finalText);
          setIssues(parseIssues(finalText));
          setState("completed");
          return;
        }

        if (event.kind === "error") {
          setState("error");
          setErrorMessage(event.errorMessage || t("aiErrorMessage"));
        }

        const nextText = getNextStreamText(event, rawAnalysisRef.current);

        if (nextText !== null) {
          rawAnalysisRef.current = nextText;
          setRawAnalysis(nextText);
        }
      });
    };

    void setupListener();

    return () => {
      unlisten?.();
    };
  }, [t]);

  const scopedSections = useMemo(() => {
    if (checkScope === "current" && selectedSectionId) {
      return sections.filter((section) => section.id === selectedSectionId);
    }

    return sections;
  }, [checkScope, sections, selectedSectionId]);

  const handleCheck = async () => {
    const requestId = `grammar-check-${resumeId}-${Date.now()}`;
    requestIdRef.current = requestId;
    rawAnalysisRef.current = "";
    savedAnalysisSignatureRef.current = null;
    setState("checking");
    setIssues([]);
    setRawAnalysis("");
    setErrorMessage("");
    setAppliedIssues(new Set());
    setRejectedIssues(new Set());
    setFailedIssues(new Set());

    try {
      const aiConfig = await getDesktopAiRuntimeConfig();

      await startAiPromptStream({
        provider: aiConfig.provider,
        model: aiConfig.model || undefined,
        baseUrl: aiConfig.baseUrl,
        requestId,
        prompt: `Review this resume content for grammar and style issues.

Return two parts:
1. A concise human-readable summary.
2. A JSON array wrapped exactly between these markers:
${JSON_START}
...json...
${JSON_END}

Each JSON item must follow:
{
  "sectionId": string,
  "sectionTitle": string,
  "type": "grammar" | "spelling" | "weak-verb" | "vague",
  "original": string,
  "suggestion": string
}

Rules:
- only include issues when the original text exists verbatim in the provided section content
- keep suggestions concise
- sectionId must match one of the provided section ids

Resume sections to review:
${JSON.stringify(
  scopedSections.map((section) => ({
    sectionId: section.id,
    sectionTitle: section.title,
    sectionType: section.type,
    content: section.content,
  })),
  null,
  2,
)}`,
      });
    } catch (error: unknown) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : t("aiErrorMessage"));
    }
  };

  const handleApplyIssue = (index: number) => {
    const issue = issues[index];
    const targetSection = sections.find((section) => section.id === issue.sectionId);
    if (!targetSection) {
      setFailedIssues((prev) => new Set(prev).add(index));
      return;
    }

    const result = replaceFirstTextDeep(
      targetSection.content,
      issue.original,
      issue.suggestion,
    );

    if (result.replaced && isRecord(result.value)) {
      updateSection(issue.sectionId, result.value);
      setAppliedIssues((prev) => new Set(prev).add(index));
      setFailedIssues((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    setFailedIssues((prev) => new Set(prev).add(index));
  };

  const handleRejectIssue = (index: number) => {
    setRejectedIssues((prev) => new Set(prev).add(index));
    setFailedIssues((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleApplyAll = () => {
    issues.forEach((_, index) => {
      if (!appliedIssues.has(index) && !rejectedIssues.has(index)) {
        handleApplyIssue(index);
      }
    });
  };

  const getIssueTypeLabel = (type: GrammarIssue["type"]) => {
    switch (type) {
      case "grammar":
        return t("grammarCheckTypeGrammar");
      case "spelling":
        return t("grammarCheckTypeSpelling");
      case "weak-verb":
        return t("grammarCheckTypeWeakVerb");
      case "vague":
        return t("grammarCheckTypeVague");
    }
  };

  const getIssueTypeColor = (type: GrammarIssue["type"]) => {
    switch (type) {
      case "grammar":
        return "bg-red-100 text-red-700";
      case "spelling":
        return "bg-orange-100 text-orange-700";
      case "weak-verb":
        return "bg-amber-100 text-amber-700";
      case "vague":
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const isLoading = state === "checking";
  const visibleAnalysis = useMemo(
    () => stripStructuredPayload(rawAnalysis),
    [rawAnalysis],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={!isLoading ? onClose : undefined}>
      <div
        className="dialog-content dialog-content--lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <SpellCheck className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <h2 className="dialog-title">{t("grammarCheckTitle")}</h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-4">
          {state === "idle" ? (
            <>
              <p className="text-sm text-zinc-500">
                {t("grammarCheckDescription")}
              </p>

              <div className="form-field">
                <label className="form-label">{t("grammarCheckScope")}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckScope("all")}
                    className={`flex-1 rounded-md border px-4 py-2 transition-colors ${
                      checkScope === "all"
                        ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {t("grammarCheckScopeAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckScope("current")}
                    className={`flex-1 rounded-md border px-4 py-2 transition-colors ${
                      checkScope === "current"
                        ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {t("grammarCheckScopeCurrent")}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {state === "checking" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("grammarCheckChecking")}</span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {visibleAnalysis || "..."}
                </pre>
              </div>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          ) : null}

          {state === "completed" ? (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {t("grammarCheckNoIssues")}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-600">
                      {t("grammarCheckFoundIssues", { count: issues.length })}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyAll}
                      disabled={issues.every(
                        (_, index) =>
                          appliedIssues.has(index) || rejectedIssues.has(index),
                      )}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t("aiPatchApplyAll")}
                    </Button>
                  </div>

                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {issues.map((issue, index) => (
                      <div
                        key={`${issue.sectionId}-${index}`}
                        className={`rounded-lg border p-3 ${
                          appliedIssues.has(index)
                            ? "border-green-200 bg-green-50"
                            : rejectedIssues.has(index)
                              ? "border-zinc-200 bg-zinc-50 opacity-75"
                            : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${getIssueTypeColor(
                                  issue.type,
                                )}`}
                              >
                                {getIssueTypeLabel(issue.type)}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {issue.sectionTitle}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                                <span className="text-zinc-600 line-through">
                                  {issue.original}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                                <span className="font-medium text-zinc-900">
                                  {issue.suggestion}
                                </span>
                              </div>
                            </div>
                            {failedIssues.has(index) ? (
                              <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">
                                {t("aiPatchApplyFailed")}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-col gap-2">
                            {appliedIssues.has(index) ? (
                              <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                {t("commonApplied")}
                              </span>
                            ) : rejectedIssues.has(index) ? (
                              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                                {t("commonRejected")}
                              </span>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleApplyIssue(index)}
                                >
                                  {t("grammarCheckApply")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRejectIssue(index)}
                                >
                                  {t("commonReject")}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t("commonCancel")}
          </Button>
          {state === "idle" ? (
            <Button onClick={() => void handleCheck()}>
              {t("grammarCheckStart")}
            </Button>
          ) : null}
          {state === "completed" ? (
            <Button onClick={() => void handleCheck()}>
              {t("grammarCheckStart")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
