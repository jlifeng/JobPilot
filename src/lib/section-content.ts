const ITEM_SECTION_TYPES = new Set([
  'work_experience',
  'education',
  'projects',
  'certifications',
  'languages',
  'github',
  'qr_codes',
  'custom',
]);

type SectionCollectionKey = 'items' | 'categories';

export interface SectionRenderOptions {
  /**
   * Make GitHub repositories use the project renderer. This keeps their
   * technologies and highlights on the same layout as normal projects while
   * preserving repository metadata in a render-only description.
   * Storage must never use this option.
   */
  useProjectLayoutForGitHub?: boolean;
  lang?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toGitHubProjectItem(
  item: Record<string, unknown>,
  lang: string,
): Record<string, unknown> {
  const originalDescription = typeof item.description === 'string' ? item.description : '';
  const isZh = lang.toLowerCase().startsWith('zh');
  const repoUrl = typeof item.repoUrl === 'string' ? item.repoUrl.trim() : '';
  const stars = typeof item.stars === 'number' && item.stars > 0 ? item.stars : 0;
  const metadata = [
    repoUrl,
    stars > 0 ? `★ ${stars.toLocaleString()}` : '',
  ].filter(Boolean).join(' · ');
  const descriptionParts = originalDescription.trim()
    ? [originalDescription.trim()]
    : [];
  if (metadata) {
    descriptionParts.push([
      repoUrl ? `[${isZh ? '仓库' : 'Repository'}](${repoUrl})` : '',
      stars > 0 ? `★ ${stars.toLocaleString()}` : '',
    ].filter(Boolean).join(' · '));
  }

  return {
    ...item,
    name: typeof item.name === 'string' ? item.name : '',
    url: repoUrl,
    description: descriptionParts.join('\n\n'),
    technologies: Array.isArray(item.technologies) ? item.technologies : [],
    highlights: Array.isArray(item.highlights) ? item.highlights : [],
  };
}

function toGitHubProjectContent(content: Record<string, unknown>, lang: string): Record<string, unknown> {
  return {
    ...content,
    items: getSectionCollection<Record<string, unknown>>(content.items, 'items').map(
      (item) => toGitHubProjectItem(item, lang),
    ),
  };
}

export function getSectionCollection<T extends object>(
  value: unknown,
  key: SectionCollectionKey,
): T[] {
  const collection = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value[key])
      ? value[key]
      : [];

  return collection.filter(isRecord) as T[];
}

export function normalizeSectionContentForRender(
  sectionType: string,
  rawContent: unknown,
  options: SectionRenderOptions = {},
): Record<string, unknown> {
  const content = isRecord(rawContent) ? { ...rawContent } : {};

  if (ITEM_SECTION_TYPES.has(sectionType)) {
    content.items = getSectionCollection(content.items, 'items');
  }

  if (sectionType === 'skills') {
    content.categories = getSectionCollection(content.categories, 'categories');
  }

  // GitHub repositories carry auto-fetched metadata. Strip values that should
  // not render here, at the single choke point shared by preview, export and the
  // resume store. Zero stars are also removed so no "0" badge reaches a template.
  if (sectionType === 'github') {
    content.items = getSectionCollection<Record<string, unknown>>(content.items, 'items').map(
      (item) => {
        // Templates use nullish checks before rendering a star badge.
        const next = { ...item };
        delete next.language;
        if (!(typeof next.stars === 'number' && next.stars > 0)) {
          delete next.stars;
        }
        return next;
      },
    );
  }

  if (sectionType === 'github' && options.useProjectLayoutForGitHub) {
    return {
      ...toGitHubProjectContent(content, options.lang || 'en'),
    };
  }

  return content;
}

/** Convert GitHub sections to the same render contract as projects. */
export function adaptGitHubSectionsToProjects(
  sections: Array<Record<string, unknown>>,
  lang: string,
): Array<Record<string, unknown>> {
  return sections.map((section) => {
    if (section.type !== 'github') return section;
    return {
      ...section,
      type: 'projects',
      content: toGitHubProjectContent(
        section.content as Record<string, unknown>,
        lang,
      ),
    };
  });
}
