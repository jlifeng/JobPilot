import type { ResumeSection, SummaryContent, SkillsContent } from '@/types/resume';
import { renderMarkdownBlocks } from '@/lib/markdown';

export function extractMarkdownBulletItems(text: unknown): string[] | null {
  if (text == null) return null;
  const lines = String(text).split('\n');
  const items: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(/^[-\u2013\u2022]\s+(.*)/);
    if (!match) return null;
    items.push(match[1]);
  }

  return items.length > 0 ? items : null;
}

/** Lightweight Markdown to HTML for resume text fields. */
export function md(text: unknown): string {
  return renderMarkdownBlocks(text, {
    listStyle: 'margin:2px 0;padding-left:1.5em;list-style-type:disc',
  });
}

/** Join degree and field with separator */
export function degreeField(degree: string, field: string | undefined): string {
  if (!field) return degree;
  return `${degree} - ${field}`;
}

export function isSectionEmpty(section: ResumeSection): boolean {
  const content = section.content;

  if (section.type === 'summary') {
    return !(content as SummaryContent).text;
  }

  if (section.type === 'skills') {
    const categories = (content as SkillsContent).categories;
    return !categories?.length || categories.every((cat) => !cat.skills?.length);
  }

  // work_experience, education, projects, certifications, languages, custom
  if (typeof content === 'object' && content !== null && 'items' in content) {
    const items = (content as { items?: unknown[] }).items;
    return !items?.length;
  }

  return false;
}
