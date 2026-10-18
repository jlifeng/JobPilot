import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

// `desktop-api` is a large bridge module; the only native seam it uses is
// `invoke` from `@tauri-apps/api/core`, so that is the single mock point.
const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
  isTauri: false,
}));

import {
  generatePdfPreview,
  type PdfPreviewGenerateInput,
  type PdfPreviewReceipt,
} from "../desktop-api";

const HTML = "<html><body><h1>Backend Engineer</h1></body></html>";

function input(): PdfPreviewGenerateInput {
  return { html: HTML };
}

function receipt(): PdfPreviewReceipt {
  return { bytesWritten: 8, bytes: Array.from(Buffer.from("%PDF-1.4", "utf8")) };
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe("generatePdfPreview", () => {
  it("invokes generate_pdf_preview with the html payload unchanged", async () => {
    invokeMock.mockResolvedValue(receipt());

    const payload = input();
    await generatePdfPreview(payload);

    assert.equal(invokeMock.mock.calls.length, 1, "exactly one invoke");
    assert.equal(invokeMock.mock.calls[0][0], "generate_pdf_preview");
    assert.deepEqual(invokeMock.mock.calls[0][1], { html: HTML });
    // The wrapper forwards the caller's object, never a rebuilt copy.
    assert.equal(invokeMock.mock.calls[0][1], payload);
  });

  it("keeps payload keys the caller supplied", async () => {
    invokeMock.mockResolvedValue(receipt());

    await generatePdfPreview({ html: HTML, extraKey: "kept" });

    assert.deepEqual(invokeMock.mock.calls[0][1], {
      html: HTML,
      extraKey: "kept",
    });
  });

  it("passes the receipt through as-is", async () => {
    const resolved = receipt();
    invokeMock.mockResolvedValue(resolved);

    const received = await generatePdfPreview(input());

    assert.deepEqual(received, resolved);
    assert.equal(received.bytesWritten, 8);
    assert.equal(received.bytes.length, 8);
  });

  it("propagates a rejected invoke to the caller", async () => {
    invokeMock.mockRejectedValue(new Error("browser unavailable"));

    await assert.rejects(generatePdfPreview(input()), /browser unavailable/);
  });

  it("propagates a rejected invoke without retrying", async () => {
    invokeMock.mockRejectedValue(new Error("timeout"));

    await assert.rejects(generatePdfPreview(input()), /timeout/);

    assert.equal(
      invokeMock.mock.calls.length,
      1,
      "no fallback invoke may swallow the failure",
    );
  });
});
