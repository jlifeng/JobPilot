import assert from "node:assert/strict";
import { describe, it } from "vitest";
import enMessages from "../../../../messages/en.json";
import zhMessages from "../../../../messages/zh.json";

const REQUIRED_EDITOR_KEYS = {
  layout: ["dragHint", "resetSplit", "hidePreview", "showPreview"],
  preview: ["fitWidth", "boundaryLabel"],
  sections: ["collapseSection", "expandSection"],
  sidebar: ["sections", "collapse", "expand"],
  fields: ["expandEditor", "collapseEditor"],
} as const;

describe("editor message catalogs", () => {
  it("keeps every editor key this change reads in both catalogs", () => {
    const en = (enMessages as Record<string, unknown>).editor as Record<
      string,
      Record<string, unknown>
    >;
    const zh = (zhMessages as Record<string, unknown>).editor as Record<
      string,
      Record<string, unknown>
    >;

    for (const [group, keys] of Object.entries(REQUIRED_EDITOR_KEYS)) {
      for (const key of keys) {
        assert.equal(
          typeof en[group]?.[key],
          "string",
          `en editor.${group}.${key}`,
        );
        assert.equal(
          typeof zh[group]?.[key],
          "string",
          `zh editor.${group}.${key}`,
        );
      }
    }
  });
});
