import React, { act, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------
// Mocks for the native + wasm edges, exactly as the other preview tests
// stub them: `desktop/vitest.config.ts` runs in node env with no browser.
// ---------------------------------------------------------------------
const generateHtmlMock = vi.hoisted(() => vi.fn());
const generatePdfPreviewMock = vi.hoisted(() => vi.fn());
const loadPdfPagesMock = vi.hoisted(() => vi.fn());
const renderPdfPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/export", () => ({ generateHtml: generateHtmlMock }));
vi.mock("../../../lib/desktop-api", () => ({
  generatePdfPreview: generatePdfPreviewMock,
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

import { i18n } from "../../../i18n";
import type { Resume, ResumeSection, ThemeConfig } from "../../../types/resume";
import {
  usePrintPreview,
  type PrintPreviewCore,
} from "../print-preview-panel";
import {
  installDomShim,
  restoreDomShim,
  shimText,
  type ShimDocument,
  type ShimElementNode,
} from "./dom-shim";

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
  new TextEncoder().encode("%PDF-1.4 binding preview pdf"),
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

// ---------------------------------------------------------------------
// The real React binding under test
// ---------------------------------------------------------------------

/** The component the hook lives in, capturing the state it exposes. */
function MountedPreview({
  resume,
  sections,
  onController,
}: {
  resume: Resume | null;
  sections: ResumeSection[];
  onController: (controller: PrintPreviewCore) => void;
}) {
  const controller = usePrintPreview(resume, sections);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  onController(controller);

  return React.createElement(
    "div",
    { "data-testid": "preview-phase" },
    state.phase,
  );
}

let root: Root | null = null;
let shimDocument: ShimDocument | null = null;
let container: ShimElementNode | null = null;

async function mountAndSettle(
  resume: Resume | null,
  sections: ResumeSection[],
  onController: (controller: PrintPreviewCore) => void = () => {},
): Promise<void> {
  const node = shimDocument!.createElement("div");
  shimDocument!.body.appendChild(node);
    container = node;
  root = createRoot(node as unknown as Element);
  await act(async () => {
    root!.render(
      React.createElement(MountedPreview, { resume, sections, onController }),
    );
  });
  await act(async () => {
    await flush();
  });
}

beforeEach(() => {
  generateHtmlMock.mockReset();
  generateHtmlMock.mockResolvedValue(
    "<html><body><div class=\"resume-export\">x</div></body></html>",
  );
  generatePdfPreviewMock.mockReset();
  generatePdfPreviewMock.mockResolvedValue({
    bytesWritten: PDF_BYTES.length,
    bytes: PDF_BYTES,
  });
  loadPdfPagesMock.mockReset();
  loadPdfPagesMock.mockResolvedValue(loadedPages(3));
  renderPdfPageMock.mockReset();
  renderPdfPageMock.mockResolvedValue({
    index: 0,
    dataUrl: "data:image/png;base64,page-0",
    width: 794,
    height: 1123,
  });

  shimDocument = installDomShim();
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  container = null;
  shimDocument = null;
  restoreDomShim();
});

describe("usePrintPreview React binding", () => {
  it("generates the exportable PDF on mount without being handed a host", async () => {
    await i18n.changeLanguage("en");

    const resume = makeResume();
    await mountAndSettle(resume, resume.sections);

    // The hook must wire its own host into the core: the very first mount has
    // to reach the browser pipeline on its own.
    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);
    const payload = generatePdfPreviewMock.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("resume-export");
  });

  it("shows the generated page count once the hook has produced a PDF", async () => {
    await i18n.changeLanguage("en");

    const resume = makeResume();
    const phases: string[] = [];
    let controller: PrintPreviewCore | null = null;

    await mountAndSettle(resume, resume.sections, (bound) => {
      controller = bound;
      phases.push(bound.getState().phase);
    });

    expect(controller!.getState().phase).toBe("current");
    expect(controller!.getState().pageCount).toBe(3);
    // The rendered output agrees with the state the core reports.
    expect(phases).toContain("current");
    expect(container && shimText(container)).toContain("current");
  });

  it("regenerates with the Smart One-Page fit when the hook switches mode", async () => {
    await i18n.changeLanguage("en");

    const resume = makeResume();
    let controller: PrintPreviewCore | null = null;

    await mountAndSettle(resume, resume.sections, (bound) => {
      controller = bound;
    });
    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      controller!.selectMode("pdf-one-page", resume, resume.sections);
    });
    await act(async () => {
      await flush();
    });

    expect(generatePdfPreviewMock).toHaveBeenCalledTimes(2);
    const payload = generatePdfPreviewMock.mock.calls[1][0] as { html: string };
    expect(payload.html).toContain("fitToOnePage");
  });
});
