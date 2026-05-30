import type { ResumeSection, SummaryContent, SkillsContent } from '@/types/resume';

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

/** Lightweight markdown → HTML for resume text fields (summary, descriptions, highlights).
 *  Supports: **bold**, `code`, line breaks, and "- item" lists. */
export function md(text: unknown): string {
  if (text == null) return '';
  let s = String(text);
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  if (!s.includes('\n')) return s;
  const lines = s.split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }
    const lm = line.match(/^[-–•]\s+(.*)/);
    if (lm) {
      if (!inList) { html += '<ul style="margin:2px 0;padding-left:1.5em;list-style-type:disc">'; inList = true; }
      html += `<li>${lm[1]}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += (html && !html.endsWith('>') ? '<br>' : '') + line;
    }
  }
  if (inList) html += '</ul>';
  return html;
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
