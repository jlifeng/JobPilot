// JobPilot Skill system — shared TypeScript types.
//
// These types mirror the Rust structs in desktop/src-tauri/src/skills.rs
// (both sides use camelCase via serde `rename_all`), and the design in
// docs/skill-system-implementation-plan.md §二.
//
// JSON-typed fields (capabilities, references, requiredContext, variables,
// tags) are serialized by Rust as serde_json::Value and parsed here into
// concrete interfaces so the renderer can work with strongly-typed data.

export type SkillSource = "builtin" | "imported" | "community" | "custom";

export interface SkillVariableOption {
  value: string;
  label: string;
}

export interface SkillVariable {
  key: string;
  label: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  defaultValue?: string;
  options?: SkillVariableOption[];
}

export type ContextRequirementType =
  | "resume"
  | "jd"
  | "conversation"
  | "interview_session"
  | "interview_answer"
  | "interview_transcript";

export interface ContextRequirement {
  type: ContextRequirementType;
  required: boolean;
  description: string;
}

export interface SkillCapabilityMatchOn {
  scenarios: string[];
  keywords?: string[];
  categories?: string[];
}

export interface SkillOutputDelimiters {
  start: string;
  end: string;
}

export interface SkillCapability {
  id: string;
  name: string;
  description: string;
  matchOn: SkillCapabilityMatchOn;
  /** System prompt content; supports `{{variable}}` interpolation. */
  prompt: string;
  outputFormat?: "text" | "json" | "stream";
  outputSchema?: Record<string, unknown>;
  outputDelimiters?: SkillOutputDelimiters;
  requiresTools?: string[];
}

export interface SkillReference {
  key: string;
  label: string;
  filename: string;
  content: string;
  /** Load this reference only when the active scenario matches. */
  whenScenario?: string;
  /** Load this reference only when the variable condition matches (e.g. "jobCategory=product"). */
  whenVariable?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string | null;
  source: SkillSource | string;
  icon?: string | null;
  tags: string[];
  capabilities: SkillCapability[];
  references: SkillReference[];
  requiredContext: ContextRequirement[];
  variables: SkillVariable[];
  enabled: boolean;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface SkillSettings {
  /** scenarioId -> "skillId:capabilityId" */
  defaultSelections: Record<string, string>;
  /** skillId -> { variableKey: value } */
  variableValues: Record<string, Record<string, string>>;
  updatedAtEpochMs: number;
}

// =====================================================
// Phase 4: Skill package import (zip 解包预览 + 冲突检测)
// =====================================================

/**
 * 冲突检测结果：skill.id 是否已存在于库，已存在时附带现有版本。
 *
 * 镜像 desktop/src-tauri/src/skills.rs 的 SkillConflict（camelCase via serde）。
 */
export interface SkillConflict {
  /** skill.id 是否已存在于库。 */
  hasConflict: boolean;
  /** 已存在时的版本（不存在时为 null）。 */
  existingVersion: string | null;
}

/**
 * 导入预览返回结构：解析出的 Skill（不入库的预览副本）+ references 数量 + 冲突检测结果。
 *
 * 镜像 desktop/src-tauri/src/skills.rs 的 SkillPackagePreview（camelCase via serde）。
 */
export interface SkillPackagePreview {
  /** 解析出的完整 Skill 结构（不入库的预览副本）。 */
  skill: Skill;
  /** 包内 references/*.md 文件数。 */
  referencesCount: number;
  /** 冲突检测结果（skill.id 是否已存在于库）。 */
  conflict: SkillConflict;
}

// =====================================================
// Scenario registry + runtime models (docs §三 / §四)
// =====================================================

export type ContextType = ContextRequirementType;

export interface AIScenario {
  id: string;
  name: string;
  description: string;
  providesContext: ContextType[];
  availableTools: string[];
  expectedOutput: "stream" | "json";
  /** PR1: placeholder. Phase 2/3 wires real prompt builders. */
  defaultSystemPrompt: string | (() => string);
}

export interface AvailableCapability {
  skillId: string;
  skillName: string;
  capabilityId: string;
  capabilityName: string;
  capabilityDescription: string;
  skillIcon?: string | null;
}

export interface SkillRuntimeContext {
  resumeContent?: string;
  jdContent?: string;
  variables?: Record<string, string>;
}
