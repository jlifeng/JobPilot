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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
): Record<string, unknown> {
  const content = isRecord(rawContent) ? { ...rawContent } : {};

  if (ITEM_SECTION_TYPES.has(sectionType)) {
    content.items = getSectionCollection(content.items, 'items');
  }

  if (sectionType === 'skills') {
    content.categories = getSectionCollection(content.categories, 'categories');
  }

  // GitHub repositories carry an auto-fetched primary language. It is not
  // resume content authored by the user, so strip it here — the single
  // normalization choke point shared by preview, export and the resume store.
  // This keeps every template from rendering an unexpected "TypeScript" line.
  if (sectionType === 'github') {
    content.items = getSectionCollection<Record<string, unknown>>(content.items, 'items').map(
      (item) => {
        if (!('language' in item)) return item;
        const next = { ...item };
        delete next.language;
        return next;
      },
    );
  }

  return content;
}
