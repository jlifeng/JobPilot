import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_EDITOR_PANE_PERCENT,
  MIN_EDITOR_PANE_PX,
  MIN_PREVIEW_PANE_PX,
  clampEditorPanePercent,
  editorPanePercentForPointer,
  fitZoomPercent,
  parseStoredEditorPanePercent,
} from "../editor-layout";

describe("clampEditorPanePercent", () => {
  it("keeps a value that leaves room for both panes", () => {
    assert.equal(clampEditorPanePercent(52, 1200), 52);
  });

  it("enforces the pixel minimums on a narrow window", () => {
    // 380 / 800 = 47.5%, 100 - 340 / 800 = 57.5%.
    assert.equal(clampEditorPanePercent(20, 800), 47.5);
    assert.equal(clampEditorPanePercent(90, 800), 57.5);
  });

  it("never lets the global bounds escape", () => {
    assert.equal(clampEditorPanePercent(0, 4000), 25);
    assert.equal(clampEditorPanePercent(100, 4000), 75);
  });

  it("falls back to the default for a non-finite value", () => {
    assert.equal(
      clampEditorPanePercent(Number.NaN, 1200),
      DEFAULT_EDITOR_PANE_PERCENT,
    );
  });

  it("keeps the split usable when the app grows or shrinks", () => {
    // A 70% split is legal at 1200px (the preview keeps 360px), but at 900px
    // it would leave only 270px: 100 - 340 / 900 = 62.2% is the cap.
    assert.equal(clampEditorPanePercent(70, 1200), 70);
    assert.ok(
      Math.abs(clampEditorPanePercent(70, 900) - 62.22222222222222) <
        1e-9,
    );
  });
});

describe("editorPanePercentForPointer", () => {
  it("converts a pointer position into a clamped percentage", () => {
    assert.equal(editorPanePercentForPointer(500, 100, 1000), 40);
    // Clamped to the preview minimum for a 1000px row.
    assert.equal(editorPanePercentForPointer(990, 100, 1000), 66);
  });

  it("returns the default when geometry is unusable", () => {
    assert.equal(
      editorPanePercentForPointer(500, 100, 0),
      DEFAULT_EDITOR_PANE_PERCENT,
    );
  });
});

describe("fitZoomPercent", () => {
  it("fits the A4 page into the available width", () => {
    assert.equal(fitZoomPercent(600), 75);
    assert.equal(fitZoomPercent(794), 100);
  });

  it("never exceeds the manual zoom limits", () => {
    assert.equal(fitZoomPercent(100), 30);
    assert.equal(fitZoomPercent(4000), 150);
    assert.equal(fitZoomPercent(0), 90);
  });
});

describe("parseStoredEditorPanePercent", () => {
  it("restores a stored useful percentage", () => {
    assert.equal(parseStoredEditorPanePercent("58"), 58);
  });

  it("clamps corrupt or out-of-range storage", () => {
    assert.equal(parseStoredEditorPanePercent("1000"), 75);
    assert.equal(parseStoredEditorPanePercent("nope"), DEFAULT_EDITOR_PANE_PERCENT);
    assert.equal(parseStoredEditorPanePercent(null), DEFAULT_EDITOR_PANE_PERCENT);
  });
});

describe("split minimums", () => {
  it("preserve readable widths on both sides", () => {
    assert.ok(MIN_EDITOR_PANE_PX >= 360);
    assert.ok(MIN_PREVIEW_PANE_PX >= 320);
  });
});
