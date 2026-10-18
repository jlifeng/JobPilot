import mupdfWasmUrl from "../../../../node_modules/mupdf/dist/mupdf-wasm.wasm?url";

/**
 * Reusable PDF page reader for the paginated print preview.
 *
 * Factored out of the MuPDF usage in `resume-import.ts` so the editor can turn
 * PDF BYTES into a page count plus per-page PNG data URLs WITHOUT importing
 * `resume-import.ts` (which drags AI/import dependencies into the preview path).
 *
 * Two constraints shape this module:
 *
 * 1. `desktop/vitest.config.ts` runs in node env with no `optimizeDeps.exclude`,
 *    so `import("mupdf")` must stay inside a function. Only then can a test
 *    import this module and exercise the pure surface without booting wasm.
 * 2. `toPixmap` + `asPNG` are synchronous and CPU-bound, so pages are rendered
 *    ONE at a time, on demand, never up front: editing must stay responsive
 *    while a preview is being prepared.
 */

/** A4 page size in CSS px at 96 dpi. */
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

/** Render scale used when the caller does not ask for a specific one. */
export const DEFAULT_PDF_PAGE_SCALE = 1;

/** One rendered page of a loaded PDF. */
export interface PdfPageImage {
  /** 0-based page index. */
  index: number;
  /** `data:image/png;base64,...`, ready for an `<img src>`. */
  dataUrl: string;
  /** CSS px at 96dpi (A4 = 794x1123). */
  width: number;
  height: number;
}

/** A PDF opened for reading. No page has been rendered yet. */
export interface LoadedPdfPages {
  pageCount: number;
  /** Lazily rendered, kept in page order. */
  pages: PdfPageImage[];
}

/** Options for {@link renderPdfPage}. */
export interface RenderPdfPageOptions {
  /** 1 renders at 96dpi (A4 = 794x1123); 2 renders twice as large. */
  scale?: number;
}

interface MupdfModuleConfig {
  locateFile?: (path: string, prefix: string) => string;
}

type GlobalWithMupdfModule = typeof globalThis & {
  $libmupdf_wasm_Module?: MupdfModuleConfig;
};

/** A MuPDF page handle, narrowed to the calls this module makes. */
type MupdfPage = {
  toPixmap(
    matrix: number[],
    colorspace: unknown,
    alpha?: boolean,
    showExtras?: boolean,
  ): MupdfPixmap;
  destroy?(): void;
};

/** A MuPDF pixmap, narrowed to the calls this module makes. */
type MupdfPixmap = {
  getWidth(): number;
  getHeight(): number;
  asPNG(): Uint8Array;
  destroy?(): void;
};

/** A MuPDF document, narrowed to the calls this module makes. */
type MupdfDocument = {
  countPages(): number;
  loadPage(index: number): MupdfPage;
};

/** The MuPDF module namespace, narrowed to what this module calls. */
type MupdfNamespace = {
  Matrix: { scale(sx: number, sy: number): number[] };
  ColorSpace: { DeviceRGB: unknown };
  Document: { openDocument(from: Uint8Array, magic?: string): MupdfDocument };
};

/**
 * State kept beside a `LoadedPdfPages` value.
 *
 * Deliberately NOT part of `LoadedPdfPages`: the public contract stays a plain
 * data object, so callers can build and compare one without knowing that a wasm
 * document and its module namespace have to stay alive for later renders.
 */
interface PdfReaderState {
  document: MupdfDocument;
  mupdf: MupdfNamespace;
  /** Already-rendered pages, keyed by index, so a repeat call is free. */
  rendered: Map<number, PdfPageImage>;
}

/** Keeps the wasm document alive without widening the public interface. */
const readerStates = new WeakMap<LoadedPdfPages, PdfReaderState>();

/** Every PDF starts with these bytes; anything else is refused before wasm. */
const PDF_HEADER = "%PDF-";

/**
 * Page box in CSS px at 96dpi for a render scale.
 *
 * Scale 1 matches the editor's continuous preview sheet (794x1123), so a
 * previewed PNG and the live sheet agree on layout width. Scale 2 is the crisp
 * option for zoomed inspection. Both dimensions scale together, so the A4
 * aspect ratio never drifts.
 */
export function a4PageSizeAtScale(scale: number): {
  width: number;
  height: number;
} {
  const factor =
    Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_PDF_PAGE_SCALE;

  return {
    width: Math.round(A4_WIDTH * factor),
    height: Math.round(A4_HEIGHT * factor),
  };
}

/**
 * Loads MuPDF wasm.
 *
 * Mirrors `desktop/src/lib/resume-import.ts`: the `locateFile` hook preserves
 * whatever configuration a previous loader installed, so both callers can share
 * the single global `$libmupdf_wasm_Module` slot. The `import("mupdf")` is what
 * keeps this module importable under vitest's node environment.
 */
async function loadMupdf(): Promise<MupdfNamespace> {
  const runtime = globalThis as GlobalWithMupdfModule;
  const previousConfig = runtime.$libmupdf_wasm_Module;

  runtime.$libmupdf_wasm_Module = {
    ...previousConfig,
    locateFile: (path: string, prefix: string) => {
      if (path === "mupdf-wasm.wasm") {
        return mupdfWasmUrl;
      }

      if (previousConfig?.locateFile) {
        return previousConfig.locateFile(path, prefix);
      }

      return `${prefix}${path}`;
    },
  };

  const module = await import("mupdf");

  return module.default as unknown as MupdfNamespace;
}

/** True when the bytes start with a PDF header. Pure and pre-wasm. */
function hasPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_HEADER.length) {
    return false;
  }

  for (let offset = 0; offset < PDF_HEADER.length; offset += 1) {
    if (bytes[offset] !== PDF_HEADER.charCodeAt(offset)) {
      return false;
    }
  }

  return true;
}

/** Hands the main thread back before a synchronous, CPU-bound render. */
function yieldToEventLoop(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Opens a PDF and reports its page count WITHOUT rendering any page.
 *
 * Rendering is deferred to {@link renderPdfPage} because every page render is a
 * synchronous, CPU-bound wasm call.
 */
export async function loadPdfPages(bytes: Uint8Array): Promise<LoadedPdfPages> {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  if (!hasPdfHeader(buffer)) {
    throw new Error("loadPdfPages: bytes are not a PDF (missing %PDF- header)");
  }

  const mupdf = await loadMupdf();
  const document = mupdf.Document.openDocument(buffer, "application/pdf");

  const loaded: LoadedPdfPages = {
    pageCount: document.countPages(),
    pages: [],
  };

  readerStates.set(loaded, {
    document,
    mupdf,
    rendered: new Map<number, PdfPageImage>(),
  });

  return loaded;
}

/**
 * Renders one page on demand (0-based).
 *
 * Safe to call repeatedly for the same index: the first call renders, later
 * calls return the memoised image. An index outside `[0, pageCount)` is refused
 * before any wasm work happens, so a stale caller can never render a page that
 * no longer exists after a refresh produced a shorter document.
 */
export async function renderPdfPage(
  loaded: LoadedPdfPages,
  index: number,
  options?: RenderPdfPageOptions,
): Promise<PdfPageImage> {
  if (!Number.isInteger(index) || index < 0 || index >= loaded.pageCount) {
    throw new Error(
      `renderPdfPage: page index ${index} is outside the document range 0-${loaded.pageCount - 1}`,
    );
  }

  const state = readerStates.get(loaded);
  if (!state) {
    throw new Error(
      "renderPdfPage: this LoadedPdfPages was not produced by loadPdfPages",
    );
  }

  const cached = state.rendered.get(index);
  if (cached) {
    return cached;
  }

  const scale =
    options?.scale && Number.isFinite(options.scale) && options.scale > 0
      ? options.scale
      : DEFAULT_PDF_PAGE_SCALE;
  const fallback = a4PageSizeAtScale(scale);

  // Yield first: the render below blocks the thread, so anything the caller
  // queued in the meantime (including abandoning a superseded preview) runs now.
  await yieldToEventLoop();

  const page = state.document.loadPage(index);
  const pixmap = page.toPixmap(
    state.mupdf.Matrix.scale(scale, scale),
    state.mupdf.ColorSpace.DeviceRGB,
    false,
    true,
  );

  // The pixmap is the largest allocation in this flow, so take the PNG bytes and
  // release it immediately.
  const pngBytes = new Uint8Array(pixmap.asPNG());
  const width = pixmap.getWidth() > 0 ? pixmap.getWidth() : fallback.width;
  const height = pixmap.getHeight() > 0 ? pixmap.getHeight() : fallback.height;
  pixmap.destroy?.();

  const image: PdfPageImage = {
    index,
    dataUrl: readBytesAsDataUrl(pngBytes),
    width,
    height,
  };

  state.rendered.set(index, image);
  loaded.pages = [...state.rendered.values()].sort((a, b) => a.index - b.index);

  return image;
}

/** Encodes PNG bytes as a `data:image/png;base64,...` URL. */
function readBytesAsDataUrl(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;

  // Chunked to stay well clear of the argument-count limit of `String.fromCharCode`.
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }

  return `data:image/png;base64,${btoa(binary)}`;
}
