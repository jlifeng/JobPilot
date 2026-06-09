import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  RotateCcw,
  Target,
  ShieldCheck,
  Lightbulb,
  AlertTriangle,
  Wand2,
  Trash2,
  FileSearch,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronLeft,
  Briefcase,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useResumeStore } from "../../stores/resume-store";
import {
  startAiPromptStream,
  listenToAiStreamEvents,
  type DesktopAiStreamEvent,
} from "../../lib/desktop-api";

/* ── Types ── */

interface JdAnalysisResult {
  overallScore: number;
  keywordMatches: string[];
  missingKeywords: string[];
  suggestions: { section: string; current: string; suggested: string }[];
  atsScore: number;
  summary: string;
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

/* ── Result view ── */
function JdAnalysisResultView({
  result,
  jobDescription,
  t,
}: {
  result: JdAnalysisResult;
  jobDescription?: string;
  t: (key: string) => string;
}) {
  const [jdExpanded, setJdExpanded] = useState(false);

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Job Description */}
      {jobDescription && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setJdExpanded(!jdExpanded)}
            className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1 truncate">
              {t("jdAnalysis.jobDescriptionLabel")}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform ${jdExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {jdExpanded && (
            <div className="border-t border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {jobDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Score Dashboard */}
      <div className="flex items-center justify-center gap-10 rounded-xl border border-zinc-100 bg-zinc-50/50 py-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <ScoreCircle score={result.overallScore} label={t("jdAnalysis.overallScore")} />
        <ScoreCircle score={result.atsScore} label={t("jdAnalysis.atsScore")} />
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <Target className="h-4 w-4 text-zinc-400" />
          {t("jdAnalysis.summary")}
        </h4>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {result.summary}
        </p>
      </div>

      {/* Keyword Matches */}
      {result.keywordMatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {t("jdAnalysis.keywordMatches")}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.keywordMatches.map((keyword) => (
              <Badge
                key={keyword}
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {result.missingKeywords.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {t("jdAnalysis.missingKeywords")}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.missingKeywords.map((keyword) => (
              <Badge
                key={keyword}
                className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            {t("jdAnalysis.suggestions")}
          </h4>
          <div className="space-y-2.5">
            {result.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-150 bg-white p-3.5 space-y-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Badge variant="secondary" className="text-xs font-medium">
                  {suggestion.section}
                </Badge>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      {t("jdAnalysis.currentState")}
                    </span>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {suggestion.current}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {t("jdAnalysis.suggestedChange")}
                    </span>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">
                      {suggestion.suggested}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results fallback */}
      {!result.summary &&
        result.keywordMatches.length === 0 &&
        result.missingKeywords.length === 0 &&
        result.suggestions.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            {t("jdAnalysis.noResults")}
          </p>
        )}
    </div>
  );
}

/* ── Main Dialog ── */
export function JdAnalysisDialog({ open, onClose, resumeId }: DialogProps) {
  const { t } = useTranslation();
  const currentResume = useResumeStore((state) => state.currentResume);

  const [activeTab, setActiveTab] = useState<string>("new");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<JdAnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    setIsAnalyzing(true);
    setError("");

    try {
      // Build a prompt for the AI to analyze JD match
      const resume = useResumeStore.getState().currentResume;
      if (!resume) throw new Error("No resume loaded");

      const resumeContent = JSON.stringify(resume.sections);
      const prompt = `You are a resume-job matching analyzer. Analyze how well this resume matches the job description.

Resume sections: ${resumeContent}

Job description: ${jobDescription}

Return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "keywordMatches": [<matched keywords>],
  "missingKeywords": [<missing keywords>],
  "suggestions": [{"section": "<name>", "current": "<text>", "suggested": "<text>"}],
  "summary": "<brief analysis>"
}

Return ONLY the JSON, no markdown fences.`;

      const receipt = await startAiPromptStream({
        provider: "openai",
        prompt,
      });

      // Listen for stream events
      let accumulated = "";
      const unlisten = await listenToAiStreamEvents((event: DesktopAiStreamEvent) => {
        if (event.requestId !== receipt.requestId) return;
        if (event.kind === "delta" && event.deltaText) {
          accumulated += event.deltaText;
        }
        if (event.kind === "completed") {
          try {
            const text = event.accumulatedText || accumulated;
            // Try to parse JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]) as JdAnalysisResult;
              setResult(data);
            } else {
              setError("Failed to parse analysis result");
            }
          } catch {
            setError("Failed to parse analysis result");
          } finally {
            setIsAnalyzing(false);
            unlisten();
          }
        }
        if (event.kind === "error") {
          setError(event.errorMessage || "Analysis failed");
          setIsAnalyzing(false);
          unlisten();
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze");
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAgain = () => {
    setResult(null);
    setJobDescription("");
    setError("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setResult(null);
      setJobDescription("");
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
          <h2 className="text-lg font-semibold">{t("jdAnalysis.title")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("jdAnalysis.description")}
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
              { value: "new", label: t("jdAnalysis.newAnalysis") },
              { value: "history", label: t("jdAnalysis.historyTab") },
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

        {/* New Analysis Tab */}
        {activeTab === "new" && (
          <>
            {!result ? (
              <div className="px-6 py-4 space-y-4">
                {currentResume?.targetJobTitle && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t("jdVersion.currentVersionLabel")}
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-2 gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">
                        {currentResume.targetJobTitle}
                        {currentResume.targetCompany
                          ? ` @ ${currentResume.targetCompany}`
                          : ""}
                      </span>
                    </Badge>
                  </div>
                )}

                <Textarea
                  placeholder={t("jdAnalysis.placeholder")}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  className="h-[200px] max-h-[200px] overflow-y-auto resize-none text-sm"
                  disabled={isAnalyzing}
                />

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
                    {t("jdAnalysis.close")}
                  </Button>
                  <Button
                    onClick={() => void handleAnalyze()}
                    disabled={isAnalyzing || !jobDescription.trim()}
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        {t("jdAnalysis.analyzing")}
                      </>
                    ) : (
                      t("jdAnalysis.analyze")
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <JdAnalysisResultView
                    result={result}
                    jobDescription={jobDescription}
                    t={t}
                  />
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="cursor-pointer"
                  >
                    {t("jdAnalysis.close")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAnalyzeAgain}
                    className="cursor-pointer gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("jdAnalysis.analyzeAgain")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* History Tab — placeholder for desktop */}
        {activeTab === "history" && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <FileSearch className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("jdAnalysis.noHistory")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
