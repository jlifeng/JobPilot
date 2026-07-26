import { describe, expect, it } from "vitest";
import { normalizeInterviewMessageMetadata } from "../desktop-api";
import { getScenario } from "../skill-scenarios";

describe("normalizeInterviewMessageMetadata", () => {
  it("normalizes a persisted suggested answer", () => {
    const metadata = normalizeInterviewMessageMetadata({
      answerEvaluation: {
        overallScore: 82,
        summary: "Clear answer",
        dimensions: [],
        strengths: [],
        riskPoints: [],
        trainingSuggestions: [],
      },
      suggestedAnswer: {
        outline: ["  Set the context  ", ""],
        keyPoints: ["Use the 30% result"],
        improvements: ["Clarify ownership"],
        referenceAnswer: "  I improved reliability by adding monitoring.  ",
        generatedAtEpochMs: 1234,
      },
    });

    expect(metadata.suggestedAnswer).toEqual({
      outline: ["Set the context"],
      keyPoints: ["Use the 30% result"],
      improvements: ["Clarify ownership"],
      referenceAnswer: "I improved reliability by adding monitoring.",
      generatedAtEpochMs: 1234,
    });
  });

  it.each([undefined, null, {}, { referenceAnswer: "   " }])(
    "drops a missing or malformed suggested answer: %j",
    (suggestedAnswer) => {
      expect(
        normalizeInterviewMessageMetadata({ suggestedAnswer }).suggestedAnswer,
      ).toBeUndefined();
    },
  );
});

describe("interview suggested answer Skill scenario", () => {
  it("registers the structured generation context", () => {
    expect(getScenario("interview-suggested-answer")).toMatchObject({
      providesContext: ["resume", "jd", "interview_answer", "interview_transcript"],
      availableTools: [],
      expectedOutput: "json",
    });
  });
});
