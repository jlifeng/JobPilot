/**
 * Template Contract Utilities
 *
 * This module provides helper functions that ensure consistent rendering
 * across both preview (React) and export (HTML string) contexts.
 */

import { SECTION_TYPES } from '@/lib/constants';
import { normalizeSectionContentForRender } from '@/lib/section-content';
import type {
  Resume,
  CanonicalResume,
  CanonicalSection,
  SectionType,
  PersonalInfoContent,
  SummaryContent,
  SkillsContent,
  SectionContent,
} from './types';

interface MarkdownOptions {
  listStyle?: string;
}

export function markdownListStyle(paddingLeft: string): string {
  return `margin:2px 0;padding-left:${paddingLeft};list-style-type:disc`;
}

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

/**
 * Lightweight markdown to HTML converter for resume text fields.
 * Supports: **bold**, `code`, line breaks, and "- item" lists.
 */
export function md(text: unknown, options: MarkdownOptions = {}): string {
  if (text == null) return '';
  let s = String(text);
  // Escape HTML
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline code: `text`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // No newlines - return inline
  if (!s.includes('\n')) return s;
  // Process lines for lists and line breaks
  const lines = s.split('\n');
  let html = '';
  let inList = false;
  const listStyle = options.listStyle ?? markdownListStyle('16px');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }
    const lm = line.match(/^[-\u2013\u2022]\s+(.*)/);
    if (lm) {
      if (!inList) {
        html += `<ul style="${listStyle}">`;
        inList = true;
      }
      html += `<li>${lm[1]}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += (html && !html.endsWith('>') ? '<br>' : '') + line;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

/**
 * Escape HTML special characters.
 */
export function esc(text: unknown): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Join degree and field with separator.
 */
export function degreeField(degree: string, field?: string): string {
  if (!field) return degree;
  return `${degree} - ${field}`;
}

/**
 * Format date range with localization.
 */
export function formatDate(start: string, end: string | null, current: boolean, lang: string): string {
  const endText = end || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
  return endText ? `${start} - ${endText}` : start;
}

/**
 * Check if a section has no content.
 */
export function isSectionEmpty(section: CanonicalSection): boolean {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return !(content as unknown as SummaryContent).text;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories;
    return !categories?.length || categories.every((cat) => !cat.skills?.length);
  }

  // work_experience, education, projects, certifications, languages, custom
  if ('items' in content) {
    return !Array.isArray(content.items) || content.items.length === 0;
  }

  return false;
}

/**
 * Get visible, non-empty sections from resume.
 */
export function visibleSections(sections: CanonicalSection[]): CanonicalSection[] {
  return sections.filter(
    (s) => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s)
  );
}

/**
 * Extract personal info section from resume.
 */
export function getPersonalInfo(resume: CanonicalResume): PersonalInfoContent {
  return (resume.personalInfo || {}) as PersonalInfoContent;
}

/**
 * Build contact list from personal info.
 */
export function getContactList(pi: PersonalInfoContent): string[] {
  return [
    pi.age,
    pi.politicalStatus,
    pi.gender,
    pi.ethnicity,
    pi.hometown,
    pi.maritalStatus,
    pi.yearsOfExperience,
    pi.educationLevel,
    pi.email,
    pi.phone,
    pi.wechat,
    pi.location,
    pi.website,
  ].filter(Boolean) as string[];
}

/**
 * Build highlights HTML list.
 */
export function buildHighlights(highlights: string[] | undefined, liClass: string): string {
  if (!highlights?.length) return '';
  return highlights
    .filter(Boolean)
    .map((h) => `<li class="${liClass}">${md(h)}</li>`)
    .join('');
}

/**
 * Convert Resume to CanonicalResume format.
 * This normalizes the resume data for template rendering.
 */
const canonicalSectionTypes = new Set<string>(SECTION_TYPES);

function toCanonicalSectionType(type: string): SectionType {
  if (canonicalSectionTypes.has(type)) {
    return type as SectionType;
  }

  return 'custom';
}

export function toCanonicalResume(resume: Resume): import('./types').CanonicalResume {
  const sections = [...resume.sections]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((section) => ({
      id: section.id,
      type: toCanonicalSectionType(section.type),
      title: section.title,
      visible: section.visible,
      sortOrder: section.sortOrder,
      content: normalizeSectionContentForRender(section.type, section.content) as unknown as SectionContent,
    }));
  const personalInfo = (sections.find((section) => section.type === 'personal_info')?.content || {}) as PersonalInfoContent;

  return {
    id: resume.id,
    title: resume.title,
    template: resume.template,
    language: resume.language,
    themeConfig: resume.themeConfig,
    personalInfo,
    sections,
  };
}
