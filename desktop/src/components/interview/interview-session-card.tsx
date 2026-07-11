import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Clock3, FileText, RotateCcw, Trash2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterviewerColorClass, getInterviewerInitials } from "../../lib/interviewers";
import type { InterviewSession } from "../../types/interview";

function formatTimestamp(value: number, locale: string): string {
  return new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface InterviewSessionCardProps {
  session: InterviewSession;
  locale: string;
  isDeleting?: boolean;
  onDelete: (session: InterviewSession) => void;
  onRestart: (session: InterviewSession) => void;
}

export function InterviewSessionCard({
  session,
  locale,
  isDeleting = false,
  onDelete,
  onRestart,
}: InterviewSessionCardProps) {
  const { t } = useTranslation();
  const isCompleted = session.status === "completed";
  const totalRounds = session.selectedInterviewers.length;
  const currentRoundLabel = isCompleted
    ? t("interview.lobby.completed")
    : t("interview.lobby.progress", {
        current: Math.min(session.currentRound + 1, totalRounds),
        total: totalRounds,
      });

  return (
    <Card className="rounded-2xl border-zinc-200/80 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-zinc-800">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg text-zinc-950 dark:text-zinc-50">
              {session.jobTitle}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTimestamp(session.updatedAtEpochMs, locale)}
              </span>
              {session.resumeTitle ? (
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {session.resumeTitle}
                </span>
              ) : null}
            </div>
          </div>
          <Badge variant={isCompleted ? "default" : "secondary"} className="rounded-full">
            {currentRoundLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {session.jobDescription}
        </p>

        <div className="flex flex-wrap gap-2">
          {session.selectedInterviewers.map((interviewer) => {
            if (interviewer.type === "skill") {
              // Skill placeholder: show Skill name + generic icon, no empty display
              return (
                <span
                  key={`${session.id}-${interviewer.name}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getInterviewerColorClass("skill")}`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-400 text-[9px] font-bold text-white">
                    {getInterviewerInitials(interviewer)}
                  </span>
                  {interviewer.name}
                </span>
              );
            }
            return (
              <span
                key={`${session.id}-${interviewer.type}`}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getInterviewerColorClass(
                  interviewer.type,
                )}`}
              >
                {interviewer.name}
              </span>
            );
          })}
        </div>

        {session.reportOverallScore !== null && session.reportOverallScore !== undefined ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("interview.report.score")}
              </span>
              <span className="inline-flex items-center gap-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                <Trophy className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                {session.reportOverallScore}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("interview.lobby.roleCount", { count: totalRounds })}
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onRestart(session)}
          >
            <RotateCcw className="h-4 w-4" />
            {t("interview.actions.restart")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={() => onDelete(session)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t("interview.actions.deleting") : t("interview.actions.delete")}
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link
              to={isCompleted ? "/interview/$sessionId/report" : "/interview/$sessionId"}
              params={{ sessionId: session.id }}
            >
              {isCompleted ? t("interview.lobby.viewReport") : t("interview.lobby.resume")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
