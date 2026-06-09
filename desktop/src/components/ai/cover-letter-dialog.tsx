import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  RotateCcw,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useResumeStore } from "../../stores/resume-store";
import {
  startAiPromptStream,
  listenToAiStreamEvents,
  type DesktopAiStreamEvent,
} from "../../lib/desktop-api";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

interface CoverLetterResult {
  title: string;
  content: string;
}

type Tone = "formal" | "friendly" | "confident";

const LANGUAGE_OPTIONS = [
  { value: "zh", label: "\u4E2D\u6587", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { value: "en", label: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { value: "ja", label: "\u65E5\u672C\u8A9E", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { value: "ko", label: "\uD55C\uAD6D\uC5B4", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { value: "fr", label: "Fran\u00E7ais", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { value: "de", label: "Deutsch", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { value: "es", label: "Espa\u00F1ol", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
] as const;

export function CoverLetterDialog({ open, onClose, resumeId }: DialogProps) {
  const { t } = useTranslation();

  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setIsGenerating(true);
    setError("");

    try {
      const resume = useResumeStore.getState().currentResume;
      if (!resume) throw new Error("No resume loaded");

      const resumeContent = JSON.stringify(resume.sections);
      const prompt = `You are a professional cover letter writer. Generate a tailored cover letter based on this resume and job description.

Resume sections: ${resumeContent}

Job description: ${jobDescription}

Tone: ${tone}
Language: ${language}

Return a JSON object with:
{
  "title": "<cover letter title>",
  "content": "<the full cover letter text>"
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
              const data = JSON.parse(jsonMatch[0]) as CoverLetterResult;
              setResult(data);
            } else {
              setError("Failed to parse result");
            }
          } catch {
            setError("Failed to parse result");
          } finally {
            setIsGenerating(false);
            unlisten();
          }
        }
        if (event.kind === "error") {
          setError(event.errorMessage || "Generation failed");
          setIsGenerating(false);
          unlisten();
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate cover letter");
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title || "cover-letter"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAgain = () => {
    setResult(null);
    setError("");
    setCopied(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setResult(null);
      setJobDescription("");
      setTone("formal");
      setLanguage("en");
      setError("");
      setCopied(false);
    }, 200);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t("coverLetter.title")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("coverLetter.description")}
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

        {!result ? (
          /* ---------- Input State ---------- */
          <div className="px-6 py-4 space-y-4">
            {/* Job Description */}
            <Textarea
              placeholder={t("coverLetter.jdPlaceholder")}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="h-[160px] max-h-[160px] overflow-y-auto resize-none text-sm"
              disabled={isGenerating}
            />

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("coverLetter.tone")}
              </label>
              <div className="flex gap-2">
                {(["formal", "friendly", "confident"] as Tone[]).map((t_tone) => (
                  <button
                    key={t_tone}
                    type="button"
                    className={cn(
                      "flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      tone === t_tone
                        ? "border-zinc-500 dark:border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600",
                    )}
                    onClick={() => setTone(t_tone)}
                    disabled={isGenerating}
                  >
                    {t(
                      `coverLetter.tone${t_tone.charAt(0).toUpperCase() + t_tone.slice(1)}`,
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("coverLetter.language")}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isGenerating}
                className="flex h-10 w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

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
                {t("coverLetter.close")}
              </Button>
              <Button
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !jobDescription.trim()}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("coverLetter.generating")}
                  </>
                ) : (
                  t("coverLetter.generate")
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* ---------- Result State ---------- */
          <>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
                {/* Title */}
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {result.title}
                </h3>
                {/* Content */}
                <div className="rounded-lg border border-zinc-150 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {result.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <Button
                variant="outline"
                onClick={handleGenerateAgain}
                className="cursor-pointer gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("coverLetter.generateAgain")}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleCopy()}
                  className="cursor-pointer gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {t("coverLetter.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {t("coverLetter.copyToClipboard")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="cursor-pointer gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("coverLetter.downloadTxt")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="cursor-pointer"
                >
                  {t("coverLetter.close")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
