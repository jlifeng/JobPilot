/**
 * Modern Template - Unified Implementation
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
  visibleSections,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';

// Modern template accent colors
const ACCENT_COLOR = '#e94560';
const DARK_BLUE = '#0f3460';
const GRADIENT_BG = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
const ACCENT_GRADIENT = 'linear-gradient(90deg, #e94560 0%, #0f3460 60%, transparent 100%)';
const RADIAL_ACCENT = 'radial-gradient(circle, #e94560 0%, transparent 70%)';

// ============================================================================
// Preview Component (React)
// ============================================================================

export function ModernPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div
      className="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-lg"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header with gradient */}
      <div
        className="relative px-10 py-8 text-white"
        style={{ background: GRADIENT_BG }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10"
          style={{ background: RADIAL_ACCENT }}
        />
        <div
          className="absolute -bottom-6 right-20 h-24 w-24 rounded-full opacity-8"
          style={{ background: RADIAL_ACCENT }}
        />

        <div className="relative flex items-center gap-6">
          {pi.avatar && (
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{ background: 'linear-gradient(135deg, #e94560, #0f3460)' }}
            >
              <img
                src={pi.avatar}
                alt=""
                className="h-20 w-20 rounded-full border-2 border-white/10 object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {pi.fullName || 'Your Name'}
            </h1>
            <ContactInfo pi={pi} align="left" iconColor={ACCENT_COLOR} style={{ color: '#d4d4d8' }} variant="profile" />
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 h-[3px] w-full"
          style={{ background: ACCENT_GRADIENT }}
        />
      </div>

      <div className="p-8 pt-6">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <h2
              className="mb-3 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider"
              style={{ color: ACCENT_COLOR }}
            >
              <span
                className="h-[3px] w-7 rounded-full"
                style={{ background: 'linear-gradient(90deg, #e94560, #0f3460)' }}
              />
              {section.title}
            </h2>
            <ModernSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ModernSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return (
      <p
        className="text-sm leading-relaxed text-zinc-600"
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 pl-4" style={{ borderColor: ACCENT_COLOR }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">{item.position}</h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                {formatDate(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.company && (
              <p className="text-sm" style={{ color: ACCENT_COLOR }}>
                {item.company}
              </p>
            )}
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.technologies.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-zinc-500 mb-0.5">
                  {lang === 'zh' ? '主要成就' : 'Key Achievements'}:
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
          <div key={item.id} className="border-l-2 pl-4" style={{ borderColor: DARK_BLUE }}>
            <h3 className="text-sm font-semibold text-zinc-800">{item.institution}</h3>
            <p className="text-sm text-zinc-600">{degreeField(item.degree, item.field)}</p>
            <span className="text-xs text-zinc-400">
              {formatDate(item.startDate, item.endDate, false, lang)}
            </span>
            {item.gpa && <p className="mt-0.5 text-xs text-zinc-500">GPA: {item.gpa}</p>}
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
    const allSkills = categories.flatMap((cat) => cat.skills || []);
    return (
      <div className="flex flex-wrap gap-2">
        {allSkills.map((skill, i) => (
          <span
            key={`skill-${i}`}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors"
          >
            {skill}
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 pl-4" style={{ borderColor: ACCENT_COLOR }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">{item.name}</h3>
              {item.startDate && (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                  {formatDate(item.startDate, item.endDate || null, false, lang)}
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
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.technologies.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
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
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 pl-4" style={{ borderColor: ACCENT_COLOR }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </h3>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                {item.stars?.toLocaleString() ?? 0}
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
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-baseline justify-between border-l-2 pl-4" style={{ borderColor: DARK_BLUE }}>
            <div>
              <span className="text-sm font-semibold text-zinc-800">{item.name}</span>
              {item.issuer && (
                <span className="text-sm text-zinc-500"> - {item.issuer}</span>
              )}
            </div>
            {item.date && (
              <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
          >
            {item.language}{' '}
            <span className="text-zinc-400">- {item.proficiency}</span>
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 pl-4" style={{ borderColor: ACCENT_COLOR }}>
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">{item.title}</h3>
                {item.subtitle && (
                  <span className="text-sm text-zinc-500"> - {item.subtitle}</span>
                )}
              </div>
              {item.date && (
                <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>
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
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border-l-2 border-zinc-200 pl-4">
            <span className="text-sm font-medium text-zinc-700">
              {item.name || item.title || item.language || ''}
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

function buildModernSectionContentHtml(
  section: CanonicalResume['sections'][number],
  lang: string
): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<div class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items
      .map(
        (it) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT_COLOR}">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold text-zinc-800">${esc(it.position)}</h3>
        <span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${formatDate(it.startDate, it.endDate, it.current, lang)}</span>
      </div>
      ${it.company ? `<p class="text-sm" style="color:${ACCENT_COLOR}">${esc(it.company)}</p>` : ''}
      ${it.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</p>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t) => `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${it.highlights.map((h) => `<li class="text-sm text-zinc-600">${md(h)}</li>`).join('')}</ul></div>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div class="border-l-2 pl-4" style="border-color:${DARK_BLUE}">
      <h3 class="text-sm font-semibold text-zinc-800">${esc(it.institution)}</h3>
      <p class="text-sm text-zinc-600">${esc(degreeField(it.degree, it.field))}</p>
      <span class="text-xs text-zinc-400">${formatDate(it.startDate, it.endDate, false, lang)}</span>
      ${it.gpa ? `<p class="mt-0.5 text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${it.highlights.map((h) => `<li class="text-sm text-zinc-600">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    const allSkills = categories.flatMap((cat) => cat.skills || []);
    return `<div class="flex flex-wrap gap-2">${allSkills
      .map(
        (skill) =>
          `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">${esc(skill)}</span>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-4">${items
      .map(
        (it) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT_COLOR}">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold text-zinc-800">${esc(it.name)}</h3>
        ${it.startDate ? `<span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${formatDate(it.startDate, it.endDate || null, false, lang)}</span>` : ''}
      </div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t) => `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${it.highlights.map((h) => `<li class="text-sm text-zinc-600">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-4">${items
      .map(
        (it) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT_COLOR}">
      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3>
        <span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${it.stars?.toLocaleString() ?? 0}</span>
      </div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1.5">${items
      .map(
        (it) =>
          `<div class="flex items-baseline justify-between border-l-2 pl-4" style="border-color:${DARK_BLUE}">
        <div>
          <span class="text-sm font-semibold text-zinc-800">${esc(it.name)}</span>
          ${it.issuer ? `<span class="text-sm text-zinc-500"> - ${esc(it.issuer)}</span>` : ''}
        </div>
        ${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}
      </div>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-2">${items
      .map(
        (it) =>
          `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">${esc(it.language)} <span class="text-zinc-400">- ${esc(it.proficiency)}</span></span>`
      )
      .join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items
      .map(
        (it) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT_COLOR}">
      <div class="flex items-baseline justify-between">
        <div>
          <h3 class="text-sm font-semibold text-zinc-800">${esc(it.title)}</h3>
          ${it.subtitle ? `<span class="text-sm text-zinc-500"> - ${esc(it.subtitle)}</span>` : ''}
        </div>
        ${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}
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
        (it) => `<div class="border-l-2 border-zinc-200 pl-4">
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
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 8px 2px 0"><span style="color:${ACCENT_COLOR};font-size:13px;flex-shrink:0">${c.htmlIcon}</span><span style="color:#d4d4d8">${esc(c.value)}</span></span>`).join('');

  const r1 = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px">${renderRow(row1)}</div>`
    : '';
  const r2 = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px">${renderRow(row2)}</div>`
    : '';

  return r1 + r2;
}

export function buildModernHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="relative overflow-hidden px-10 py-8 text-white" style="background:${GRADIENT_BG}">
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10" style="background:${RADIAL_ACCENT}"></div>
      <div class="absolute -bottom-6 right-20 h-24 w-24 rounded-full" style="opacity:0.08;background:${RADIAL_ACCENT}"></div>
      <div class="relative flex items-center gap-6">
        ${pi.avatar ? `<div class="shrink-0 rounded-full p-[2px]" style="background:linear-gradient(135deg,#e94560,#0f3460)"><img src="${esc(pi.avatar)}" alt="" class="h-[80px] w-[80px] rounded-full border-2 border-white/10 object-cover"/></div>` : ''}
        <div class="min-w-0 flex-1">
          <h1 class="text-3xl font-bold tracking-tight">${esc(pi.fullName || 'Your Name')}</h1>
          ${buildContactHtml(pi)}
        </div>
      </div>
      <div class="absolute bottom-0 left-0 h-[3px] w-full" style="background:${ACCENT_GRADIENT}"></div>
    </div>
    <div class="p-8 pt-6">
      ${sections
        .map(
          (s) => `<div class="mb-6" data-section>
        <h2 class="mb-3 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider" style="color:${ACCENT_COLOR}">
          <span class="h-[3px] w-7 rounded-full" style="background:linear-gradient(90deg,#e94560,#0f3460)"></span>${esc(s.title)}
        </h2>
        ${buildModernSectionContentHtml(s, lang)}
      </div>`
        )
        .join('')}
    </div>
  </div>`;
}

// ============================================================================
// Template Registration
// ============================================================================

export const modernTemplate: UnifiedTemplate = {
  id: 'modern',
  name: 'Modern',
  PreviewComponent: ModernPreview,
  buildHtml: buildModernHtml,
};
