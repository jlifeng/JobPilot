import { describe, expect, it } from "vitest";
import { normalizeSectionContentForRender } from "@/lib/section-content";

describe("normalizeSectionContentForRender", () => {
  it("strips the auto-fetched GitHub primary language", () => {
    const content = normalizeSectionContentForRender("github", {
      items: [
        {
          id: "repo-1",
          repoUrl: "https://github.com/jlifeng/JobPilot",
          name: "JobPilot",
          stars: 140,
          language: "TypeScript",
          description: "Local-first AI resume workbench",
        },
      ],
    });

    const [item] = content.items as Array<Record<string, unknown>>;
    expect(item).not.toHaveProperty("language");
    expect(item.name).toBe("JobPilot");
    expect(item.stars).toBe(140);
    expect(item.description).toBe("Local-first AI resume workbench");
  });

  it("keeps the language field on the languages section", () => {
    const content = normalizeSectionContentForRender("languages", {
      items: [{ id: "lang-1", language: "English", proficiency: "Fluent" }],
    });

    const [item] = content.items as Array<Record<string, unknown>>;
    expect(item.language).toBe("English");
  });

  it("tolerates github items without a language key", () => {
    const content = normalizeSectionContentForRender("github", {
      items: [{ id: "repo-2", name: "Plain", stars: 1, description: "" }],
    });

    const [item] = content.items as Array<Record<string, unknown>>;
    expect(item.name).toBe("Plain");
    expect(item).not.toHaveProperty("language");
  });
});
