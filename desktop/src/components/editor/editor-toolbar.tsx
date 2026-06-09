import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Cpu,
  Palette,
  Save,
  FileSearch,
  Languages,
  FileText,
  SpellCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "../../stores/editor-store";
import { useResumeStore } from "../../stores/resume-store";
import { useUIStore } from "../../stores/ui-store";
import { getWorkspaceSettingsSnapshot } from "../../lib/desktop-api";
import { ExportDialog } from "./export-dialog";
import { SettingsDialog } from "./settings-dialog";
import { JdAnalysisDialog } from "./jd-analysis-dialog";
import { TranslateDialog } from "./translate-dialog";
import { CoverLetterDialog } from "./cover-letter-dialog";
import { GrammarCheckDialog } from "./grammar-check-dialog";

const TOOLBAR_BUTTON_CLASS =
  "cursor-pointer rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-200";

export function EditorToolbar() {
  const { t } = useTranslation();
  const { toggleThemeEditor, showThemeEditor, undo, redo, undoStack, redoStack } =
    useEditorStore();
  const { isSaving, isDirty, currentResume, restoreSections, save } = useResumeStore();
  const { activeModal, openModal, closeModal } = useUIStore();
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    void getWorkspaceSettingsSnapshot()
      .then((settings) => {
        if (!isCancelled) {
          setAutoSave(settings.editor?.autoSave ?? true);
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUndo = () => {
    const snapshot = undo();
    if (snapshot) {
      restoreSections(snapshot.sections);
    }
  };

  const handleRedo = () => {
    const snapshot = redo();
    if (snapshot) {
      restoreSections(snapshot.sections);
    }
  };

  const resumeId = currentResume?.id || "";

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between rounded-xl border border-slate-200/80 bg-white/95 px-4 shadow-[0_4px_12px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`${TOOLBAR_BUTTON_CLASS} gap-1`}
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="max-w-48 truncate text-sm font-semibold text-slate-950 dark:text-zinc-50">
            {currentResume?.title || ""}
          </span>
          <span className="text-xs text-zinc-400">
            {isSaving
              ? t("editor.toolbar.saving")
              : isDirty
                ? autoSave
                  ? ""
                  : t("editor.toolbar.unsaved")
                : t("editor.toolbar.autoSaved")}
          </span>
          {!autoSave && isDirty && !isSaving && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => save()}
              className="cursor-pointer gap-1 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{t("editor.toolbar.save")}</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.undo")}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.redo")}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            data-tour="export"
            variant="ghost"
            size="sm"
            onClick={() => openModal("export")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.exportPdf")}
          >
            <Download className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.exportPdf")}
            </span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("jd-analysis")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.jdAnalysis")}
          >
            <FileSearch className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.jdAnalysis")}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("translate")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.translate")}
          >
            <Languages className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.translate")}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("cover-letter")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.coverLetter")}
          >
            <FileText className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.coverLetter")}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("grammar-check")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.grammarCheck")}
          >
            <SpellCheck className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.grammarCheck")}
            </span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            data-tour="theme"
            variant={showThemeEditor ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleThemeEditor}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("editor.toolbar.theme")}
          >
            <Palette className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.theme")}
            </span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("settings")}
            className={TOOLBAR_BUTTON_CLASS}
            title={t("settings.ai.title")}
          >
            <Cpu className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("settings.ai.title")}
            </span>
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={activeModal === "export"}
        onClose={closeModal}
        resumeId={resumeId}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={activeModal === "settings"}
        onClose={closeModal}
      />

      {/* JD Analysis Dialog */}
      <JdAnalysisDialog
        open={activeModal === "jd-analysis"}
        onClose={closeModal}
        resumeId={resumeId}
      />

      {/* Translate Dialog */}
      <TranslateDialog
        open={activeModal === "translate"}
        onClose={closeModal}
        resumeId={resumeId}
      />

      {/* Cover Letter Dialog */}
      <CoverLetterDialog
        open={activeModal === "cover-letter"}
        onClose={closeModal}
        resumeId={resumeId}
      />

      {/* Grammar Check Dialog */}
      <GrammarCheckDialog
        open={activeModal === "grammar-check"}
        onClose={closeModal}
        resumeId={resumeId}
      />
    </>
  );
}
