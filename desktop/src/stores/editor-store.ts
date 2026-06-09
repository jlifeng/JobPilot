import { create } from 'zustand';
import type { ResumeSection } from '../types/resume';

const MAX_UNDO_STACK = 50;

export interface ResumeSnapshot {
  sections: ResumeSection[];
  timestamp: number;
}

interface EditorStore {
  selectedSectionId: string | null;
  showThemeEditor: boolean;
  showAiChat: boolean;
  isSectionSidebarCollapsed: boolean;
  isDragging: boolean;
  undoStack: ResumeSnapshot[];
  redoStack: ResumeSnapshot[];

  selectSection: (id: string | null) => void;
  toggleThemeEditor: () => void;
  toggleSectionSidebar: () => void;
  setSectionSidebarCollapsed: (collapsed: boolean) => void;
  setDragging: (dragging: boolean) => void;
  pushUndo: (snapshot: ResumeSnapshot) => void;
  undo: () => ResumeSnapshot | null;
  redo: () => ResumeSnapshot | null;
  reset: () => void;
  toggleAiChat: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  selectedSectionId: null,
  showThemeEditor: false,
  showAiChat: false,
  isSectionSidebarCollapsed: true,
  isDragging: false,
  undoStack: [],
  redoStack: [],

  selectSection: (id) => set({ selectedSectionId: id }),

  toggleThemeEditor: () => set((state) => ({ showThemeEditor: !state.showThemeEditor })),

  toggleSectionSidebar: () =>
    set((state) => ({
      isSectionSidebarCollapsed: !state.isSectionSidebarCollapsed,
    })),

  setSectionSidebarCollapsed: (collapsed) =>
    set({ isSectionSidebarCollapsed: collapsed }),

  toggleAiChat: () =>
    set((state) => ({ showAiChat: !state.showAiChat })),

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
      showThemeEditor: false,
      isSectionSidebarCollapsed: true,
      isDragging: false,
      undoStack: [],
      redoStack: [],
    }),
}));
