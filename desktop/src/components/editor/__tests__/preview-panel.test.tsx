import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------
// Mocks: the native and wasm edges of the print preview path.
// `desktop/vitest.config.ts` runs in node env, so `@/lib/export`,
// `../../lib/desktop-api` and the MuPDF-backed page reader must be stubbed.
// ---------------------------------------------------------------------
const generateHtmlMock = vi.hoisted(() => vi.fn());
const generatePdfPreviewMock = vi.hoisted(() => vi.fn());
const loadPdfPagesMock = vi.hoisted(() => vi.fn());
const renderPdfPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/export", () => ({ generateHtml: generateHtmlMock }));
vi.mock("../../../lib/desktop-api", () => ({
  generatePdfPreview: generatePdfPreviewMock,
  saveDocument: vi.fn(),
}));
vi.mock("../../../lib/preview/pdf-pages", () => ({
  A4_WIDTH: 794,
  A4_HEIGHT: 1123,
  DEFAULT_PDF_PAGE_SCALE: 1,
  a4PageSizeAtScale: (scale: number) => ({
    width: Math.round(794 * scale),
    height: Math.round(1123 * scale),
  }),
  loadPdfPages: loadPdfPagesMock,
  renderPdfPage: renderPdfPageMock,
}));
vi.mock("@/components/preview/resume-preview", () => ({
  ResumePreview: () =>
    React.createElement("div", { "data-testid": "resume-preview" }),
}));

import { i18n } from "../../../i18n";
import enMessages from "../../../../../messages/en.json";
import zhMessages from "../../../../../messages/zh.json";
const storeHolder = vi.hoisted(() => ({
  state: { currentResume: null, sections: [] } as {
    currentResume: Resume | null;
    sections: ResumeSection[];
  },
}));

// Zustand v5 reads getInitialState() for the server snapshot, so a setState
// in the test body is invisible to renderToStaticMarkup. The store is
// therefore stubbed here with the current holder value.
vi.mock("../../../stores/resume-store", async () => {
  const react = await import("react");
  const useResumeStore = (selector?: (state: unknown) => unknown) => {
    const read = () =>
      selector
        ? (selector(storeHolder.state) as unknown)
        : (storeHolder.state as unknown);
    return react.useSyncExternalStore(
      () => () => {},
      read,
      read,
    ) as never;
  };
  return { useResumeStore };
});
import type {
  Resume,
  ResumeSection,
  ThemeConfig,
} from "../../../types/resume";
import {
  createPrintPreviewCore,
  PrintPreviewSurface,
} from "../print-preview-panel";
import {
  EditorPreviewPanel,
  LivePreviewSurface,
  estimateLivePages,
  unzoomedHeight,
} from "../editor-preview-panel";

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

const THEME: ThemeConfig = {
  primaryColor: "#1a1a1a",
  accentColor: "#3b82f6",
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

const PDF_BYTES = Array.from(
  new TextEncoder().encode("%PDF-1.4 fake preview pdf"),
);

function loadedPages(pageCount: number) {
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      index,
      dataUrl: `data:image/png;base64,page-${index}`,
      width: 794,
      height: 1123,
    })),
  };
}

/** Let queued microtasks (and the mocked render timer) settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function store(resume: Resume | null, sections: ResumeSection[] = []): void {
  storeHolder.state = { currentResume: resume, sections };
}

beforeEach(() => {
  generateHtmlMock.mockReset();
  generatePdfPreviewMock.mockReset();
  loadPdfPagesMock.mockReset();
  renderPdfPageMock.mockReset();
});

// ---------------------------------------------------------------------
// Live (estimated) view
// ---------------------------------------------------------------------

describe("EditorPreviewPanel live view", () => {
  it("labels the page count as an estimate", async () => {
    await i18n.changeLanguage("en");
    store(makeResume());

    const markup = renderToStaticMarkup(
      React.createElement(EditorPreviewPanel),
    );

    expect(markup).toContain("Estimated pages");
    expect(markup).toContain("Est");
    // Live and print modes are both offered from the panel header.
    expect(markup).toContain("Live");
    expect(markup).toContain("Print preview");
  });

  it("renders page boundary guides at the estimated boundaries", () => {
    const estimate = estimateLivePages("classic", { ...THEME }, 2400);

    const markup = renderToStaticMarkup(
      React.createElement(LivePreviewSurface, {
        resume: makeResume(),
        zoom: 90,
        estimate,
        onScroll: () => {},
        contentRef: React.createRef<HTMLDivElement>(),
        scrollRef: React.createRef<HTMLDivElement>(),
      }),
    );

    expect(estimate.pageCount).toBeGreaterThan(1);
    expect(markup).toContain("data-page-boundary=\"0\"");
    expect(markup).toContain("data-page-boundary=\"1\"");
    expect(markup).toContain("Estimated page break");
  });

  it("keeps the estimate unchanged when only the zoom changes", () => {
    const measuredAtDefaultZoom = 2400;
    const measuredAtHighZoom = 2400 * 1.5;

    const atDefault = estimateLivePages(
      "classic",
      { ...THEME },
      unzoomedHeight(measuredAtDefaultZoom, 90),
    );
    const atHigh = estimateLivePages(
      "classic",
      { ...THEME },
      unzoomedHeight(measuredAtHighZoom, 150),
    );

    expect(atDefault.pageCount).toBe(atHigh.pageCount);
    expect(atDefault.boundaries).toEqual(atHigh.boundaries);
  });

  it("keeps the zoom control operable", async () => {
    await i18n.changeLanguage("en");
    store(makeResume());

    const markup = renderToStaticMarkup(
      React.createElement(EditorPreviewPanel),
    );

    expect(markup).toContain("aria-label=\"Zoom out preview\"");
    expect(markup).toContain("aria-label=\"Zoom in preview\"");
    expect(markup).toContain("90%");
  });
});

// ---------------------------------------------------------------------
// Print preview: generation and mode
// ---------------------------------------------------------------------

describe("PrintPreviewPanel generation", () => {
  it("generates the exportable PDF on entry with the selected mode", async () => {
    generateHtmlMock.mockResolvedValue(
      "<html><body><div class=\"resume-export\">x</div></body></html>",
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(3));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();

    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);
    const payload = generatePdfPreviewMock.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("resume-export");
    // Normal PDF must not receive the Smart One-Page fit script.
    expect(payload.html).not.toContain("fitToOnePage");
    expect(core.getState().phase).toBe("current");
    expect(core.getState().pageCount).toBe(3);
    expect(core.getState().currentPage).toBe(1);
  });

  it("does not start a second generation for the same snapshot key", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(2));

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    core.sync(resume, resume.sections);
    core.refresh();
    await flush();

    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);
  });

  it("regenerates with the Smart One-Page fit when that mode is selected", async () => {
    generateHtmlMock.mockResolvedValue(
      "<html><body><div class=\"resume-export\">x</div></body></html>",
    );
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(1));

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    generatePdfPreviewMock.mockClear();

    core.selectMode("pdf-one-page");
    await flush();

    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);
    const payload = generatePdfPreviewMock.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("fitToOnePage");
    expect(core.getState().mode).toBe("pdf-one-page");
  });
});

// ---------------------------------------------------------------------
// Print preview: state machine
// ---------------------------------------------------------------------

describe("PrintPreviewPanel state machine", () => {
  it("shows the generating state with enabled controls", async () => {
    let release: (() => void) | undefined;
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockReturnValue(
      new Promise((resolve) => {
        release = () =>
          resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES });
      }),
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(2));

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);

    expect(core.getState().phase).toBe("generating");
    await i18n.changeLanguage("en");
    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, { controller: core }),
    );
    expect(markup).toContain("Generating print preview");
    expect(markup).toContain("aria-live=\"polite\"");

    release?.();
    await flush();
    expect(core.getState().phase).toBe("current");
  });

  it("reports the real page count and navigates between pages", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(4));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();

    expect(core.getState().pageCount).toBe(4);
    core.nextPage();
    expect(core.getState().currentPage).toBe(2);
    core.nextPage();
    core.nextPage();
    expect(core.getState().currentPage).toBe(4);
    core.nextPage();
    expect(core.getState().currentPage).toBe(4);
    core.prevPage();
    core.prevPage();
    core.prevPage();
    core.prevPage();
    expect(core.getState().currentPage).toBe(1);
    core.prevPage();
    expect(core.getState().currentPage).toBe(1);
  });

  it("clamps a page jump to the available pages", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(3));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();

    core.goToPage(0);
    expect(core.getState().currentPage).toBe(1);
    core.goToPage(99);
    expect(core.getState().currentPage).toBe(3);
    core.goToPage(2);
    expect(core.getState().currentPage).toBe(2);
  });

  it("renders PDF pages on demand at display scale", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(3));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();

    expect(loadPdfPagesMock).toHaveBeenCalledTimes(1);
    expect(renderPdfPageMock).toHaveBeenCalled();
    expect(renderPdfPageMock.mock.calls[0][1]).toBe(0);
    expect(renderPdfPageMock.mock.calls[0][2]).toEqual({ scale: 1 });
  });
});

// ---------------------------------------------------------------------
// Print preview: stale results
// ---------------------------------------------------------------------

describe("PrintPreviewPanel stale handling", () => {
  it("marks the result outdated after an edit and keeps the old pages visible", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(2));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    expect(core.getState().phase).toBe("current");

    // An edit changes the snapshot key: the result is now outdated.
    const edited = makeSection("section-1", { title: "Renamed" });
    core.sync(resume, [edited]);
    expect(core.getState().phase).toBe("outdated");
    expect(core.getState().pageCount).toBe(2);
    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);

    await i18n.changeLanguage("en");
    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, { controller: core }),
    );
    expect(markup).toContain("out of date");
  });

  it("ignores a late result from an older snapshot key", async () => {
    let release: (() => void) | undefined;
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () =>
          resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES });
      }),
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(2));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    expect(core.getState().phase).toBe("generating");

    // The document changes while the first generation is still in flight.
    const edited = makeSection("section-1", { title: "Renamed" });
    core.sync(resume, [edited]);

    release?.();
    await flush();

    // The late result belongs to the pre-edit snapshot: it may finish, but it
    // is never presented as current and no page of it is shown.
    expect(core.getState().pageCount).toBe(0);
    // Whatever the panel decides to do next, the stale artifact is gone:
    // no page of the superseded PDF is shown.
    expect(["generating", "outdated", "current", "failed"]).toContain(
      core.getState().phase,
    );
  });

  it("clears the pages when the document changes and ignores its late result", async () => {
    const gates: Array<() => void> = [];
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    // Every generation stays in flight until the test releases it.
    generatePdfPreviewMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          gates.push(() =>
            resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES }),
          );
        }),
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(2));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    const first = makeResume();
    const core = createPrintPreviewCore({
      resume: () => first,
      sections: () => first.sections,
    });
    core.sync(first, first.sections);
    expect(core.getState().phase).toBe("generating");
    // Let the HTML build settle; the PDF generation itself stays gated.
    await flush();
    expect(core.getState().phase).toBe("generating");
    expect(gates.length).toBe(1);

    // Switching documents drops the previous document's visible pages.
    const second = makeResume({ id: "resume-2", title: "Other" });
    core.sync(second, second.sections);
    expect(core.getState().phase).toBe("generating");
    expect(core.getState().pageCount).toBe(0);
    expect(core.getState().currentPage).toBe(1);

    // The first document's late result must not be presented as current.
    gates[0]();
    await flush();

    expect(core.getState().pageCount).toBe(0);

    // The second document's result is the only one that may be shown.
    gates[1]();
    await flush();

    expect(core.getState().pageCount).toBe(2);
    expect(core.getState().phase).toBe("current");
  });
});

// ---------------------------------------------------------------------
// Print preview: failure and retry
// ---------------------------------------------------------------------

describe("PrintPreviewPanel failure", () => {
  it("explains a failed generation and retries on demand", async () => {
    await i18n.changeLanguage("en");
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockRejectedValueOnce(
      new Error("browser unavailable"),
    );

    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();

    expect(core.getState().phase).toBe("failed");
    expect(core.getState().errorMessage).toContain("browser unavailable");

    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, { controller: core }),
    );
    expect(markup).toContain("Print preview failed");
    expect(markup).toContain("Retry");

    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(1));
    renderPdfPageMock.mockResolvedValue({
      index: 0,
      dataUrl: "data:image/png;base64,page-0",
      width: 794,
      height: 1123,
    });

    core.refresh();
    await flush();

    expect(core.getState().phase).toBe("current");
    expect(core.getState().pageCount).toBe(1);
  });
});

// ---------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------

describe("preview panel localization", () => {
  it("adds every preview key to both message catalogs", () => {
    const en = (enMessages as Record<string, unknown>).editor as Record<
      string,
      Record<string, unknown>
    >;
    const zh = (zhMessages as Record<string, unknown>).editor as Record<
      string,
      Record<string, unknown>
    >;
    const keys = [
      "live",
      "print",
      "estimatedPages",
      "pageIndicator",
      "generating",
      "outdated",
      "retry",
      "failed",
      "prevPage",
      "nextPage",
      "pageJump",
    ];

    for (const key of keys) {
      expect(typeof en.preview[key], `en editor.preview.${key}`).toBe(
        "string",
      );
      expect(typeof zh.preview[key], `zh editor.preview.${key}`).toBe(
        "string",
      );
    }
  });

  it("renders the translated status strings for the active language", async () => {
    await i18n.changeLanguage("zh");
    const resume = makeResume();
    store(resume);

    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, {
        controller: createPrintPreviewCore({
          resume: () => resume,
          sections: () => resume.sections,
        }),
      }),
    );

    expect(markup).toContain("打印预览");
    await i18n.changeLanguage("en");
  });
});
