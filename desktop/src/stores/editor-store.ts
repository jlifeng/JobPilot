import { create } from 'zustand';
import type { ResumeSection } from '../types/resume';

const MAX_UNDO_STACK = 50;

export interface ResumeSnapshot {
  sections: ResumeSection[];
  timestamp: number;
}

interface EditorStore {
  selectedSectionId: string | null;
  collapsedSectionIds: string[];
  showThemeEditor: boolean;
  showPreview: boolean;
  showAiChat: boolean;
  aiChatInitialPrompt: string | null;
  isSectionSidebarCollapsed: boolean;
  isDragging: boolean;
  undoStack: ResumeSnapshot[];
  redoStack: ResumeSnapshot[];

  selectSection: (id: string | null) => void;
  toggleSectionCollapsed: (id: string) => void;
  expandSection: (id: string) => void;
  setCollapsedSections: (ids: string[]) => void;
  toggleThemeEditor: () => void;
  togglePreview: () => void;
  toggleSectionSidebar: () => void;
  setSectionSidebarCollapsed: (collapsed: boolean) => void;
  setDragging: (dragging: boolean) => void;
  pushUndo: (snapshot: ResumeSnapshot) => void;
  undo: () => ResumeSnapshot | null;
  redo: () => ResumeSnapshot | null;
  reset: () => void;
  toggleAiChat: (initialPrompt?: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  selectedSectionId: null,
  collapsedSectionIds: [],
  showThemeEditor: false,
  showPreview: true,
  showAiChat: false,
  aiChatInitialPrompt: null,
  isSectionSidebarCollapsed: true,
  isDragging: false,
  undoStack: [],
  redoStack: [],

  selectSection: (id) => set({ selectedSectionId: id }),

  toggleSectionCollapsed: (id) =>
    set((state) => ({
      collapsedSectionIds: state.collapsedSectionIds.includes(id)
        ? state.collapsedSectionIds.filter((sectionId) => sectionId !== id)
        : [...state.collapsedSectionIds, id],
    })),

  expandSection: (id) =>
    set((state) => ({
      collapsedSectionIds: state.collapsedSectionIds.filter(
        (sectionId) => sectionId !== id,
      ),
    })),

  setCollapsedSections: (ids) =>
    set({ collapsedSectionIds: [...new Set(ids)] }),

  toggleThemeEditor: () => set((state) => ({ showThemeEditor: !state.showThemeEditor })),

  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),

  toggleSectionSidebar: () =>
    set((state) => ({
      isSectionSidebarCollapsed: !state.isSectionSidebarCollapsed,
    })),

  setSectionSidebarCollapsed: (collapsed) =>
    set({ isSectionSidebarCollapsed: collapsed }),

  toggleAiChat: (initialPrompt) =>
    set((state) => ({
      showAiChat: !state.showAiChat,
      aiChatInitialPrompt: !state.showAiChat ? initialPrompt || null : null,
    })),

  setDragging: (dragging) => set({ isDragging: dragging }),

  pushUndo: (snapshot) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;

    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({
      undoStack: newUndoStack,
      redoStack: [...redoStack, previous],
    });

    // Return the previous snapshot; caller restores sections from it.
    // If this was the last entry, "previous" IS the state to restore to.
    return previous;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;

    const snapshot = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, snapshot],
    }));

    return snapshot;
  },

  reset: () =>
    set({
      selectedSectionId: null,
      collapsedSectionIds: [],
      showThemeEditor: false,
      showPreview: true,
      isSectionSidebarCollapsed: true,
      isDragging: false,
      undoStack: [],
      redoStack: [],
    }),
}));
