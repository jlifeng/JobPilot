import { BACKGROUND_TEMPLATES } from "@/lib/constants";
import type { ThemeConfig } from "../../types/resume";

/**
 * Estimated live pagination for the continuous preview sheet.
 *
 * Every number produced here is an ESTIMATE for instant feedback while editing.
 * Browser print fragmentation (keep-together items, orphans/widows, box-decoration
 * clones at page breaks) cannot be reproduced from a single measured content
 * height, so callers must label these results as estimates. The authoritative
 * page count comes from the generated PDF artifact.
 *
 * Pure arithmetic only: no MuPDF, no Tauri invoke, no DOM, so it stays testable
 * in vitest's node environment.
 */

/** A4 page height in px at 96 dpi. */
export const A4_HEIGHT = 1123;

export interface EstimatedPagesInput {
  /** Measured unzoomed content height in px (never a zoomed screen measurement). */
  contentHeight: number;
  /** Full A4 height in px. */
  pageHeight: number;
  /** Theme top margin in px. */
  topMargin: number;
  /** Theme bottom margin in px. */
  bottomMargin: number;
}

export interface EstimatedPages {
  pageCount: number;
  /** y offsets of page breaks, in content-height space (page 2 starts at boundaries[0]). */
  boundaries: number[];
  contentHeight: number;
}

function isUsableNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Usable height per page for a template class.
 *
 * Background / dark / sidebar templates render edge-to-edge in the PDF
 * (`@page margin: 0`), so they use the full page height. Regular templates lose
 * the theme top + bottom margins. The template classification is imported from
 * the shared constants so there is only one definition of it.
 */
export function usablePageHeight(template: string, theme: ThemeConfig): number {
  if (BACKGROUND_TEMPLATES.has(template)) {
    return A4_HEIGHT;
  }

  const top = isUsableNumber(theme.margin.top) ? theme.margin.top : 0;
  const bottom = isUsableNumber(theme.margin.bottom) ? theme.margin.bottom : 0;

  return Math.max(1, A4_HEIGHT - top - bottom);
}

/**
 * Estimate how many A4 pages the measured content needs, and where the page
 * breaks fall. Content that fits on one page reports a single page with no
 * boundaries. Degenerate inputs (0, NaN, negative) also report one page.
 */
export function estimatePages(input: EstimatedPagesInput): EstimatedPages {
  const { contentHeight } = input;

  if (!Number.isFinite(contentHeight) || contentHeight <= 0) {
    return { pageCount: 1, boundaries: [], contentHeight: 0 };
  }

  const pageHeight = input.pageHeight;
  const topMargin = input.topMargin;
  const bottomMargin = input.bottomMargin;

  if (
    !Number.isFinite(pageHeight) ||
    pageHeight <= 0 ||
    !Number.isFinite(topMargin) ||
    !Number.isFinite(bottomMargin)
  ) {
    return { pageCount: 1, boundaries: [], contentHeight };
  }

  const usable = Math.max(1, pageHeight - topMargin - bottomMargin);
  const pageCount = Math.max(1, Math.ceil(contentHeight / usable));

  // Page 1 has no boundary; every later page starts one usable height further on.
  const boundaries: number[] = [];
  for (let page = 1; page < pageCount; page += 1) {
    boundaries.push(page * usable);
  }

  return { pageCount, boundaries, contentHeight };
}

/**
 * Preferred page from the page whose box contains the vertical centre of the
 * viewport. If the centre lands in a gap between pages, the nearest page wins.
 * The result is always clamped to a valid page index.
 */
export function currentPageIndexFromScroll(
  viewportTop: number,
  viewportHeight: number,
  boundaries: number[],
  contentHeight: number,
): number {
  const pageCount = boundaries.length + 1;

  if (
    !Number.isFinite(viewportTop) ||
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(contentHeight) ||
    viewportHeight <= 0 ||
    contentHeight <= 0 ||
    pageCount <= 1
  ) {
    return 0;
  }

  const top = Math.min(Math.max(viewportTop, 0), contentHeight - viewportHeight);
  const centre = top + viewportHeight / 2;

  // Page i ends at its own boundary; the last page runs to the end of the content,
  // so a centre inside a gap still resolves to the page that owns it.
  for (let index = 0; index < pageCount; index += 1) {
    const end = index === pageCount - 1 ? contentHeight : boundaries[index];

    if (centre < end) {
      return index;
    }
  }

  return pageCount - 1;
}
