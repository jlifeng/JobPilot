import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  createPreviewSnapshot,
  type PdfPreviewMode,
  type PreviewSnapshot,
} from "../preview/snapshot";
import type { Resume, ResumeSection, ThemeConfig } from "../../types/resume";

// ---------------------------------------------------------------------
// Fixtures (desktop types: dates are ISO strings, content is JSON data)
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

function makeSection(
  id: string,
  overrides: Partial<ResumeSection> = {},
): ResumeSection {
  return {
    id,
    resumeId: "resume-1",
    type: "work_experience",
    title: "Work Experience",
    sortOrder: 0,
    visible: true,
    content: {
      items: [
        {
          id: "exp-1",
          company: "Acme",
          position: "Engineer",
          startDate: "2020-01",
          endDate: "2024-01",
          current: false,
          description: "Built things",
          technologies: ["TypeScript"],
          highlights: ["Shipped a feature"],
        },
      ],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Read a section's `items` array without fighting the SectionContent union. */
function itemsOf(
  content: ResumeSection["content"],
): Array<Record<string, unknown>> {
  const items = (content as unknown as { items?: unknown }).items;
  return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [];
}

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: "resume-1",
    userId: "desktop-workspace",
    title: "Backend Engineer",
    template: "classic",
    themeConfig: { ...THEME },
    isDefault: false,
    language: "en",
    targetJobTitle: null,
    targetCompany: null,
    sections: [makeSection("section-1")],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function snapshot(
  resume: Resume | null,
  sections: ResumeSection[],
  mode: PdfPreviewMode = "pdf",
): PreviewSnapshot {
  const created = createPreviewSnapshot(resume, sections, mode);
  assert.ok(created, "expected a snapshot for a loaded resume");
  return created;
}

// ---------------------------------------------------------------------
// createPreviewSnapshot
// ---------------------------------------------------------------------

describe("createPreviewSnapshot", () => {
  it("returns null when there is no loaded resume", () => {
    assert.equal(
      createPreviewSnapshot(null, [makeSection("section-1")], "pdf"),
      null,
    );
  });

  it("carries the effective mode, template, theme, language and title", () => {
    const created = snapshot(
      makeResume(),
      [makeSection("section-1")],
      "pdf-one-page",
    );

    assert.equal(created.mode, "pdf-one-page");
    assert.equal(created.template, "classic");
    assert.equal(created.title, "Backend Engineer");
    assert.equal(created.language, "en");
    assert.deepEqual(created.themeConfig, THEME);
    assert.equal(created.sections.length, 1);
  });

  it("clones section content so later editor mutations cannot change it", () => {
    const section = makeSection("section-1");
    const created = snapshot(makeResume(), [section]);

    const items = itemsOf(created.sections[0].content);
    items[0].company = "Mutated";
    items.push({ id: "exp-2" });
    (created.sections[0] as { title: string }).title = "Mutated title";

    const source = itemsOf(section.content);
    assert.equal(source[0].company, "Acme");
    assert.equal(source.length, 1);
    assert.equal(section.title, "Work Experience");
  });

  it("keeps every section, including hidden ones, in store order", () => {
    const sections = [
      makeSection("section-1", { sortOrder: 0 }),
      makeSection("section-2", {
        sortOrder: 1,
        visible: false,
        title: "Skills",
      }),
      makeSection("section-3", { sortOrder: 2, title: "Projects" }),
    ];

    const created = snapshot(makeResume(), sections);

    assert.deepEqual(
      created.sections.map((entry) => entry.id),
      ["section-1", "section-2", "section-3"],
    );
    assert.deepEqual(
      created.sections.map((entry) => entry.visible),
      [true, false, true],
    );
  });
});

// ---------------------------------------------------------------------
// Snapshot key: what invalidates a matching preview result
// ---------------------------------------------------------------------

describe("createPreviewSnapshot key", () => {
  const base = () => ({
    resume: makeResume(),
    sections: [makeSection("section-1")],
    mode: "pdf" as PdfPreviewMode,
  });

  it("changes when the template changes", () => {
    const { resume, sections, mode } = base();
    assert.notEqual(
      snapshot(resume, sections, mode).key,
      snapshot(makeResume({ template: "modern" }), sections, mode).key,
    );
  });

  it("changes when any theme property changes", () => {
    const { resume, sections, mode } = base();
    const first = snapshot(resume, sections, mode).key;

    const themeChanges: Partial<ThemeConfig>[] = [
      { primaryColor: "#123456" },
      { accentColor: "#abcdef" },
      { fontFamily: "Georgia" },
      { fontSize: "large" },
      { lineSpacing: 1.8 },
      { sectionSpacing: 32 },
      { margin: { top: 40, right: 24, bottom: 24, left: 24 } },
      { avatarStyle: "oneInch" },
    ];

    for (const change of themeChanges) {
      assert.notEqual(
        first,
        snapshot(
          makeResume({ themeConfig: { ...THEME, ...change } }),
          sections,
          mode,
        ).key,
        `theme change ${JSON.stringify(change)} must invalidate the key`,
      );
    }
  });

  it("changes when a section's content changes", () => {
    const { resume, sections, mode } = base();
    const first = snapshot(resume, sections, mode).key;

    const edited = makeSection("section-1");
    itemsOf(edited.content)[0].company = "Globex";
    assert.notEqual(
      first,
      snapshot(resume, [edited], mode).key,
      "company edit",
    );

    const summaryEdit = makeSection("section-1", {
      type: "summary",
      content: { text: "A short summary" },
    });
    assert.notEqual(first, snapshot(resume, [summaryEdit], mode).key);
  });

  it("changes when a section's title, type or id changes", () => {
    const { resume, sections, mode } = base();
    const first = snapshot(resume, sections, mode).key;

    assert.notEqual(
      first,
      snapshot(
        resume,
        [makeSection("section-1", { title: "Experience" })],
        mode,
      ).key,
    );
    assert.notEqual(
      first,
      snapshot(resume, [makeSection("section-1", { type: "projects" })], mode)
        .key,
    );
    assert.notEqual(
      first,
      snapshot(resume, [makeSection("section-9")], mode).key,
    );
  });

  it("changes when section visibility changes", () => {
    const { resume, sections, mode } = base();
    assert.notEqual(
      snapshot(resume, sections, mode).key,
      snapshot(resume, [makeSection("section-1", { visible: false })], mode)
        .key,
    );
  });

  it("changes when section order changes", () => {
    const { resume, mode } = base();
    const first = snapshot(
      resume,
      [
        makeSection("section-1", { sortOrder: 0 }),
        makeSection("section-2", { sortOrder: 1 }),
      ],
      mode,
    ).key;
    const swapped = snapshot(
      resume,
      [
        makeSection("section-2", { sortOrder: 0 }),
        makeSection("section-1", { sortOrder: 1 }),
      ],
      mode,
    ).key;

    assert.notEqual(first, swapped);
  });

  it("changes when a section is added or removed", () => {
    const { resume, sections, mode } = base();
    assert.notEqual(
      snapshot(resume, sections, mode).key,
      snapshot(
        resume,
        [...sections, makeSection("section-2", { sortOrder: 1 })],
        mode,
      ).key,
    );
    assert.notEqual(
      snapshot(resume, sections, mode).key,
      snapshot(resume, [], mode).key,
    );
  });

  it("changes when the mode changes", () => {
    const { resume, sections } = base();
    assert.notEqual(
      snapshot(resume, sections, "pdf").key,
      snapshot(resume, sections, "pdf-one-page").key,
    );
  });

  it("stays stable across irrelevant churn: new identities, key order and timestamps", () => {
    const { resume, sections, mode } = base();
    const first = snapshot(resume, sections, mode).key;

    // Same values, brand new objects (what the store produces on every mutation).
    assert.equal(
      snapshot(makeResume(), [makeSection("section-1")], mode).key,
      first,
    );

    // Autosave timestamps churn on every save and must not invalidate.
    const restamped = makeSection("section-1", {
      createdAt: "2026-10-18T09:00:00.000Z",
      updatedAt: "2026-10-18T09:00:00.000Z",
    });
    assert.equal(
      snapshot(
        makeResume({ updatedAt: "2026-10-18T09:00:00.000Z" }),
        [restamped],
        mode,
      ).key,
      first,
    );

    // Content keys in a different insertion order describe the same content.
    const reorderedKeys = makeSection("section-1");
    reorderedKeys.content = {
      items: [
        {
          highlights: ["Shipped a feature"],
          technologies: ["TypeScript"],
          description: "Built things",
          current: false,
          endDate: "2024-01",
          startDate: "2020-01",
          position: "Engineer",
          company: "Acme",
          id: "exp-1",
        },
      ],
    };
    assert.equal(snapshot(resume, [reorderedKeys], mode).key, first);

    // Repeated calls are deterministic.
    assert.equal(snapshot(resume, sections, mode).key, first);
  });

  it("does not reuse a key from a different document", () => {
    const { sections, mode } = base();
    assert.notEqual(
      snapshot(makeResume(), sections, mode).key,
      snapshot(makeResume({ id: "resume-2" }), sections, mode).key,
    );
  });
});
