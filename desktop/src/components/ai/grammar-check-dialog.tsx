import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  AlertTriangle,
  RotateCcw,
  SpellCheck,
  Wand2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useResumeStore } from "../../stores/resume-store";
import {
  startAiPromptStream,
  listenToAiStreamEvents,
  type DesktopAiStreamEvent,
} from "../../lib/desktop-api";

/* ── Types ── */

interface GrammarIssue {
  sectionId: string;
  sectionTitle: string;
  severity: "high" | "medium" | "low";
  type: "grammar" | "weak_verb" | "vague" | "quantify" | "spelling";
  original: string;
  suggestion: string;
}

interface GrammarCheckResult {
  issues: GrammarIssue[];
  summary: string;
  score: number;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

/* ── Helpers ── */

function getScoreColor(score: number): string {
  if (score < 40) return "text-red-500";
  if (score <= 70) return "text-yellow-500";
  return "text-emerald-500";
}

function getScoreStroke(score: number): string {
  if (score < 40) return "stroke-red-500";
  if (score <= 70) return "stroke-yellow-500";
  return "stroke-emerald-500";
}

function getScoreTrack(score: number): string {
  if (score < 40) return "stroke-red-100";
  if (score <= 70) return "stroke-yellow-100";
  return "stroke-emerald-100";
}

function ScoreCircle({
  score,
  label,
  size = "lg",
}: {
  score: number;
  label: string;
  size?: "sm" | "lg";
}) {
  const isSm = size === "sm";
  const radius = isSm ? 16 : 40;
  const viewBox = isSm ? "0 0 40 40" : "0 0 100 100";
  const cx = isSm ? 20 : 50;
  const strokeWidth = isSm ? 3 : 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${isSm ? "h-10 w-10" : "h-24 w-24"}`}>
        <svg
          className={`${isSm ? "h-10 w-10" : "h-24 w-24"} -rotate-90`}
          viewBox={viewBox}
        >
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={getScoreTrack(score)}
          />
          <circle
            cx={cx}
            cy={cx}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getScoreStroke(score)} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold ${getScoreColor(score)} ${isSm ? "text-xs" : "text-2xl"}`}
          >
            {score}
          </span>
        </div>
      </div>
      {!isSm && (
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
    </div>
  );
}

function SeverityBadge({
  severity,
  t,
}: {
  severity: GrammarIssue["severity"];
  t: (key: string) => string;
}) {
  const styles = {
    high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    medium:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
    low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  };
  const labels = {
    high: t("grammarCheck.severityHigh"),
    medium: t("grammarCheck.severityMedium"),
    low: t("grammarCheck.severityLow"),
  };
  return <Badge className={styles[severity]}>{labels[severity]}</Badge>;
}

function TypeBadge({
  type,
  t,
}: {
  type: GrammarIssue["type"];
  t: (key: string) => string;
}) {
  const labelMap: Record<GrammarIssue["type"], string> = {
    grammar: t("grammarCheck.typeGrammar"),
    weak_verb: t("grammarCheck.typeWeakVerb"),
    vague: t("grammarCheck.typeVague"),
    quantify: t("grammarCheck.typeQuantify"),
    spelling: t("grammarCheck.typeSpelling"),
  };
  return (
    <Badge variant="secondary" className="text-xs">
      {labelMap[type]}
    </Badge>
  );
}

/* ── Result view ── */
function GrammarCheckResultView({
  result,
  t,
}: {
  result: GrammarCheckResult;
  t: (key: string) => string;
}) {
  return (
    <div className="px-6 py-4 space-y-6">
      {/* Score */}
      <div className="flex items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50/50 py-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <ScoreCircle score={result.score} label={t("grammarCheck.score")} />
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t("grammarCheck.summary")}
        </h4>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {result.summary}
        </p>
      </div>

      {/* Issues */}
      {result.issues.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {t("grammarCheck.issues")} ({result.issues.length})
          </h4>
          <div className="space-y-2.5">
            {result.issues.map((issue, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-150 bg-white p-3.5 space-y-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {issue.sectionTitle}
                  </Badge>
                  <SeverityBadge severity={issue.severity} t={t} />
                  <TypeBadge type={issue.type} t={t} />
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      {t("grammarCheck.original")}
                    </span>
                    <p className="text-sm text-zinc-500 line-through dark:text-zinc-500">
                      {issue.original}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {t("grammarCheck.suggestion")}
                    </span>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {issue.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("grammarCheck.noIssues")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Dialog ── */
export function GrammarCheckDialog({ open, onClose, resumeId }: DialogProps) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>("new");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    setIsChecking(true);
    setError("");

    try {
      const resume = useResumeStore.getState().currentResume;
      if (!resume) throw new Error("No resume loaded");

      const resumeContent = JSON.stringify(resume.sections);
      const prompt = `You are a professional resume grammar and style checker. Analyze this resume for grammar errors, spelling mistakes, weak verbs, vague expressions, and opportunities to quantify achievements.

Resume sections: ${resumeContent}

Return a JSON object with this exact structure:
{
  "score": <number 0-100 for writing quality>,
  "summary": "<brief summary of findings>",
  "issues": [
    {
      "sectionId": "<section id>",
      "sectionTitle": "<section title>",
      "severity": "high" | "medium" | "low",
      "type": "grammar" | "weak_verb" | "vague" | "quantify" | "spelling",
      "original": "<original text>",
      "suggestion": "<suggested fix>"
    }
  ]
}

Return ONLY the JSON, no markdown fences.`;

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
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]) as GrammarCheckResult;
              setResult(data);
            } else {
              setError("Failed to parse result");
            }
          } catch {
            setError("Failed to parse result");
          } finally {
            setIsChecking(false);
            unlisten();
          }
        }
        if (event.kind === "error") {
          setError(event.errorMessage || "Grammar check failed");
          setIsChecking(false);
          unlisten();
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check grammar");
      setIsChecking(false);
    }
  };

  const handleCheckAgain = () => {
    setResult(null);
    setError("");
    void handleCheck();
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setResult(null);
      setError("");
      setActiveTab("new");
    }, 200);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-lg bg-white shadow-xl dark:bg-zinc-900 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <SpellCheck className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t("grammarCheck.title")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("grammarCheck.description")}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 cursor-pointer"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Tabs */}
        <div className="px-6 pt-3">
          <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {[
              { value: "new", label: t("grammarCheck.newCheck") },
              { value: "history", label: t("grammarCheck.historyTab") },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                  activeTab === value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "hover:text-zinc-900 dark:hover:text-zinc-100",
                )}
                onClick={() => setActiveTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* New Check Tab */}
        {activeTab === "new" && (
          <>
            {!result ? (
              <div className="px-6 py-4 space-y-4">
                {!isChecking && !error && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <SpellCheck className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {t("grammarCheck.description")}
                    </p>
                  </div>
                )}

                {isChecking && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100 mb-3" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t("grammarCheck.checking")}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="cursor-pointer"
                  >
                    {t("grammarCheck.close")}
                  </Button>
                  <Button
                    onClick={() => void handleCheck()}
                    disabled={isChecking}
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        {t("grammarCheck.checking")}
                      </>
                    ) : (
                      t("grammarCheck.check")
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <GrammarCheckResultView result={result} t={t} />
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="cursor-pointer"
                  >
                    {t("grammarCheck.close")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCheckAgain}
                    className="cursor-pointer gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("grammarCheck.checkAgain")}
                  </Button>
                  {result.issues.length > 0 && (
                    <Button className="cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400">
                      <Wand2 className="h-3.5 w-3.5" />
                      {t("grammarCheck.fixAll")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* History Tab — placeholder for desktop */}
        {activeTab === "history" && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <SpellCheck className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("grammarCheck.noHistory")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
