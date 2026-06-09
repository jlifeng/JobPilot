import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResumeStore } from "../../stores/resume-store";
import { saveAiAnalysisRecord } from "../../lib/desktop-api";
import {
  downloadBlob,
  generateRequestId,
  getDesktopAiRuntimeConfig,
  parseCoverLetterOutput,
  runPromptStream,
} from "./ai-dialog-helpers";

interface CoverLetterDialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
}

type CoverLetterState = "idle" | "generating" | "completed" | "error";

export function CoverLetterDialog({ open, onClose, resumeId }: CoverLetterDialogProps) {
  const { t, i18n } = useTranslation();
  const { currentResume, sections } = useResumeStore();

  const [jdText, setJdText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [state, setState] = useState<CoverLetterState>("idle");
  const [coverLetterTitle, setCoverLetterTitle] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [streamingDraft, setStreamingDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const isZh = i18n.language.startsWith("zh");
  const isLoading = state === "generating";
  const previewText = state === "generating" ? streamingDraft : coverLetter;

  useEffect(() => {
    if (!open) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setJdText("");
      setCompanyName("");
      setJobTitle("");
      setState("idle");
      setCoverLetterTitle("");
      setCoverLetter("");
      setStreamingDraft("");
      setErrorMessage("");
      setCopyFeedback(false);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
    };
  }, [open]);

  const handleGenerate = async () => {
    if (!currentResume || !jdText.trim() || !companyName.trim() || !jobTitle.trim()) {
      return;
    }

    setState("generating");
    setCoverLetterTitle("");
    setCoverLetter("");
    setStreamingDraft("");
    setErrorMessage("");
    setCopyFeedback(false);

    try {
      const runtime = await getDesktopAiRuntimeConfig();
      const resumeContext = {
        resumeId,
        title: currentResume.title || "",
        language: currentResume.language || "en",
        sections: sections.map((section) => ({
          type: section.type,
          title: section.title,
          content: section.content,
        })),
      };

      const rawOutput = await runPromptStream(
        {
          provider: runtime.provider,
          model: runtime.model,
          baseUrl: runtime.baseUrl,
          requestId: generateRequestId("cover-letter"),
          systemPrompt: `You are an expert cover letter writer. Write a tailored cover letter in ${
            currentResume.language === "zh" ? "Simplified Chinese" : "English"
          }.

Requirements:
- Keep the letter professional, persuasive, and specific
- Open with a strong hook instead of generic filler
- Tie concrete resume evidence to the job requirements
- Mention the company and role naturally
- Keep the result concise and ready to send

Output format:
TITLE: <your title here>
---CONTENT---
<the full cover letter body>`,
          prompt: `Generate a professional cover letter for the following position:

Company: ${companyName}
Position: ${jobTitle}

Job Description:
${jdText}

Candidate Resume:
${JSON.stringify(resumeContext, null, 2)}

Write a polished cover letter that:
1. Opens with a strong, tailored hook
2. Connects the candidate's experience to the job requirements
3. Shows enthusiasm for the company and role
4. Ends with a clear call to action`,
        },
        {
          onEvent: (event) => {
            if (event.kind === "delta") {
              setStreamingDraft(event.accumulatedText || "");
            }
          },
        },
      );

      const parsed = parseCoverLetterOutput(rawOutput);
      setCoverLetterTitle(parsed.title);
      setCoverLetter(parsed.content);
      setStreamingDraft(parsed.content);
      setState("completed");

      void saveAiAnalysisRecord({
        documentId: resumeId,
        analysisType: "cover_letter",
        payload: {
          companyName,
          jobTitle,
          jobDescription: jdText,
          title: parsed.title,
          content: parsed.content,
        },
        score: null,
        issueCount: null,
        targetJobTitle: jobTitle,
        targetCompany: companyName,
      }).catch((error) => {
        console.error("Failed to save cover letter record:", error);
      });
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("aiErrorMessage"),
      );
    }
  };

  const handleCopy = async () => {
    if (!coverLetter.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Keep the dialog usable if clipboard access is blocked.
    }
  };

  const handleSave = () => {
    if (!coverLetter.trim()) {
      return;
    }

    const safeTitle = (coverLetterTitle || "cover-letter")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .trim();
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${safeTitle || "cover-letter"}.txt`);
  };

  const handleRegenerate = () => {
    setState("idle");
    setCoverLetterTitle("");
    setCoverLetter("");
    setStreamingDraft("");
    setErrorMessage("");
    setCopyFeedback(false);
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={!isLoading ? onClose : undefined}>
      <div className="dialog-content dialog-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <h2 className="dialog-title">{t("coverLetterTitle")}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-4">
          {!coverLetter && state !== "completed" && (
            <>
              <p className="text-sm text-zinc-500">{t("coverLetterDescription")}</p>

              <div className="form-field">
                <label className="form-label">{t("coverLetterCompany")}</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("coverLetterCompanyPlaceholder")}
                />
              </div>

              <div className="form-field">
                <label className="form-label">{t("coverLetterJobTitle")}</label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={t("coverLetterJobTitlePlaceholder")}
                />
              </div>

              <div className="form-field">
                <label className="form-label">{t("coverLetterJobDescription")}</label>
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder={t("coverLetterJobDescriptionPlaceholder")}
                  className="h-36"
                />
              </div>
            </>
          )}

          {(state === "generating" || state === "completed" || state === "error") && (
            <div className="space-y-3">
              {state === "generating" && (
                <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 text-zinc-600">
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  <div className="space-y-1">
                    <span className="block text-sm font-medium">{t("coverLetterGenerating")}</span>
                    <span className="block text-xs text-zinc-500">
                      {isZh ? "正在流式生成内容…" : "Streaming the draft letter..."}
                    </span>
                  </div>
                </div>
              )}

              {state === "completed" && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("coverLetterComplete")}</span>
                </div>
              )}

              {state === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              {(previewText || state === "completed") && (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="form-field">
                    <label className="form-label">
                      {isZh ? "标题" : "Title"}
                    </label>
                    <Input
                      value={coverLetterTitle}
                      onChange={(e) => setCoverLetterTitle(e.target.value)}
                      placeholder={isZh ? "求职信标题" : "Cover letter title"}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      {isZh ? "内容" : "Content"}
                    </label>
                    <Textarea
                      value={previewText}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="min-h-72 max-h-96"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t("commonCancel")}
          </Button>
          {!coverLetter && state !== "completed" && (
            <Button
              onClick={() => void handleGenerate()}
              disabled={!jdText.trim() || !companyName.trim() || !jobTitle.trim()}
            >
              {t("coverLetterGenerate")}
            </Button>
          )}
          {state === "completed" && (
            <>
              <Button variant="secondary" onClick={handleRegenerate} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("coverLetterRegenerate")}
              </Button>
              <Button onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                {copyFeedback ? (isZh ? "已复制" : "Copied") : t("coverLetterCopy")}
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {t("coverLetterSave")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
