export type InterviewerType =
  | "hr"
  | "technical"
  | "scenario"
  | "behavioral"
  | "project_deep_dive"
  | "leader";

export interface InterviewerConfig {
  type: InterviewerType;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  style: string;
  focusAreas: string[];
  systemPrompt: string;
  personality: string;
}

export type InterviewSessionStatus =
  | "preparing"
  | "in_progress"
  | "paused"
  | "completed";

export type InterviewRoundStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type InterviewMessageRole = "interviewer" | "candidate" | "system";

export interface InterviewAnswerEvaluationDimension {
  id: string;
  label: string;
  score: number;
  feedback: string;
}

export interface InterviewAnswerEvaluation {
  overallScore: number;
  summary: string;
  dimensions: InterviewAnswerEvaluationDimension[];
  strengths: string[];
  riskPoints: string[];
  followUpQuestion?: string | null;
  trainingSuggestions: string[];
}

export interface InterviewMessageMetadata {
  marked?: boolean;
  hinted?: boolean;
  skipped?: boolean;
  turnKind?: InterviewTurnKind;
  answerEvaluation?: InterviewAnswerEvaluation;
  answerEvaluationError?: string;
}

export interface InterviewMessage {
  id: string;
  roundId: string;
  role: InterviewMessageRole;
  content: string;
  metadata: InterviewMessageMetadata;
  createdAtEpochMs: number;
}

export interface InterviewRoundSummary {
  score?: number | null;
  feedback: string;
}

export interface InterviewRound {
  id: string;
  sessionId: string;
  interviewerType: InterviewerType;
  interviewerConfig: InterviewerConfig;
  sortOrder: number;
  status: InterviewRoundStatus;
  questionCount: number;
  maxQuestions: number;
  summary?: InterviewRoundSummary | null;
  messages: InterviewMessage[];
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  overallScore: number;
  summary: string;
  overallFeedback: string;
  improvementSuggestions: string[];
  weakPoints: InterviewWeakPoint[];
  trainingPlan: InterviewTrainingPlanItem[];
  createdAtEpochMs: number;
}

export interface InterviewWeakPoint {
  title: string;
  evidence: string;
  severity: "low" | "medium" | "high";
  trainingFocus: string;
}

export interface InterviewTrainingPlanItem {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  drills: string[];
}

export interface InterviewSession {
  id: string;
  resumeId?: string | null;
  resumeTitle?: string | null;
  jobDescription: string;
  jobTitle: string;
  selectedInterviewers: InterviewerConfig[];
  currentRound: number;
  status: InterviewSessionStatus;
  reportId?: string | null;
  reportOverallScore?: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface InterviewSessionDetail extends InterviewSession {
  rounds: InterviewRound[];
  report?: InterviewReport | null;
}

export interface CreateInterviewSessionInput {
  jobDescription: string;
  jobTitle: string;
  resumeId?: string | null;
  interviewers: InterviewerConfig[];
}

export type InterviewTurnKind = "start" | "answer" | "hint" | "skip" | "end_round";

export interface StartInterviewTurnStreamInput {
  sessionId: string;
  roundId: string;
  kind: InterviewTurnKind;
  locale: "zh" | "en";
  prompt?: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  requestId?: string;
}

export interface GenerateInterviewReportInput {
  sessionId: string;
  locale: "zh" | "en";
  provider?: string;
  model?: string;
  baseUrl?: string;
}

export interface UpdateInterviewMessageMetadataInput {
  messageId: string;
  marked?: boolean;
  hinted?: boolean;
  skipped?: boolean;
}
