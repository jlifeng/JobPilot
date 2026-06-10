/**
 * Classic Template - Unified Implementation
 *
 * This template provides both preview (React) and export (HTML) rendering
 * using a single source of truth for consistent output.
 */

import React from 'react';
import type {
  PersonalInfoContent,
  SummaryContent,
  WorkExperienceContent,
  EducationContent,
  SkillsContent,
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  CustomContent,
  GitHubContent,
} from '@/types/resume';
import type { CanonicalResume, UnifiedTemplate, TemplateProps } from '../types';
import {
  md,
  esc,
  degreeField,
  formatDate,
  getPersonalInfo,
  buildHighlights,
  visibleSections,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

// ============================================================================
// Preview Component (React)
// ============================================================================

export function ClassicPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);

  return (
    <div
      className="mx-auto max-w-[210mm] bg-white shadow-lg"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="mb-6 border-b-2 border-zinc-800 pb-4">
        <div className="flex items-center justify-center gap-4">
          {pi.avatar && (
            <img
              src={pi.avatar}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">
              {pi.fullName || 'Your Name'}
            </h1>
          </div>
        </div>
        <ContactInfo pi={pi} variant="profile" />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="mb-5" data-section>
          <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-800">
            {section.title}
          </h2>
          <ClassicSectionContent section={section} lang={resume.language} />
        </div>
      ))}
    </div>
  );
}

function ClassicSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang?: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;
  const language = lang || 'en';

  if (section.type === 'summary') {
    return (
      <p
        className="text-sm text-zinc-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-semibold text-zinc-800 text-sm">
                  {item.position}
                </span>
                {item.company && (
                  <span className="text-sm text-zinc-600"> at {item.company}</span>
                )}
                {item.location && (
                  <span className="text-sm text-zinc-400"> , {item.location}</span>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {formatDate(item.startDate, item.endDate, item.current, language)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{language === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}
              </p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-zinc-500 mb-0.5">
                  {language === 'zh' ? '主要成就' : 'Key Achievements'}:
                </p>
                <ul className="list-disc pl-4">
                  {item.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="text-sm text-zinc-600"
                      dangerouslySetInnerHTML={{ __html: md(h) }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-semibold text-zinc-800 text-sm">
                  {degreeField(item.degree, item.field)}
                </span>
                {item.institution && (
                  <span className="text-sm text-zinc-600"> - {item.institution}</span>
                )}
                {item.location && (
                  <span className="text-sm text-zinc-400"> , {item.location}</span>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {formatDate(item.startDate, item.endDate, false, language)}
              </span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-600"
                    dangerouslySetInnerHTML={{ __html: md(h) }}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-1">
        {categories.map((cat) => (
          <div key={cat.id}>
            <p className="text-sm font-medium text-zinc-700">{cat.name}</p>
            {cat.skills?.length > 0 && (
              <ul className="mt-0.5 list-disc pl-4">
                {cat.skills.map((skill, i) => (
                  <li key={i} className="text-sm text-zinc-600">{skill}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-zinc-800 text-sm">
                {item.name}
              </span>
              {item.startDate && (
                <span className="text-xs text-zinc-400">
                  {formatDate(item.startDate, item.endDate || null, false, language)}
                </span>
              )}
            </div>
            {item.description && (
              <p
                className="mt-1 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}
              </p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-600"
                    dangerouslySetInnerHTML={{ __html: md(h) }}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-zinc-800 text-sm">
                {item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="text-xs text-zinc-400">
                {item.stars?.toLocaleString()}
              </span>
            </div>
            {item.language && (
              <span className="text-xs text-zinc-500">{item.language}</span>
            )}
            {item.description && (
              <p
                className="mt-1 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-semibold text-zinc-800" issuerClassName="text-zinc-600" />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <span className="font-semibold text-zinc-800 text-sm">
              {item.language}
            </span>
            <span className="text-sm text-zinc-600"> - {item.proficiency}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-800">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-sm text-zinc-500"> - {item.subtitle}</span>
                )}
              </div>
              {item.date && (
                <span className="text-xs text-zinc-400">{item.date}</span>
              )}
            </div>
            {item.description && (
              <p
                className="mt-0.5 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Generic fallback for items-based content
  if ('items' in content && Array.isArray(content.items)) {
    return (
      <div className="space-y-2">
        {(content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>).map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium text-zinc-700">
              {item.name || item.title || item.language}
            </span>
            {item.description && (
              <p
                className="text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ============================================================================
// Export Builder (HTML String)
// ============================================================================

function buildClassicSectionContentHtml(
  section: CanonicalResume['sections'][number],
  lang: string
): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<div class="text-sm text-zinc-600 leading-relaxed">${md((content as unknown as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div>
      <div class="flex items-baseline justify-between">
        <div>
          <span class="font-semibold text-zinc-800 text-sm">${esc(it.position)}</span>
          ${it.company ? `<span class="text-sm text-zinc-600"> at ${esc(it.company)}</span>` : ''}
          ${it.location ? `<span class="text-sm text-zinc-400"> , ${esc(it.location)}</span>` : ''}
        </div>
        <span class="text-xs text-zinc-400">${formatDate(it.startDate, it.endDate, it.current, lang)}</span>
      </div>
      ${it.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</p>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div>
      <div class="flex items-baseline justify-between">
        <div>
          <span class="font-semibold text-zinc-800 text-sm">${esc(degreeField(it.degree, it.field))}</span>
          ${it.institution ? `<span class="text-sm text-zinc-600"> - ${esc(it.institution)}</span>` : ''}
          ${it.location ? `<span class="text-sm text-zinc-400"> , ${esc(it.location)}</span>` : ''}
        </div>
        <span class="text-xs text-zinc-400">${formatDate(it.startDate, it.endDate, false, lang)}</span>
      </div>
      ${it.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1">${categories
      .map(
        (cat) =>
          `<div><p class="text-sm font-medium text-zinc-700">${esc(cat.name)}</p>${cat.skills?.length ? `<ul class="mt-0.5 list-disc pl-4">${cat.skills.map((skill) => `<li class="text-sm text-zinc-600">${esc(skill)}</li>`).join('')}</ul>` : ''}</div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div>
      <div class="flex items-baseline justify-between">
        <span class="font-semibold text-zinc-800 text-sm">${esc(it.name)}</span>
        ${it.startDate ? `<span class="text-xs text-zinc-400">${formatDate(it.startDate, it.endDate || null, false, lang)}</span>` : ''}
      </div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div>
      <div class="flex items-baseline justify-between">
        <span class="font-semibold text-zinc-800 text-sm">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-400">${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-semibold text-zinc-800', issuerClass: 'text-zinc-600' });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1">${items
      .map(
        (it) =>
          `<div><span class="font-semibold text-zinc-800 text-sm">${esc(it.language)}</span><span class="text-sm text-zinc-600"> - ${esc(it.proficiency)}</span></div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-2">${items
      .map(
        (it) => `<div>
      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-sm font-semibold text-zinc-800">${esc(it.title)}</span>
          ${it.subtitle ? `<span class="text-sm text-zinc-500"> - ${esc(it.subtitle)}</span>` : ''}
        </div>
        ${it.date ? `<span class="text-xs text-zinc-400">${esc(it.date)}</span>` : ''}
      </div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  // Generic fallback for items-based content
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return `<div class="space-y-2">${items
      .map(
        (it) => `<div>
          <span class="text-sm font-medium text-zinc-700">${esc(it.name || it.title || it.language || '')}</span>
          ${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}
        </div>`
      )
      .join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: PersonalInfoContent): string {
  const { row1, row2 } = buildContactEntries(pi, { variant: 'profile' });
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 8px"><span style="flex-shrink:0">${c.htmlIcon}</span><span>${esc(c.value)}</span></span>`).join('');

  const r1 = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px;color:#6B7280;text-align:center">${renderRow(row1)}</div>`
    : '';
  const r2 = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px;color:#6B7280;text-align:center">${renderRow(row2)}</div>`
    : '';

  return r1 + r2;
}

export function buildClassicHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 border-b-2 border-zinc-800 pb-4">
      <div class="flex items-center justify-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-full object-cover"/>` : ''}
        <div class="text-center">
          <h1 class="text-2xl font-bold text-zinc-900">${esc(pi.fullName || 'Your Name')}</h1>
        </div>
      </div>
      ${buildContactHtml(pi)}
    </div>
    ${sections
      .map(
        (s) => `<div class="mb-5" data-section>
      <h2 class="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-800">${esc(s.title)}</h2>
      ${buildClassicSectionContentHtml(s, lang)}
    </div>`
      )
      .join('')}
  </div>`;
}

// ============================================================================
// Template Registration
// ============================================================================

export const classicTemplate: UnifiedTemplate = {
  id: 'classic',
  name: 'Classic',
  PreviewComponent: ClassicPreview,
  buildHtml: buildClassicHtml,
};
