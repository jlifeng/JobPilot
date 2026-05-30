/**
 * Professional Template - Unified Implementation
 *
 * This template provides both preview (React) and export (HTML) rendering
 * from the same template definition so section structure does not drift.
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
import type { CanonicalResume, TemplateProps, UnifiedTemplate } from '../types';
import {
  md,
  esc,
  degreeField,
  getPersonalInfo,
  visibleSections,
  buildHighlights,
  markdownListStyle,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';
import { AvatarImage } from '@/components/preview/avatar-image';

const BLUE = '#1e3a5f';
const FONT_FAMILY = 'Georgia, "Times New Roman", serif';

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  const endText = localizedEndDate(endDate, current, lang);
  return endText ? `${startDate} – ${endText}` : startDate;
}

// ============================================================================
// Preview Component (React)
// ============================================================================

export function ProfessionalPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: FONT_FAMILY }}>
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-4">
          {pi.avatar && (
            <AvatarImage
              src={pi.avatar}
              avatarStyle={resume.themeConfig.avatarStyle}
              size={72}
              className="shrink-0"
              style={{ border: `2px solid ${BLUE}` }}
            />
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-wide" style={{ color: BLUE }}>
              {pi.fullName || 'Your Name'}
            </h1>
          </div>
        </div>
        <ContactInfo pi={pi} iconColor={BLUE} variant="profile" />
        <div
          className="mt-4 h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${BLUE} 20%, ${BLUE} 80%, transparent 100%)` }}
        />
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-5" data-section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>
              {section.title}
            </h2>
            <div className="h-[1px] flex-1 bg-zinc-200" />
          </div>
          <ProfessionalSectionContent section={section} lang={resume.language || 'en'} />
        </div>
      ))}
    </div>
  );
}

function ProfessionalSectionContent({
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
        style={{ fontFamily: 'Georgia, serif' }}
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
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
                <span className="text-sm font-bold" style={{ color: BLUE }}>{item.position}</span>
                {item.company && <span className="text-sm text-zinc-600"> — {item.company}</span>}
                {item.location && <span className="text-sm text-zinc-400"> ({item.location})</span>}
              </div>
              <span className="shrink-0 text-xs italic text-zinc-400">
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}
              </p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-5">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
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
                <span className="text-sm font-bold" style={{ color: BLUE }}>{item.institution}</span>
                {item.location && <span className="text-sm text-zinc-400"> ({item.location})</span>}
              </div>
              <span className="shrink-0 text-xs italic text-zinc-400">
                {dateRange(item.startDate, item.endDate, true, lang)}
              </span>
            </div>
            <p className="text-sm text-zinc-600">{degreeField(item.degree, item.field)}</p>
            {item.gpa && <p className="text-xs text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {item.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
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
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id}>
            <p className="text-sm font-semibold" style={{ color: BLUE }}>{cat.name}</p>
            {cat.skills?.length > 0 && (
              <ul className="mt-0.5 list-disc pl-5">
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
              <span className="text-sm font-bold" style={{ color: BLUE }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 text-xs italic text-zinc-400">
                  {dateRange(item.startDate, item.endDate, !item.endDate, lang)}
                </span>
              )}
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}
              </p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {item.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
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
              <span className="text-sm font-bold" style={{ color: BLUE }}>{item.name}</span>
              <span className="shrink-0 text-xs italic text-zinc-400">{item.stars?.toLocaleString() ?? 0}</span>
            </div>
            {item.language && <span className="text-xs text-zinc-500">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-semibold" issuerClassName="text-zinc-600" dateClassName="shrink-0 text-xs italic text-zinc-400" titleStyle={{ color: BLUE }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {items.map((item) => (
          <span key={item.id} className="text-sm">
            <span className="font-semibold" style={{ color: BLUE }}>{item.language}</span>
            <span className="text-zinc-500"> — {item.proficiency}</span>
          </span>
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
                <span className="text-sm font-semibold" style={{ color: BLUE }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs italic text-zinc-400">{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
    if (!svgs) return null;
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

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: BLUE }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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

function buildProfessionalSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<p class="text-sm leading-relaxed text-zinc-600" style="font-family:Georgia,serif">${md((content as unknown as SummaryContent).text)}</p>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${BLUE}">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-zinc-600"> — ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm text-zinc-400"> (${esc(it.location)})</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400 italic">${esc(dateRange(it.startDate, it.endDate, it.current, lang))}</span></div>
      ${it.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(it.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${BLUE}">${esc(it.institution)}</span>${it.location ? `<span class="text-sm text-zinc-400"> (${esc(it.location)})</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400 italic">${esc(dateRange(it.startDate, it.endDate, true, lang))}</span></div>
      <p class="text-sm text-zinc-600">${esc(degreeField(it.degree, it.field))}</p>
      ${it.gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((cat) => `<div>
      <p class="text-sm font-semibold" style="color:${BLUE}">${esc(cat.name)}</p>
      ${cat.skills?.length ? `<ul class="mt-0.5 list-disc pl-5">${cat.skills.map((skill) => `<li class="text-sm text-zinc-600">${esc(skill)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BLUE}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-400 italic">${esc(dateRange(it.startDate, it.endDate, !it.endDate, lang))}</span>` : ''}</div>
      ${it.description ? `<p class="mt-1 text-sm text-zinc-600">${md(it.description)}</p>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BLUE}">${esc(it.name)}</span><span class="shrink-0 text-xs text-zinc-400 italic">${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<p class="mt-1 text-sm text-zinc-600">${md(it.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-semibold', issuerClass: 'text-zinc-600', dateClass: 'shrink-0 text-xs text-zinc-400 italic', titleStyle: `color:${BLUE}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${items.map((it) =>
      `<span class="text-sm"><span class="font-semibold" style="color:${BLUE}">${esc(it.language)}</span><span class="text-zinc-500"> — ${esc(it.proficiency)}</span></span>`
    ).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-2">${items.map((it) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${BLUE}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400 italic">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<p class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</p>` : ''}
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

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    return `<div class="space-y-2">${items.map((it) => `<div><span class="text-sm font-medium" style="color:${BLUE}">${esc(it.name || it.title || it.language || '')}</span>${it.description ? `<p class="text-sm text-zinc-600">${md(it.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: PersonalInfoContent): string {
  const { row1, row2 } = buildContactEntries(pi, { variant: 'profile' });
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px"><span style="color:${BLUE};font-size:12px">${c.htmlIcon}</span><span style="color:#6B7280">${esc(c.value)}</span></span>`).join('');

  const r1 = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px;text-align:center">${renderRow(row1)}</div>`
    : '';
  const r2 = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px;text-align:center">${renderRow(row2)}</div>`
    : '';

  return r1 + r2;
}

export function buildProfessionalHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Georgia,'Times New Roman',serif">
    <div class="mb-6 text-center">
      <div class="flex items-center justify-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-[72px] w-[72px] shrink-0 rounded-full border-2 object-cover" style="border-color:${BLUE}"/>` : ''}
        <div>
          <h1 class="text-3xl font-bold tracking-wide" style="color:${BLUE}">${esc(pi.fullName || 'Your Name')}</h1>
        </div>
      </div>
      ${buildContactHtml(pi)}
      <div class="mt-4 h-[2px] w-full" style="background:linear-gradient(90deg,transparent 0%,${BLUE} 20%,${BLUE} 80%,transparent 100%)"></div>
    </div>
    ${sections.map((s) => `<div class="mb-5" data-section>
      <div class="mb-3 flex items-center gap-3"><h2 class="text-sm font-bold uppercase tracking-[0.2em]" style="color:${BLUE}">${esc(s.title)}</h2><div class="h-[1px] flex-1 bg-zinc-200"></div></div>
      ${buildProfessionalSectionHtml(s, lang)}
    </div>`).join('')}
  </div>`;
}

// ============================================================================
// Template Registration
// ============================================================================

export const professionalTemplate: UnifiedTemplate = {
  id: 'professional',
  name: 'Professional',
  PreviewComponent: ProfessionalPreview,
  buildHtml: buildProfessionalHtml,
};
