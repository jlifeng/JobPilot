import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const SEMVER_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const INTERNAL_TYPES = new Set(["docs", "chore", "ci", "build", "test", "refactor", "style"]);
const INTERNAL_SCOPES = new Set(["docs", "readme", "trellis", "ci", "infra", "release"]);
const GENERIC_NOISE_PATTERNS = [
  /^(ui|bug|chat|templates|p\d+|fix|feat|update|sqlite)$/iu,
  /^initial commit$/iu,
];
const INTERNAL_SUMMARY_PATTERNS = [
  /readme/iu,
  /vercel/iu,
  /\bci\b/iu,
  /workflow/iu,
  /signing/iu,
  /artifact/iu,
  /smoke/iu,
  /trellis/iu,
  /\blint\b/iu,
  /\bspec\b/iu,
  /bootstrap/iu,
  /assessment/iu,
  /\bapi\b/iu,
  /\bmcp\b/iu,
  /desktop github release/iu,
  /migration workflows/iu,
  /runtime boundary/iu,
  /\bpipeline\b/iu,
  /record journal/iu,
  /local startup helpers/iu,
  /群二维码/u,
  /添加部署视频/u,
];
const PRODUCT_REWRITE_RULES = [
  {
    pattern: /desktop-dashboard-parity/iu,
    section: "New",
    summary: "Desktop dashboard experience",
  },
  {
    pattern: /desktop-templates-parity/iu,
    section: "New",
    summary: "Desktop templates browsing and preview",
  },
  {
    pattern: /rewrite editor components to match web 1:1|editor page 1:1 parity with web/iu,
    section: "Improved",
    summary: "Desktop editor experience now matches the web app more closely",
  },
  {
    pattern: /unify design foundation with web stack|align core surfaces with web ui/iu,
    section: "Improved",
    summary: "Core desktop screens now feel more consistent and polished",
  },
  {
    pattern: /dynamic model fetching, connectivity tests, remove hardcoded fallbacks/iu,
    section: "Improved",
    summary: "AI settings now support model discovery and connectivity checks",
  },
  {
    pattern: /add exa pool config to settings, rewrite 4 ai dialogs/iu,
    section: "New",
    summary: "Expanded AI settings and refreshed key AI dialogs",
  },
  {
    pattern: /bridge native ai provider streaming in tauri/iu,
    section: "New",
    summary: "Native AI streaming in the desktop app",
  },
  {
    pattern: /validate unified template preview and export in tauri shell/iu,
    section: "New",
    summary: "Template preview and export in the desktop app",
  },
  {
    pattern: /fix templates preview dialog, button text color/iu,
    section: "Improved",
    summary: "Template preview dialog and button styling",
  },
  {
    pattern: /rewrite templates page with resumepreview, fix create-dialog thumbnail overflow/iu,
    section: "Improved",
    summary: "Templates page layout and create-dialog thumbnails",
  },
  {
    pattern: /remove shell status bar, use web template-thumbnail and tailwind nav/iu,
    section: "Improved",
    summary: "Desktop navigation and template thumbnails",
  },
];
const INITIAL_RELEASE_SECTIONS = [
  {
    title: "New",
    items: [
      "Native desktop workflow for resume editing and export",
      "Desktop resume workspace with drag-and-drop editing, inline updates, and autosave",
      "Template browsing, preview, customization, and export in the desktop app",
      "AI workflows for resume writing, resume parsing, JD matching, cover letters, translation, and writing polish",
      "English and Chinese interface",
    ],
  },
  {
    title: "Improved",
    items: [
      "More consistent desktop experience across dashboard, editor, templates, and settings",
      "Local-first AI settings with model discovery and connectivity checks",
      "In-app update checking, release notes viewing, and installer download flow",
    ],
  },
];
const SECTION_TITLE_TRANSLATIONS = new Map([
  ["New", "新增"],
  ["Improved", "优化"],
]);
const SUMMARY_TRANSLATIONS = new Map([
  ["Native desktop workflow for resume editing and export", "原生桌面简历编辑与导出工作流"],
  ["Desktop resume workspace with drag-and-drop editing, inline updates, and autosave", "桌面简历工作台，支持拖拽编辑、行内修改和自动保存"],
  ["Template browsing, preview, customization, and export in the desktop app", "在桌面端支持模板浏览、预览、定制与导出"],
  ["AI workflows for resume writing, resume parsing, JD matching, cover letters, translation, and writing polish", "支持 AI 简历撰写、简历解析、JD 匹配、求职信生成、翻译与润色"],
  ["English and Chinese interface", "支持中英文界面"],
  ["More consistent desktop experience across dashboard, editor, templates, and settings", "仪表盘、编辑器、模板与设置等核心页面体验更加统一"],
  ["Local-first AI settings with model discovery and connectivity checks", "本地优先的 AI 设置，支持模型发现与连通性检测"],
  ["In-app update checking, release notes viewing, and installer download flow", "支持应用内检查更新、查看更新日志与下载安装流程"],
  ["Desktop dashboard experience", "桌面端仪表盘体验"],
  ["Desktop templates browsing and preview", "桌面端模板浏览与预览"],
  ["Desktop editor experience now matches the web app more closely", "桌面端编辑器体验与 Web 版更加一致"],
  ["Core desktop screens now feel more consistent and polished", "桌面端核心页面更统一、更完善"],
  ["AI settings now support model discovery and connectivity checks", "AI 设置现已支持模型发现与连通性检测"],
  ["Expanded AI settings and refreshed key AI dialogs", "扩展 AI 设置并重做关键 AI 弹窗"],
  ["Native AI streaming in the desktop app", "桌面端原生 AI 流式输出"],
  ["Template preview and export in the desktop app", "桌面端模板预览与导出"],
  ["Template preview dialog and button styling", "模板预览弹窗与按钮样式优化"],
  ["Templates page layout and create-dialog thumbnails", "模板页布局与创建弹窗缩略图优化"],
  ["Desktop navigation and template thumbnails", "桌面导航与模板缩略图优化"],
  ["Ship in-app updater flow", "上线应用内更新流程"],
  ["Restore tool-driven resume editing", "恢复工具驱动的简历编辑流程"],
]);

function runGit(rootDir, args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getTagList(rootDir) {
  const raw = runGit(rootDir, ["tag", "--list", "--sort=-v:refname"]);
  return raw.length === 0
    ? []
    : raw.split(/\r?\n/gu).map((line) => line.trim()).filter(Boolean);
}

function getPreviousReleaseTag(rootDir, currentTag) {
  return (
    getTagList(rootDir).find(
      (tag) => tag !== currentTag && SEMVER_TAG_PATTERN.test(tag),
    ) ?? null
  );
}

function getCommitLines(rootDir, rangeSpec) {
  const raw = runGit(rootDir, [
    "log",
    "--no-merges",
    "--format=%H%x09%s",
    rangeSpec,
  ]);
  return raw.length === 0
    ? []
    : raw.split(/\r?\n/gu).filter(Boolean).map((line) => {
        const [hash, ...subjectParts] = line.split("\t");
        return {
          hash,
          shortHash: hash.slice(0, 7),
          subject: subjectParts.join("\t").trim(),
        };
      });
}

function parseCommitSubject(subject) {
  const normalized = subject.trim().replace(/[：﹕]/gu, ":");
  const match =
    /^(?<type>[A-Za-z]+)(?:\((?<scope>[^)]+)\))?!?\s*:\s*(?<summary>.+)$/u.exec(
      normalized,
    );

  return {
    type: match?.groups?.type?.toLowerCase() ?? "other",
    scope: match?.groups?.scope?.toLowerCase() ?? "",
    summary: match?.groups?.summary?.trim() ?? normalized,
  };
}

function isInternalSummary(summary) {
  return INTERNAL_SUMMARY_PATTERNS.some((pattern) => pattern.test(summary));
}

function isGenericNoise(summary) {
  return GENERIC_NOISE_PATTERNS.some((pattern) => pattern.test(summary.trim()));
}

function cleanSummary(summary) {
  const normalized = summary
    .trim()
    .replace(/desktop[-_]/giu, "desktop ")
    .replace(/\b1:1\b/gu, "")
    .replace(/\bparity\b/giu, "experience")
    .replace(/\bin tauri shell\b/giu, "in the desktop app")
    .replace(/\bin tauri\b/giu, "in the desktop app")
    .replace(/\bdesktop shell\b/giu, "desktop app")
    .replace(/\s*&\s*/gu, " and ")
    .replace(/\s*\+\s*/gu, " and ")
    .replace(/\s{2,}/gu, " ")
    .replace(/\s+([,.!?:;])/gu, "$1")
    .trim();

  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/iu.test(normalized)) {
    return normalized.replace(/[-_]+/gu, " ");
  }

  return normalized;
}

function toSentenceCase(summary) {
  if (summary.length === 0) {
    return summary;
  }

  const firstCharacter = summary[0];
  if (/[a-z]/u.test(firstCharacter)) {
    return `${firstCharacter.toUpperCase()}${summary.slice(1)}`;
  }

  return summary;
}

function normalizeDedupKey(summary) {
  return summary
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function classifyCommit(commit) {
  const parsed = parseCommitSubject(commit.subject);

  for (const rule of PRODUCT_REWRITE_RULES) {
    if (rule.pattern.test(parsed.summary)) {
      return {
        section: rule.section,
        summary: rule.summary,
      };
    }
  }

  if (INTERNAL_TYPES.has(parsed.type) || INTERNAL_SCOPES.has(parsed.scope)) {
    return null;
  }

  if (isInternalSummary(parsed.summary) || isGenericNoise(parsed.summary)) {
    return null;
  }

  const section =
    parsed.type === "feat"
      ? "New"
      : parsed.type === "fix" || parsed.type === "perf"
        ? "Improved"
        : null;

  if (!section) {
    return null;
  }

  return {
    section,
    summary: toSentenceCase(cleanSummary(parsed.summary)),
  };
}

function buildSections(commits) {
  const grouped = new Map();
  const seen = new Set();

  for (const commit of commits) {
    const classified = classifyCommit(commit);
    if (!classified) {
      continue;
    }

    const dedupKey = normalizeDedupKey(classified.summary);
    if (!dedupKey || seen.has(dedupKey)) {
      continue;
    }

    seen.add(dedupKey);

    const sectionItems = grouped.get(classified.section) ?? [];
    sectionItems.push(classified.summary);
    grouped.set(classified.section, sectionItems);
  }

  return [
    { title: "New", items: grouped.get("New") ?? [] },
    { title: "Improved", items: grouped.get("Improved") ?? [] },
  ].filter((section) => section.items.length > 0);
}

function buildInitialReleaseSections() {
  return INITIAL_RELEASE_SECTIONS.map((section) => ({
    title: section.title,
    items: [...section.items],
  }));
}

function translateSectionTitle(title) {
  return SECTION_TITLE_TRANSLATIONS.get(title) ?? title;
}

function translateSummary(summary) {
  return SUMMARY_TRANSLATIONS.get(summary) ?? summary;
}

function formatBilingualText(english, chinese) {
  return chinese && chinese !== english ? `${english} / ${chinese}` : english;
}

function buildCompareLine(repository, previousTag, currentTag) {
  if (!repository || !previousTag) {
    return null;
  }

  return `Compared with [${previousTag}](https://github.com/${repository}/compare/${previousTag}...${currentTag}). / 对比 [${previousTag}](https://github.com/${repository}/compare/${previousTag}...${currentTag})。`;
}

function buildReleaseNotesBody(sections) {
  if (sections.length === 0) {
    return "No user-facing additions or improvements were summarized for this release. / 本次发布暂无可总结的用户可感知新增或优化。";
  }

  const lines = [];
  for (const section of sections) {
    lines.push(
      `## ${formatBilingualText(section.title, translateSectionTitle(section.title))}`,
    );
    lines.push("");
    for (const item of section.items) {
      lines.push(`- ${formatBilingualText(item, translateSummary(item))}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildReleaseNotesMarkdown({
  currentTag,
  previousTag,
  repository,
  releaseDate,
  sections,
}) {
  const lines = [
    `# JobPilot ${currentTag}`,
    "",
    `Release date: ${releaseDate} / 发布日期：${releaseDate}`,
  ];

  const compareLine = buildCompareLine(repository, previousTag, currentTag);
  if (compareLine) {
    lines.push(compareLine);
  } else {
    lines.push("First official desktop release of JobPilot. / JobPilot 首个正式桌面版本发布。");
  }

  lines.push("");
  lines.push(buildReleaseNotesBody(sections));
  lines.push("");

  return lines.join("\n");
}

/**
 * Extract version section from CHANGELOG.md
 * @param {string} changelogPath - Path to CHANGELOG.md
 * @param {string} version - Version string (e.g., "1.1.5")
 * @returns {string | null} - The section content or null if not found
 */
function extractChangelogSection(changelogPath, version) {
  if (!existsSync(changelogPath)) {
    return null;
  }

  const content = readFileSync(changelogPath, "utf8");
  // Match version header: ## [1.1.5] or ## [1.1.5] - 2025-05-21
  const versionPattern = new RegExp(
    `^## \\[${version.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\][^\n]*\\n`,
    "mu",
  );
  const match = versionPattern.exec(content);

  if (!match) {
    return null;
  }

  const startIndex = match.index + match[0].length;
  // Find the next version header
  const nextVersionPattern = /^## \[[\d.]+\]/mu;
  const remainingContent = content.slice(startIndex);
  const nextMatch = nextVersionPattern.exec(remainingContent);

  const sectionContent = nextMatch
    ? remainingContent.slice(0, nextMatch.index).trim()
    : remainingContent.trim();

  return sectionContent;
}

/**
 * Build release notes from CHANGELOG.md
 * @param {string} rootDir - Project root directory
 * @param {string} currentTag - Current release tag (e.g., "v1.1.5")
 * @param {string | null} repository - GitHub repository (e.g., "owner/repo")
 * @returns {object} - Release notes object
 */
export function collectReleaseNotes(rootDir, currentTag, repository) {
  const previousTag = getPreviousReleaseTag(rootDir, currentTag);
  const version = currentTag.replace(/^v/u, ""); // Remove 'v' prefix
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  const releaseDate = new Date().toISOString().slice(0, 10);

  // Try to extract from CHANGELOG.md first
  const changelogSection = extractChangelogSection(changelogPath, version);

  if (changelogSection) {
    // Build markdown from CHANGELOG content
    const lines = [
      `# JobPilot ${currentTag}`,
      "",
      `Release date: ${releaseDate} / 发布日期：${releaseDate}`,
    ];

    const compareLine = buildCompareLine(repository, previousTag, currentTag);
    if (compareLine) {
      lines.push(compareLine);
    }

    lines.push("");
    lines.push(changelogSection);
    lines.push("");

    return {
      previousTag,
      commits: [],
      sections: [],
      releaseDate,
      markdown: lines.join("\n"),
      body: changelogSection,
    };
  }

  // Fallback to git commits if CHANGELOG section not found
  const rangeSpec = previousTag ? `${previousTag}..${currentTag}` : currentTag;
  const commits = getCommitLines(rootDir, rangeSpec);
  const sections = previousTag ? buildSections(commits) : buildInitialReleaseSections();

  return {
    previousTag,
    commits,
    sections,
    releaseDate,
    markdown: buildReleaseNotesMarkdown({
      currentTag,
      previousTag,
      repository,
      releaseDate,
      sections,
    }),
    body: buildReleaseNotesBody(sections),
  };
}
