import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import type { Resume } from "@/types/resume";
import {
  getUnifiedTemplate,
  getUnifiedTemplateIds,
  toCanonicalResume,
} from "@/lib/template-renderer";

function createResume(template: string): Resume {
  const now = new Date("2026-10-17T00:00:00.000Z");

  return {
    id: "resume-zero-stars",
    userId: "user-1",
    title: "Open Source",
    template,
    themeConfig: {
      primaryColor: "#111827",
      accentColor: "#e94560",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
      avatarStyle: "circle",
    },
    isDefault: false,
    language: "en",
    targetJobTitle: null,
    targetCompany: null,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: "github",
        resumeId: "resume-zero-stars",
        type: "github",
        title: "Open Source",
        sortOrder: 1,
        visible: true,
        content: {
          items: [
            {
              id: "repo-zero",
              repoUrl: "https://github.com/example/zero",
              name: "ZeroStarProject",
              stars: 0,
              description: "No stars yet.",
            },
            {
              id: "repo-positive",
              repoUrl: "https://github.com/example/positive",
              name: "PopularProject",
              stars: 1234,
              description: "Has stars.",
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

describe("GitHub star display", () => {
  it("hides zero stars and keeps positive stars across every unified template", () => {
    for (const templateId of getUnifiedTemplateIds()) {
      const template = getUnifiedTemplate(templateId);
      assert.ok(template, `Expected "${templateId}" to be registered`);

      const resume = toCanonicalResume(createResume(templateId));
      const previewMarkup = renderToStaticMarkup(
        React.createElement(template.PreviewComponent, { resume }),
      );
      const exportMarkup = template.buildHtml(resume);

      for (const markup of [previewMarkup, exportMarkup]) {
        assert.match(markup, /PopularProject/, templateId);
        assert.match(markup, /ZeroStarProject/, templateId);
        assert.match(markup, /No stars yet\./, templateId);
        assert.match(markup, /1,234/, templateId);
        assert.doesNotMatch(markup, />\s*0\s*</, templateId);
      }
    }
  });
});
