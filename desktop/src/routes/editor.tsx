import { useEffect } from "react";
import { createRoute, useParams } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { EditorSidebar } from "../components/editor/editor-sidebar";
import { EditorCanvas } from "../components/editor/editor-canvas";
import { EditorPreviewPanel } from "../components/editor/editor-preview-panel";
import { EditorToolbar } from "../components/editor/editor-toolbar";
import { ThemeEditor } from "../components/editor/theme-editor";
import { AIChatBubble } from "../components/ai/ai-chat-bubble";
import { useEditorStore } from "../stores/editor-store";
import { useResumeStore, generateId } from "../stores/resume-store";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument, getTemplateValidationSnapshot } from "../lib/desktop-api";
import { toResumeDocument } from "../lib/desktop-document-mappers";
import type { Resume, SectionContent } from "../types/resume";

function createFallbackResume(): Resume {
  const id = generateId();
  const now = new Date().toISOString();
  return {
    id,
    userId: "desktop-workspace",
    title: "New Resume",
    template: "classic",
    language: "en",
    isDefault: true,
    themeConfig: {
      primaryColor: "#1a1a1a",
      accentColor: "#3b82f6",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 24, right: 24, bottom: 24, left: 24 },
      sectionSpacing: 16,
      avatarStyle: "circle",
    },
    sections: [
      {
        id: generateId(),
        resumeId: id,
        type: "personal_info",
        title: "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: "",
          jobTitle: "",
          email: "",
          phone: "",
          location: "",
        } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId(),
        resumeId: id,
        type: "summary",
        title: "Summary",
        sortOrder: 1,
        visible: true,
        content: { text: "" } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId(),
        resumeId: id,
        type: "work_experience",
        title: "Work Experience",
        sortOrder: 2,
        visible: true,
        content: { items: [] } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId(),
        resumeId: id,
        type: "education",
        title: "Education",
        sortOrder: 3,
        visible: true,
        content: { items: [] } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId(),
        resumeId: id,
        type: "certifications",
        title: "Certifications",
        sortOrder: 4,
        visible: true,
        content: { items: [] } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId(),
        resumeId: id,
        type: "skills",
        title: "Skills",
        sortOrder: 5,
        visible: true,
        content: { categories: [] } as unknown as SectionContent,
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function toResumeFromValidation(doc: {
  metadata: {
    id: string;
    title: string;
    template: string;
    language: string;
    targetJobTitle?: string | null;
    targetCompany?: string | null;
    isDefault: boolean;
    createdAtEpochMs: number;
    updatedAtEpochMs: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: Record<string, any>;
  sections: Array<{
    id: string;
    documentId: string;
    sectionType: string;
    title: string;
    sortOrder: number;
    visible: boolean;
    content: Record<string, unknown>;
    createdAtEpochMs: number;
    updatedAtEpochMs: number;
  }>;
}): Resume {
  return {
    id: doc.metadata.id,
    userId: "desktop-workspace",
    title: doc.metadata.title,
    template: doc.metadata.template,
    language: doc.metadata.language,
    targetJobTitle: doc.metadata.targetJobTitle,
    targetCompany: doc.metadata.targetCompany,
    isDefault: doc.metadata.isDefault,
    themeConfig: {
      primaryColor: (doc.theme.primaryColor as string) || "#1a1a1a",
      accentColor: (doc.theme.accentColor as string) || "#3b82f6",
      fontFamily: (doc.theme.fontFamily as string) || "Inter",
      fontSize: (doc.theme.fontSize as string) || "medium",
      lineSpacing: (doc.theme.lineSpacing as number) || 1.5,
      margin: {
        top: ((doc.theme.margin as Record<string, number> | undefined)?.top) ?? 24,
        right: ((doc.theme.margin as Record<string, number> | undefined)?.right) ?? 24,
        bottom: ((doc.theme.margin as Record<string, number> | undefined)?.bottom) ?? 24,
        left: ((doc.theme.margin as Record<string, number> | undefined)?.left) ?? 24,
      },
      sectionSpacing: (doc.theme.sectionSpacing as number) || 16,
      avatarStyle: ((doc.theme.avatarStyle as string) === "oneInch" || (doc.theme.avatarStyle as string) === "one_inch")
        ? "oneInch"
        : "circle",
    },
    sections: doc.sections.map((s, i) => ({
      id: s.id,
      resumeId: s.documentId || doc.metadata.id,
      type: s.sectionType,
      title: s.title,
      sortOrder: s.sortOrder ?? i,
      visible: s.visible,
      content: s.content as unknown as SectionContent,
      createdAt: new Date(s.createdAtEpochMs).toISOString(),
      updatedAt: new Date(s.updatedAtEpochMs).toISOString(),
    })),
    createdAt: new Date(doc.metadata.createdAtEpochMs).toISOString(),
    updatedAt: new Date(doc.metadata.updatedAtEpochMs).toISOString(),
  };
}

function EditorRoute() {
  const { id } = useParams({ from: "/editor/$id" });
  const { showThemeEditor } = useEditorStore();
  const {
    currentResume,
    sections,
    setResume,
    updateSection,
    addSection,
    removeSection,
    reorderSections,
    reset,
  } = useResumeStore();

  // Load the requested document from native storage, with validation snapshot as a fallback.
  useEffect(() => {
    let isCancelled = false;

    const loadEditorDocument = async () => {
      try {
        const nativeDocument = await getDocument(id);
        if (nativeDocument) {
          if (!isCancelled) {
            setResume(toResumeDocument(nativeDocument));
          }
          return;
        }
      } catch {
        // Fall through to template validation fallback.
      }

      try {
        const snapshot = await getTemplateValidationSnapshot();
        if (snapshot.documents.length > 0) {
          const doc = snapshot.documents[0];
          if (!isCancelled) {
            setResume(toResumeFromValidation(doc));
            return;
          }
        }
      } catch {
        // Fall through to the local fallback document.
      }

      if (!isCancelled) {
        setResume(createFallbackResume());
      }
    };

    void loadEditorDocument();

    return () => {
      isCancelled = true;
    };
  }, [id, setResume]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Loading state
  if (!currentResume) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-64 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 bg-slate-50 p-3 dark:bg-zinc-950">
      <EditorToolbar />
      <div className="min-h-0 flex flex-1 gap-3 overflow-x-auto overflow-y-hidden">
        <EditorSidebar
          sections={sections}
          onAddSection={addSection}
          onReorderSections={reorderSections}
        />
        <EditorCanvas
          sections={sections}
          onUpdateSection={updateSection}
          onRemoveSection={removeSection}
          onReorderSections={reorderSections}
        />
        {showThemeEditor && <ThemeEditor />}
        <EditorPreviewPanel />
      </div>

      {/* AI Chat Bubble */}
      <AIChatBubble resumeId={currentResume?.id || ""} />
    </div>
  );
}

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$id",
  component: EditorRoute,
});
