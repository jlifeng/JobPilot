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
import { AvatarImage } from '@/components/preview/avatar-image';
import type { CanonicalResume, TemplateProps, UnifiedTemplate } from '../types';
import {
  md,
  esc,
  degreeField,
  getPersonalInfo,
  visibleSections,
  buildHighlights,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';
const SLATE_50 = '#f8fafc';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} - ${localizedEndDate(endDate, current, lang)}`;
}

export function NordicPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-8 text-center">
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            size={64}
            avatarStyle={resume.themeConfig.avatarStyle}
            className="mx-auto mb-3"
            style={{ border: `2px solid ${SLATE_400}` }}
          />
        )}
        <h1 className="text-2xl font-light tracking-wide" style={{ color: SLATE_500 }}>{pi.fullName || 'Your Name'}</h1>
        {pi.jobTitle && <p className="mt-1 text-sm font-light tracking-wider" style={{ color: SLATE_400 }}>{pi.jobTitle}</p>}
        <ContactInfo pi={pi} iconColor={SLATE_400} style={{ color: SLATE_400 }} />
      </div>

      <div className="mx-auto mb-8 h-px w-full" style={{ backgroundColor: SLATE_400 }} />

      {sections.map((section) => (
        <div key={section.id} className="mb-7" data-section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em]" style={{ color: SLATE_500 }}>
            {section.title}
          </h2>
          <NordicSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function NordicSectionContent({
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
        className="text-sm font-light leading-relaxed"
        style={{ color: SLATE_500 }}
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-sm p-3" style={{ backgroundColor: SLATE_50 }}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.position}</span>
                {item.company && <span className="text-sm font-light" style={{ color: SLATE_400 }}> | {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs font-light" style={{ color: SLATE_400 }}>
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm font-light" style={{ color: SLATE_500 }}>
                <span className="font-medium" style={{ color: SLATE_500 }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs font-light" style={{ color: SLATE_400 }}>
                {lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}
              </p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium" style={{ color: SLATE_400 }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-4">
                  {item.highlights.map((highlight, index) => (
                    <li key={index} className="text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(highlight) }} />
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
          <div key={item.id} className="rounded-sm p-3" style={{ backgroundColor: SLATE_50 }}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm font-light" style={{ color: SLATE_400 }}> - {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs font-light" style={{ color: SLATE_400 }}>
                {dateRange(item.startDate, item.endDate, true, lang)}
              </span>
            </div>
            {item.gpa && <p className="text-xs font-light" style={{ color: SLATE_400 }}>GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 list-disc pl-4">
                {item.highlights.map((highlight, index) => (
                  <li key={index} className="text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(highlight) }} />
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
        {categories.map((category) => (
          <div key={category.id} className="flex text-sm">
            <span className="w-28 shrink-0 font-medium" style={{ color: SLATE_500 }}>{category.name}:</span>
            <span className="font-light" style={{ color: SLATE_400 }}>{category.skills.join(', ')}</span>
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
          <div key={item.id} className="rounded-sm p-3" style={{ backgroundColor: SLATE_50 }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 text-xs font-light" style={{ color: SLATE_400 }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs font-light" style={{ color: SLATE_400 }}>{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 list-disc pl-4">
                {item.highlights.map((highlight, index) => (
                  <li key={index} className="text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(highlight) }} />
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
    return <CertificationList items={items} titleClassName="font-medium" issuerClassName="font-light" dateClassName="shrink-0 text-xs font-light" titleStyle={{ color: SLATE_500 }} issuerStyle={{ color: SLATE_400 }} dateStyle={{ color: SLATE_400 }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.language}</span>
            <span className="text-sm font-light" style={{ color: SLATE_400 }}> — {item.proficiency}</span>
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
          <div key={item.id} className="rounded-sm p-3" style={{ backgroundColor: SLATE_50 }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.name}</span>
              <span className="text-xs font-light" style={{ color: SLATE_400 }}>★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs font-light" style={{ color: SLATE_400 }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
                <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.title}</span>
                {item.subtitle && <span className="text-sm font-light" style={{ color: SLATE_400 }}> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs font-light" style={{ color: SLATE_400 }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm font-light" style={{ color: SLATE_500 }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
    if (!svgs) return null;
    const validItems = items.filter((qr) => svgs[qr.id]);
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
    const items = content.items as GenericItem[];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: SLATE_500 }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm font-light" style={{ color: SLATE_400 }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function buildNordicSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm font-light leading-relaxed" style="color:${SLATE_500}">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.position)}</span>${item.company ? `<span class="text-sm font-light" style="color:${SLATE_400}"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm font-light" style="color:${SLATE_500}"><span class="font-medium" style="color:${SLATE_500}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs font-light" style="color:${SLATE_400}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${SLATE_400}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm font-light')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm font-light" style="color:${SLATE_400}"> - ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-xs font-light" style="color:${SLATE_400}">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm font-light')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${SLATE_500}">${esc(category.name)}:</span><span class="font-light" style="color:${SLATE_400}">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm font-light" style="color:${SLATE_500}">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs font-light" style="color:${SLATE_400}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm font-light')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-medium', issuerClass: 'font-light', dateClass: 'shrink-0 text-xs font-light', titleStyle: `color:${SLATE_500}`, issuerStyle: `color:${SLATE_400}`, dateStyle: `color:${SLATE_400}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.language)}</span><span class="text-sm font-light" style="color:${SLATE_400}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.name)}</span><span class="text-xs font-light" style="color:${SLATE_400}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs font-light" style="color:${SLATE_400}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm font-light" style="color:${SLATE_500}">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm font-light" style="color:${SLATE_400}"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm font-light" style="color:${SLATE_500}">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
    const validItems = items.filter((qr) => svgs[qr.id]);
    if (validItems.length === 0) return '';
    return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`).join('')}</div>`;
  }

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm font-light" style="color:${SLATE_400}">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: PersonalInfoContent): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:${SLATE_400}">${entry.htmlIcon}</span><span style="color:${SLATE_400}">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:12px;font-size:12px;text-align:center">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '4px' : '12px'};font-size:12px;text-align:center">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildNordicHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-8 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-16 w-16 rounded-full object-cover" style="border:2px solid ${SLATE_400}"/>` : ''}
      <h1 class="text-2xl font-light tracking-wide" style="color:${SLATE_500}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-sm font-light tracking-wider" style="color:${SLATE_400}">${esc(pi.jobTitle)}</p>` : ''}
      ${buildContactHtml(pi)}
    </div>
    <div class="mx-auto mb-8 h-px w-full" style="background-color:${SLATE_400}"></div>
    ${sections.map((section) => `<div class="mb-7" data-section>
      <h2 class="mb-3 text-xs font-medium uppercase tracking-[0.2em]" style="color:${SLATE_500}">${esc(section.title)}</h2>
      ${buildNordicSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const nordicTemplate: UnifiedTemplate = {
  id: 'nordic',
  name: 'Nordic',
  PreviewComponent: NordicPreview,
  buildHtml: buildNordicHtml,
};
