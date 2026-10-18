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

  return JSON.stringify(stableJson(payload));
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
  };
}
