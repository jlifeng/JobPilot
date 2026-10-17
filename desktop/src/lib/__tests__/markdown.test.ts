import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { renderInlineMarkdown, renderMarkdownBlocks } from "@/lib/markdown";
import { getUnifiedTemplate, toCanonicalResume } from "@/lib/template-renderer";
import type { Resume } from "@/types/resume";

describe("resume markdown rendering", () => {
  it("renders supported inline formatting without exposing raw markers", () => {
    assert.equal(
      renderInlineMarkdown("**Bold** *Italic* ~~Gone~~ `a*b`"),
      "<strong>Bold</strong> <em>Italic</em> <del>Gone</del> <code>a*b</code>",
    );
  });

  it("renders safe links and escapes HTML", () => {
    assert.equal(
      renderInlineMarkdown("[Docs](https://example.com/a?b=1&c=2)"),
      '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
    assert.equal(
      renderInlineMarkdown("<script>alert(1)</script>"),
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("renders highlight bullet markdown inside list items", () => {
    assert.equal(
      renderMarkdownBlocks("- **First**\n- *Second*"),
      '<ul style="margin:2px 0;padding-left:16px;list-style-type:disc"><li><strong>First</strong></li><li><em>Second</em></li></ul>',
    );
  });

  it("renders formatted highlights in unified preview and export templates", () => {
    const template = getUnifiedTemplate("modern");
    assert.ok(template);
    const now = new Date("2026-10-17T00:00:00.000Z");
    const resume: Resume = {
      id: "markdown-highlight-resume",
      userId: "user-1",
      title: "Markdown Highlights",
      template: "modern",
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
          id: "projects",
          resumeId: "markdown-highlight-resume",
          type: "projects",
          title: "Projects",
          sortOrder: 1,
          visible: true,
          content: {
            items: [
              {
                id: "project-1",
                name: "Markdown Project",
                url: "https://example.com",
                description: "Project description.",
                technologies: [],
                highlights: ["**Bold** *Italic* ~~Gone~~ `code` [Docs](https://example.com)"],
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    const canonical = toCanonicalResume(resume);
    const exportMarkup = template.buildHtml(canonical);
    assert.match(exportMarkup, /<strong>Bold<\/strong>/);
    assert.match(exportMarkup, /<em>Italic<\/em>/);
    assert.match(exportMarkup, /<del>Gone<\/del>/);
    assert.match(exportMarkup, /<code>code<\/code>/);
    assert.match(exportMarkup, /<a href="https:\/\/example\.com"/);
    assert.doesNotMatch(exportMarkup, /\*\*Bold\*\*/);
  });
});
