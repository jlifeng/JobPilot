/**
 * Geometry helpers for the editor/preview split.
 *
 * Keeping the clamping here makes the pointer and keyboard paths agree, and
 * lets the layout be tested without relying on a browser's layout engine.
 */

export const DEFAULT_EDITOR_PANE_PERCENT = 52;
export const MIN_EDITOR_PANE_PX = 380;
export const MIN_PREVIEW_PANE_PX = 340;
export const SPLIT_STORAGE_KEY = "jobpilot.editor.split-percent";

const MIN_EDITOR_PANE_PERCENT = 25;
const MAX_EDITOR_PANE_PERCENT = 75;

export function clampEditorPanePercent(
  value: number,
  containerWidth: number,
  minEditorPx = MIN_EDITOR_PANE_PX,
  minPreviewPx = MIN_PREVIEW_PANE_PX,
): number {
  if (!Number.isFinite(value)) return DEFAULT_EDITOR_PANE_PERCENT;

  let minPercent = MIN_EDITOR_PANE_PERCENT;
  let maxPercent = MAX_EDITOR_PANE_PERCENT;

  if (Number.isFinite(containerWidth) && containerWidth > 0) {
    const editorPercent = (minEditorPx / containerWidth) * 100;
    const previewPercent =
      100 - (minPreviewPx / containerWidth) * 100;

    // If both minimums cannot fit, prefer the default over an inverted range.
    if (editorPercent <= previewPercent) {
      minPercent = Math.max(minPercent, editorPercent);
      maxPercent = Math.min(maxPercent, previewPercent);
    }
  }

  return Math.min(maxPercent, Math.max(minPercent, value));
}

export function editorPanePercentForPointer(
  pointerX: number,
  containerLeft: number,
  containerWidth: number,
): number {
  if (
    !Number.isFinite(pointerX) ||
    !Number.isFinite(containerLeft) ||
    !Number.isFinite(containerWidth) ||
    containerWidth <= 0
  ) {
    return DEFAULT_EDITOR_PANE_PERCENT;
  }

  return clampEditorPanePercent(
    ((pointerX - containerLeft) / containerWidth) * 100,
    containerWidth,
  );
}

/**
 * Percentage needed to fit a page of `pageWidth` into the available preview
 * content width. Returns the same clamped range as the manual zoom controls.
 */
export function fitZoomPercent(
  availableWidth: number,
  pageWidth = 794,
  minZoom = 30,
  maxZoom = 150,
): number {
  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(pageWidth) ||
    availableWidth <= 0 ||
    pageWidth <= 0
  ) {
    return 90;
  }

  const fitted = Math.floor((availableWidth / pageWidth) * 100);
  return Math.min(maxZoom, Math.max(minZoom, fitted));
}

export function parseStoredEditorPanePercent(raw: string | null): number {
  if (raw === null) return DEFAULT_EDITOR_PANE_PERCENT;

  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_EDITOR_PANE_PERCENT;

  return clampEditorPanePercent(value, 0);
}
