import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------
// Mocks: the native and wasm edges of the export path. The node test
// environment has neither Tauri nor a browser, so `@/lib/export`,
// `../../lib/desktop-api`, the MuPDF page reader and the dialog plugin are
// stubbed, and the reuse decision is asserted from the call counts and
// payloads they record.
// ---------------------------------------------------------------------
const generateHtmlMock = vi.hoisted(() => vi.fn());
const generatePdfPreviewMock = vi.hoisted(() => vi.fn());
const writePdfExportMock = vi.hoisted(() => vi.fn());
const writeExportFileMock = vi.hoisted(() => vi.fn());
const saveDialogMock = vi.hoisted(() => vi.fn());
const loadPdfPagesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/export", () => ({
  generateHtml: generateHtmlMock,
  generateMarkdown: vi.fn(),
  generatePlainText: vi.fn(),
}));
vi.mock("../../../lib/desktop-api", () => ({
  generatePdfPreview: generatePdfPreviewMock,
  writePdfExport: writePdfExportMock,
  writeExportFile: writeExportFileMock,
}));
vi.mock("../../../lib/preview/pdf-pages", () => ({
  A4_WIDTH: 794,
  A4_HEIGHT: 1123,
  DEFAULT_PDF_PAGE_SCALE: 1,
  loadPdfPages: loadPdfPagesMock,
  renderPdfPage: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: saveDialogMock,
}));

// Zustand v5 reads getInitialState() for the server snapshot, so the dialog's
// store subscription must be stubbed for `renderToStaticMarkup`.
const storeHolder = vi.hoisted(() => ({
  state: {
    currentResume: null,
    isDirty: false,
    save: vi.fn(),
    sections: [],
  } as {
    currentResume: Resume | null;
    isDirty: boolean;
    save: () => Promise<void>;
    sections: ResumeSection[];
  },
}));

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

import { i18n } from "../../../i18n";
import type {
  Resume,
  ResumeSection,
  ThemeConfig,
} from "../../../types/resume";
import {
  clearPdfArtifactCache,
  getCachedPdfArtifact,
} from "../../../lib/preview/preview-artifact-cache";
import { createPreviewSnapshot } from "../../../lib/preview/snapshot";
import { createPrintPreviewCore } from "../print-preview-panel";
import { ExportDialog, writePdfExportForFormat } from "../export-dialog";

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

const CACHED_BYTES = Array.from(
  new TextEncoder().encode("%PDF-1.4 the pdf the user previewed"),
);

/**
 * Minimal shared-resume shape for the helper under test: a cache hit never
 * reaches the HTML generator, so only the identity fields matter.
 */
function toSharedShape(resume: Resume, sections = resume.sections) {
  return {
    id: resume.id,
    userId: resume.userId,
    title: resume.title,
    template: resume.template,
    themeConfig: resume.themeConfig,
    isDefault: resume.isDefault,
    language: resume.language,
    targetJobTitle: resume.targetJobTitle,
    targetCompany: resume.targetCompany,
    sections: sections.map((section) => ({
      ...section,
      createdAt: new Date(section.createdAt),
      updatedAt: new Date(section.updatedAt),
    })),
    createdAt: new Date(resume.createdAt),
    updatedAt: new Date(resume.updatedAt),
  };
}

/** Let queued microtasks (and mocked timers) settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function pdfReceipt() {
  return { bytesWritten: CACHED_BYTES.length, bytes: CACHED_BYTES };
}

beforeEach(() => {
  clearPdfArtifactCache();
  generateHtmlMock.mockReset();
  generateHtmlMock.mockResolvedValue("<html><body>regenerated</body></html>");
  generatePdfPreviewMock.mockReset();
  generatePdfPreviewMock.mockResolvedValue(pdfReceipt());
  loadPdfPagesMock.mockReset();
  loadPdfPagesMock.mockResolvedValue({
    pageCount: 1,
    pages: [
      {
        index: 0,
        dataUrl: "data:image/png;base64,page-0",
        width: 794,
        height: 1123,
      },
    ],
  });
  writePdfExportMock.mockReset();
  writePdfExportMock.mockResolvedValue({
    fileName: "resume.pdf",
    outputPath: "C:\\tmp\\resume.pdf",
    bytesWritten: 42,
  });
  writeExportFileMock.mockReset();
  writeExportFileMock.mockResolvedValue({
    fileName: "resume.pdf",
    outputPath: "C:\\tmp\\resume.pdf",
    bytesWritten: CACHED_BYTES.length,
  });
  saveDialogMock.mockReset();
  saveDialogMock.mockResolvedValue("C:\\tmp\\resume.pdf");
});

describe("print preview publishes the artifact an export reuses", () => {
  it("saves the PDF the preview generated, without regenerating it", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();

    const snapshot = createPreviewSnapshot(resume, resume.sections, "pdf");
    expect(snapshot).not.toBeNull();

    const published = getCachedPdfArtifact(snapshot!.key, "pdf", false);
    expect(published).not.toBeNull();
    expect(published!.bytes).toEqual(CACHED_BYTES);

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf",
    });

    expect(writeExportFileMock).toHaveBeenCalledTimes(1);
    expect(writeExportFileMock.mock.calls[0][0].bytes).toEqual(CACHED_BYTES);
    expect(generateHtmlMock).not.toHaveBeenCalled();
    expect(writePdfExportMock).not.toHaveBeenCalled();
  });

  it("misses and regenerates after an edit invalidates the previewed artifact", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();
    expect(getCachedPdfArtifactCountFor(resume, "pdf")).toBe(1);

    // An edit changes the effective snapshot key.
    const edited = [makeSection("section-1", { title: "Renamed" })];
    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume, edited),
      previewSource: { resume, sections: edited },
      anonymized: false,
      format: "pdf",
    });

    expect(writeExportFileMock).not.toHaveBeenCalled();
    expect(generateHtmlMock).toHaveBeenCalledTimes(1);
    expect(writePdfExportMock).toHaveBeenCalledTimes(1);
  });

  it("misses for an anonymized export and regenerates", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();
    // The previewed artifact is never anonymized.
    const snapshot = createPreviewSnapshot(resume, resume.sections, "pdf");
    expect(getCachedPdfArtifact(snapshot!.key, "pdf", false)).not.toBeNull();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\anonymous-resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: true,
      format: "pdf",
    });

    expect(writeExportFileMock).not.toHaveBeenCalled();
    expect(generateHtmlMock).toHaveBeenCalledTimes(1);
    expect(writePdfExportMock).toHaveBeenCalledTimes(1);
  });

  it("clears the previous document's artifact on a document switch", async () => {
    const first = makeResume();
    const core = createPrintPreviewCore({
      resume: () => first,
      sections: () => first.sections,
    });
    core.sync(first, first.sections);
    await flush();
    expect(getCachedPdfArtifactCountFor(first, "pdf")).toBe(1);

    const second = makeResume({ id: "resume-2", title: "Other" });
    core.sync(second, second.sections);
    await flush();

    // Only the second document's artifact may remain.
    expect(getCachedPdfArtifactCountFor(first, "pdf")).toBe(0);
    expect(getCachedPdfArtifactCountFor(second, "pdf")).toBe(1);
  });
});

describe("export reuses the previewed PDF artifact", () => {
  it("writes the cached bytes and does not regenerate for an unchanged PDF export", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();

    const receipt = await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf",
    });

    expect(receipt.bytesWritten).toBe(CACHED_BYTES.length);
    expect(writeExportFileMock).toHaveBeenCalledTimes(1);
    expect(writeExportFileMock.mock.calls[0][0]).toEqual({
      outputPath: "C:\\tmp\\resume.pdf",
      expectedExtension: "pdf",
      bytes: CACHED_BYTES,
    });
    expect(generateHtmlMock).not.toHaveBeenCalled();
    expect(writePdfExportMock).not.toHaveBeenCalled();
  });

  it("writes the cached bytes for Smart One-Page when that mode was previewed", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    core.selectMode("pdf-one-page");
    await flush();
    generateHtmlMock.mockClear();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf-one-page",
    });

    expect(writeExportFileMock).toHaveBeenCalledTimes(1);
    expect(writeExportFileMock.mock.calls[0][0].bytes).toEqual(CACHED_BYTES);
    expect(generateHtmlMock).not.toHaveBeenCalled();
    expect(writePdfExportMock).not.toHaveBeenCalled();
  });

  it("does not reuse a normal-PDF artifact for a Smart One-Page export", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf-one-page",
    });

    // Different output mode: regenerate with the one-page fit applied.
    expect(writeExportFileMock).not.toHaveBeenCalled();
    expect(generateHtmlMock).toHaveBeenCalledTimes(1);
    expect(writePdfExportMock).toHaveBeenCalledTimes(1);
    const payload = writePdfExportMock.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("fitToOnePage");
  });

  it("does not reuse a Smart One-Page artifact for a normal PDF export", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    core.selectMode("pdf-one-page");
    await flush();
    generateHtmlMock.mockClear();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf",
    });

    expect(writeExportFileMock).not.toHaveBeenCalled();
    expect(writePdfExportMock).toHaveBeenCalledTimes(1);
    const payload = writePdfExportMock.mock.calls[0][0] as { html: string };
    expect(payload.html).not.toContain("fitToOnePage");
  });

  it("regenerates when the cache is empty", async () => {
    const resume = makeResume();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\resume.pdf",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf",
    });

    expect(writeExportFileMock).not.toHaveBeenCalled();
    expect(writePdfExportMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing output path and extension handling on a hit", async () => {
    const resume = makeResume();
    const core = createPrintPreviewCore({
      resume: () => resume,
      sections: () => resume.sections,
    });
    core.sync(resume, resume.sections);
    await flush();
    // Forget the preview's own HTML build; only the export's calls matter.
    generateHtmlMock.mockClear();

    await writePdfExportForFormat({
      outputPath: "C:\\tmp\\elsewhere\\no-extension",
      exportResume: toSharedShape(resume),
      previewSource: { resume, sections: resume.sections },
      anonymized: false,
      format: "pdf",
    });

    // The caller's path is forwarded verbatim; the Rust side normalizes the
    // extension, exactly as it does for every other export format.
    expect(writeExportFileMock.mock.calls[0][0].outputPath).toBe(
      "C:\\tmp\\elsewhere\\no-extension",
    );
    expect(writeExportFileMock.mock.calls[0][0].expectedExtension).toBe("pdf");
  });
});

describe("ExportDialog PDF export surface", () => {
  it("offers both PDF modes with the anonymization control", async () => {
    // i18next initialises asynchronously, so the language must settle before
    // the dialog reads it.
    await i18n.changeLanguage("en");

    const markup = renderToStaticMarkup(
      React.createElement(ExportDialog, {
        open: true,
        onClose: () => {},
        resumeId: "resume-1",
      }),
    );

    expect(markup).toContain("Smart One-Page");
    expect(markup).toContain("export-anonymize-sensitive-data");
  });
});

/** 1 when the print preview published an artifact for this snapshot, else 0. */
function getCachedPdfArtifactCountFor(
  resume: Resume,
  mode: "pdf" | "pdf-one-page",
): number {
  const snapshot = createPreviewSnapshot(resume, resume.sections, mode);
  return snapshot && getCachedPdfArtifact(snapshot.key, mode, false) ? 1 : 0;
}
