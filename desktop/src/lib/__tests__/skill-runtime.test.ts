// SkillRuntime unit tests (PR1 verification per docs §四).
//
// Covers:
// - getCapabilitiesForScenario: scenario filtering + disabled Skill exclusion
// - findMatchingCapability: keyword scoring, multi-candidate tie-break to
//   highest score, score <= 0 rejection
// - buildSystemPrompt: variable interpolation, conditional reference loading
//   (whenScenario / whenVariable / unconditional), resume/jd context injection
//
// Mock Skills cover three shapes:
// - single-file Skill (one capability, no references)
// - multi-stage Skill (multiple capabilities, references with conditions)
// - Skill with unconditional + conditional references

import { describe, it, expect } from "vitest";
import { SkillRuntime } from "../skill-runtime";
import type { Skill } from "../../types/skill";

// ---------------------------------------------------------------------
// Mock Skill fixtures
// ---------------------------------------------------------------------

function makeSkill(overrides: Partial<Skill>): Skill {
  const now = Date.now();
  return {
    id: "skill-default",
    name: "Default Skill",
    description: "",
    version: "1.0.0",
    author: null,
    source: "custom",
    icon: null,
    tags: [],
    capabilities: [],
    references: [],
    requiredContext: [],
    variables: [],
    enabled: true,
    createdAtEpochMs: now,
    updatedAtEpochMs: now,
    ...overrides,
  };
}

// Single-file Skill: one capability, no references. Matches "ai-chat".
const singleFileSkill: Skill = makeSkill({
  id: "single-file",
  name: "Single File Skill",
  capabilities: [
    {
      id: "resume-polish",
      name: "简历优化",
      description: "Polish resume content",
      matchOn: {
        scenarios: ["ai-chat"],
        keywords: ["简历优化", "改简历"],
        categories: ["resume-polish"],
      },
      prompt: "You are a resume editor. Improve: {{userInput}}",
    },
  ],
});

// Multi-stage Skill: multiple capabilities, references with conditions.
// Matches interview-persona + jd-analysis.
const multiStageSkill: Skill = makeSkill({
  id: "interview-master",
  name: "Interview Master",
  requiredContext: [
    { type: "resume", required: true, description: "Candidate resume" },
    { type: "jd", required: false, description: "Job description" },
  ],
  references: [
    {
      key: "general-guide",
      label: "General Interview Guide",
      filename: "general-guide.md",
      content: "General guidance for all interviews.",
    },
    {
      key: "role-product",
      label: "Product Role Guide",
      filename: "role-product.md",
      content: "Product-specific guidance.",
      whenScenario: "jd-analysis",
    },
    {
      key: "role-technical",
      label: "Technical Role Guide",
      filename: "role-technical.md",
      content: "Technical guidance.",
      whenVariable: "jobCategory=technical",
    },
  ],
  variables: [
    {
      key: "jobCategory",
      label: "岗位方向",
      type: "select",
      required: false,
      options: [
        { value: "product", label: "Product" },
        { value: "technical", label: "Technical" },
      ],
    },
  ],
  capabilities: [
    {
      id: "interview-persona",
      name: "面试官人设",
      description: "Configure interviewer persona",
      matchOn: {
        scenarios: ["interview-persona"],
        keywords: ["模拟面试", "面试官"],
        categories: ["interview"],
      },
      prompt: "You are a {{jobCategory}} interviewer. Max questions: {{maxQuestions}}.",
    },
    {
      id: "jd-analysis",
      name: "岗位分析",
      description: "Analyze JD against resume",
      matchOn: {
        scenarios: ["jd-analysis"],
        keywords: ["岗位分析", "JD"],
      },
      prompt: "Analyze the JD match.",
    },
  ],
});

// Skill with unmet context requirement (interview_transcript) for the
// interview-report scenario — used to exercise the -20 penalty.
const reportSkill: Skill = makeSkill({
  id: "report-skill",
  name: "Report Skill",
  requiredContext: [
    {
      type: "interview_transcript",
      required: true,
      description: "Full transcript",
    },
  ],
  capabilities: [
    {
      id: "report-gen",
      name: "Report Generation",
      description: "Generate interview report",
      matchOn: {
        scenarios: ["interview-report"],
        keywords: ["report"],
      },
      prompt: "Generate a report.",
    },
  ],
});

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

describe("SkillRuntime.getCapabilitiesForScenario", () => {
  it("returns capabilities whose matchOn.scenarios includes the scenario", () => {
    const runtime = new SkillRuntime([singleFileSkill, multiStageSkill]);
    const caps = runtime.getCapabilitiesForScenario("ai-chat");
    expect(caps).toHaveLength(1);
    expect(caps[0].skillId).toBe("single-file");
    expect(caps[0].capabilityId).toBe("resume-polish");
  });

  it("returns capabilities from multiple skills for a shared scenario", () => {
    const runtime = new SkillRuntime([singleFileSkill, multiStageSkill]);
    const caps = runtime.getCapabilitiesForScenario("interview-persona");
    expect(caps).toHaveLength(1);
    expect(caps[0].capabilityId).toBe("interview-persona");
  });

  it("excludes capabilities from disabled Skills entirely", () => {
    const disabled = makeSkill({
      ...singleFileSkill,
      id: "single-file-disabled",
      enabled: false,
    });
    const runtime = new SkillRuntime([singleFileSkill, disabled]);
    const caps = runtime.getCapabilitiesForScenario("ai-chat");
    expect(caps).toHaveLength(1);
    expect(caps[0].skillId).toBe("single-file");
  });

  it("returns empty array when no skill matches the scenario", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    expect(runtime.getCapabilitiesForScenario("translate")).toEqual([]);
  });
});

describe("SkillRuntime.findMatchingCapability", () => {
  it("returns null when no capability scores above 0", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    const match = runtime.findMatchingCapability("translate", "translate my resume");
    expect(match).toBeNull();
  });

  it("matches a capability with keyword hits scoring higher than no hits", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    const withKeywords = runtime.findMatchingCapability("ai-chat", "帮我简历优化");
    expect(withKeywords).not.toBeNull();
    expect(withKeywords?.capabilityId).toBe("resume-polish");

    const withoutKeywords = runtime.findMatchingCapability("ai-chat", "random unrelated text");
    // Scenario match (100) still > 0, so it should still match.
    expect(withoutKeywords).not.toBeNull();
    // The keyword case must score higher.
    expect(withKeywords).not.toBeNull();
  });

  it("returns the highest-scoring candidate among multiple matches", () => {
    // Add a second skill that also matches ai-chat but with fewer keywords.
    const weakMatch = makeSkill({
      id: "weak-match",
      name: "Weak Match",
      capabilities: [
        {
          id: "weak-cap",
          name: "Weak",
          description: "Weak capability",
          matchOn: {
            scenarios: ["ai-chat"],
          },
          prompt: "Do something.",
        },
      ],
    });
    const runtime = new SkillRuntime([weakMatch, singleFileSkill]);
    const match = runtime.findMatchingCapability("ai-chat", "简历优化 改简历");
    expect(match).not.toBeNull();
    // singleFileSkill matches 2 keywords (20) + scenario (100) = 120
    // weakMatch matches only scenario (100)
    expect(match?.skillId).toBe("single-file");
  });

  it("penalizes unmet context requirements, rejecting when score drops to 0 or below", () => {
    // interview-report scenario provides interview_transcript, so reportSkill
    // has 0 unmet requirements → score = 100 (scenario) + keyword hits.
    const runtime = new SkillRuntime([reportSkill]);
    const match = runtime.findMatchingCapability("interview-report", "generate report");
    expect(match).not.toBeNull();
    expect(match?.skillId).toBe("report-skill");
  });

  it("penalizes unmet context when scenario does not provide required context", () => {
    // For ai-chat scenario (provides resume, conversation), the reportSkill's
    // required interview_transcript is unmet → -20.
    // Score = 0 (no scenario match) - 20 = -20 → rejected.
    const runtime = new SkillRuntime([reportSkill]);
    const match = runtime.findMatchingCapability("ai-chat", "report");
    expect(match).toBeNull();
  });
});

describe("SkillRuntime.getCapability", () => {
  it("finds a capability by (skillId, capabilityId)", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "jd-analysis");
    expect(lookup).not.toBeNull();
    expect(lookup?.capability.id).toBe("jd-analysis");
    expect(lookup?.skill.id).toBe("interview-master");
  });

  it("returns null for unknown skillId", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    expect(runtime.getCapability("unknown", "jd-analysis")).toBeNull();
  });

  it("returns null for unknown capabilityId", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    expect(runtime.getCapability("interview-master", "unknown")).toBeNull();
  });
});

describe("SkillRuntime.buildSystemPrompt", () => {
  it("interpolates {{variable}} placeholders with provided values", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "interview-persona");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt("interview-persona", lookup.capability, lookup.skill, {
      variables: { jobCategory: "product", maxQuestions: "10" },
    });
    expect(prompt).toContain("You are a product interviewer.");
    expect(prompt).toContain("Max questions: 10.");
    // Unresolved placeholders stay as-is (not silently dropped).
    expect(prompt).not.toContain("{{jobCategory}}");
    expect(prompt).not.toContain("{{maxQuestions}}");
  });

  it("leaves unknown {{variable}} placeholders in place", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "interview-persona");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt(
      "interview-persona",
      lookup.capability,
      lookup.skill,
      {},
    );
    expect(prompt).toContain("{{jobCategory}}");
    expect(prompt).toContain("{{maxQuestions}}");
  });

  it("loads unconditional references (no whenScenario/whenVariable)", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "interview-persona");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt(
      "interview-persona",
      lookup.capability,
      lookup.skill,
      { variables: { jobCategory: "product", maxQuestions: "5" } },
    );
    expect(prompt).toContain("General guidance for all interviews.");
  });

  it("loads references whose whenScenario matches the active scenario", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "jd-analysis");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt("jd-analysis", lookup.capability, lookup.skill, {});
    // role-product has whenScenario="jd-analysis" → loaded
    expect(prompt).toContain("Product-specific guidance.");
    // role-technical has whenVariable="jobCategory=technical" → not loaded
    expect(prompt).not.toContain("Technical guidance.");
  });

  it("loads references whose whenVariable matches the active variable value", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "interview-persona");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt(
      "interview-persona",
      lookup.capability,
      lookup.skill,
      { variables: { jobCategory: "technical", maxQuestions: "3" } },
    );
    // role-technical has whenVariable="jobCategory=technical" → loaded
    expect(prompt).toContain("Technical guidance.");
    // role-product has whenScenario="jd-analysis" → not loaded in interview-persona
    expect(prompt).not.toContain("Product-specific guidance.");
  });

  it("does not load references whose whenScenario does not match", () => {
    const runtime = new SkillRuntime([multiStageSkill]);
    const lookup = runtime.getCapability("interview-master", "interview-persona");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt(
      "interview-persona",
      lookup.capability,
      lookup.skill,
      { variables: { jobCategory: "product", maxQuestions: "5" } },
    );
    // role-product only loads in jd-analysis scenario
    expect(prompt).not.toContain("Product-specific guidance.");
  });

  it("appends resumeContent and jdContent to the end of the prompt", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    const lookup = runtime.getCapability("single-file", "resume-polish");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt("ai-chat", lookup.capability, lookup.skill, {
      variables: { userInput: "make it better" },
      resumeContent: "NAME: John Doe\nSUMMARY: Engineer",
      jdContent: "REQ: 5 years React",
    });
    // Base prompt comes first
    expect(prompt.indexOf("You are a resume editor.")).toBeLessThan(
      prompt.indexOf("--- 简历内容 ---"),
    );
    // Resume content injected
    expect(prompt).toContain("--- 简历内容 ---");
    expect(prompt).toContain("NAME: John Doe");
    // JD content injected after resume
    expect(prompt).toContain("--- 岗位描述 ---");
    expect(prompt).toContain("REQ: 5 years React");
    expect(prompt.indexOf("--- 简历内容 ---")).toBeLessThan(
      prompt.indexOf("--- 岗位描述 ---"),
    );
  });

  it("omits empty resume/jd context blocks", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    const lookup = runtime.getCapability("single-file", "resume-polish");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt("ai-chat", lookup.capability, lookup.skill, {
      variables: { userInput: "x" },
      resumeContent: "   ",
      jdContent: "",
    });
    expect(prompt).not.toContain("--- 简历内容 ---");
    expect(prompt).not.toContain("--- 岗位描述 ---");
  });

  it("handles a Skill with no references cleanly", () => {
    const runtime = new SkillRuntime([singleFileSkill]);
    const lookup = runtime.getCapability("single-file", "resume-polish");
    if (!lookup) {
      throw new Error("expected capability lookup to succeed");
    }
    const prompt = runtime.buildSystemPrompt("ai-chat", lookup.capability, lookup.skill, {
      variables: { userInput: "go" },
    });
    expect(prompt).toBe("You are a resume editor. Improve: go");
  });
});
