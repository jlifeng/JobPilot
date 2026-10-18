import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  a4PageSizeAtScale,
  loadPdfPages,
  renderPdfPage,
  type LoadedPdfPages,
} from "../preview/pdf-pages";

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

// MuPDF wasm only boots inside the webview, so `loadPdfPages` is exercised here
// only for its pre-wasm header guard: the check runs before any dynamic
// `import("mupdf")`, which is what keeps this module importable under vitest's
// node environment (desktop/vitest.config.ts has no optimizeDeps.exclude).
/**
 * A stand-in for a real `LoadedPdfPages`.
 *
 * Only the index guard is exercised here (it runs before any wasm work), so
 * the value needs the shape the guard reads - a page count and a `close()`.
 * Building it through `loadPdfPages` is impossible in the node environment
 * because MuPDF only boots inside the webview.
 */
function loaded(pageCount: number): LoadedPdfPages {
  return {
    pageCount,
    close: () => {},
  };
}

// ---------------------------------------------------------------------
// renderPdfPage: index guard
// ---------------------------------------------------------------------

describe("renderPdfPage index guard", () => {
  it("rejects a negative index", async () => {
    const document = loaded(3);

    await assert.rejects(
      () => renderPdfPage(document, -1),
      /index/i,
      "negative index must be refused before any rendering",
    );
  });

  it("rejects an index equal to the page count", async () => {
    const document = loaded(3);

    await assert.rejects(
      () => renderPdfPage(document, 3),
      /index/i,
      "pageCount is one past the last valid page",
    );
  });

  it("rejects an index beyond the page count", async () => {
    const document = loaded(3);

    await assert.rejects(
      () => renderPdfPage(document, 4),
      /index/i,
      "out-of-range index must never reach the renderer",
    );
  });
});

// ---------------------------------------------------------------------
// loadPdfPages: pre-wasm input guard
// ---------------------------------------------------------------------

describe("loadPdfPages input guard", () => {
  it("rejects bytes that are not a PDF before touching wasm", async () => {
    await assert.rejects(
      () => loadPdfPages(new TextEncoder().encode("<html>not a pdf</html>")),
      /pdf/i,
      "a non-PDF payload must fail fast instead of loading the wasm runtime",
    );
  });
});

// ---------------------------------------------------------------------
// a4PageSizeAtScale: default preview scale
// ---------------------------------------------------------------------

describe("a4PageSizeAtScale", () => {
  it("reports A4 at 96dpi for scale 1", () => {
    assert.deepEqual(a4PageSizeAtScale(1), { width: 794, height: 1123 });
  });

  it("doubles both dimensions at scale 2", () => {
    assert.deepEqual(a4PageSizeAtScale(2), { width: 1588, height: 2246 });
  });

  it("keeps the A4 aspect ratio for fractional scales", () => {
    const size = a4PageSizeAtScale(1.5);

    assert.equal(size.width, Math.round(794 * 1.5));
    assert.equal(size.height, Math.round(1123 * 1.5));
  });
});

// ---------------------------------------------------------------------
// LoadedPdfPages: the close contract
// ---------------------------------------------------------------------

describe("LoadedPdfPages.close", () => {
  it("is safe to call more than once and on a value that was never opened", () => {
    const document = loaded(3);

    document.close();
    document.close();

    assert.equal(document.pageCount, 3);
  });

  it("leaves the page count readable after closing", () => {
    const document = loaded(7);

    document.close();

    // The panel still needs the count to lay its list out while the next
    // document loads, so closing must not scramble the plain data fields.
    assert.equal(document.pageCount, 7);
  });

  it("is part of the public contract, so a caller can release the document", () => {
    const document = loaded(1);

    assert.equal(typeof document.close, "function");
  });
});
