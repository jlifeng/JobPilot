/**
 * Consultant Template - Unified Implementation
 *
 * Single source of truth for both preview (React) and export (HTML string).
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
  QrCodeItem,
} from '@/types/resume';
import type { CanonicalResume, UnifiedTemplate, TemplateProps } from '../types';
import {
  md,
  esc,
  degreeField,
  getPersonalInfo,
  buildHighlights,
  visibleSections,
  markdownListStyle,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const GRAY_700 = '#374151';
const BLUE_600 = '#2563eb';

// ============================================================================
// Preview Component (React)
// ============================================================================

export function ConsultantPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="consultant-tpl mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`.consultant-tpl li::marker { color: ${BLUE_600} !important; }`}</style>

      {/* Top accent bar */}
      <div className="mb-6 h-1 w-full rounded" style={{ backgroundColor: BLUE_600 }} />

      {/* Header */}
      <div className="mb-6">
        <div className={`flex items-center gap-4 ${!pi.avatar ? 'justify-center' : ''}`}>
          {pi.avatar && (
            <img
              src={pi.avatar}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
              style={{ border: `2px solid ${BLUE_600}` }}
            />
          )}
          <div className={!pi.avatar ? 'text-center' : ''}>
            <h1 className="text-2xl font-bold" style={{ color: GRAY_700 }}>{pi.fullName || 'Your Name'}</h1>
          </div>
        </div>
        <ContactInfo pi={pi} iconColor="#6b7280" style={{ color: '#6b7280' }} align={pi.avatar ? 'left' : 'center'} variant="profile" />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-3 border-l-[3px] pl-3 text-sm font-bold uppercase tracking-wider" style={{ color: GRAY_700, borderColor: BLUE_600 }}>
            {section.title}
          </h2>
          <ConsultantSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function ConsultantSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return (
      <p className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.position}</span>
                {item.company && <span className="text-sm text-gray-500"> | {item.company}</span>}
                {item.location && <span className="text-sm text-gray-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>
                {item.startDate} - {item.endDate || (item.current ? (lang === 'zh' ? '至今' : 'Present') : '')}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-semibold" style={{ color: GRAY_700 }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1.5">
                <p className="text-xs font-semibold" style={{ color: GRAY_700 }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="mt-0.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                  {item.highlights.map((h, i) => (
                    <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
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
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-gray-500"> - {item.institution}</span>}
                {item.location && <span className="text-sm text-gray-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.startDate} - {item.endDate || (lang === 'zh' ? '至今' : 'Present')}</span>
            </div>
            {item.gpa && <p className="text-sm text-gray-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {item.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
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
      <div className="space-y-1.5">
        {categories.map((cat) => (
          <div key={cat.id}>
            <p className="text-sm font-semibold" style={{ color: GRAY_700 }}>{cat.name}</p>
            {cat.skills?.length > 0 && (
              <ul className="mt-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {cat.skills.map((skill, i) => (
                  <li key={i} className="text-sm text-gray-600">{skill}</li>
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
              <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.startDate} - {item.endDate || (lang === 'zh' ? '至今' : 'Present')}</span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {item.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-bold" issuerClassName="text-gray-500" dateClassName="shrink-0 text-xs font-medium" titleStyle={{ color: GRAY_700 }} dateStyle={{ color: BLUE_600 }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.language}</span>
            <span className="text-sm text-gray-500"> — {item.proficiency}</span>
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
              <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.name}</span>
              <span className="text-xs text-gray-400">⭐ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-gray-400">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-gray-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
    if (svgs) {
      const validItems = items.filter((q) => svgs[q.id]);
      if (validItems.length === 0) return null;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 24px', paddingTop: '4px' }}>
          {validItems.map((qr) => (
            <div key={qr.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 96 }}>
              <div style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: svgs[qr.id] }} />
              {qr.label && <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 96 }}>{qr.label}</span>}
            </div>
          ))}
        </div>
      );
    }
    // Fallback: no pre-generated SVGs (preview context without export)
    // In preview, QrCodesPreview handles async SVG generation separately
    return null;
  }

  // Generic fallback
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: GRAY_700 }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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

function buildConsultantSectionHtml(
  section: CanonicalResume['sections'][number],
  lang: string,
): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<p class="text-sm leading-relaxed text-gray-600">${md((content as unknown as SummaryContent).text)}</p>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-gray-500"> | ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm text-gray-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${BLUE_600}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<p class="mt-1 text-sm text-gray-600"><span class="font-semibold" style="color:${GRAY_700}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(it.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-semibold" style="color:${GRAY_700}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="mt-0.5 space-y-0.5" style="padding-left:1.25rem;list-style-type:disc">${buildHighlights(it.highlights, 'text-sm text-gray-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-gray-500"> - ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-sm text-gray-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${BLUE_600}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-sm text-gray-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 space-y-0.5" style="padding-left:1.25rem;list-style-type:disc">${buildHighlights(it.highlights, 'text-sm text-gray-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((cat) =>
      `<div><p class="text-sm font-semibold" style="color:${GRAY_700}">${esc(cat.name)}</p>${cat.skills?.length ? `<ul class="mt-0.5" style="padding-left:1.25rem;list-style-type:disc">${cat.skills.map((skill) => `<li class="text-sm text-gray-600">${esc(skill)}</li>`).join('')}</ul>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs font-medium" style="color:${BLUE_600}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<p class="mt-1 text-sm text-gray-600">${md(it.description)}</p>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 space-y-0.5" style="padding-left:1.25rem;list-style-type:disc">${buildHighlights(it.highlights, 'text-sm text-gray-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-bold', issuerClass: 'text-gray-500', dateClass: 'shrink-0 text-xs font-medium', titleStyle: `color:${GRAY_700}`, dateStyle: `color:${BLUE_600}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((it) =>
      `<div><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(it.language)}</span><span class="text-sm text-gray-500"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(it.name)}</span><span class="text-xs text-gray-400">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-gray-400">${esc(it.language)}</span>` : ''}
      ${it.description ? `<p class="mt-1 text-sm text-gray-600">${md(it.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${GRAY_700}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-gray-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs font-medium" style="color:${BLUE_600}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<p class="mt-0.5 text-sm text-gray-600">${md(it.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
    const validItems = items.filter((q) => svgs[q.id]);
    if (validItems.length === 0) return '';
    return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`
    ).join('')}</div>`;
  }

  // Generic fallback
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return `<div class="space-y-2">${items.map((it) => `<div><span class="text-sm font-medium" style="color:${GRAY_700}">${esc(it.name || it.title || it.language || '')}</span>${it.description ? `<p class="text-sm text-gray-600">${md(it.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: PersonalInfoContent): string {
  const { row1, row2 } = buildContactEntries(pi, { variant: 'profile' });
  if (row1.length === 0 && row2.length === 0) return '';

  const textAlign = pi.avatar ? 'left' : 'center';
  const iconColor = '#6b7280';
  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#6b7280">${esc(c.value)}</span></span>`).join('');

  const r1 = row1.length > 0
    ? `<div style="margin-top:12px;font-size:13px;text-align:${textAlign}">${renderRow(row1)}</div>`
    : '';
  const r2 = row2.length > 0
    ? `<div style="margin-top:4px;font-size:13px;text-align:${textAlign}">${renderRow(row2)}</div>`
    : '';

  return r1 + r2;
}

export function buildConsultantHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="consultant-tpl mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <style>.consultant-tpl li::marker { color: ${BLUE_600} !important; }</style>
    <div class="mb-6 h-1 w-full rounded" style="background-color:${BLUE_600}"></div>
    <div class="mb-6">
      <div class="flex items-center gap-4${pi.avatar ? '' : ' justify-center'}">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-full object-cover" style="border:2px solid ${BLUE_600}"/>` : ''}
        <div${pi.avatar ? '' : ' style="text-align:center"'}>
          <h1 class="text-2xl font-bold" style="color:${GRAY_700}">${esc(pi.fullName || 'Your Name')}</h1>
        </div>
      </div>
      ${buildContactHtml(pi)}
    </div>
    ${sections.map((s) => `<div class="mb-6" data-section>
      <h2 class="mb-3 border-l-[3px] pl-3 text-sm font-bold uppercase tracking-wider" style="color:${GRAY_700};border-color:${BLUE_600}">${esc(s.title)}</h2>
      ${buildConsultantSectionHtml(s, lang)}
    </div>`).join('')}
  </div>`;
}

// ============================================================================
// Template Registration
// ============================================================================

export const consultantTemplate: UnifiedTemplate = {
  id: 'consultant',
  name: 'Consultant',
  PreviewComponent: ConsultantPreview,
  buildHtml: buildConsultantHtml,
};
