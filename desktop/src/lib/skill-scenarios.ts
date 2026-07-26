// JobPilot AI scenario registry (docs §三 3.2).
//
// Each AI entrypoint registers its "需求画像" here so the SkillRuntime can
// bridge between Skills and concrete features. PR1 ships the registry with
// placeholder `defaultSystemPrompt` values; Phase 2/3 will wire the real
// prompt builders (buildResumeEditSystemPrompt, build_interview_system_prompt,
// etc.) into these slots.
//
// `providesContext` / `availableTools` / `expectedOutput` are filled per the
// implementation plan and must stay accurate — the runtime relies on them to
// filter capabilities and inject context.

import type { AIScenario } from "../types/skill";

export const AI_SCENARIOS: AIScenario[] = [
  {
    id: "ai-chat",
    name: "AI Resume Assistant",
    description: "Conversational resume editing with tool-assisted text patches.",
    providesContext: ["resume", "conversation"],
    availableTools: ["replaceResumeText", "updateResumeMetadata"],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "cover-letter",
    name: "Cover Letter Generation",
    description: "Generate a tailored cover letter from resume + JD.",
    providesContext: ["resume", "jd"],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "grammar-check",
    name: "Grammar Check",
    description: "Surface grammar issues in resume content.",
    providesContext: ["resume"],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "jd-analysis",
    name: "JD Match Analysis",
    description: "Score resume against a job description and surface gaps.",
    providesContext: ["resume", "jd"],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "translate",
    name: "Resume Translation",
    description: "Translate resume content between languages.",
    providesContext: ["resume"],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "generate-resume",
    name: "Resume Generation",
    description: "Generate resume sections from a template or prompt.",
    providesContext: [],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "interview-persona",
    name: "Mock Interview — Interviewer Persona",
    description: "Drive a mock interview round with a configured interviewer persona.",
    providesContext: ["resume", "jd", "interview_session"],
    availableTools: [],
    expectedOutput: "stream",
    defaultSystemPrompt: "",
  },
  {
    id: "interview-evaluation",
    name: "Interview Answer Evaluation",
    description: "Score a candidate answer and produce structured feedback.",
    providesContext: ["resume", "jd", "interview_answer"],
    availableTools: [],
    expectedOutput: "json",
    defaultSystemPrompt: "",
  },
  {
    id: "interview-suggested-answer",
    name: "Interview Suggested Answer",
    description: "Generate a grounded coaching structure and reference answer after an attempt.",
    providesContext: ["resume", "jd", "interview_answer", "interview_transcript"],
    availableTools: [],
    expectedOutput: "json",
    defaultSystemPrompt: "",
  },
  {
    id: "interview-report",
    name: "Interview Report",
    description: "Aggregate an interview transcript into a structured report.",
    providesContext: ["interview_transcript"],
    availableTools: [],
    expectedOutput: "json",
    defaultSystemPrompt: "",
  },
];

const SCENARIO_INDEX: ReadonlyMap<string, AIScenario> = new Map(
  AI_SCENARIOS.map((scenario) => [scenario.id, scenario]),
);

export function getScenario(scenarioId: string): AIScenario | undefined {
  return SCENARIO_INDEX.get(scenarioId);
}

export function listScenarios(): AIScenario[] {
  return AI_SCENARIOS;
}
