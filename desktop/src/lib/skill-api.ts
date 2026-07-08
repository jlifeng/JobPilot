// Typed Tauri invoke wrappers for the Skill system.
//
// Mirrors the Rust commands registered in desktop/src-tauri/src/lib.rs. We
// reuse the `invokeWithFallback` pattern from desktop-api.ts so browser-only
// preview (no Tauri runtime) keeps working — read commands fall back to
// empty/default values, write commands surface errors explicitly.
//
// IMPORTANT: components should never call `invoke()` directly. Always go
// through this module (per .trellis/spec/guides/desktop-runtime-boundary.md
// and the "Direct `invoke()` calls in components" forbidden pattern).

import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Skill, SkillPackagePreview, SkillSettings } from "../types/skill";

const FALLBACK_SKILLS: Skill[] = [];
const FALLBACK_SKILL_SETTINGS: SkillSettings = {
  defaultSelections: {},
  variableValues: {},
  updatedAtEpochMs: 0,
};

function reportDesktopFallback(command: string, error: unknown): void {
  console.warn(`[skill-api] Falling back for ${command}.`, error);
}

async function invokeWithFallback<T>(
  command: string,
  fallback: T,
  payload?: Record<string, unknown>,
): Promise<T> {
  try {
    return payload ? await invoke<T>(command, payload) : await invoke<T>(command);
  } catch (error) {
    reportDesktopFallback(command, error);
    return fallback;
  }
}

export async function listSkills(): Promise<Skill[]> {
  return invokeWithFallback<Skill[]>("list_skills", FALLBACK_SKILLS);
}

export async function getSkill(skillId: string): Promise<Skill | null> {
  return invokeWithFallback<Skill | null>("get_skill", null, { skillId });
}

export async function saveSkill(skill: Skill): Promise<Skill> {
  if (!isTauri()) {
    throw new Error("saveSkill requires the desktop runtime");
  }
  return invoke<Skill>("save_skill", { skill });
}

export async function deleteSkill(skillId: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error("deleteSkill requires the desktop runtime");
  }
  return invoke<boolean>("delete_skill", { skillId });
}

export async function getSkillSettings(): Promise<SkillSettings> {
  return invokeWithFallback<SkillSettings>("get_skill_settings", FALLBACK_SKILL_SETTINGS);
}

export interface SetDefaultSkillSelectionInput {
  scenarioId: string;
  selection?: string | null;
}

export async function setDefaultSkillSelection(
  input: SetDefaultSkillSelectionInput,
): Promise<SkillSettings> {
  if (!isTauri()) {
    throw new Error("setDefaultSkillSelection requires the desktop runtime");
  }
  return invoke<SkillSettings>("set_default_skill_selection", { input });
}

// =====================================================
// Phase 4: Skill package import (zip 解包预览 + 确认入库)
// =====================================================

/**
 * 解析 `.skill` zip 包，返回预览结构（不落库）。
 *
 * 调用方拿到预览后展示弹窗，用户确认后再调 confirmImportSkillPackage 入库。
 * invoke 参数名 filePath 与 Rust 的 file_path（camelCase via Tauri）对应。
 */
export async function importSkillPackage(
  filePath: string,
): Promise<SkillPackagePreview> {
  if (!isTauri()) {
    throw new Error("importSkillPackage requires the desktop runtime");
  }
  return invoke<SkillPackagePreview>("import_skill_package", { filePath });
}

/**
 * 预览确认后真正入库（upsert）。
 *
 * 若 useNewId 非空，覆盖 skill.id（用户选"作为新 id 导入"时前端传新 id）。
 * invoke 参数名 skill / useNewId 与 Rust 的 skill / use_new_id（camelCase via Tauri）对应。
 */
export async function confirmImportSkillPackage(
  skill: Skill,
  useNewId?: string,
): Promise<Skill> {
  if (!isTauri()) {
    throw new Error("confirmImportSkillPackage requires the desktop runtime");
  }
  return invoke<Skill>("confirm_import_skill_package", {
    skill,
    useNewId: useNewId ?? null,
  });
}
