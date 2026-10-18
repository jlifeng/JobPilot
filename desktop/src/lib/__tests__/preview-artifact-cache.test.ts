import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import {
  clearPdfArtifactCache,
  getCachedPdfArtifact,
  MAX_CACHED_PDF_ARTIFACTS,
  setCachedPdfArtifact,
  type CachedPdfArtifact,
} from "../preview/preview-artifact-cache";

/**
 * The cache is the seam that lets an unchanged export save the very PDF the
 * print preview displayed. Its only safety property is that a hit requires the
 * key, the PDF mode and the anonymized flag to ALL match: that is what stops a
 * stale document, a different output mode or an anonymized export from being
 * served a PDF it did not ask for.
 */

const PDF_BYTES = Array.from(
  new TextEncoder().encode("%PDF-1.4 cached artifact"),
);

function artifact(
  overrides: Partial<CachedPdfArtifact> = {},
): CachedPdfArtifact {
  return {
    key: "key-a",
    mode: "pdf",
    html: "<html><body>a</body></html>",
    bytes: PDF_BYTES,
    bytesWritten: PDF_BYTES.length,
    anonymized: false,
    ...overrides,
  };
}

beforeEach(() => {
  clearPdfArtifactCache();
});

describe("preview artifact cache", () => {
  it("returns the artifact when key, mode and anonymized all match", () => {
    setCachedPdfArtifact(artifact());

    const hit = getCachedPdfArtifact("key-a", "pdf", false);
    assert.notEqual(hit, null);
    assert.equal(hit?.key, "key-a");
    assert.equal(hit?.mode, "pdf");
    assert.equal(hit?.bytesWritten, PDF_BYTES.length);
    assert.deepEqual(hit?.bytes, PDF_BYTES);
  });

  it("misses for a different key", () => {
    setCachedPdfArtifact(artifact({ key: "key-a" }));

    assert.equal(getCachedPdfArtifact("key-b", "pdf", false), null);
  });

  it("misses for a different mode", () => {
    setCachedPdfArtifact(artifact({ key: "key-a", mode: "pdf" }));

    assert.equal(getCachedPdfArtifact("key-a", "pdf-one-page", false), null);
  });

  it("misses when the cached artifact is anonymized but the export is not", () => {
    setCachedPdfArtifact(artifact({ anonymized: true }));

    assert.equal(getCachedPdfArtifact("key-a", "pdf", false), null);
  });

  it("misses when the export is anonymized but the cached artifact is not", () => {
    // The print preview never anonymizes, so this is the direction that would
    // otherwise leak sensitive data into an anonymized export.
    setCachedPdfArtifact(artifact({ anonymized: false }));

    assert.equal(getCachedPdfArtifact("key-a", "pdf", true), null);
  });

  it("hits an anonymized artifact for an anonymized export", () => {
    setCachedPdfArtifact(artifact({ anonymized: true }));

    assert.notEqual(getCachedPdfArtifact("key-a", "pdf", true), null);
  });

  it("replaces the previous artifact for the same key", () => {
    setCachedPdfArtifact(artifact({ bytes: [1, 2, 3] }));
    setCachedPdfArtifact(artifact({ bytes: [4, 5, 6] }));

    const hit = getCachedPdfArtifact("key-a", "pdf", false);
    assert.deepEqual(hit?.bytes, [4, 5, 6]);
  });

  it("overwriting changes the stored mode", () => {
    setCachedPdfArtifact(artifact({ mode: "pdf" }));
    setCachedPdfArtifact(artifact({ mode: "pdf-one-page" }));

    assert.equal(getCachedPdfArtifact("key-a", "pdf", false), null);
    assert.notEqual(getCachedPdfArtifact("key-a", "pdf-one-page", false), null);
  });

  it("keeps artifacts for different keys side by side", () => {
    setCachedPdfArtifact(artifact({ key: "key-a" }));
    setCachedPdfArtifact(artifact({ key: "key-b", mode: "pdf-one-page" }));

    assert.notEqual(getCachedPdfArtifact("key-a", "pdf", false), null);
    assert.notEqual(getCachedPdfArtifact("key-b", "pdf-one-page", false), null);
  });

  it("clear empties the cache", () => {
    setCachedPdfArtifact(artifact());
    assert.notEqual(getCachedPdfArtifact("key-a", "pdf", false), null);

    clearPdfArtifactCache();

    assert.equal(getCachedPdfArtifact("key-a", "pdf", false), null);
  });

  it("keeps at most the documented bound and evicts the oldest entry first", () => {
    for (let index = 0; index < MAX_CACHED_PDF_ARTIFACTS + 4; index += 1) {
      setCachedPdfArtifact(artifact({ key: `key-${index}` }));
    }

    // The four oldest insertions are gone...
    assert.equal(getCachedPdfArtifact("key-0", "pdf", false), null);
    assert.equal(getCachedPdfArtifact("key-3", "pdf", false), null);
    // ...and the most recent ones are still served.
    assert.notEqual(
      getCachedPdfArtifact(`key-${MAX_CACHED_PDF_ARTIFACTS + 3}`, "pdf", false),
      null,
    );
  });

  it("a re-stored artifact outranks older entries, so a refreshed one survives", () => {
    setCachedPdfArtifact(artifact({ key: "key-stale" }));

    // Fill the bound, refreshing `key-fresh` on every insert. Without the
    // delete-before-set the refreshed entry keeps its original (oldest)
    // insertion slot and would be evicted even though it is the newest one.
    for (let index = 0; index < MAX_CACHED_PDF_ARTIFACTS; index += 1) {
      setCachedPdfArtifact(artifact({ key: "key-fresh" }));
      setCachedPdfArtifact(artifact({ key: `key-${index}` }));
    }

    assert.notEqual(getCachedPdfArtifact("key-fresh", "pdf", false), null);
    // The never-refreshed entry from before the fill is the one that goes.
    assert.equal(getCachedPdfArtifact("key-stale", "pdf", false), null);
  });
});
