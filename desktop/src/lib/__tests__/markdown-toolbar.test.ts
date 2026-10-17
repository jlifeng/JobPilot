import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { applyInlineMarkdown, toggleMarkdownList } from "@/lib/markdown-toolbar";

describe("markdown toolbar editing", () => {
  it("wraps a selection with emphasis markers", () => {
    assert.deepEqual(
      applyInlineMarkdown("A ship B", 2, 6, "bold", ""),
      {
        value: "A **ship** B",
        selectionStart: 4,
        selectionEnd: 8,
      },
    );
  });

  it("inserts an empty inline token and selects its editable placeholder", () => {
    assert.deepEqual(
      applyInlineMarkdown("abc", 1, 1, "code", ""),
      {
        value: "a``bc",
        selectionStart: 2,
        selectionEnd: 2,
      },
    );
  });

  it("toggles the current line into and out of a markdown list", () => {
    const added = toggleMarkdownList("One", 0, 0);
    assert.equal(added.value, "- One");
    assert.deepEqual([added.selectionStart, added.selectionEnd], [0, 5]);

    const removed = toggleMarkdownList(added.value, 0, 5);
    assert.equal(removed.value, "One");
    assert.deepEqual([removed.selectionStart, removed.selectionEnd], [0, 3]);
  });
});
