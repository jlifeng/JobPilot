import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildInterviewRestartDraft,
  deleteInterviewSession,
  generateInterviewReport,
  getInterviewReport,
  saveInterviewRestartDraft,
} from "../../lib/desktop-api";
import { resolveInterviewLocale } from "../../lib/interviewers";
import type {
  InterviewReport,
  InterviewSessionDetail,
  InterviewTrainingPlanItem,
  InterviewWeakPoint,
} from "../../types/interview";

interface InterviewReportSummaryProps {
  sessionId: string;
  initialSession: InterviewSessionDetail | null;
  initialReport: InterviewReport | null;
  runtimeIsFallback: boolean;
}

function getPriorityTone(value: "low" | "medium" | "high"): string {
  if (value === "high") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200";
  }
  if (value === "low") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
}

interface WeakPointCardProps {
  item: InterviewWeakPoint;
  label: string;
}

function WeakPointCard({ item, label }: WeakPointCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 font-medium text-zinc-950 dark:text-zinc-50">
          <AlertTriangle className="h-4 w-4" />
          {item.title}
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getPriorityTone(item.severity)}`}>
          {label}
        </span>
      </div>
      {item.evidence ? (
        <p className="mt-3 leading-6 text-zinc-600 dark:text-zinc-300">{item.evidence}</p>
      ) : null}
      {item.trainingFocus ? (
        <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
          {item.trainingFocus}
        </div>
      ) : null}
    </div>
  );
}

interface TrainingPlanCardProps {
  item: InterviewTrainingPlanItem;
  label: string;
}

function TrainingPlanCard({ item, label }: TrainingPlanCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 font-medium text-zinc-950 dark:text-zinc-50">
          <Target className="h-4 w-4" />
          {item.title}
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getPriorityTone(item.priority)}`}>
          {label}
        </span>
      </div>
      {item.description ? (
        <p className="mt-3 leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
      ) : null}
      {item.drills.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {item.drills.map((drill, index) => (
            <li
              key={`${item.title}-drill-${index}`}
              className="rounded-xl bg-zinc-50 px-3 py-2 text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300"
            >
              {drill}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function InterviewReportSummary({
  sessionId,
  initialSession,
  initialReport,
  runtimeIsFallback,
}: InterviewReportSummaryProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = resolveInterviewLocale(i18n.language);
  const [session] = useState(initialSession);
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const priorityLabels = {
    low: t("interview.practice.priorityLow"),
    medium: t("interview.practice.priorityMedium"),
    high: t("interview.practice.priorityHigh"),
  };

  useEffect(() => {
    if (runtimeIsFallback || report || !session || session.status !== "completed") {
      return;
    }

    let isCancelled = false;

    const ensureReport = async () => {
      setIsGenerating(true);
      try {
        const generated = await generateInterviewReport({
          sessionId,
          locale,
        });
        if (!isCancelled) {
          setReport(generated);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : t("interview.report.generateError"),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    void ensureReport();

    return () => {
      isCancelled = true;
    };
  }, [locale, report, runtimeIsFallback, session, sessionId, t]);

  const refreshReport = async () => {
    setIsGenerating(true);
    try {
      const next = await getInterviewReport(sessionId);
      if (next) {
        setReport(next);
        setError(null);
        return;
      }

      const generated = await generateInterviewReport({
        sessionId,
        locale,
      });
      setReport(generated);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.report.generateError"),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestart = () => {
    if (!session) {
      return;
    }

    saveInterviewRestartDraft(buildInterviewRestartDraft(session));
    void navigate({ to: "/interview/new" });
  };

  const handleDelete = async () => {
    if (!session) {
      return;
    }

    const confirmed = window.confirm(
      t("interview.actions.deleteConfirm", { title: session.jobTitle }),
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteInterviewSession(session.id);
      void navigate({ to: "/interview" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.actions.deleteError"),
      );
      setIsDeleting(false);
    }
  };

  if (runtimeIsFallback) {
    return (
      <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-none dark:border-amber-900 dark:bg-amber-950/40">
        <CardHeader>
          <CardTitle>{t("interview.fallback.title")}</CardTitle>
          <CardDescription>{t("interview.fallback.body")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="rounded-3xl border-zinc-200/80 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>{t("interview.report.notFoundTitle")}</CardTitle>
          <CardDescription>{t("interview.report.notFoundBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/interview">
            <ArrowLeft className="h-4 w-4" />
            {t("interview.actions.backToLobby")}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={handleRestart}
            disabled={isGenerating || isDeleting}
          >
            <RotateCcw className="h-4 w-4" />
            {t("interview.actions.restart")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void refreshReport()}
            disabled={isGenerating || isDeleting}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("interview.report.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("interview.actions.generateReport")}
              </>
            )}
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/interview/$sessionId" params={{ sessionId }}>
              {t("interview.report.reviewTranscript")}
            </Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            onClick={() => void handleDelete()}
            disabled={isGenerating || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t("interview.actions.deleting") : t("interview.actions.delete")}
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{session.jobTitle}</CardTitle>
              <CardDescription>{t("interview.report.subtitle")}</CardDescription>
            </div>
            {report ? (
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-5 py-4 text-right">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("interview.report.score")}
                </div>
                <div className="mt-1 inline-flex items-center gap-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  <Trophy className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                  {report.overallScore}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {session.selectedInterviewers.map((interviewer) => (
              <Badge key={`${session.id}-${interviewer.type}`} variant="outline" className="rounded-full">
                {interviewer.name}
              </Badge>
            ))}
            {session.resumeTitle ? (
              <Badge variant="secondary" className="rounded-full">
                {session.resumeTitle}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="rounded-3xl border-red-200 bg-red-50 shadow-none dark:border-red-900 dark:bg-red-950/40">
          <CardContent className="pt-6 text-sm text-red-700 dark:text-red-200">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {!report ? (
        <Card className="rounded-3xl border-zinc-200/80 dark:border-zinc-800">
          <CardContent className="flex min-h-[220px] items-center justify-center pt-6">
            <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("interview.report.generating")}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>{t("interview.report.summaryTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {report.summary}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>{t("interview.report.feedbackTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                <p className="whitespace-pre-wrap">{report.overallFeedback}</p>
              </CardContent>
            </Card>
          </div>

          {report.weakPoints.length > 0 ? (
            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t("interview.practice.weakPointsTitle")}
                </CardTitle>
                <CardDescription>{t("interview.practice.weakPointsHint")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {report.weakPoints.map((item, index) => (
                  <WeakPointCard
                    key={`${report.id}-weak-${index}`}
                    item={item}
                    label={priorityLabels[item.severity]}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          {report.trainingPlan.length > 0 ? (
            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  {t("interview.practice.trainingPlanTitle")}
                </CardTitle>
                <CardDescription>{t("interview.practice.trainingPlanHint")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {report.trainingPlan.map((item, index) => (
                  <TrainingPlanCard
                    key={`${report.id}-training-${index}`}
                    item={item}
                    label={priorityLabels[item.priority]}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle>{t("interview.report.improvementsTitle")}</CardTitle>
              <CardDescription>{t("interview.report.improvementsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.improvementSuggestions.map((item, index) => (
                <div
                  key={`${report.id}-improvement-${index}`}
                  className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
                >
                  <div className="font-medium text-zinc-950 dark:text-zinc-50">
                    {index + 1}. {item}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
