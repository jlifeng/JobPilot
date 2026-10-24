import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  PanelRightClose,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ResumePreview } from "@/components/preview/resume-preview";
import type { Resume as SharedResume, ThemeConfig } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "../../stores/resume-store";
import type { Resume } from "../../types/resume";
import {
  A4_HEIGHT,
  currentPageIndexFromScroll,
  estimatePages,
  usablePageHeight,
  type EstimatedPages,
} from "../../lib/preview/pagination";
import { BACKGROUND_TEMPLATES } from "@/lib/constants";
import { fitZoomPercent } from "../../lib/editor-layout";
import { PrintPreviewPanel } from "./print-preview-panel";

/**
 * Editor preview panel: live guidance plus an accurate print preview.
 *
 * The live view keeps the existing continuous A4 sheet and zoom control, and
 * adds an EXPLICITLY ESTIMATED page count, page boundary guides and a
 * scroll-driven current-page indicator. The estimate only ever describes a
 * sheet that is actually on screen: a measurement taken from a detached node
 * reports zeros, which would silently reset the estimate to one page.
 *
 * The print view (see `print-preview-panel.tsx`) shows the real pages of the
 * PDF the user would export.
 */

// A4 width in px (at 96 dpi)
const A4_WIDTH = 794;
const DEFAULT_ZOOM = 90;
const MIN_ZOOM = 30;
const MAX_ZOOM = 150;
const LIVE_PREVIEW_HORIZONTAL_PADDING = 32;

/** Which view the panel is showing. */
export type PreviewViewMode = "live" | "print";

/**
 * Layout height of a sheet in the px space the estimate works in, or 0 when
 * there is nothing to measure.
 *
 * Two rules make this trustworthy:
 *
 * - A CSS-`zoom` element reports `scrollHeight`/`offsetHeight` in its own
 *   UNZOOMED px (verified in Chrome: 4400 at zoom 0.3, 0.9 and 1.5 alike), so
 *   the reading is used as-is - dividing by the zoom would inflate every
 *   estimate, and the inflation would grow as the user zooms out.
 * - A detached or unlaid-out node reports 0 from both heights and a zero
 *   `getBoundingClientRect()`. Callers must read that as "no measurement", never
 *   as "one page of content", which is how switching the preview view used to
 *   reset the estimate to a single page.
 */
export function sheetLayoutHeight(sheet: HTMLElement): number {
  if (!sheet.isConnected) return 0;

  const scrollHeight = sheet.scrollHeight;
  if (Number.isFinite(scrollHeight) && scrollHeight > 0) return scrollHeight;

  const offsetHeight = sheet.offsetHeight;
  if (Number.isFinite(offsetHeight) && offsetHeight > 0) return offsetHeight;

  return 0;
}

/**
 * Estimated pagination for the live sheet.
 *
 * `contentHeight` must already be unzoomed. Background templates render
 * edge-to-edge in the PDF, so they use the full A4 height instead of losing
 * the theme margins - the same classification the estimate module applies.
 */
export function estimateLivePages(
  template: string,
  theme: ThemeConfig,
  sheetHeight: number,
): EstimatedPages {
  const usable = usablePageHeight(template, theme);
  const hasPagePadding = !BACKGROUND_TEMPLATES.has(template);
  const topPadding = hasPagePadding ? Math.max(0, theme.margin.top) : 0;
  const bottomPadding = hasPagePadding ? Math.max(0, theme.margin.bottom) : 0;

  // The sheet's min-height includes the template's top and bottom padding.
  // Pagination must measure only the flow inside that padding, or a full
  // single page (A4 + margins) is rounded up into a phantom second page.
  const contentHeight = Math.max(0, sheetHeight - topPadding - bottomPadding);

  const estimate = estimatePages({
    contentHeight,
    pageHeight: usable,
    topMargin: 0,
    bottomMargin: 0,
  });

  return {
    pageCount: estimate.pageCount,
    // Guides live in sheet coordinates, not in the padded content box.
    boundaries: estimate.boundaries.map((boundary) => boundary + topPadding),
    // Scroll current-page detection shares those coordinates.
    contentHeight: Math.max(sheetHeight, 0),
  };
}

/** The live sheet: continuous A4 with estimated page guides. */
export interface LivePreviewSurfaceProps {
  resume: Resume;
  zoom: number;
  estimate: EstimatedPages;
  onScroll: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** The zoomed sheet the boundary guides are drawn on. */
  sheetRef: React.RefObject<HTMLDivElement | null>;
}

export function LivePreviewSurface({
  resume,
  zoom,
  estimate,
  onScroll,
  scrollRef,
  sheetRef,
}: LivePreviewSurfaceProps) {
  const { t } = useTranslation();
  const scale = zoom / 100;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-auto bg-slate-50 dark:bg-zinc-950"
    >
      <div className="flex min-h-full justify-center px-4 py-6 lg:py-8">
        <div
          ref={sheetRef}
          className="relative overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl shadow-slate-900/16 ring-1 ring-slate-900/5 dark:border-zinc-700 dark:shadow-black/50"
          style={{
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
            zoom: scale,
          }}
        >
          <ResumePreview resume={resume as unknown as SharedResume} />

          {/* Estimated page breaks: guidance only, never a real PDF break. */}
          {estimate.boundaries.map((boundary, index) => (
            <div
              key={index}
              data-page-boundary={index}
              aria-hidden="true"
              title={t("editor.preview.boundaryGuide")}
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-blue-400/70 dark:border-blue-500/60"
              style={{ top: boundary }}
            >
              <span
                data-boundary-page={index + 2}
                data-page-count={estimate.pageCount}
                aria-hidden="true"
                className="absolute right-1 -top-2 rounded-sm bg-blue-500/90 px-1 text-[10px] font-medium leading-4 text-white"
              >
                {t("editor.preview.boundaryLabel", {
                  page: index + 2,
                  total: estimate.pageCount,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Zoom control, unchanged in behaviour from the original panel. */
function ZoomControls({
  zoom,
  autoFit,
  onZoomOut,
  onZoomIn,
  onAutoFit,
}: {
  zoom: number;
  autoFit: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onAutoFit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50/60 px-1 py-0.5 dark:border-blue-500/20 dark:bg-blue-950/25">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 cursor-pointer rounded-full p-0 ${
          autoFit
            ? "bg-white text-blue-600 dark:bg-blue-950/50 dark:text-blue-200"
            : "text-slate-600 hover:bg-white hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        }`}
        aria-label={t("editor.preview.fitWidth")}
        title={t("editor.preview.fitWidth")}
        aria-pressed={autoFit}
        onClick={onAutoFit}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        aria-label={t("editor.toolbar.zoomOut")}
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <span className="w-9 text-center text-xs font-medium tabular-nums text-slate-600 dark:text-zinc-300">
        {zoom}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        aria-label={t("editor.toolbar.zoomIn")}
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function EditorPreviewPanel({
  onHide,
}: {
  onHide?: () => void;
} = {}) {
  const { t } = useTranslation();
  const { currentResume, sections } = useResumeStore();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [autoFit, setAutoFit] = useState(true);
  const [view, setView] = useState<PreviewViewMode>("live");
  const [estimate, setEstimate] = useState<EstimatedPages>({
    pageCount: 1,
    boundaries: [],
    contentHeight: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  // The sheet is the box the boundary guides are positioned in, so it is the
  // box that gets measured.
  const sheetRef = useRef<HTMLDivElement>(null);

  const template = currentResume?.template ?? "classic";
  const themeConfig = currentResume?.themeConfig;

  // Measure the layout and turn it into an estimate. Only a sheet that is
  // actually rendered can produce a measurement; see `sheetLayoutHeight`.
  const measure = useCallback(
    (element: HTMLElement) => {
      const contentHeight = sheetLayoutHeight(element);
      // Nothing measurable (the view is swapped, the sheet is detached or the
      // layout has not run). Keep the last real estimate rather than
      // overwriting it with a single page.
      if (contentHeight <= 0) return;

      setEstimate(
        estimateLivePages(
          template,
          themeConfig ?? DEFAULT_LIVE_THEME,
          contentHeight,
        ),
      );
    },
    [template, themeConfig],
  );

  // Observe the SHEET, not the inner content: the boundary guides are drawn
  // on the sheet at `top: boundary`, so the measured box and the drawn box
  // have to be the same element. Measuring the content div instead left every
  // guide offset by the sheet's padding and border.
  //
  // A ResizeObserver is an external-system callback, so the setState inside it
  // is the sanctioned pattern and the estimate follows content, template,
  // typography and zoom changes alike.
  //
  // `view` is a dependency on purpose: switching to the print view unmounts
  // this sheet, and switching back mounts a different DOM node. Without it the
  // effect never re-runs, so the estimate would never be measured again.
  useEffect(() => {
    const element = sheetRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    measure(element);

    // Webfonts and images change the layout after the first paint, so the
    // first measurement can be too small. Re-measure once they settle.
    let cancelled = false;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => {
        if (!cancelled) measure(element);
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [measure, sections, view]);

  // Fit the A4 sheet to the preview column until the user picks an explicit
  // zoom level. The horizontal padding belongs to LivePreviewSurface.
  useEffect(() => {
    if (!autoFit || view !== "live") return;

    const element = scrollRef.current;
    if (!element) return;

    const update = () => {
      const available =
        element.clientWidth - LIVE_PREVIEW_HORIZONTAL_PADDING;
      if (available <= 0) return;
      setZoom(fitZoomPercent(available, A4_WIDTH, MIN_ZOOM, MAX_ZOOM));
    };

    update();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoFit, view]);

  const handleScroll = useCallback(
    (scale: number) => {
      const container = scrollRef.current;
      if (!container) return;

      const top = container.scrollTop / scale;
      const height = container.clientHeight / scale;
      const index = currentPageIndexFromScroll(
        top,
        height,
        estimate.boundaries,
        estimate.contentHeight,
      );

      setCurrentPage(index + 1);
    },
    [estimate],
  );

  const liveResume = useMemo<Resume | null>(() => {
    if (!currentResume) return null;
    return { ...currentResume, sections };
  }, [currentResume, sections]);

  if (!liveResume) return null;

  return (
    <div
      data-tour="preview"
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-1.5 border-b border-slate-100 bg-white px-2.5 dark:border-white/10 dark:bg-card">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/70 p-0.5 dark:border-white/10 dark:bg-white/5">
          {(
            [
              ["live", t("editor.preview.live")],
              ["print", t("editor.preview.print")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                view === value
                  ? "bg-white text-blue-600 shadow-sm dark:bg-blue-950/40 dark:text-blue-200"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {view === "live" ? (
            <ZoomControls
              zoom={zoom}
              autoFit={autoFit}
              onZoomOut={() => {
                setAutoFit(false);
                setZoom((z) => Math.max(MIN_ZOOM, z - 10));
              }}
              onZoomIn={() => {
                setAutoFit(false);
                setZoom((z) => Math.min(MAX_ZOOM, z + 10));
              }}
              onAutoFit={() => setAutoFit(true)}
            />
          ) : null}
          {onHide ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
              aria-label={t("editor.layout.hidePreview")}
              title={t("editor.layout.hidePreview")}
              onClick={onHide}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {view === "print" ? (
        <PrintPreviewPanel resume={currentResume} sections={sections} />
      ) : (
        <>
          {/* Estimated pagination, always labelled as an estimate. */}
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 text-xs dark:border-white/10 dark:bg-card">
            <span
              className="truncate font-medium text-slate-600 dark:text-zinc-300"
              title={t("editor.preview.estimateNotice")}
            >
                {t("editor.preview.estimatedPages", { count: estimate.pageCount })}
            </span>
            <span
              className="shrink-0 tabular-nums text-slate-500 dark:text-zinc-400"
              data-testid="live-page-indicator"
            >
              {t("editor.preview.pageIndicator", {
                current: currentPage,
                total: estimate.pageCount,
              })}
            </span>
          </div>

          <LivePreviewSurface
            resume={liveResume}
            zoom={zoom}
            estimate={estimate}
            onScroll={() => handleScroll(zoom / 100)}
            scrollRef={scrollRef}
            sheetRef={sheetRef}
          />
        </>
      )}
    </div>
  );
}

/** Fallback theme when the store has not produced one yet. */
const DEFAULT_LIVE_THEME: ThemeConfig = {
  primaryColor: "#1a1a1a",
  accentColor: "#3b82f6",
  fontFamily: "Inter",
  fontSize: "medium",
  lineSpacing: 1.5,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  sectionSpacing: 16,
  avatarStyle: "oneInch",
};
