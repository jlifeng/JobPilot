import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Resume } from "@/types/resume";
import { ResumePreview } from "@/components/preview/resume-preview";
import {
  getUnifiedTemplate,
  getUnifiedTemplateIds,
  toCanonicalResume,
} from "@/lib/template-renderer";

function createResume(template: string): Resume {
  const now = new Date("2026-10-24T00:00:00.000Z");

  return {
    id: "resume-github-details",
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
        resumeId: "resume-github-details",
        type: "github",
        title: "Open Source",
        sortOrder: 1,
        visible: true,
        content: {
          items: [
            {
              id: "repo-details",
              repoUrl: "https://github.com/example/jobpilot",
              name: "JobPilot",
              stars: 42,
              description: "Local-first resume workbench.",
              technologies: ["React", "Rust"],
              highlights: ["Unified preview and export"],
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

describe("GitHub project details", () => {
  it("renders the derived details exactly once in the real preview component", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ResumePreview, { resume: createResume("classic") }),
    );

    expect(markup.match(/Tech:/g)).toHaveLength(1);
    expect(markup.match(/Unified preview and export/g)).toHaveLength(1);
  });

  it("renders technologies and highlights across every unified template", () => {
    for (const templateId of getUnifiedTemplateIds()) {
      const template = getUnifiedTemplate(templateId);
      assert.ok(template, `Expected "${templateId}" to be registered`);

      const resume = toCanonicalResume(createResume(templateId));
      const previewMarkup = renderToStaticMarkup(
        React.createElement(template.PreviewComponent, { resume }),
      );
      const exportMarkup = template.buildHtml(resume);

      for (const markup of [previewMarkup, exportMarkup]) {
        assert.match(markup, /React/, templateId);
        assert.match(markup, /Rust/, templateId);
        assert.match(markup, /Unified preview and export/, templateId);
        assert.match(markup, /example\/jobpilot/, templateId);
      }
    }
  });

  it("preserves repository metadata for legacy GitHub content", () => {
    const source = createResume("classic");
    const section = source.sections[0];
    const content = section.content as unknown as {
      items: Array<Record<string, unknown>>;
    };
    delete content.items[0].technologies;
    delete content.items[0].highlights;

    const markup = renderToStaticMarkup(
      React.createElement(ResumePreview, { resume: source }),
    );

    expect(markup).toContain("Local-first resume workbench.");
    expect(markup).toContain("https://github.com/example/jobpilot");
    expect(markup).toContain("★ 42");
  });

  it("uses the consultant projects layout for GitHub technologies and highlights", () => {
    const source = createResume("consultant");
    source.language = "zh";
    const resume = toCanonicalResume(source);
    const template = getUnifiedTemplate("consultant");
    assert.ok(template);

    const markup = template.buildHtml(resume);
    assert.match(markup, /技术栈: React, Rust/);
    assert.match(markup, /<ul class="mt-1\.5 space-y-0\.5" style="padding-left:1\.25rem;list-style-type:disc">/);
    assert.doesNotMatch(markup, /<strong>技术栈:<\/strong>/);
    assert.doesNotMatch(markup, /<strong>亮点:<\/strong>/);
  });
});
