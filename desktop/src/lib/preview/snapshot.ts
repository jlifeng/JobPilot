import type {
  Resume as DesktopResume,
  ResumeSection as DesktopResumeSection,
  ThemeConfig,
} from "../../types/resume";

/**
 * Immutable snapshot of the effective document behind a preview.
 *
 * One snapshot answers "which document and which output mode is this preview
 * result for?" so a stale PDF can never be presented as current, and so an
 * unchanged preview can be saved from the very PDF it displayed.
 *
 * This module is deliberately free of MuPDF, Tauri invoke and `@/lib/export`:
 * it stays pure data so it can be unit-tested in vitest's node environment.
 */

/** PDF output modes the editor can preview. */
export type PdfPreviewMode = "pdf" | "pdf-one-page";

export interface PreviewSnapshotSection {
  id: string;
  resumeId: string;
  type: string;
  title: string;
  sortOrder: number;
  visible: boolean;
  /** Desktop section content, deep-cloned from the editor store. */
  content: DesktopResumeSection["content"];
  createdAt: string;
  updatedAt: string;
}

export interface PreviewSnapshot {
  /**
   * Stable identity of the effective document and output mode: mode, document
   * id, template, title, language, theme and every section's id/type/title/
   * order/visibility/content. Two snapshots with the same key describe the same
   * output, so a preview result keyed by it is either current or outdated.
   * Derived from a serialisation of exactly those inputs, never from object
   * identity, so unrelated churn (new objects, re-saved timestamps) does not
   * invalidate a still-matching result.
   */
  key: string;
  mode: PdfPreviewMode;
  title: string;
  language: string;
  template: string;
  themeConfig: ThemeConfig;
  sections: PreviewSnapshotSection[];
  /**
   * The document this snapshot was taken from, so the generation pipeline
   * can build the shared resume without the caller re-supplying it. The
   * object is the store's own reference; the cloned section list above is
   * what is rendered, so a later editor mutation cannot change a result
   * that is already in flight.
   */
  resume: DesktopResume;
}

/**
 * Serialize only what changes the rendered output, with object keys sorted, so
 * the key depends on values rather than on object identity or property order.
 * Autosave timestamps, target-job metadata and other display-only fields are
 * intentionally excluded: they must not invalidate a matching result.
 */
function buildKey(
  resume: DesktopResume,
  sections: DesktopResumeSection[],
  mode: PdfPreviewMode,
): string {
  const payload = {
    mode,
    resumeId: resume.id,
    template: resume.template,
    title: resume.title,
    language: resume.language,
    themeConfig: stableJson(resume.themeConfig),
    sections: sections.map((section) => ({
      id: section.id,
      resumeId: section.resumeId,
      type: section.type,
      title: section.title,
      sortOrder: section.sortOrder,
      visible: section.visible,
      content: stableJson(section.content),
    })),
  };

  return hashJson(stableJson(payload));
}

/**
 * 64-bit FNV-1a over the serialised payload, hex-encoded.
 *
 * The key is compared on every store change and used as a map address, so it
 * has to be cheap and fixed-size. Serialising the whole resume and keeping the
 * string made a multi-hundred-KB key out of a long document, rebuilt on every
 * keystroke; hashing it keeps the comparison and the lookup O(1) in the key
 * length while still changing whenever any serialised input changes.
 *
 * Two independent 32-bit lanes (one fed by the low byte of each character, one
 * by the high byte) make an accidental collision across the inputs that matter
 * - mode, document id, per-section content - vanishingly unlikely, and the
 * digest is not security-sensitive: it only decides whether a cached PDF still
 * describes the document on screen.
 */
function hashJson(value: unknown): string {
  const serialized = JSON.stringify(value);

  // FNV-1a, carried as two 32-bit lanes so the arithmetic stays exact in
  // JavaScript numbers. Both start from the same offset basis.
  let low = 0x811c9dc5;
  let high = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);

    low ^= code & 0xff;
    low = Math.imul(low, 0x01000193) >>> 0;
    // The high byte only varies for non-ASCII input, so it is folded in
    // separately: a two-lane digest still changes when either byte changes.
    high ^= (code >>> 8) & 0xff;
    high = Math.imul(high, 0x01000193) >>> 0;
  }

  const hex = (value: number): string =>
    value.toString(16).padStart(8, "0");

  return `${hex(high)}${hex(low)}`;
}

/** JSON with recursively sorted object keys, so equal content gives one string. */
function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableJson(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          stableJson((value as Record<string, unknown>)[key]),
        ]),
    );
  }

  return value;
}

/**
 * Build the immutable effective snapshot for a preview.
 *
 * Returns null when no resume is loaded, so callers can clear preview state on
 * document switches instead of rendering a previous document's result.
 */
export function createPreviewSnapshot(
  resume: DesktopResume | null,
  sections: DesktopResumeSection[],
  mode: PdfPreviewMode,
): PreviewSnapshot | null {
  if (!resume) {
    return null;
  }

  // Deep clone: an editor mutation after this snapshot was taken must not be
  // able to change a preview result that is already in flight.
  const cloned = sections.map((section) => structuredClone(section));

  return {
    key: buildKey(resume, cloned, mode),
    mode,
    title: resume.title,
    language: resume.language,
    template: resume.template,
    themeConfig: structuredClone(resume.themeConfig),
    sections: cloned,
    resume,
  };
}
