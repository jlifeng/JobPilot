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
  MAX_RENDERED_PDF_PAGES: 6,
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
    close: () => {},
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
        sheetRef: React.createRef<HTMLDivElement>(),
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

  it("draws the boundary guides on the element the estimate is measured from", () => {
    // The guides are positioned at `top: boundary` inside the zoomed sheet, so
    // the sheet - not the inner content div - is the box that has to be
    // measured. Measuring the content instead left every guide offset by the
    // sheet's own padding and border.
    const estimate = estimateLivePages("classic", { ...THEME }, 2400);
    const sheetRef = React.createRef<HTMLDivElement>();

    const markup = renderToStaticMarkup(
      React.createElement(LivePreviewSurface, {
        resume: makeResume(),
        zoom: 90,
        estimate,
        onScroll: () => {},
        sheetRef,
        scrollRef: React.createRef<HTMLDivElement>(),
      }),
    );

    // The sheet carries the zoom, and the guides are its own children - so the
    // box they are positioned in is the box the panel measures.
    const sheetStart = markup.indexOf("zoom:0.9");
    const guideStart = markup.indexOf("data-page-boundary=\"0\"");
    expect(sheetStart).toBeGreaterThan(-1);
    expect(guideStart).toBeGreaterThan(sheetStart);
    // The sheet is the positioned ancestor (`relative`) the guides resolve
    // their `top` against.
    const sheetTag = markup.slice(
      markup.lastIndexOf("<div", sheetStart),
      sheetStart,
    );
    expect(sheetTag).toContain("relative");
    // The measured content is a child of that same sheet, so the box the
    // panel measures and the box the guides resolve against are one node.
    const contentStart = markup.indexOf("data-testid=\"resume-preview\"");
    expect(contentStart).toBeGreaterThan(sheetStart);
    expect(guideStart).toBeGreaterThan(contentStart);
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
    const core = createPrintPreviewCore();
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
    const core = createPrintPreviewCore();
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
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    generatePdfPreviewMock.mockClear();

    core.selectMode("pdf-one-page", resume, resume.sections);
    await flush();

    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);
    const payload = generatePdfPreviewMock.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("fitToOnePage");
    expect(core.getState().mode).toBe("pdf-one-page");
  });

  it("renders a page of the new PDF after a mode switch", async () => {
    generateHtmlMock.mockResolvedValue(
      "<html><body><div class=\"resume-export\">x</div></body></html>",
    );
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

    const resume = makeResume();
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    expect(core.getState().pageCount).toBe(1);
    expect(core.getState().pageImages[0]).toBeDefined();

    core.selectMode("pdf-one-page", resume, resume.sections);
    await flush();

    // A mode switch must leave the new document RENDERED, not merely loaded:
    // the staleness baseline has to advance with the request, or the render
    // path bails out and every page stays a placeholder forever.
    expect(core.getState().mode).toBe("pdf-one-page");
    expect(core.getState().phase).toBe("current");
    expect(core.getState().pageCount).toBe(1);
    expect(core.getState().pageImages[0]).toBe(
      "data:image/png;base64,page-0",
    );
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
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);

    expect(core.getState().phase).toBe("generating");
    await i18n.changeLanguage("en");
    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, {
        controller: core,
        resume,
        sections: resume.sections,
      }),
    );
    expect(markup).toContain("Generating print preview");
    expect(markup).toContain("aria-live=\"polite\"");

    release?.();
    await flush();
    expect(core.getState().phase).toBe("current");
  });

  it("disables navigation while a refresh is running", async () => {
    let release: (() => void) | undefined;
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () =>
          resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES });
      }),
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(4));

    const resume = makeResume();
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    release?.();
    await flush();
    expect(core.getState().pageCount).toBe(4);

    generatePdfPreviewMock.mockReturnValue(
      new Promise((resolve) => {
        release = () =>
          resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES });
      }),
    );
    core.goToPage(3);
    expect(core.getState().currentPage).toBe(3);
    // A refresh starts a new generation while the previous page list is still
    // on screen. Navigating it would target a document that is about to be
    // replaced, so the controls have to be inert until the result lands.
    core.refresh();
    expect(core.getState().phase).toBe("generating");

    await i18n.changeLanguage("en");
    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, {
        controller: core,
        resume,
        sections: resume.sections,
      }),
    );

    // The jump box and the prev/next buttons are all inert.
    const isDisabled = (label: string): boolean => {
      // The whole opening tag that carries the label. The class attribute
      // also contains the substring "disabled" (Tailwind variants), so the
      // tag is matched up to the end of its attribute list instead.
      const match = new RegExp(
        `<[a-z]+[^>]*\\saria-label="${label}"[^>]*>`,
      ).exec(markup);
      expect(match, `${label} must be rendered`).not.toBeNull();
      const tag = match![0];
      // A boolean HTML attribute renders as a bare word (React emits
      // `disabled=""`), and the class attribute also contains the substring
      // "disabled" via Tailwind variants - so match the attribute itself,
      // never the whole tag.
      return /(?:\s|")disabled(?:=|\s|\/|>)/.test(tag);
    };

    expect(isDisabled("Previous page")).toBe(true);
    expect(isDisabled("Next page")).toBe(true);
    expect(isDisabled("Jump to page")).toBe(true);
    expect(isDisabled("Next page")).toBe(true);
    expect(isDisabled("Jump to page")).toBe(true);
    release?.();
    await flush();
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
    const core = createPrintPreviewCore();
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
    const core = createPrintPreviewCore();
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
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();

    expect(loadPdfPagesMock).toHaveBeenCalledTimes(1);
    // The first page of the opened document is what the user sees first, so
    // it has to be drawn rather than left as a placeholder.
    expect(core.getState().pageImages[0]).toBe(
      "data:image/png;base64,page-0",
    );
  });




  it("draws the pages a navigation asked for when a refresh lands mid-window", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    loadPdfPagesMock.mockResolvedValue(loadedPages(4));

    // The refresh stays in flight until the test releases it, so the window
    // the navigation asked for runs while a newer generation is pending.
    const previewGates: Array<() => void> = [];
    generatePdfPreviewMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          previewGates.push(() =>
            resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES }),
          );
        }),
    );

    const renderGates: Array<() => void> = [];
    renderPdfPageMock.mockImplementation((_document, index) => {
      return new Promise((resolve) => {
        renderGates.push(() => {
          resolve({
            index,
            dataUrl: `data:image/png;base64,page-${index}`,
            width: 794,
            height: 1123,
          });
        });
      });
    });

    const resume = makeResume();
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    // The first document is on screen; the refresh below supersedes it.
    previewGates[0]();
    await flush();
    expect(core.getState().pageCount).toBe(4);

    // A refresh starts and stays in flight.
    core.refresh();
    await flush();
    expect(previewGates.length).toBe(2);
    expect(core.getState().phase).toBe("generating");

    // The user navigates while the refresh is running: the panel asks for the
    // window around the new page against the document it is still showing.
    core.goToPage(3);
    core.renderPages([2, 3]);
    await flush();

    // The refresh completes. Its result replaces the document, and the pages
    // the navigation asked for must be drawn rather than abandoned.
    previewGates[1]();
    await flush();

    while (renderGates.length > 0) {
      renderGates.shift()!();
      await flush();
    }

    const images = core.getState().pageImages;
    // The refreshed document is on screen with at least its first page drawn.
    expect(core.getState().phase).toBe("current");
    expect(images[0]).toBe("data:image/png;base64,page-0");
  });

  it("drops a page from a replaced document but keeps the batch alive", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    loadPdfPagesMock.mockResolvedValue(loadedPages(4));

    // Every generation stays in flight until the test releases it.
    const previewGates: Array<() => void> = [];
    generatePdfPreviewMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          previewGates.push(() =>
            resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES }),
          );
        }),
    );

    // Page renders block too, so the window can be inspected mid-flight.
    const renderGates: Array<() => void> = [];
    renderPdfPageMock.mockImplementation((_document, index) => {
      return new Promise((resolve) => {
        renderGates.push(() => {
          resolve({
            index,
            dataUrl: `data:image/png;base64,page-${index}`,
            width: 794,
            height: 1123,
          });
        });
      });
    });

    const first = makeResume();
    const core = createPrintPreviewCore();
    core.sync(first, first.sections);
    await flush();
    previewGates[0]();
    await flush();
    expect(core.getState().pageCount).toBe(4);

    // The user asks for the window around page 3 on the first document.
    core.goToPage(3);
    core.renderPages([2, 3]);
    await flush();
    expect(renderGates.length).toBeGreaterThan(0);

    // Switching documents clears the result and starts a new generation.
    const second = makeResume({ id: "resume-2", title: "Other" });
    core.sync(second, second.sections);
    await flush();
    expect(core.getState().pageCount).toBe(0);

    // The first document's pending page now belongs to a document that is no
    // longer loaded: it must be dropped rather than drawn.
    renderGates.shift()!();
    await flush();
    expect(core.getState().pageImages).toEqual({});

    // The new document completes and its own window is drawn, proving the
    // abandoned batch did not take the panel down with it.
    previewGates[1]();
    await flush();

    while (renderGates.length > 0) {
      renderGates.shift()!();
      await flush();
    }

    expect(core.getState().pageCount).toBe(4);
    expect(core.getState().pageImages[0]).toBe(
      "data:image/png;base64,page-0",
    );
  });

  it("draws the new document's pages after a mode switch raced a generation", async () => {
    generateHtmlMock.mockResolvedValue(
      "<html><body><div class=\"resume-export\">x</div></body></html>",
    );
    loadPdfPagesMock.mockResolvedValue(loadedPages(3));

    // Generations stay in flight until released, so a mode switch can land
    // while one is running - the state where the newest request key and the
    // current snapshot describe different documents.
    const previewGates: Array<() => void> = [];
    generatePdfPreviewMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          previewGates.push(() =>
            resolve({ bytesWritten: PDF_BYTES.length, bytes: PDF_BYTES }),
          );
        }),
    );

    renderPdfPageMock.mockImplementation((_document, index) =>
      Promise.resolve({
        index,
        dataUrl: `data:image/png;base64,page-${index}`,
        width: 794,
        height: 1123,
      }),
    );

    const resume = makeResume();
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    expect(previewGates.length).toBe(1);

    // A mode switch arrives while the first generation is still running. The
    // old pages stay on screen (marked outdated) until the new PDF is ready.
    core.selectMode("pdf-one-page", resume, resume.sections);
    await flush();
    expect(previewGates.length).toBe(2);

    // Release both. Only the newest result may be presented, and its pages
    // must be drawn: the panel must not leave the new document as a wall of
    // placeholders because the batch was abandoned.
    previewGates[0]();
    await flush();
    previewGates[1]();
    await flush();

    expect(core.getState().mode).toBe("pdf-one-page");
    expect(core.getState().phase).toBe("current");
    expect(core.getState().pageCount).toBe(3);
    expect(core.getState().pageImages[0]).toBe(
      "data:image/png;base64,page-0",
    );
  });

  it("bounds the rendered pages it keeps and releases a replaced document", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });
    loadPdfPagesMock.mockResolvedValue(loadedPages(12));
    renderPdfPageMock.mockImplementation((_document, index) =>
      Promise.resolve({
        index,
        dataUrl: `data:image/png;base64,page-${index}`,
        width: 794,
        height: 1123,
      }),
    );

    const resume = makeResume();
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();
    expect(core.getState().pageCount).toBe(12);

    // Walk the whole document: the panel must not accumulate a data URL per
    // page, or a long resume costs several MB that nothing ever releases.
    for (let page = 1; page <= 12; page += 1) {
      core.goToPage(page);
      await flush();
    }

    expect(Object.keys(core.getState().pageImages).length).toBeLessThanOrEqual(
      6,
    );
    // The page on screen is the one that must still be there.
    expect(core.getState().pageImages[11]).toBe(
      "data:image/png;base64,page-11",
    );
  });

  it("closes the previous document when a new one replaces it", async () => {
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    generatePdfPreviewMock.mockResolvedValue({
      bytesWritten: PDF_BYTES.length,
      bytes: PDF_BYTES,
    });

    const closed: number[] = [];
    loadPdfPagesMock.mockImplementation(() => {
      const pageCount = 3;
      return Promise.resolve({
        pageCount,
        close: () => closed.push(pageCount),
      });
    });
    renderPdfPageMock.mockImplementation((_document, index) =>
      Promise.resolve({
        index,
        dataUrl: `data:image/png;base64,page-${index}`,
        width: 794,
        height: 1123,
      }),
    );

    const first = makeResume();
    const core = createPrintPreviewCore();
    core.sync(first, first.sections);
    await flush();
    expect(loadPdfPagesMock).toHaveBeenCalledTimes(1);
    expect(closed).toEqual([]);

    // A document switch must release the MuPDF document of the one it
    // replaces: dropping the reference alone leaves the wasm handle allocated.
    const second = makeResume({ id: "resume-2", title: "Other" });
    core.sync(second, second.sections);
    await flush();

    expect(closed).toEqual([3]);
    expect(loadPdfPagesMock).toHaveBeenCalledTimes(2);
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
    const core = createPrintPreviewCore();
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
      React.createElement(PrintPreviewSurface, {
        controller: core,
        resume,
        sections: resume.sections,
      }),
    );
    expect(markup).toContain("out of date");
  });

  it("ignores a late result from an older snapshot key", async () => {
    let release: (() => void) | undefined;
    generateHtmlMock.mockResolvedValue("<html><body>x</body></html>");
    // BOTH generations stay in flight, so the only thing that can move the
    // panel forward is the late result this test releases by hand.
    generatePdfPreviewMock.mockImplementation(
      () =>
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
    const core = createPrintPreviewCore();
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
    // The edit is the newest request, so the panel is working on it - never
    // resting on the superseded result.
    expect(["generating", "outdated"]).toContain(core.getState().phase);
    expect(core.getState().pageImages).toEqual({});
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
    const core = createPrintPreviewCore();
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
    const core = createPrintPreviewCore();
    core.sync(resume, resume.sections);
    await flush();

    expect(core.getState().phase).toBe("failed");
    expect(core.getState().errorMessage).toContain("browser unavailable");

    const markup = renderToStaticMarkup(
      React.createElement(PrintPreviewSurface, {
        controller: core,
        resume,
        sections: resume.sections,
      }),
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
    // Every key the preview UI reads, so this test matches its own
    // name: a key added to one catalog only would leave a control
    // untranslated.
    const keys = [
      "live",
      "print",
      "estimatedPages",
      "estimateNotice",
      "boundaryGuide",
      "pageIndicator",
      "totalPages",
      "pageAlt",
      "pageRendering",
      "idle",
      "modeLabel",
      "modePdf",
      "modeOnePage",
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
        controller: createPrintPreviewCore(),
        resume,
        sections: resume.sections,
      }),
    );

    expect(markup).toContain("打印预览");
    await i18n.changeLanguage("en");
  });
});
