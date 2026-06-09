import { useState, useMemo, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bot,
  Copy,
  FileText,
  FolderOpen,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { rootRoute } from "./root";
import { Skeleton } from "../components/skeleton";
import { CreateResumeDialog } from "../components/dashboard/create-resume-dialog";
import { GenerateResumeDialog } from "../components/dashboard/generate-resume-dialog";
import { ImportJsonDialog } from "../components/dashboard/import-json-dialog";
import type { Resume } from "../types/resume";
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  getDocument,
  listAiAnalysisRecords,
  listInterviewSessions,
  listDocuments,
  renameDocument,
} from "../lib/desktop-api";
import { toResume, toResumeDocument } from "../lib/desktop-document-mappers";
import type { AiAnalysisRecord, DesktopDocumentDetail } from "../lib/desktop-api";
import type { InterviewSession } from "../types/interview";
import { TemplateThumbnail } from "@/components/dashboard/template-thumbnail";
import { TEMPLATE_MATRIX_GROUPS } from "@/lib/template-matrix";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function sortByLastEdited(resumes: Resume[]): Resume[] {
  return [...resumes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function sortByRecentInterview(sessions: InterviewSession[]): InterviewSession[] {
  return [...sessions].sort((a, b) => b.updatedAtEpochMs - a.updatedAtEpochMs);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSerializedDocumentBytes(document: DesktopDocumentDetail): number {
  return new TextEncoder().encode(JSON.stringify(document)).length;
}

function formatRelativeTime(
  value: string | number | undefined,
  labels: {
    minutes: (count: number) => string;
    hours: (count: number) => string;
    days: (count: number) => string;
  },
): string {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return labels.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hours(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return labels.days(days);
  return date.toLocaleDateString();
}

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.24)] ${className}`}
    >
      {children}
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-[260px] overflow-hidden lg:block">
      <div className="absolute right-10 top-5 h-24 w-40 rotate-[-8deg] rounded-xl bg-white/80 shadow-[0_18px_40px_rgba(37,99,235,0.12)] dark:bg-zinc-900/80 dark:shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
        <div className="h-7 rounded-t-xl bg-gradient-to-r from-blue-500 to-blue-600" />
        <div className="space-y-2 p-3">
          <div className="h-2 w-20 rounded-full bg-blue-100 dark:bg-blue-900/60" />
          <div className="h-2 w-28 rounded-full bg-slate-100 dark:bg-zinc-800" />
          <div className="h-2 w-16 rounded-full bg-slate-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="absolute bottom-5 right-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-[0_12px_28px_rgba(37,99,235,0.14)] dark:bg-blue-950/70 dark:text-blue-200 dark:shadow-none">
        <Bot className="h-6 w-6" />
      </div>
      <div className="absolute bottom-12 right-48 h-7 w-7 rounded-xl bg-orange-100 shadow-sm dark:bg-orange-950/60 dark:shadow-none" />
      <Sparkles className="absolute right-24 top-4 h-6 w-6 text-blue-200 dark:text-blue-800" />
    </div>
  );
}

function HeroCard({
  latestResume,
  relativeLabels,
  onContinue,
}: {
  latestResume: Resume | null;
  relativeLabels: {
    minutes: (count: number) => string;
    hours: (count: number) => string;
    days: (count: number) => string;
  };
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const latestTitle = latestResume?.title ?? t("dashboardNoResumesShort");
  const latestTime = latestResume
    ? formatRelativeTime(latestResume.updatedAt, relativeLabels)
    : t("dashboardHeroNoResumeHint");

  return (
    <section className="relative flex min-h-[156px] items-center overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-blue-100/70 px-6 py-5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:border-blue-400/20 dark:from-[#172033] dark:via-[#13213a] dark:to-card dark:shadow-[0_22px_50px_rgba(0,0,0,0.24)] lg:h-[156px] lg:py-0">
      <HeroIllustration />
      <div className="relative z-10 flex w-full flex-col gap-5 lg:pr-[300px]">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-zinc-50">
            {t("dashboardHeroTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            {t("workspaceWelcomeSubtitle")}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={!latestResume}
            onClick={onContinue}
          >
            {t("dashboardContinueEdit")}
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="min-w-0 max-w-[360px]">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {t("dashboardHeroLastResume")}
              <span className="px-1.5">·</span>
              {latestTime}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-zinc-50">
              {latestTitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentResumeRow({
  resume,
  dataSizeLabel,
  relativeLabels,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  resume: Resume;
  dataSizeLabel?: string;
  relativeLabels: {
    minutes: (count: number) => string;
    hours: (count: number) => string;
    days: (count: number) => string;
  };
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const targetLabel = [resume.targetCompany, resume.targetJobTitle]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" · ");

  return (
    <div
      className="group flex cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900/70"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex h-[78px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900">
        <TemplateThumbnail template={resume.template} className="h-[78px] w-[58px] shadow-sm" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-zinc-50">{resume.title}</p>
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-200">
            {t("dashboardLocal")}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          {t("dashboardUpdatedAt", {
            time: formatRelativeTime(resume.updatedAt, relativeLabels),
          })}
          {dataSizeLabel ? (
            <>
              <span className="px-1.5">·</span>
              {dataSizeLabel}
            </>
          ) : null}
        </p>
        {targetLabel ? (
          <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
            {targetLabel}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="hidden h-9 cursor-pointer items-center justify-center rounded-lg border border-blue-100 bg-white px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-900/60 dark:bg-zinc-950 dark:text-blue-200 dark:hover:bg-blue-950/40 sm:inline-flex"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        {t("dashboardContinueEdit")}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
            aria-label={t("commonMore")}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-4 w-4" />
            {t("commonRename")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
            {t("commonDuplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            {t("commonDelete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  tone,
  onClick,
  wide = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone: "blue" | "violet" | "green" | "orange";
  onClick: () => void;
  wide?: boolean;
}) {
  const toneClass = {
    blue:
      "bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-200 dark:bg-blue-950/45 dark:text-blue-200 dark:border-blue-500/25 dark:hover:border-blue-400/40",
    violet:
      "bg-violet-50 text-violet-600 border-violet-100 hover:border-violet-200 dark:bg-violet-950/45 dark:text-violet-200 dark:border-violet-500/25 dark:hover:border-violet-400/40",
    green:
      "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-200 dark:border-emerald-500/25 dark:hover:border-emerald-400/40",
    orange:
      "bg-orange-50 text-orange-500 border-orange-100 hover:border-orange-200 dark:bg-orange-950/45 dark:text-orange-200 dark:border-orange-500/25 dark:hover:border-orange-400/40",
  }[tone];

  return (
    <button
      type="button"
      className={`group flex min-h-[112px] cursor-pointer flex-col items-start justify-center rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_16px_38px_rgba(0,0,0,0.28)] ${toneClass} ${wide ? "sm:col-span-2" : ""}`}
      onClick={onClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-current/10">
        {icon}
      </div>
      <p className="mt-4 text-sm font-bold text-slate-950 dark:text-zinc-50">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{description}</p>
    </button>
  );
}

function RecentInterviewCard({
  session,
  relativeLabels,
  onOpen,
}: {
  session: InterviewSession;
  relativeLabels: {
    minutes: (count: number) => string;
    hours: (count: number) => string;
    days: (count: number) => string;
  };
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const totalRounds = session.selectedInterviewers.length;
  const isCompleted = session.status === "completed";
  const progressLabel = isCompleted
    ? t("interview.lobby.completed")
    : t("interview.lobby.progress", {
        current: Math.min(session.currentRound + 1, totalRounds),
        total: totalRounds,
      });
  const updatedTime = formatRelativeTime(session.updatedAtEpochMs, relativeLabels);

  return (
    <DashboardCard className="relative flex min-h-[240px] flex-col overflow-hidden border-violet-100 bg-gradient-to-br from-violet-50 via-white to-violet-100/80 p-6 dark:border-violet-500/25 dark:from-[#271c3f] dark:via-violet-950/45 dark:to-card">
      <div className="relative z-10 flex w-full flex-1 flex-col md:w-[60%]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-200">
            <Mic className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-violet-900 dark:text-violet-100">
            {t("dashboardRecentInterviews")}
          </h2>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <p className="min-w-0 max-w-full truncate text-base font-bold text-slate-950 dark:text-zinc-50">
            {session.jobTitle}
          </p>
          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/70 dark:text-violet-200">
            {progressLabel}
          </span>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {t("dashboardUpdatedAt", { time: updatedTime })}
          </span>
          {session.reportOverallScore !== null && session.reportOverallScore !== undefined ? (
            <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-zinc-900/70 dark:text-violet-200">
              {t("interview.report.score")} {session.reportOverallScore}
            </span>
          ) : null}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
          {session.jobDescription}
        </p>
        <button
          type="button"
          className="mt-auto inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
          onClick={onOpen}
        >
          {isCompleted ? t("interview.lobby.viewReport") : t("interview.lobby.resume")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-5 right-8 hidden items-end gap-3 md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70 text-violet-500 shadow-sm dark:bg-zinc-900/70 dark:text-violet-200 dark:shadow-none">
          <Bot className="h-10 w-10" />
        </div>
        <div className="h-16 w-20 rounded-t-3xl bg-violet-200/70 dark:bg-violet-900/50" />
      </div>
    </DashboardCard>
  );
}

function getAnalysisTypeLabel(record: AiAnalysisRecord, t: (key: string) => string): string {
  if (record.analysisType === "jd") return t("dashboardAiAnalysisJd");
  if (record.analysisType === "grammar") return t("dashboardAiAnalysisGrammar");
  return t("dashboardAiAnalysisCoverLetter");
}

function getAnalysisSummary(record: AiAnalysisRecord): string {
  try {
    const parsed = JSON.parse(record.payloadJson) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const payload = parsed as Record<string, unknown>;
      const summary = payload.summary;
      if (typeof summary === "string" && summary.trim()) {
        return summary.trim();
      }

      const title = payload.title;
      if (typeof title === "string" && title.trim()) {
        return title.trim();
      }

      const content = payload.content;
      if (typeof content === "string") {
        return content.trim().slice(0, 120);
      }
    }
  } catch {
    return "";
  }

  return "";
}

function AISuggestionCard({
  latestAnalysis,
  relativeLabels,
  onStart,
}: {
  latestAnalysis: AiAnalysisRecord | null;
  relativeLabels: {
    minutes: (count: number) => string;
    hours: (count: number) => string;
    days: (count: number) => string;
  };
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const latestAnalysisSummary = latestAnalysis ? getAnalysisSummary(latestAnalysis) : "";
  const latestAnalysisTime = latestAnalysis
    ? formatRelativeTime(latestAnalysis.createdAtEpochMs, relativeLabels)
    : "";
  const latestAnalysisTarget = latestAnalysis
    ? [latestAnalysis.targetJobTitle, latestAnalysis.targetCompany]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" · ")
    : "";

  return (
    <DashboardCard className="relative flex min-h-[240px] flex-col overflow-hidden border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100/70 p-6 dark:border-orange-500/25 dark:from-[#342414] dark:via-orange-950/45 dark:to-card">
      <div className="relative z-10 flex w-full flex-1 flex-col md:w-[60%]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-500 dark:bg-orange-950/60 dark:text-orange-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-slate-950 dark:text-zinc-50">
            {t("dashboardAiSuggestionTitle")}
          </h2>
        </div>
        {latestAnalysis ? (
          <>
            <p className="mt-6 text-base font-bold text-slate-950 dark:text-zinc-50">
              {getAnalysisTypeLabel(latestAnalysis, t)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {typeof latestAnalysis.score === "number" ? (
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-zinc-900/70 dark:text-orange-200">
                  {t("dashboardAiAnalysisScore", { score: latestAnalysis.score })}
                </span>
              ) : null}
              {typeof latestAnalysis.issueCount === "number" ? (
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-zinc-900/70 dark:text-orange-200">
                  {t("dashboardAiAnalysisIssues", { count: latestAnalysis.issueCount })}
                </span>
              ) : null}
              {latestAnalysisTarget ? (
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-zinc-900/70 dark:text-orange-200">
                  {t("dashboardAiAnalysisTarget", { target: latestAnalysisTarget })}
                </span>
              ) : null}
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {t("dashboardUpdatedAt", { time: latestAnalysisTime })}
              </span>
            </div>
            {latestAnalysisSummary ? (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                {latestAnalysisSummary}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-6 text-base font-bold text-slate-950 dark:text-zinc-50">
              {t("dashboardAiSuggestionSubtitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              {t("dashboardAiSuggestionBody")}
            </p>
          </>
        )}
        <button
          type="button"
          className="mt-auto inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
          onClick={onStart}
        >
          {t("dashboardStartNow")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 right-10 hidden h-28 w-24 rotate-2 rounded-xl bg-white/80 p-3 shadow-[0_12px_28px_rgba(245,158,11,0.16)] dark:bg-zinc-900/80 dark:shadow-none md:block">
        <div className="h-2 w-12 rounded-full bg-orange-200 dark:bg-orange-800" />
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800" />
          <div className="h-2 w-16 rounded-full bg-slate-100 dark:bg-zinc-800" />
          <div className="h-2 w-20 rounded-full bg-orange-100 dark:bg-orange-900/60" />
        </div>
      </div>
      <Target className="absolute bottom-10 right-36 hidden h-7 w-7 text-blue-400 dark:text-blue-700 md:block" />
    </DashboardCard>
  );
}

function DashboardRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [aiAnalysisRecords, setAiAnalysisRecords] = useState<AiAnalysisRecord[]>([]);
  const [documentDataSizes, setDocumentDataSizes] = useState<Record<string, string>>({});
  const [showAllResumes, setShowAllResumes] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const refreshResumes = useCallback(async () => {
    setIsLoading(true);
    try {
      const documents = await listDocuments();
      setResumes(documents.map(toResume));
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshResumes();
  }, [refreshResumes]);

  useEffect(() => {
    const refreshWorkspaceSignals = async () => {
      try {
        const [nextInterviewSessions, nextAiAnalysisRecords] = await Promise.all([
          listInterviewSessions(),
          listAiAnalysisRecords({ limit: 5 }),
        ]);
        setInterviewSessions(nextInterviewSessions);
        setAiAnalysisRecords(nextAiAnalysisRecords);
      } catch (error) {
        console.error("Failed to load workspace signals:", error);
      }
    };

    void refreshWorkspaceSignals();
  }, []);

  const relativeLabels = useMemo(
    () => ({
      minutes: (count: number) => t("dashboardRelativeMinutes", { count }),
      hours: (count: number) => t("dashboardRelativeHours", { count }),
      days: (count: number) => t("dashboardRelativeDays", { count }),
    }),
    [t],
  );
  const sortedResumes = useMemo(() => sortByLastEdited(resumes), [resumes]);
  const latestResume = sortedResumes[0] ?? null;
  const displayedResumes = useMemo(
    () => (showAllResumes ? sortedResumes : sortedResumes.slice(0, 3)),
    [showAllResumes, sortedResumes],
  );
  const recentInterviewSession = useMemo(
    () => sortByRecentInterview(interviewSessions)[0] ?? null,
    [interviewSessions],
  );
  const latestAnalysis = aiAnalysisRecords[0] ?? null;
  const templateCount = useMemo(
    () => TEMPLATE_MATRIX_GROUPS.reduce((total, group) => total + group.templates.length, 0),
    [],
  );

  useEffect(() => {
    if (displayedResumes.length === 0) {
      setDocumentDataSizes({});
      return;
    }

    let cancelled = false;

    const loadDocumentDataSizes = async () => {
      const entries = await Promise.all(
        displayedResumes.map(async (resume) => {
          try {
            const document = await getDocument(resume.id);
            return document
              ? ([resume.id, formatBytes(getSerializedDocumentBytes(document))] as const)
              : null;
          } catch (error) {
            console.error("Failed to load document data size:", error);
            return null;
          }
        }),
      );

      if (!cancelled) {
        setDocumentDataSizes(
          Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)),
        );
      }
    };

    void loadDocumentDataSizes();

    return () => {
      cancelled = true;
    };
  }, [displayedResumes]);

  const handleCreateFromDialog = async (data: {
    title?: string;
    template?: string;
    language?: string;
  }) => {
    return createDocument({
      title: data.title,
      template: data.template,
      language: data.language,
    });
  };

  const handleImportSuccess = async (document?: DesktopDocumentDetail | null) => {
    await refreshResumes();
    if (document) {
      navigate({ to: "/editor/$id", params: { id: document.id } });
    }
  };

  const handleOpenLatestResume = () => {
    if (!latestResume) return;
    navigate({ to: "/editor/$id", params: { id: latestResume.id } });
  };

  const handleRenameResume = async (resume: Resume) => {
    const nextTitle = window.prompt(t("commonRename"), resume.title)?.trim();
    if (!nextTitle || nextTitle === resume.title) {
      return;
    }

    try {
      const updated = await renameDocument(resume.id, nextTitle);
      setResumes((current) =>
        current.map((item) => (item.id === resume.id ? toResumeDocument(updated) : item)),
      );
    } catch (error) {
      console.error("Failed to rename document:", error);
    }
  };

  const handleDuplicateResume = async (resume: Resume) => {
    try {
      const duplicated = await duplicateDocument(resume.id);
      setResumes((current) => sortByLastEdited([toResumeDocument(duplicated), ...current]));
    } catch (error) {
      console.error("Failed to duplicate document:", error);
    }
  };

  const handleDeleteResume = async (resume: Resume) => {
    if (!window.confirm(t("dashboardDeleteConfirm", { title: resume.title }))) {
      return;
    }

    try {
      const deleted = await deleteDocument(resume.id);
      if (deleted) {
        setResumes((current) => current.filter((item) => item.id !== resume.id));
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-8">
      <HeroCard
        latestResume={latestResume}
        relativeLabels={relativeLabels}
        onContinue={handleOpenLatestResume}
      />

      <div className={`grid gap-5 ${recentInterviewSession ? "lg:grid-cols-2" : ""}`}>
        {recentInterviewSession ? (
          <RecentInterviewCard
            session={recentInterviewSession}
            relativeLabels={relativeLabels}
            onOpen={() =>
              navigate({
                to:
                  recentInterviewSession.status === "completed"
                    ? "/interview/$sessionId/report"
                    : "/interview/$sessionId",
                params: { sessionId: recentInterviewSession.id },
              })
            }
          />
        ) : null}
        <AISuggestionCard
          latestAnalysis={latestAnalysis}
          relativeLabels={relativeLabels}
          onStart={latestResume ? handleOpenLatestResume : () => setGenerateDialogOpen(true)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_416px]">
        <DashboardCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
            <h2 className="text-base font-bold text-slate-950 dark:text-zinc-50">
              {t("dashboardRecentResumes")}
            </h2>
            {sortedResumes.length > 3 ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                onClick={() => setShowAllResumes((value) => !value)}
              >
                {showAllResumes ? t("dashboardShowRecent") : t("dashboardViewAll")}
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-[92px] rounded-xl" />
              ))}
            </div>
          ) : displayedResumes.length > 0 ? (
            <>
              {displayedResumes.map((resume) => (
                <RecentResumeRow
                  key={resume.id}
                  resume={resume}
                  dataSizeLabel={documentDataSizes[resume.id]}
                  relativeLabels={relativeLabels}
                  onOpen={() => navigate({ to: "/editor/$id", params: { id: resume.id } })}
                  onRename={() => void handleRenameResume(resume)}
                  onDuplicate={() => void handleDuplicateResume(resume)}
                  onDelete={() => void handleDeleteResume(resume)}
                />
              ))}
              <button
                type="button"
                className="mx-5 mb-5 mt-3 flex w-[calc(100%-2.5rem)] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:border-white/15 dark:bg-zinc-950/35 dark:text-zinc-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-200"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span>
                  {t("dashboardDropzoneHint")}
                  <span className="ml-1 font-semibold text-blue-600 dark:text-blue-300">
                    {t("dashboardImportInline")}
                  </span>
                </span>
                <span className="hidden text-xs text-slate-400 dark:text-zinc-500 sm:inline">
                  {t("dashboardDropzoneSupported")}
                </span>
              </button>
            </>
          ) : (
            <div className="m-5 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center dark:border-white/15 dark:bg-zinc-950/35">
              <p className="text-sm font-semibold text-slate-950 dark:text-zinc-50">
                {t("dashboardNoResumesShort")}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{t("dashboardNoResumes")}</p>
              <button
                type="button"
                className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("dashboardCreateResume")}
              </button>
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="p-5">
          <h2 className="text-base font-bold text-slate-950 dark:text-zinc-50">{t("dashboardQuickStart")}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QuickAction
              icon={<FileText className="h-5 w-5" />}
              title={t("dashboardCreateResume")}
              description={t("dashboardCreateResumeDescription")}
              tone="blue"
              onClick={() => setCreateDialogOpen(true)}
            />
            <QuickAction
              icon={<Upload className="h-5 w-5" />}
              title={t("dashboardImportJson")}
              description={t("dashboardImportDescription")}
              tone="violet"
              onClick={() => setImportDialogOpen(true)}
            />
            <QuickAction
              icon={<Sparkles className="h-5 w-5" />}
              title={t("dashboardAiGenerate")}
              description={t("dashboardAiGenerateDescription")}
              tone="green"
              onClick={() => setGenerateDialogOpen(true)}
            />
            <QuickAction
              icon={<Mic className="h-5 w-5" />}
              title={t("interview.dashboardCta")}
              description={t("dashboardMockInterviewDescription")}
              tone="orange"
              onClick={() => navigate({ to: "/interview" })}
            />
            <QuickAction
              icon={<FolderOpen className="h-5 w-5" />}
              title={t("templatesTitle")}
              description={t("dashboardTemplatesDescription", { count: templateCount })}
              tone="violet"
              wide
              onClick={() => navigate({ to: "/templates" })}
            />
          </div>
        </DashboardCard>
      </div>

      <CreateResumeDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateFromDialog}
        onCreated={(document) => {
          void refreshResumes();
          navigate({ to: "/editor/$id", params: { id: document.id } });
        }}
      />

      <GenerateResumeDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
      />

      <ImportJsonDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportSuccess}
      />
    </div>
  );
}

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardRoute,
});
