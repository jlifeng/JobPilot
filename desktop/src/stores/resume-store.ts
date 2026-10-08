import { create } from "zustand";
import { saveDocument } from "../lib/desktop-api";
import { useEditorStore } from "./editor-store";
import { normalizeSectionContentForRender } from "@/lib/section-content";
import type {
  Resume,
  ResumeSection,
  SectionContent,
  ThemeConfig,
} from "../types/resume";

const AUTOSAVE_DELAY = 500;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Strip render-only metadata (the auto-fetched GitHub primary language) as soon
 * as stored sections enter the store, so the in-memory snapshot cannot write it
 * back to SQLite on the next autosave.
 */
function normalizeSectionContent(section: ResumeSection): SectionContent {
  return normalizeSectionContentForRender(
    section.type,
    section.content,
  ) as unknown as SectionContent;
}

type StoreSet = (
  partial:
    | Partial<ResumeStore>
    | ((state: ResumeStore) => Partial<ResumeStore>),
) => void;
type StoreGet = () => ResumeStore;

/**
 * Shared write path for `save()` and `forceSave()`. Reads the latest snapshot
 * from the store at call time so keystrokes that landed between the trigger
 * (autosave timer / submit boundary) and this flush are captured. Both
 * `save()` and `forceSave()` funnel through here; the caller is responsible
 * for the `isDirty` early-return policy — `save()` honors it, `forceSave()`
 * skips it so submit boundaries never lose unsaved drafts to AI tool reloads.
 */
async function persistResume(
  get: StoreGet,
  set: StoreSet,
): Promise<void> {
  const { currentResume, sections } = get();
  if (!currentResume) return;

  set({ isSaving: true });
  try {
    await saveDocument({
      id: currentResume.id,
      title: currentResume.title,
      template: currentResume.template,
      language: currentResume.language,
      themeJson: JSON.stringify(currentResume.themeConfig),
      targetJobTitle: currentResume.targetJobTitle,
      targetCompany: currentResume.targetCompany,
      sections: sections.map((section) => ({
        id: section.id,
        documentId: section.resumeId || currentResume.id,
        sectionType: section.type,
        title: section.title,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content as unknown as Record<string, unknown>,
        createdAtEpochMs: typeof section.createdAt === "string"
          ? new Date(section.createdAt).getTime()
          : Date.now(),
        updatedAtEpochMs: typeof section.updatedAt === "string"
          ? new Date(section.updatedAt).getTime()
          : Date.now(),
      })),
    });

    set({ isDirty: false });
  } catch (error) {
    console.error("Failed to save resume:", error);
  } finally {
    set({ isSaving: false });
  }
}

interface ResumeStore {
  currentResume: Resume | null;
  sections: ResumeSection[];
  isDirty: boolean;
  isSaving: boolean;
  _saveTimeout: ReturnType<typeof setTimeout> | null;

  setResume: (resume: Resume) => void;
  updateSection: (sectionId: string, content: Partial<SectionContent>) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  addSection: (section: ResumeSection) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sections: ResumeSection[]) => void;
  restoreSections: (sections: ResumeSection[]) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setTemplate: (template: string) => void;
  setTitle: (title: string) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  save: () => Promise<void>;
  /**
   * Force-flush the current in-memory resume to desktop storage, bypassing
   * the `isDirty` early-return inside `save()`. Use this at submit boundaries
   * (e.g. before kicking off an AI prompt stream) where stale SQLite state
   * would otherwise cause the AI tool to read / overwrite the user's unsaved
   * draft. Clears any pending autosave timer first so the two cannot race.
   */
  forceSave: () => Promise<void>;
  _captureSnapshot: () => void;
  _scheduleSave: () => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  currentResume: null,
  sections: [],
  isDirty: false,
  isSaving: false,
  _saveTimeout: null,

  _captureSnapshot: () => {
    const { sections } = get();
    useEditorStore.getState().pushUndo({
      sections: structuredClone(sections),
      timestamp: Date.now(),
    });
  },

  restoreSections: (sections) => {
    set((state) => ({
      sections,
      currentResume: state.currentResume
        ? { ...state.currentResume, sections }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  setResume: (resume) => {
    // Cancel any pending autosave to prevent stale data overwriting
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    const sections = resume.sections.map((s, i) => ({
      ...s,
      sortOrder: s.sortOrder ?? i,
      content: normalizeSectionContent(s),
    }));

    set({
      currentResume: { ...resume, sections },
      sections,
      isDirty: false,
      _saveTimeout: null,
    });
  },

  updateSection: (sectionId, content) => {
    get()._captureSnapshot();
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              content: {
                ...(typeof s.content === "object" && s.content !== null
                  ? (s.content as unknown as Record<string, unknown>)
                  : {}),
                ...(typeof content === "object" && content !== null
                  ? (content as unknown as Record<string, unknown>)
                  : {}),
              } as unknown as SectionContent,
            }
          : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? { ...state.currentResume, sections }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  updateSectionTitle: (sectionId, title) => {
    get()._captureSnapshot();
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? { ...state.currentResume, sections }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  addSection: (section) => {
    get()._captureSnapshot();
    set((state) => {
      const sections = [...state.sections, section];
      return {
        sections,
        currentResume: state.currentResume
          ? { ...state.currentResume, sections }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  removeSection: (sectionId) => {
    get()._captureSnapshot();
    set((state) => {
      const sections = state.sections.filter((s) => s.id !== sectionId);
      return {
        sections,
        currentResume: state.currentResume
          ? { ...state.currentResume, sections }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  reorderSections: (sections) => {
    get()._captureSnapshot();
    set((state) => ({
      sections,
      currentResume: state.currentResume
        ? { ...state.currentResume, sections }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  toggleSectionVisibility: (sectionId) => {
    get()._captureSnapshot();
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? { ...state.currentResume, sections }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  setTemplate: (template) => {
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, template }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  setTitle: (title) => {
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, title }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  updateTheme: (theme) => {
    set((state) => ({
      currentResume: state.currentResume
        ? {
            ...state.currentResume,
            themeConfig: { ...state.currentResume.themeConfig, ...theme },
          }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  save: async () => {
    const { currentResume, isDirty } = get();
    if (!currentResume || !isDirty) return;
    await persistResume(get, set);
  },

  forceSave: async () => {
    const { currentResume, _saveTimeout } = get();
    // Cancel any pending autosave so it cannot race this flush.
    if (_saveTimeout) {
      clearTimeout(_saveTimeout);
      set({ _saveTimeout: null });
    }
    if (!currentResume) return;
    await persistResume(get, set);
  },

  _scheduleSave: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    const timeout = setTimeout(() => {
      get().save();
    }, AUTOSAVE_DELAY);

    set({ _saveTimeout: timeout });
  },

  reset: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);
    set({
      currentResume: null,
      sections: [],
      isDirty: false,
      isSaving: false,
      _saveTimeout: null,
    });
  },
}));

export { generateId };
