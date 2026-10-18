import type { PdfPreviewMode } from "./snapshot";

// Re-exported so callers of the cache seam do not have to reach into the
// snapshot module for the mode type.
export type { PdfPreviewMode };

/**
 * In-memory seam between print preview and export.
 *
 * The print preview already generates the very PDF the user would export
 * (same HTML, same PDF mode, same browser pipeline). Saving that unchanged
 * preview therefore has to reuse the generated artifact instead of running the
 * whole pipeline a second time - the spec requires the saved file to be the
 * document the user checked, while also requiring that a changed document or a
 * changed privacy option never reuses a stale artifact.
 *
 * The key is the effective snapshot key from `createPreviewSnapshot`
 * (mode + document + template + title + language + theme + every section's
 * identity/order/visibility/content), so it changes exactly when the output
 * would change. `anonymized` is a SEPARATE axis on purpose: a preview artifact
 * is always generated from the un-anonymized document, so it must never be
 * handed to an anonymized export, and vice versa.
 *
 * Deliberately in-memory only: no persistence, no schema, no Tauri command.
 * A cache entry lives only for the current preview lifecycle and is dropped on
 * document switches.
 */

export interface CachedPdfArtifact {
  key: string;
  mode: PdfPreviewMode;
  /** The exact HTML that produced the PDF. */
  html: string;
  /** The generated PDF bytes. */
  bytes: number[];
  bytesWritten: number;
  /** Whether the source resume was anonymized when the PDF was generated. */
  anonymized: boolean;
}

/**
 * Upper bound on cached artifacts. The editor only ever has one live preview
 * at a time, but a refresh, a mode switch and an edit can each leave a distinct
 * artifact behind, so a handful of entries covers real usage. Insertion order
 * is preserved and the oldest entry is evicted first (FIFO), which keeps a
 * recently refreshed document from being dropped in favour of stale ones.
 */
export const MAX_CACHED_PDF_ARTIFACTS = 8;

const cache = new Map<string, CachedPdfArtifact>();

/**
 * Read an artifact back. A hit requires key AND mode AND anonymized to match;
 * anything else is a miss, so the caller regenerates instead of writing a PDF
 * that does not describe the current document or the current privacy option.
 */
export function getCachedPdfArtifact(
  key: string,
  mode: PdfPreviewMode,
  anonymized: boolean,
): CachedPdfArtifact | null {
  const artifact = cache.get(key);
  if (!artifact) return null;
  if (artifact.mode !== mode) return null;
  if (artifact.anonymized !== anonymized) return null;
  return artifact;
}

/**
 * Store (or overwrite) the artifact for a key.
 *
 * A re-store deletes first, so `Map.set` cannot silently keep the old
 * insertion position: refreshing an artifact makes it the newest entry, and
 * the bound therefore evicts the least recently stored artifact.
 */
export function setCachedPdfArtifact(artifact: CachedPdfArtifact): void {
  cache.delete(artifact.key);
  cache.set(artifact.key, artifact);

  while (cache.size > MAX_CACHED_PDF_ARTIFACTS) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

/** Drop every cached artifact (used on document switch). */
export function clearPdfArtifactCache(): void {
  cache.clear();
}
