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

const BLUE_GRAY = '#475569';
const ACCENT = '#3b82f6';

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
  return `${startDate} – ${localizedEndDate(endDate, current, lang)}`;
}

export function TimelinePreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6 text-center">
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            avatarStyle={resume.themeConfig.avatarStyle}
            size={72}
            className="mx-auto mb-3"
            style={{ border: `2px solid ${ACCENT}` }}
          />
        )}
        <h1 className="text-2xl font-bold" style={{ color: BLUE_GRAY }}>{pi.fullName || 'Your Name'}</h1>
        {pi.jobTitle && <p className="mt-0.5 text-base" style={{ color: ACCENT }}>{pi.jobTitle}</p>}
        <ContactInfo pi={pi} iconColor="#71717a" style={{ color: '#6b7280' }} />
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider" style={{ color: BLUE_GRAY }}>
            {section.title}
          </h2>
          <TimelineSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function TimelineDot(): React.ReactElement {
  return <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style={{ borderColor: ACCENT }} />;
}

function TimelineSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="relative ml-2 border-l-2 pl-6" style={{ borderColor: '#e2e8f0' }}>
        {items.map((item, index) => (
          <div key={item.id} className={`relative ${index < items.length - 1 ? 'pb-5' : ''}`}>
            <TimelineDot />
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: BLUE_GRAY }}>{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> | {item.company}</span>}
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: '#eff6ff', color: ACCENT }}>
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <TechPills technologies={item.technologies} />}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-4">
                  {item.highlights.map((highlight, highlightIndex) => <li key={highlightIndex} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
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
      <div className="relative ml-2 border-l-2 pl-6" style={{ borderColor: '#e2e8f0' }}>
        {items.map((item, index) => (
          <div key={item.id} className={`relative ${index < items.length - 1 ? 'pb-4' : ''}`}>
            <TimelineDot />
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: BLUE_GRAY }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, highlightIndex) => <li key={highlightIndex} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
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
        {categories.map((category) => (
          <div key={category.id} className="flex text-sm">
            <span className="w-28 shrink-0 font-medium" style={{ color: ACCENT }}>{category.name}:</span>
            <span className="text-zinc-600">{category.skills.join(', ')}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="relative ml-2 border-l-2 pl-6" style={{ borderColor: '#e2e8f0' }}>
        {items.map((item, index) => (
          <div key={item.id} className={`relative ${index < items.length - 1 ? 'pb-5' : ''}`}>
            <TimelineDot />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: BLUE_GRAY }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: '#eff6ff', color: ACCENT }}>
                  {dateRange(item.startDate, item.endDate, true, lang)}
                </span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <TechPills technologies={item.technologies} />}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, highlightIndex) => <li key={highlightIndex} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
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
      <div className="relative ml-2 border-l-2 pl-6" style={{ borderColor: '#e2e8f0' }}>
        {items.map((item, index) => (
          <div key={item.id} className={`relative ${index < items.length - 1 ? 'pb-5' : ''}`}>
            <TimelineDot />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: BLUE_GRAY }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs" style={{ color: ACCENT }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-semibold" issuerClassName="text-zinc-500" titleStyle={{ color: BLUE_GRAY }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {items.map((item) => (
          <span key={item.id} className="text-sm">
            <span className="font-medium" style={{ color: ACCENT }}>{item.language}</span>
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
                <span className="text-sm font-semibold" style={{ color: BLUE_GRAY }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
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
            <span className="text-sm font-medium" style={{ color: BLUE_GRAY }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function TechPills({ technologies }: { technologies: string[] }): React.ReactElement {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {technologies.map((technology, index) => (
        <span key={index} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: '#eff6ff', color: ACCENT }}>
          {technology}
        </span>
      ))}
    </div>
  );
}

function buildTechPills(technologies: string[] | undefined): string {
  if (!technologies?.length) return '';
  return `<div class="mt-1 flex flex-wrap gap-1">${technologies.map((technology) => `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${ACCENT}">${esc(technology)}</span>`).join('')}</div>`;
}

function buildTimelineListHtml<T extends { id: string }>(
  items: T[],
  render: (item: T, index: number, items: T[]) => string,
  paddingClass: string,
): string {
  return `<div class="relative border-l-2 pl-6 ml-2" style="border-color:#e2e8f0">${items.map((item, index, all) =>
    `<div class="relative${index < all.length - 1 ? ` ${paddingClass}` : ''}">
      <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style="border-color:${ACCENT}"></div>
      ${render(item, index, all)}
    </div>`
  ).join('')}</div>`;
}

function buildTimelineSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return buildTimelineListHtml(items, (item) => `
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${BLUE_GRAY}">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-500"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${ACCENT}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}
      ${buildTechPills(item.technologies)}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    `, 'pb-5');
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return buildTimelineListHtml(items, (item) => `
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${BLUE_GRAY}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-500"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    `, 'pb-4');
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1">${categories.map((category) => `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${ACCENT}">${esc(category.name)}:</span><span class="text-zinc-600">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return buildTimelineListHtml(items, (item) => `
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BLUE_GRAY}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${ACCENT}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${buildTechPills(item.technologies)}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    `, 'pb-5');
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return buildTimelineListHtml(items, (item) => `
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BLUE_GRAY}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 text-xs text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs" style="color:${ACCENT}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    `, 'pb-5');
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-semibold', issuerClass: 'text-zinc-500', titleStyle: `color:${BLUE_GRAY}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${items.map((item) => `<span class="text-sm"><span class="font-medium" style="color:${ACCENT}">${esc(item.language)}</span><span class="text-zinc-500"> — ${esc(item.proficiency)}</span></span>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${BLUE_GRAY}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${BLUE_GRAY}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: PersonalInfoContent): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:#71717a">${entry.htmlIcon}</span><span style="color:#6b7280">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:8px;font-size:13px;text-align:center">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '4px' : '8px'};font-size:13px;text-align:center">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildTimelineHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-18 w-18 rounded-full border-2 object-cover" style="border-color:${ACCENT}"/>` : ''}
      <h1 class="text-2xl font-bold" style="color:${BLUE_GRAY}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-0.5 text-base" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
      ${buildContactHtml(pi)}
    </div>
    ${sections.map((section) => `<div class="mb-6" data-section>
      <h2 class="mb-3 text-sm font-bold uppercase tracking-wider" style="color:${BLUE_GRAY}">${esc(section.title)}</h2>
      ${buildTimelineSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const timelineTemplate: UnifiedTemplate = {
  id: 'timeline',
  name: 'Timeline',
  PreviewComponent: TimelinePreview,
  buildHtml: buildTimelineHtml,
};
