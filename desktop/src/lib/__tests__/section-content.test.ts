import { describe, expect, it } from "vitest";
import {
  adaptGitHubSectionsToProjects,
  normalizeSectionContentForRender,
} from "@/lib/section-content";

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

  it("omits zero or missing GitHub stars from render data", () => {
    const content = normalizeSectionContentForRender("github", {
      items: [
        { id: "repo-zero", name: "Zero", stars: 0, description: "" },
        { id: "repo-missing", name: "Missing", description: "" },
        { id: "repo-positive", name: "Positive", stars: 7, description: "" },
      ],
    });

    const [zero, missing, positive] = content.items as Array<Record<string, unknown>>;
    expect(zero).not.toHaveProperty("stars");
    expect(missing).not.toHaveProperty("stars");
    expect(positive.stars).toBe(7);
  });

  it("keeps user-authored GitHub technologies and highlights when storing content", () => {
    const content = normalizeSectionContentForRender("github", {
      items: [
        {
          id: "repo-details",
          repoUrl: "https://github.com/jlifeng/JobPilot",
          name: "JobPilot",
          stars: 140,
          description: "Local-first AI resume workbench",
          technologies: ["React", "Rust"],
          highlights: ["Shipped a cross-platform editor"],
        },
      ],
    });

    const [item] = content.items as Array<Record<string, unknown>>;
    expect(item.technologies).toEqual(["React", "Rust"]);
    expect(item.highlights).toEqual(["Shipped a cross-platform editor"]);
    expect(item.description).toBe("Local-first AI resume workbench");
  });

  it("maps GitHub repositories onto the project render contract", () => {
    const content = normalizeSectionContentForRender(
      "github",
      {
        items: [
          {
            id: "repo-details",
            name: "JobPilot",
            stars: 1,
            description: "本地优先的简历工作台",
            technologies: ["React", "Rust"],
            highlights: ["支持跨平台编辑", "统一预览与导出"],
          },
        ],
      },
      { useProjectLayoutForGitHub: true, lang: "zh" },
    );

    const [item] = content.items as Array<Record<string, unknown>>;
    expect(item.technologies).toEqual(["React", "Rust"]);
    expect(item.highlights).toEqual(["支持跨平台编辑", "统一预览与导出"]);
  });

  it("adapts GitHub sections to project sections only for rendering", () => {
    const [section] = adaptGitHubSectionsToProjects(
      [
        {
          id: "github",
          type: "github",
          title: "Open Source",
          sortOrder: 1,
          visible: true,
          content: {
            items: [
              {
                id: "repo",
                repoUrl: "https://github.com/example/jobpilot",
                name: "JobPilot",
                stars: 42,
                description: "Local-first resume workbench",
                technologies: ["React", "Rust"],
                highlights: ["Unified preview and export"],
              },
            ],
          },
        },
      ],
      "en",
    );

    expect(section.type).toBe("projects");
    expect(section.title).toBe("Open Source");
    const [item] = (section.content as { items: Array<Record<string, unknown>> }).items;
    expect(item.technologies).toEqual(["React", "Rust"]);
    expect(item.highlights).toEqual(["Unified preview and export"]);
    expect(item.description).toContain("[Repository](https://github.com/example/jobpilot)");
    expect(item.description).toContain("★ 42");
  });
});
