import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "../../stores/editor-store";
import { useResumeStore } from "../../stores/resume-store";
import { useDragHandle } from "./dnd/sortable-section";
import type { ResumeSection, SectionContent } from "../../types/resume";
import { PersonalInfoSection } from "./sections/personal-info";
import { SummarySection } from "./sections/summary";
import { WorkExperienceSection } from "./sections/work-experience";
import { EducationSection } from "./sections/education";
import { SkillsSection } from "./sections/skills";
import { ProjectsSection } from "./sections/projects";
import { CertificationsSection } from "./sections/certifications";
import { LanguagesSection } from "./sections/languages";
import { CustomSection } from "./sections/custom-section";
import { GitHubSection } from "./sections/github";
import { QrCodesSection } from "./sections/qr-codes";

interface SectionWrapperProps {
  section: ResumeSection;
  onUpdate: (content: Partial<SectionContent>) => void;
  onRemove: () => void;
}

const sectionComponents: Record<
  string,
  React.ComponentType<{ section: ResumeSection; onUpdate: (content: Partial<SectionContent>) => void }>
> = {
  personal_info: PersonalInfoSection,
  summary: SummarySection,
  work_experience: WorkExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  projects: ProjectsSection,
  certifications: CertificationsSection,
  languages: LanguagesSection,
  github: GitHubSection,
  qr_codes: QrCodesSection,
  custom: CustomSection,
};

export function SectionWrapper({ section, onUpdate, onRemove }: SectionWrapperProps) {
  const { t } = useTranslation();
  const {
    collapsedSectionIds,
    selectedSectionId,
    selectSection,
    toggleAiChat,
    toggleSectionCollapsed,
  } = useEditorStore();
  const { toggleSectionVisibility, updateSectionTitle } = useResumeStore();
  const { attributes, listeners } = useDragHandle();
  const isSelected = selectedSectionId === section.id;
  const isCollapsed = collapsedSectionIds.includes(section.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== section.title) {
      updateSectionTitle(section.id, trimmed);
    } else {
      setRenameValue(section.title);
    }
    setIsRenaming(false);
  };

  const SectionComponent = sectionComponents[section.type];
  const isRenamable = section.type !== "personal_info";

  return (
    <div
      data-section-card={section.id}
      data-collapsed={isCollapsed ? "true" : "false"}
      className={`scroll-mt-3 rounded-xl border bg-white shadow-sm transition-[border-color,box-shadow] duration-200 dark:bg-zinc-900 ${
        isSelected
          ? "border-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.08)] dark:border-blue-500/50 dark:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
      } ${!section.visible ? "opacity-50" : ""}`}
      onClick={() => selectSection(section.id)}
    >
      <div
        className={`sticky top-0 z-10 flex flex-row items-center justify-between gap-2 px-3 py-2 transition-colors sm:px-4 ${
          isCollapsed ? "rounded-xl" : "rounded-t-xl border-b"
        } ${
          isSelected
            ? "border-blue-100 bg-blue-50/90 dark:border-blue-500/20 dark:bg-blue-950/45"
            : "border-zinc-100 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical
            className="h-4 w-4 shrink-0 cursor-grab text-zinc-300 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          />
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-expanded={!isCollapsed}
            aria-label={t(
              isCollapsed
                ? "editor.sections.expandSection"
                : "editor.sections.collapseSection",
            )}
            title={t(
              isCollapsed
                ? "editor.sections.expandSection"
                : "editor.sections.collapseSection",
            )}
            onClick={(event) => {
              event.stopPropagation();
              selectSection(section.id);
              toggleSectionCollapsed(section.id);
            }}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isCollapsed ? "-rotate-90" : ""
              }`}
            />
          </button>
          {isRenaming ? (
            <input
              ref={renameInputRef}
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
              className="h-6 w-32 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent px-1 text-sm font-semibold text-zinc-700 outline-none dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className={`truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200 ${
                isRenamable
                  ? "cursor-text rounded px-1 -mx-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  : ""
              }`}
              onDoubleClick={
                isRenamable
                  ? (e) => {
                      e.stopPropagation();
                      setRenameValue(section.title);
                      setIsRenaming(true);
                    }
                  : undefined
              }
            >
              {section.title}
            </h3>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            title={t("editorAiPolish")}
            onClick={(e) => {
              e.stopPropagation();
              toggleAiChat(t("editorAiPolishPrompt", {
                sectionTitle: section.title,
              }));
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionVisibility(section.id);
            }}
          >
            {section.visible ? (
              <Eye className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3">
          {SectionComponent ? (
            <SectionComponent section={section} onUpdate={onUpdate} />
          ) : (
            <p className="text-sm text-zinc-400">
              Unknown section type: {section.type}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
