import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ResumePreview } from "@/components/preview/resume-preview";
import type { Resume as SharedResume } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "../../stores/resume-store";
import type { Resume } from "../../types/resume";

// A4 width in px (at 96 dpi)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const DEFAULT_ZOOM = 90;
const MIN_ZOOM = 30;
const MAX_ZOOM = 150;

export function EditorPreviewPanel() {
  const { t } = useTranslation();
  const { currentResume, sections } = useResumeStore();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const liveResume = useMemo<Resume | null>(() => {
    if (!currentResume) return null;
    return { ...currentResume, sections };
  }, [currentResume, sections]);

  if (!liveResume) return null;

  const scale = zoom / 100;

  return (
    <div
      data-tour="preview"
      className="flex min-w-[420px] flex-[6] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 dark:border-white/10 dark:bg-card">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          {t("editor.toolbar.preview")}
        </span>
        <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50/60 px-1 py-0.5 dark:border-blue-500/20 dark:bg-blue-950/25">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            aria-label={t("editor.toolbar.zoomOut")}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 10))}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-xs font-medium tabular-nums text-slate-600 dark:text-zinc-300">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            aria-label={t("editor.toolbar.zoomIn")}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 10))}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview body */}
      <div className="min-h-0 flex-1 overflow-auto bg-slate-50 dark:bg-zinc-950">
        <div className="flex min-h-full justify-center px-8 py-8 lg:py-10">
          <div
            className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl shadow-slate-900/16 ring-1 ring-slate-900/5 dark:border-zinc-700 dark:shadow-black/50"
            style={{
              width: A4_WIDTH,
              minHeight: A4_HEIGHT,
              zoom: scale,
            }}
          >
            <ResumePreview resume={liveResume as unknown as SharedResume} />
          </div>
        </div>
      </div>
    </div>
  );
}
