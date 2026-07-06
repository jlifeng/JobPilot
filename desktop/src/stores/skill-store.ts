// Zustand store for the JobPilot Skill system.
//
// Holds the installed Skill list, default selections, and per-Skill variable
// values. Mirrors the established Zustand pattern in resume-store /
// app-update-store: actions call into the typed skill-api wrappers, never
// touching `invoke()` directly (per desktop-runtime-boundary.md and the
// "Direct `invoke()` calls in components" forbidden pattern).
//
// PR1 scope: load + cache + mutate state. The UI wiring (SkillSelector) is
// Phase 2/3; this store just makes the data available to those future
// components.

import { create } from "zustand";
import {
  deleteSkill as deleteSkillApi,
  getSkillSettings,
  listSkills,
  saveSkill as saveSkillApi,
  setDefaultSkillSelection as setDefaultSkillSelectionApi,
  type SetDefaultSkillSelectionInput,
} from "../lib/skill-api";
import type { Skill, SkillSettings } from "../types/skill";

interface SkillStore {
  skills: Skill[];
  defaultSelections: Record<string, string>;
  variableValues: Record<string, Record<string, string>>;
  settingsUpdatedAtEpochMs: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSkills: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSkill: (skill: Skill) => Promise<Skill | null>;
  removeSkill: (skillId: string) => Promise<boolean>;
  setDefaultSelection: (
    input: SetDefaultSkillSelectionInput,
  ) => Promise<SkillSettings | null>;
  setVariableValue: (skillId: string, key: string, value: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: [],
  defaultSelections: {},
  variableValues: {},
  settingsUpdatedAtEpochMs: 0,
  isLoading: false,
  isSaving: false,
  error: null,

  async loadSkills() {
    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const skills = await listSkills();
      set({ skills, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load skills.",
      });
    }
  },

  async loadSettings() {
    try {
      const settings = await getSkillSettings();
      set({
        defaultSelections: settings.defaultSelections,
        variableValues: settings.variableValues,
        settingsUpdatedAtEpochMs: settings.updatedAtEpochMs,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load skill settings.",
      });
    }
  },

  async saveSkill(skill) {
    if (get().isSaving) {
      return null;
    }
    set({ isSaving: true, error: null });
    try {
      const saved = await saveSkillApi(skill);
      // Merge the saved Skill back into the list (upsert by id).
      const existing = get().skills;
      const index = existing.findIndex((item) => item.id === saved.id);
      const next = index >= 0
        ? existing.map((item, i) => (i === index ? saved : item))
        : [...existing, saved];
      set({ skills: next, isSaving: false });
      return saved;
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "Failed to save skill.",
      });
      return null;
    }
  },

  async removeSkill(skillId) {
    set({ error: null });
    try {
      const removed = await deleteSkillApi(skillId);
      if (removed) {
        set({
          skills: get().skills.filter((item) => item.id !== skillId),
        });
      }
      return removed;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete skill.",
      });
      return false;
    }
  },

  async setDefaultSelection(input) {
    set({ error: null });
    try {
      const settings = await setDefaultSkillSelectionApi(input);
      set({
        defaultSelections: settings.defaultSelections,
        variableValues: settings.variableValues,
        settingsUpdatedAtEpochMs: settings.updatedAtEpochMs,
      });
      return settings;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to set default skill selection.",
      });
      return null;
    }
  },

  setVariableValue(skillId, key, value) {
    // Local optimistic update; persisted via saveSkill when a Skill defines
    // variables, or through a dedicated settings write in a later phase.
    set((state) => {
      const current = state.variableValues[skillId] ?? {};
      return {
        variableValues: {
          ...state.variableValues,
          [skillId]: { ...current, [key]: value },
        },
      };
    });
  },

  clearError() {
    set({ error: null });
  },

  reset() {
    set({
      skills: [],
      defaultSelections: {},
      variableValues: {},
      settingsUpdatedAtEpochMs: 0,
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));
