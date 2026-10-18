import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { generateHtml } from "@/lib/export";
import type { Resume as SharedResume } from "@/types/resume";
import { generatePdfPreview } from "../../lib/desktop-api";
import {
  prepareDesktopPdfHtml,
  toSharedResume,
} from "../../lib/resume-export";
import {
  A4_HEIGHT,
  A4_WIDTH,
  loadPdfPages,
  renderPdfPage,
  type LoadedPdfPages,
} from "../../lib/preview/pdf-pages";
import {
  createPreviewSnapshot,
  type PdfPreviewMode,
  type PreviewSnapshot,
} from "../../lib/preview/snapshot";
import {
  clearPdfArtifactCache,
  setCachedPdfArtifact,
} from "../../lib/preview/preview-artifact-cache";
import type { Resume, ResumeSection } from "../../types/resume";

/**
 * Print preview for the desktop editor.
 *
 * The panel turns the effective in-memory document into the SAME PDF the user
 * would export (normal PDF or Smart One-Page) and displays its real pages. No
 * save dialog is opened and no anonymization is applied: previewing must stay a
 * lightweight, side-effect-free action on the editor store.
 *
 * Two things shape the implementation:
 *
 * 1. The state machine must survive edits, mode switches, document switches and
 *    out-of-order completions, so the observable result is always tied to the
 *    snapshot it was generated from.
 * 2. `desktop/vitest.config.ts` runs in a node environment where React effects
 *    and the DOM are unavailable, so the machine lives in a framework-free core
 *    (`createPrintPreviewCore`). The React layer is a thin subscriber over it.
 *
 * The generated PDF is published to the shared artifact cache, so exporting an
 * unchanged document saves the very PDF that was displayed instead of running
 * the browser pipeline a second time.
 */

/** Visible lifecycle of a print-preview result. */
export type PrintPreviewPhase =
  | "idle"
  | "generating"
  | "current"
  | "outdated"
  | "failed";

export interface PrintPreviewState {
  phase: PrintPreviewPhase;
  mode: PdfPreviewMode;
  /** Real page count of the generated PDF (0 when nothing is displayed). */
  pageCount: number;
  /** 1-based page the user is looking at. */
  currentPage: number;
  /** Rendered page data URLs keyed by 0-based page index. */
  pageImages: Record<number, string>;
  errorMessage: string;
}

export interface PrintPreviewCore {
  getState(): PrintPreviewState;
  subscribe(listener: (state: PrintPreviewState) => void): () => void;
  /**
   * Re-evaluate the effective snapshot for the selected mode.
   *
   * Called by the React layer whenever the store changes. A new snapshot key
   * marks the displayed result outdated (or starts the first generation on
   * entry); a different document id clears everything.
   */
  sync(resume: Resume | null, sections: ResumeSection[]): void;
  /** Explicit user refresh for the current snapshot. */
  refresh(): void;
  /**
   * Switch the PDF output mode and regenerate immediately.
   *
   * The effective document is passed in, so the new snapshot is built from
   * exactly what `sync` last saw and the two can never disagree.
   */
  selectMode(
    mode: PdfPreviewMode,
    resume: Resume | null,
    sections: ResumeSection[],
  ): void;
  goToPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
  /** Render the given 0-based pages if they are not cached yet. */
  renderPages(indices: number[]): void;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Unknown error";
}

/**
 * Upper bound on rendered page images held in core state.
 *
 * Each entry is a base64 PNG data URL of roughly 100-300 KB, so an unbounded
 * record costs several MB for a long resume and nothing releases it. The panel
 * pre-renders the window around the current page, so keeping the nearest pages
 * and dropping the farthest matches how the list is actually read.
 */
const MAX_CACHED_PAGE_IMAGES = 6;

/**
 * Keeps the `MAX_CACHED_PAGE_IMAGES` pages nearest to `currentPage`.
 *
 * Distance is measured in pages, so a jump to the far end of the document
 * replaces the window instead of growing the record without limit.
 */
function boundPageImages(
  images: Record<number, string>,
  currentPage: number,
): Record<number, string> {
  const indices = Object.keys(images).map(Number);
  if (indices.length <= MAX_CACHED_PAGE_IMAGES) return images;

  const centre = currentPage - 1;
  indices.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));

  const kept: Record<number, string> = {};
  for (const index of indices.slice(0, MAX_CACHED_PAGE_IMAGES)) {
    kept[index] = images[index];
  }

  return kept;
}

/**
 * Framework-free core of the print preview state machine.
 *
 * Kept free of React so the observable behaviour - generation, de-duplication
 * for the same snapshot key, rejection of late results from older keys or a
 * previous document, retry and page navigation - can be exercised directly in
 * vitest's node environment.
 */
export function createPrintPreviewCore(): PrintPreviewCore {
  let state: PrintPreviewState = {
    phase: "idle",
    mode: "pdf",
    pageCount: 0,
    currentPage: 1,
    pageImages: {},
    errorMessage: "",
  };

  const listeners = new Set<(state: PrintPreviewState) => void>();

  const notify = (): void => {
    const snapshot = state;
    listeners.forEach((listener) => listener(snapshot));
  };

  const patch = (next: Partial<PrintPreviewState>): void => {
    state = { ...state, ...next };
    notify();
  };

  let mode: PdfPreviewMode = "pdf";
  let documentId: string | null = null;
  let snapshot: PreviewSnapshot | null = null;
  /** Key of the newest request; older in-flight results are compared to it. */
  let requestKey = "";
  /** Key of the result currently on screen. */
  let generatedKey: string | null = null;
  /** Key of the request currently in flight, so a duplicate never starts. */
  let inFlightKey: string | null = null;
  let loaded: LoadedPdfPages | null = null;

  /**
   * Key of the document currently loaded; the pages on screen are its pages.
   *
   * `loaded` is only ever replaced by a generation that was still current when
   * it finished, so a page request against `loaded` belongs to a document the
   * panel really produced. Comparing against this key - rather than the newest
   * request - is what lets the panel keep drawing the document it is showing
   * while a newer generation is in flight, and still drops a page that belongs
   * to a document that has since been replaced.
   */
  let loadedKey: string | null = null;

  const clearResult = (): void => {
    // A document switch must release the wasm document of the one it replaces;
    // dropping the reference alone leaves it allocated.
    loaded?.close();
    loaded = null;
    loadedKey = null;
    generatedKey = null;
    inFlightKey = null;
    requestKey = "";
    // A document switch must not leave the previous document's PDF behind for
    // an export to pick up.
    clearPdfArtifactCache();
    patch({
      phase: "idle",
      pageCount: 0,
      currentPage: 1,
      pageImages: {},
      errorMessage: "",
    });
  };

  async function renderPages(indices: number[]): Promise<void> {
    const document = loaded;
    if (!document) return;
    const documentKey = loadedKey;

    for (const index of indices) {
      if (index < 0 || index >= document.pageCount) continue;
      if (state.pageImages[index]) continue;
      // Skip rather than abandon the batch: the remaining pages of this
      // document are still worth drawing even if one request was superseded.
      if (documentKey === null || loadedKey !== documentKey) continue;

      try {
        const image = await renderPdfPage(document, index, { scale: 1 });
        // A generation that finished while this page was rendering replaced
        // the document, so this page belongs to the old one and is dropped.
        if (loadedKey !== documentKey) return;
        patch({
          pageImages: boundPageImages(
            { ...state.pageImages, [image.index]: image.dataUrl },
            state.currentPage,
          ),
        });
      } catch {
        // Keep the page placeholder; a render failure must not break navigation.
      }
    }
  }

  async function generate(target: PreviewSnapshot): Promise<void> {
    // Resolve duplicate requests for the same snapshot: a second browser
    // process for identical content is pure waste.
    if (inFlightKey === target.key) return;

    inFlightKey = target.key;
    requestKey = target.key;
    patch({ phase: "generating", errorMessage: "" });

    try {
      const sharedResume = toSharedResume(
        { ...target.resume, sections: target.sections },
        target.sections,
      );
      // Mirrors the export flow, minus the save dialog and anonymization.
      const html = prepareDesktopPdfHtml(
        await generateHtml(sharedResume as unknown as SharedResume, true),
        { fitOnePage: target.mode === "pdf-one-page" },
      );
      const receipt = await generatePdfPreview({ html });

      // An older request may finish, but its result is never presented as
      // current after the document, content or mode changed.
      if (requestKey !== target.key) return;

      // Publish the artifact for the export path: the key is the effective
      // snapshot, so a later export only reuses it while the document and the
      // output mode are unchanged. Preview is never anonymized.
      setCachedPdfArtifact({
        key: target.key,
        mode: target.mode,
        bytes: receipt.bytes,
        bytesWritten: receipt.bytesWritten,
        anonymized: false,
      });

      const document = await loadPdfPages(new Uint8Array(receipt.bytes));
      if (requestKey !== target.key) return;

      // The previous document is superseded: release it before swapping.
      loaded?.close();
      loaded = document;
      loadedKey = target.key;
      generatedKey = target.key;
      state = {
        ...state,
        phase: "current",
        pageCount: document.pageCount,
        currentPage: 1,
        pageImages: {},
      };
      notify();
      void renderPages([0]);
      // A page requested while this generation was in flight was skipped, so
      // draw the window around the page now on screen.
      const from = Math.max(0, state.currentPage - 2);
      const to = Math.min(document.pageCount - 1, state.currentPage);
      const window: number[] = [];
      for (let index = from; index <= to; index += 1) window.push(index);
      void renderPages(window);
    } catch (error) {
      if (requestKey !== target.key) return;
      patch({ phase: "failed", errorMessage: readErrorMessage(error) });
    } finally {
      if (inFlightKey === target.key) inFlightKey = null;
    }
  }

  const core: PrintPreviewCore = {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    sync(resume, sections) {
      const nextDocumentId = resume?.id ?? null;

      if (nextDocumentId !== documentId) {
        // Switching documents must drop the previous document's pages and
        // reject its late results.
        documentId = nextDocumentId;
        clearResult();
      }

      snapshot = createPreviewSnapshot(resume, sections, mode);
      if (!snapshot) {
        patch({ phase: "idle" });
        return;
      }

      requestKey = snapshot.key;

      if (generatedKey === snapshot.key) {
        patch({ phase: "current" });
        return;
      }

      if (inFlightKey === snapshot.key) {
        patch({ phase: "generating" });
        return;
      }

      if (generatedKey) {
        // Content changed since the result was produced: keep the old pages
        // visible but clearly mark them outdated.
        patch({ phase: "outdated" });
        return;
      }

      void generate(snapshot);
    },

    refresh() {
      if (snapshot) void generate(snapshot);
    },

    selectMode(next, resume, sections) {
      if (next === mode) return;
      mode = next;
      // The caller hands over the effective document, so the snapshot
      // cannot disagree with what sync() already saw.
      const nextSnapshot = createPreviewSnapshot(resume, sections, next);
      // Record the new baseline BEFORE generating: the staleness guards
      // and the render path compare against it, and without this no page
      // of the regenerated PDF would ever be drawn.
      snapshot = nextSnapshot;
      patch({ mode: next });
      if (!nextSnapshot) return;
      // An explicit mode choice regenerates right away; the old pages stay
      // visible (and outdated) while the new PDF is prepared.
      void generate(nextSnapshot);
    },

    goToPage(page) {
      const total = Math.max(1, state.pageCount);
      const parsed = Number.isFinite(page) ? Math.trunc(page) : 1;
      const clamped = Math.min(Math.max(parsed || 1, 1), total);

      if (clamped !== state.currentPage) {
        patch({ currentPage: clamped });
      }
      void renderPages([clamped - 1]);
    },

    nextPage() {
      core.goToPage(state.currentPage + 1);
    },

    prevPage() {
      core.goToPage(state.currentPage - 1);
    },

    renderPages(indices) {
      void renderPages(indices);
    },
  };

  return core;
}

/**
 * React binding for {@link createPrintPreviewCore}.
 *
 * The store owns the document, so the hook only forwards it: the core decides
 * what is current, outdated or failed.
 */
/**
 * The core, with `selectMode` bound to the document the editor holds.
 *
 * A thin adapter rather than a second state machine: the panel calls
 * `controller.selectMode(mode)`, and this forwards the effective document
 * so the core never has to hold a reference to the store.
 */
function useBoundCore(
  core: PrintPreviewCore,
  resume: Resume | null,
  sections: ResumeSection[],
): PrintPreviewCore {
  return useMemo(
    () => ({
      ...core,
      selectMode: (mode: PdfPreviewMode) =>
        core.selectMode(mode, resume, sections),
    }),
    [core, resume, sections],
  );
}

export function usePrintPreview(
  resume: Resume | null,
  sections: ResumeSection[],
): PrintPreviewCore {
  // The core is created once and then driven from an effect. It holds no
  // reference to the store: every entry point receives the effective
  // document from this hook, so the binding cannot silently detach from the
  // document the editor is showing.
  const [core] = useState(createPrintPreviewCore);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    core.sync(resume, sections);
  }, [core, resume, sections]);

  useEffect(() => core.subscribe(() => forceRender()), [core]);

  return useBoundCore(core, resume, sections);
}

export interface PrintPreviewPanelProps {
  resume: Resume | null;
  sections: ResumeSection[];
}

/** Presentational surface: everything visible, nothing stateful. */
export function PrintPreviewSurface({
  controller,
  resume,
  sections,
}: {
  controller: PrintPreviewCore;
  /** The effective document, forwarded to `selectMode` on a mode switch. */
  resume: Resume | null;
  sections: ResumeSection[];
}) {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    // The core has no DOM, so the server snapshot is the same read.
    controller.getState,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  // The jump box is keyed by the current page, so any navigation (including a
  // refresh that produces fewer pages) resets it to the page on screen and a
  // stale number can never be submitted.
  const jumpKey = `${state.currentPage}:${state.pageCount}`;

  const pageCount = state.pageCount;
  const isGenerating = state.phase === "generating";

  // React null-pads removed entries, but the array itself keeps its old
  // length, so a scroll handler would keep walking detached cards. Trim it to
  // the pages actually rendered.
  useEffect(() => {
    cardRefs.current.length = pageCount;
  }, [pageCount]);

  const handleScroll = (): void => {
    const container = scrollRef.current;
    // While a refresh is running the page list still describes the document
    // that is about to be replaced, so a scroll must not retarget it.
    if (!container || pageCount <= 1 || isGenerating) return;

    const view = container.getBoundingClientRect();
    const centre = view.top + view.height / 2;

    // The page intersecting the vertical centre of the viewport is current.
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const box = card.getBoundingClientRect();
      const distance = Math.abs(box.top + box.height / 2 - centre);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    controller.goToPage(bestIndex + 1);
  };

  const commitJump = (value: string): void => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      controller.goToPage(parsed);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Output mode + refresh */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 dark:border-white/10 dark:bg-card">
        <div
          role="group"
          aria-label={t("editor.preview.modeLabel")}
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/70 p-0.5 dark:border-white/10 dark:bg-white/5"
        >
          {(
            [
              ["pdf", t("editor.preview.modePdf")],
              ["pdf-one-page", t("editor.preview.modeOnePage")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={state.mode === value}
              onClick={() => controller.selectMode(value, resume, sections)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                state.mode === value
                  ? "bg-white text-blue-600 shadow-sm dark:bg-blue-950/40 dark:text-blue-200"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer gap-1 rounded-full px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-blue-200"
          aria-label={t("editor.preview.refresh")}
          onClick={() => controller.refresh()}
          disabled={isGenerating}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`}
          />
          {t("editor.preview.refresh")}
        </Button>
      </div>

      {/* Status + navigation */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 dark:border-white/10 dark:bg-card">
        <div
          aria-live="polite"
          className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
              <span className="truncate">{t("editor.preview.generating")}</span>
            </>
          ) : null}
          {state.phase === "outdated" ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate">{t("editor.preview.outdated")}</span>
            </>
          ) : null}
          {state.phase === "failed" ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="truncate text-red-600 dark:text-red-400">
                {t("editor.preview.failed")}
                {state.errorMessage ? ` (${state.errorMessage})` : ""}
              </span>
            </>
          ) : null}
          {state.phase === "current" ? (
            <span className="truncate tabular-nums">
              {t("editor.preview.totalPages", { count: pageCount })}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-blue-200"
            aria-label={t("editor.preview.prevPage")}
            onClick={() => controller.prevPage()}
            disabled={state.currentPage <= 1 || pageCount === 0 || isGenerating}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className="min-w-[92px] text-center text-xs font-medium tabular-nums text-slate-600 dark:text-zinc-300"
            data-testid="print-page-indicator"
          >
            {t("editor.preview.pageIndicator", {
              current: state.currentPage,
              total: pageCount,
            })}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 cursor-pointer rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-blue-200"
            aria-label={t("editor.preview.nextPage")}
            onClick={() => controller.nextPage()}
            disabled={state.currentPage >= pageCount || pageCount === 0 || isGenerating}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <label className="ml-1 flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
            <span className="sr-only">{t("editor.preview.pageJump")}</span>
            <input
              key={jumpKey}
              type="number"
              min={1}
              max={Math.max(1, pageCount)}
              defaultValue=""
              placeholder={String(state.currentPage)}
              onBlur={(event) => commitJump(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitJump(event.currentTarget.value);
              }}
              aria-label={t("editor.preview.pageJump")}
              disabled={pageCount === 0 || isGenerating}
              className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-700 shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:border-white/10 dark:bg-input/30 dark:text-zinc-200"
            />
          </label>
        </div>
      </div>

      {/* Pages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto bg-slate-100/60 p-4 dark:bg-zinc-950"
      >
        {state.phase === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t("editor.preview.failed")}
            </p>
            {state.errorMessage ? (
              <p className="max-w-sm text-xs text-slate-500 dark:text-zinc-400">
                {state.errorMessage}
              </p>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => controller.refresh()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("editor.preview.retry")}
            </Button>
          </div>
        ) : null}

        {state.phase === "idle" && pageCount === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-zinc-400">
            {t("editor.preview.idle")}
          </div>
        ) : null}

        {pageCount > 0 ? (
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
            {Array.from({ length: pageCount }, (_, index) => {
              const dataUrl = state.pageImages[index];
              const isActive = index + 1 === state.currentPage;

              return (
                <div
                  key={index}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  data-page-index={index}
                  data-active={isActive ? "true" : "false"}
                  className={`overflow-hidden rounded-sm border bg-white shadow-md transition-shadow dark:border-white/10 ${
                    isActive
                      ? "border-blue-400 ring-2 ring-blue-400/40 dark:border-blue-500"
                      : "border-slate-200 dark:border-zinc-700"
                  }`}
                  style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}
                >
                  {dataUrl ? (
                    <img
                      src={dataUrl}
                      alt={t("editor.preview.pageAlt", { page: index + 1 })}
                      width={A4_WIDTH}
                      height={A4_HEIGHT}
                      className="block h-auto w-full"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500"
                      style={{ minHeight: A4_HEIGHT - 8 }}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">
                        {t("editor.preview.pageRendering")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PrintPreviewPanel({
  resume,
  sections,
}: PrintPreviewPanelProps) {
  const controller = usePrintPreview(resume, sections);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    // The core has no DOM, so the server snapshot is the same read.
    controller.getState,
  );

  // Pre-render the pages around the current one so scrolling stays smooth
  // without ever blocking the editor on a full-document render.

  useEffect(() => {
    const first = Math.max(0, state.currentPage - 1);
    const last = Math.min(Math.max(0, state.pageCount - 1), state.currentPage + 1);
    if (state.pageCount === 0) return;
    const indices: number[] = [];
    for (let index = first; index <= last; index += 1) indices.push(index);
    controller.renderPages(indices);
  }, [controller, state.currentPage, state.pageCount]);

  return (
    <PrintPreviewSurface
      controller={controller}
      resume={resume}
      sections={sections}
    />
  );
}
