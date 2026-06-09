import { useCallback, useRef, useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import {
  Plus,
  GripVertical,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderKanban,
  Award,
  Languages,
  LayoutList,
  Pencil,
  Github,
  QrCode,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "../../lib/utils";
import { useEditorStore } from "../../stores/editor-store";
import { useResumeStore, generateId } from "../../stores/resume-store";
import type { ResumeSection, SectionContent } from "../../types/resume";

const SECTION_TYPES = [
  "personal_info",
  "summary",
  "work_experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "github",
  "qr_codes",
  "custom",
] as const;

type SectionType = (typeof SECTION_TYPES)[number];

const sectionIcons: Record<string, React.ElementType> = {
  personal_info: User,
  summary: FileText,
  work_experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  projects: FolderKanban,
  certifications: Award,
  languages: Languages,
  github: Github,
  qr_codes: QrCode,
  custom: LayoutList,
};

function SortableSidebarItem({
  section,
  isSelected,
  onSelect,
  onRename,
  renameLabel,
  icon: Icon,
}: {
  section: ResumeSection;
  isSelected: boolean;
  onSelect: () => void;
  onRename?: (title: string) => void;
  renameLabel: string;
  icon: React.ElementType;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== section.title && onRename) {
      onRename(trimmed);
    } else {
      setRenameValue(section.title);
    }
    setIsRenaming(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const isRenamable = section.type !== "personal_info";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150",
        isSelected
          ? "bg-blue-600 font-medium text-white shadow-sm dark:bg-blue-500 dark:text-white"
          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200",
      )}
    >
      <GripVertical
        className="h-3.5 w-3.5 shrink-0 cursor-grab text-current opacity-35 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      />
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
        aria-current={isSelected ? "true" : undefined}
        onClick={onSelect}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-85" />
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenameValue(section.title);
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-full min-w-0 rounded border border-current/25 bg-transparent px-1 text-sm text-inherit outline-none"
          />
        ) : (
          <span className="truncate">{section.title}</span>
        )}
      </button>
      {isRenamable && !isRenaming && (
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded p-1 text-current opacity-0 transition-opacity hover:opacity-100 group-hover/item:opacity-60"
          aria-label={renameLabel}
          onClick={(e) => {
            e.stopPropagation();
            setRenameValue(section.title);
            setIsRenaming(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface EditorSidebarProps {
  sections: ResumeSection[];
  onAddSection: (section: ResumeSection) => void;
  onReorderSections: (sections: ResumeSection[]) => void;
}

export function EditorSidebar({
  sections,
  onAddSection,
  onReorderSections,
}: EditorSidebarProps) {
  const { t } = useTranslation();
  const {
    selectedSectionId,
    selectSection,
    isSectionSidebarCollapsed,
    toggleSectionSidebar,
    setSectionSidebarCollapsed,
  } = useEditorStore();
  const { updateSectionTitle } = useResumeStore();

  const handleSelect = useCallback(
    (id: string) => {
      selectSection(id);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-section-id="${id}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [selectSection]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newSections = [...sections];
          const [removed] = newSections.splice(oldIndex, 1);
          newSections.splice(newIndex, 0, removed);
          const reordered = newSections.map((s, i) => ({
            ...s,
            sortOrder: i,
          }));
          onReorderSections(reordered);
        }
      }
    },
    [sections, onReorderSections]
  );

  const sectionTypeLabels: Record<string, string> = {
    personal_info: t("editor.sections.personalInfo"),
    summary: t("editor.sections.summary"),
    work_experience: t("editor.sections.workExperience"),
    education: t("editor.sections.education"),
    skills: t("editor.sections.skills"),
    projects: t("editor.sections.projects"),
    certifications: t("editor.sections.certifications"),
    languages: t("editor.sections.languages"),
    github: t("editor.sections.github"),
    qr_codes: t("editor.sections.qrCodes"),
    custom: t("editor.sections.custom"),
  };

  const existingTypes = new Set(sections.map((s) => s.type));
  const availableTypes = SECTION_TYPES.filter((type) => {
    if (type === "custom") return true;
    return !existingTypes.has(type);
  });

  const handleAddSection = (type: SectionType) => {
    const now = new Date().toISOString();
    const newSection: ResumeSection = {
      id: generateId(),
      resumeId: "",
      type,
      title: sectionTypeLabels[type] || type,
      sortOrder: sections.length,
      visible: true,
      content:
        (type === "personal_info"
          ? { fullName: "", jobTitle: "", email: "", phone: "", location: "" }
          : type === "summary"
            ? { text: "" }
            : type === "skills"
              ? { categories: [] }
              : { items: [] }) as unknown as SectionContent,
      createdAt: now,
      updatedAt: now,
    };
    onAddSection(newSection);
  };

  if (isSectionSidebarCollapsed) {
    return (
      <div
        data-tour="sidebar"
        className="flex w-14 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
      >
        <div className="flex h-12 items-center justify-center border-b border-slate-100 dark:border-white/10">
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            aria-label={t("editor.sidebar.expand")}
            title={t("editor.sidebar.expand")}
            onClick={toggleSectionSidebar}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-2">
            {sections.map((section) => {
              const Icon = sectionIcons[section.type] || LayoutList;
              const isSelected = selectedSectionId === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={cn(
                    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200",
                  )}
                  aria-label={section.title}
                  title={section.title}
                  onClick={() => handleSelect(section.id)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}

            {availableTypes.length > 0 ? (
              <>
                <Separator className="my-2" />
                <button
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-dashed border-blue-100 bg-blue-50/40 text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500/20 dark:bg-blue-950/20 dark:text-blue-200"
                  aria-label={t("editor.sidebar.addSection")}
                  title={t("editor.sidebar.addSection")}
                  onClick={() => setSectionSidebarCollapsed(false)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div data-tour="sidebar" className="w-56 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between px-3 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {t("editor.sidebar.sections")}
        </h3>
        <button
          type="button"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          aria-label={t("editor.sidebar.collapse")}
          title={t("editor.sidebar.collapse")}
          onClick={toggleSectionSidebar}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="space-y-1 px-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => {
                const Icon = sectionIcons[section.type] || LayoutList;
                return (
                  <SortableSidebarItem
                    key={section.id}
                    section={section}
                    isSelected={selectedSectionId === section.id}
                    onSelect={() => handleSelect(section.id)}
                    onRename={
                      section.type !== "personal_info"
                        ? (title) => updateSectionTitle(section.id, title)
                        : undefined
                    }
                    renameLabel={t("common.rename")}
                    icon={Icon}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {availableTypes.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="px-2 pb-4">
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {t("editor.sidebar.addSection")}
              </p>
              <div className="space-y-0.5 rounded-xl border border-dashed border-blue-100 bg-blue-50/40 p-1 dark:border-blue-500/20 dark:bg-blue-950/20">
                {availableTypes.map((type) => {
                  const Icon = sectionIcons[type] || LayoutList;
                  return (
                    <button
                      key={type}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 transition-colors duration-150 hover:bg-white hover:text-blue-700 hover:shadow-sm dark:text-zinc-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
                      onClick={() => handleAddSection(type)}
                    >
                      <Plus className="h-3 w-3 shrink-0 text-zinc-400" />
                      <Icon className="h-4 w-4 shrink-0 opacity-75" />
                      <span className="truncate">{sectionTypeLabels[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
