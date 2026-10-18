import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  A4_HEIGHT,
  currentPageIndexFromScroll,
  estimatePages,
  usablePageHeight,
} from "../preview/pagination";
import type { ThemeConfig } from "../../types/resume";

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

const THEME: ThemeConfig = {
  primaryColor: "#1a1a1a",
  accentColor: "#ec4899",
  fontFamily: "Inter",
  fontSize: "medium",
  lineSpacing: 1.5,
  margin: { top: 24, right: 24, bottom: 24, left: 24 },
  sectionSpacing: 16,
  avatarStyle: "circle",
};

// A regular template loses the theme top + bottom margins from the page.
const REGULAR_USABLE = A4_HEIGHT - THEME.margin.top - THEME.margin.bottom;

function estimate(
  contentHeight: number,
  overrides: Partial<{
    topMargin: number;
    bottomMargin: number;
    pageHeight: number;
  }> = {},
) {
  return estimatePages({
    contentHeight,
    pageHeight: overrides.pageHeight ?? A4_HEIGHT,
    topMargin: overrides.topMargin ?? THEME.margin.top,
    bottomMargin: overrides.bottomMargin ?? THEME.margin.bottom,
  });
}

// ---------------------------------------------------------------------
// usablePageHeight
// ---------------------------------------------------------------------

describe("usablePageHeight", () => {
  it("uses the full page height for background templates", () => {
    for (const template of ["modern", "two-column", "sidebar", "gradient"]) {
      assert.equal(usablePageHeight(template, THEME), A4_HEIGHT, template);
    }
  });

  it("subtracts the theme top and bottom margins for regular templates", () => {
    assert.equal(usablePageHeight("classic", THEME), 1075);
    assert.equal(usablePageHeight("ats", THEME), 1075);
  });

  it("follows the theme margins, not the screen zoom", () => {
    const tight = { ...THEME, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
    const roomy = { ...THEME, margin: { top: 96, right: 0, bottom: 96, left: 0 } };

    assert.equal(usablePageHeight("classic", tight), A4_HEIGHT);
    assert.equal(usablePageHeight("classic", roomy), A4_HEIGHT - 192);
  });
});

// ---------------------------------------------------------------------
// estimatePages
// ---------------------------------------------------------------------

describe("estimatePages", () => {
  it("reports a single page with no boundaries for empty content", () => {
    const result = estimate(0);
    assert.equal(result.pageCount, 1);
    assert.deepEqual(result.boundaries, []);
    assert.equal(result.contentHeight, 0);
  });

  it("reports a single page for content that exactly fills the usable height", () => {
    const result = estimate(REGULAR_USABLE);
    assert.equal(result.pageCount, 1);
    assert.deepEqual(result.boundaries, []);
  });

  it("splits 2.5 pages into three pages with cumulative boundaries", () => {
    const result = estimate(REGULAR_USABLE * 2.5);
    assert.equal(result.pageCount, 3);
    assert.deepEqual(result.boundaries, [1075, 2150]);
    assert.equal(result.contentHeight, REGULAR_USABLE * 2.5);
  });

  it("splits three full pages into three pages with two boundaries", () => {
    const result = estimate(REGULAR_USABLE * 3);
    assert.equal(result.pageCount, 3);
    assert.deepEqual(result.boundaries, [1075, 2150]);
  });

  it("keeps boundaries cumulative in content-height space", () => {
    const result = estimate(REGULAR_USABLE * 4 + 10);
    assert.equal(result.pageCount, 5);
    assert.deepEqual(result.boundaries, [1075, 2150, 3225, 4300]);
    assert.ok(result.boundaries.every((value) => value < result.contentHeight));
  });

  it("ignores zoom: only the unzoomed height and theme margins decide", () => {
    // The preview is measured unzoomed, so the same 1075 px of content stays one
    // page no matter what zoom the sheet is displayed at.
    for (const zoom of [30, 90, 150]) {
      assert.equal(estimate(REGULAR_USABLE).pageCount, 1, `zoom ${zoom}`);
    }

    // Halving the theme margins changes the usable height, not the measurement.
    const halfMargins = estimatePages({
      contentHeight: 1075,
      pageHeight: A4_HEIGHT,
      topMargin: 12,
      bottomMargin: 12,
    });
    assert.equal(halfMargins.pageCount, 1);
    assert.deepEqual(halfMargins.boundaries, []);

    // A regular template and a background template disagree only because of the
    // theme margins, never because of the display zoom.
    const justOver = 1076;
    assert.equal(estimate(justOver).pageCount, 2);
    assert.equal(
      estimatePages({
        contentHeight: justOver,
        pageHeight: A4_HEIGHT,
        topMargin: 0,
        bottomMargin: 0,
      }).pageCount,
      1,
    );
  });

  it("returns a single page for degenerate inputs", () => {
    for (const contentHeight of [0, -100, Number.NaN]) {
      const result = estimate(contentHeight);
      assert.equal(result.pageCount, 1, `contentHeight ${contentHeight}`);
      assert.deepEqual(result.boundaries, []);
    }

    const degenerate = estimatePages({
      contentHeight: 2000,
      pageHeight: 0,
      topMargin: Number.NaN,
      bottomMargin: -50,
    });
    assert.equal(degenerate.pageCount, 1);
    assert.deepEqual(degenerate.boundaries, []);
  });

  it("accepts explicit page and margin values that differ from the theme", () => {
    const result = estimatePages({
      contentHeight: 1600,
      pageHeight: 2000,
      topMargin: 100,
      bottomMargin: 100,
    });
    assert.equal(result.pageCount, 1);
    assert.deepEqual(result.boundaries, []);

    const twoPages = estimatePages({
      contentHeight: 1610,
      pageHeight: 2000,
      topMargin: 200,
      bottomMargin: 200,
    });
    assert.equal(twoPages.pageCount, 2);
    assert.deepEqual(twoPages.boundaries, [1600]);
    assert.equal(twoPages.contentHeight, 1610);
  });
});

// ---------------------------------------------------------------------
// currentPageIndexFromScroll
// ---------------------------------------------------------------------

const THREE_PAGES = estimate(REGULAR_USABLE * 2.5).boundaries;

describe("currentPageIndexFromScroll", () => {
  const viewportHeight = 800;

  it("reports the first page at the top of the document", () => {
    assert.equal(
      currentPageIndexFromScroll(0, viewportHeight, THREE_PAGES, REGULAR_USABLE * 2.5),
      0,
    );
  });

  it("reports the page containing the vertical centre of the viewport", () => {
    // Centre 400 -> page 1 (0..1075)
    assert.equal(
      currentPageIndexFromScroll(0, viewportHeight, THREE_PAGES, REGULAR_USABLE * 2.5),
      0,
    );
    // Centre 1100 -> page 2 (1075..2150)
    assert.equal(
      currentPageIndexFromScroll(700, viewportHeight, THREE_PAGES, REGULAR_USABLE * 2.5),
      1,
    );
    // Centre 2200 -> page 3 (2150..3225)
    assert.equal(
      currentPageIndexFromScroll(1800, viewportHeight, THREE_PAGES, REGULAR_USABLE * 2.5),
      2,
    );
  });

  it("reports the last page at the bottom of the document", () => {
    const contentHeight = REGULAR_USABLE * 2.5;
    assert.equal(
      currentPageIndexFromScroll(
        contentHeight - viewportHeight,
        viewportHeight,
        THREE_PAGES,
        contentHeight,
      ),
      2,
    );
  });

  it("resolves a centre at a page break to the page that owns it", () => {
    // The last page is only half full, so the viewport can be centred past the
    // end of the content: that is a gap, and the nearest page is the last one.
    const contentHeight = REGULAR_USABLE * 2.5;
    assert.equal(
      currentPageIndexFromScroll(610, viewportHeight, THREE_PAGES, contentHeight),
      0,
    );
    assert.equal(
      currentPageIndexFromScroll(740, viewportHeight, THREE_PAGES, contentHeight),
      1,
    );
    assert.equal(
      currentPageIndexFromScroll(
        contentHeight - viewportHeight,
        viewportHeight,
        THREE_PAGES,
        contentHeight,
      ),
      2,
    );
    // A viewport taller than the whole document centres on the whole content, so
    // the reported page is a valid index rather than a crash.
    const tallPage = currentPageIndexFromScroll(
      0,
      contentHeight * 2,
      THREE_PAGES,
      contentHeight,
    );
    assert.ok(tallPage >= 0 && tallPage <= 2);
  });

  it("clamps out-of-range scroll positions to the first and last page", () => {
    const contentHeight = REGULAR_USABLE * 2.5;
    assert.equal(
      currentPageIndexFromScroll(-500, viewportHeight, THREE_PAGES, contentHeight),
      0,
    );
    assert.equal(
      currentPageIndexFromScroll(contentHeight * 2, viewportHeight, THREE_PAGES, contentHeight),
      2,
    );
  });

  it("returns page 0 for degenerate boundaries and viewport", () => {
    assert.equal(currentPageIndexFromScroll(0, 0, [], 0), 0);
    assert.equal(currentPageIndexFromScroll(0, Number.NaN, THREE_PAGES, REGULAR_USABLE), 0);
  });
});
