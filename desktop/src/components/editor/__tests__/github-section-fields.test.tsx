import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../../i18n";
import type { ResumeSection } from "../../../types/resume";
import { GitHubSection } from "../sections/github";
import {
  installDomShim,
  restoreDomShim,
  shimText,
  type ShimDocument,
} from "./dom-shim";

let doc: ShimDocument;
let root: Root | null = null;
let host: ReturnType<ShimDocument["createElement"]>;

function createSection(): ResumeSection {
  return {
    id: "github-section",
    resumeId: "resume-1",
    type: "github",
    title: "Open Source",
    sortOrder: 0,
    visible: true,
    content: {
      items: [
        {
          id: "repo-1",
          repoUrl: "https://github.com/example/jobpilot",
          name: "JobPilot",
          stars: 42,
          description: "Local-first resume workbench",
        },
      ],
    },
    createdAt: "2026-10-24T00:00:00.000Z",
    updatedAt: "2026-10-24T00:00:00.000Z",
  };
}

async function renderSection(section: ResumeSection): Promise<void> {
  root = createRoot(host as unknown as Element);
  await act(async () => {
    root?.render(
      <GitHubSection
        section={section}
        onUpdate={() => {}}
      />,
    );
  });
}

describe("GitHubSection fields", () => {
  beforeEach(async () => {
    doc = installDomShim();
    host = doc.createElement("div");
    doc.body.appendChild(host);
    await i18n.changeLanguage("zh");
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    restoreDomShim();
  });

  it("renders the same project detail fields as the projects section", async () => {
    await renderSection(createSection());
    const text = shimText(host);

    expect(text).toContain("描述");
    expect(text).toContain("技术栈");
    expect(text).toContain("亮点");
  });

  it("tolerates persisted GitHub items without the new arrays", async () => {
    await renderSection(createSection());
    const text = shimText(host);

    // Markdown textarea content is not reflected as text nodes in the
    // dependency-free DOM shim; the persisted description is still present via
    // the field contract, while both new editors must always mount.
    expect(text).toContain("技术栈");
    expect(text).toContain("亮点");
  });
});
