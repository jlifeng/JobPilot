// JobPilot SkillRuntime — pure rule-driven matching + prompt assembly engine.
//
// Implements docs §四. No AI calls happen here; the only AI invocation is the
// final LLM call in each scenario, which receives the assembled prompt.
//
// Scoring formula (docs §四 4.2):
//   场景精确匹配(100) + 分类匹配(50) + 关键词匹配(10/个)
//   - 未满足的上下文需求(20/个)
// Only candidates with score > 0 are returned.

import type {
  AIScenario,
  AvailableCapability,
  Skill,
  SkillCapability,
  SkillCapabilityMatchOn,
  SkillReference,
  SkillRuntimeContext,
} from "../types/skill";
import { getScenario } from "./skill-scenarios";

export interface CapabilityLookup {
  capability: SkillCapability;
  skill: Skill;
}

export class SkillRuntime {
  constructor(private readonly skills: Skill[] = []) {}

  /** Update the runtime's installed-Skill set. Returns a new instance. */
  withSkills(skills: Skill[]): SkillRuntime {
    return new SkillRuntime(skills);
  }

  /**
   * Return all capabilities whose matchOn.scenarios includes the given
   * scenario. Disabled Skills are excluded entirely.
   */
  getCapabilitiesForScenario(scenarioId: string): AvailableCapability[] {
    const out: AvailableCapability[] = [];
    for (const skill of this.skills) {
      if (!skill.enabled) {
        continue;
      }
      for (const capability of skill.capabilities) {
        if (this.matchesScenario(capability.matchOn, scenarioId)) {
          out.push({
            skillId: skill.id,
            skillName: skill.name,
            capabilityId: capability.id,
            capabilityName: capability.name,
            capabilityDescription: capability.description,
            skillIcon: skill.icon,
          });
        }
      }
    }
    return out;
  }

  /** Precise lookup by (skillId, capabilityId). */
  getCapability(skillId: string, capabilityId: string): CapabilityLookup | null {
    for (const skill of this.skills) {
      if (skill.id !== skillId) {
        continue;
      }
      const capability = skill.capabilities.find((c) => c.id === capabilityId);
      if (capability) {
        return { capability, skill };
      }
    }
    return null;
  }

  /**
   * Score every enabled capability against the scenario + user input and
   * return the highest-scoring candidate (if any scores > 0).
   *
   * Context penalties are derived from the active scenario's declared
   * `providesContext` list — a capability's requiredContext entries that the
   * scenario can't satisfy each subtract 20 points.
   */
  findMatchingCapability(
    scenarioId: string,
    userInput: string,
  ): (AvailableCapability & CapabilityLookup) | null {
    const scenario = getScenario(scenarioId);
    let best: (AvailableCapability & CapabilityLookup) | null = null;
    let bestScore = 0;

    for (const skill of this.skills) {
      if (!skill.enabled) {
        continue;
      }
      for (const capability of skill.capabilities) {
        const score = this.scoreCapability(capability, skill, scenarioId, scenario, userInput);
        if (score <= 0) {
          continue;
        }
        if (score > bestScore) {
          bestScore = score;
          best = {
            skillId: skill.id,
            skillName: skill.name,
            capabilityId: capability.id,
            capabilityName: capability.name,
            capabilityDescription: capability.description,
            skillIcon: skill.icon,
            capability,
            skill,
          };
        }
      }
    }

    return best;
  }

  /**
   * Build the final systemPrompt (docs §四 4.3):
   *   1. Take capability.prompt as the base
   *   2. Interpolate {{variable}} placeholders with actual values
   *   3. Conditionally load references (whenScenario / whenVariable match
   *      or no condition)
   *   4. Append resumeContent / jdContent to the end
   *
   * Variable interpolation is pure string replacement — no code execution.
   */
  buildSystemPrompt(
    scenarioId: string,
    capability: SkillCapability,
    skill: Skill,
    context: SkillRuntimeContext = {},
  ): string {
    const variables = context.variables ?? {};
    const interpolated = this.interpolateVariables(capability.prompt, variables);
    const referenceBlocks: string[] = [];

    for (const reference of skill.references) {
      if (this.shouldLoadReference(reference, scenarioId, variables)) {
        referenceBlocks.push(this.formatReference(reference));
      }
    }

    const contextBlocks: string[] = [];
    if (context.resumeContent && context.resumeContent.trim().length > 0) {
      contextBlocks.push(`--- 简历内容 ---\n${context.resumeContent.trim()}`);
    }
    if (context.jdContent && context.jdContent.trim().length > 0) {
      contextBlocks.push(`--- 岗位描述 ---\n${context.jdContent.trim()}`);
    }

    const sections = [interpolated, ...referenceBlocks, ...contextBlocks];
    return sections.filter((s) => s.trim().length > 0).join("\n\n");
  }

  // ----- internal helpers -----

  private matchesScenario(matchOn: SkillCapabilityMatchOn, scenarioId: string): boolean {
    return matchOn.scenarios.includes(scenarioId);
  }

  private scoreCapability(
    capability: SkillCapability,
    skill: Skill,
    scenarioId: string,
    scenario: AIScenario | undefined,
    userInput: string,
  ): number {
    const matchOn = capability.matchOn;
    let score = 0;

    if (matchOn.scenarios.includes(scenarioId)) {
      score += 100;
    }

    const categories = matchOn.categories ?? [];
    if (categories.length > 0 && scenario && categories.includes(scenarioId)) {
      score += 50;
    }

    const keywords = matchOn.keywords ?? [];
    if (keywords.length > 0 && userInput.trim().length > 0) {
      const lowerInput = userInput.toLowerCase();
      for (const keyword of keywords) {
        const trimmed = keyword.trim().toLowerCase();
        if (trimmed.length > 0 && lowerInput.includes(trimmed)) {
          score += 10;
        }
      }
    }

    // Penalize unmet context requirements declared by the Skill.
    // `providesContext` lists what the scenario already supplies, so any
    // required entry missing from that set subtracts 20 points.
    const provided = new Set(scenario?.providesContext ?? []);
    for (const requirement of skill.requiredContext) {
      if (requirement.required && !provided.has(requirement.type)) {
        score -= 20;
      }
    }

    return score;
  }

  private shouldLoadReference(
    reference: SkillReference,
    scenarioId: string,
    variables: Record<string, string>,
  ): boolean {
    // A reference with no condition is always loaded.
    const hasScenarioCondition = typeof reference.whenScenario === "string"
      && reference.whenScenario.trim().length > 0;
    const hasVariableCondition = typeof reference.whenVariable === "string"
      && reference.whenVariable.trim().length > 0;

    if (!hasScenarioCondition && !hasVariableCondition) {
      return true;
    }

    // whenScenario matches the active scenario → load.
    if (hasScenarioCondition && reference.whenScenario === scenarioId) {
      return true;
    }

    // whenVariable matches the active variable value → load.
    // Format: "key=value" (case-insensitive on value).
    if (hasVariableCondition) {
      const condition = reference.whenVariable ?? "";
      const eqIndex = condition.indexOf("=");
      if (eqIndex > 0) {
        const key = condition.slice(0, eqIndex).trim();
        const expected = condition.slice(eqIndex + 1).trim().toLowerCase();
        const actual = (variables[key] ?? "").trim().toLowerCase();
        if (expected.length > 0 && actual === expected) {
          return true;
        }
      }
    }

    return false;
  }

  private formatReference(reference: SkillReference): string {
    const header = `--- ${reference.label} (${reference.filename}) ---`;
    return `${header}\n${reference.content.trim()}`;
  }

  private interpolateVariables(prompt: string, variables: Record<string, string>): string {
    if (Object.keys(variables).length === 0) {
      return prompt;
    }
    // Replace {{key}} (any whitespace inside braces). Unknown keys are left
    // as-is so missing values are visible in the prompt rather than silently
    // dropped.
    return prompt.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
      const value = variables[key];
      return value !== undefined && value !== null ? value : match;
    });
  }
}
