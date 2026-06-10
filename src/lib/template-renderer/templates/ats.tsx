import React from 'react';
import type {
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
  markdownListStyle,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

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

export function AtsPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className={`mb-4 ${pi.avatar ? 'flex items-center gap-4' : 'text-center'}`}>
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            size={64}
            avatarStyle={resume.themeConfig.avatarStyle}
            wrapperClassName="shrink-0 overflow-hidden"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-black">{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-0.5 text-base text-zinc-800">{pi.jobTitle}</p>}
          <ContactInfo pi={pi} iconColor="#525252" style={{ color: '#404040' }} />
        </div>
      </div>

      <hr className="mb-4 border-black" />

      {sections.map((section) => (
        <div key={section.id} className="mb-4" data-section>
          <h2 className="mb-1.5 border-b border-black pb-0.5 text-base font-bold uppercase text-black">
            {section.title}
          </h2>
          <AtsSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function AtsSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="text-sm leading-relaxed text-zinc-700" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-black">{item.position}</span>
                {item.company && <span className="text-sm text-zinc-700">, {item.company}</span>}
                {item.location && <span className="text-sm text-zinc-500">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-sm text-zinc-600">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-sm text-zinc-700">
                <span className="font-medium text-zinc-800">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="text-sm text-zinc-600">{lang === 'zh' ? '技术栈' : 'Technologies'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-bold text-black">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <BulletList items={item.highlights} />
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
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-black">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-700">, {item.institution}</span>}
                {item.location && <span className="text-sm text-zinc-500">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-sm text-zinc-600">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-600">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-5" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id}>
            <p className="text-sm font-bold text-black">{category.name}</p>
            {category.skills?.length > 0 && (
              <ul className="mt-0.5 list-disc pl-4">
                {category.skills.map((skill, index) => <li key={index} className="text-sm text-zinc-700">{skill}</li>)}
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
              <span className="text-sm font-bold text-black">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-sm text-zinc-600">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="text-sm text-zinc-600">{lang === 'zh' ? '技术栈' : 'Technologies'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-5" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-bold text-black" issuerClassName="text-zinc-700" dateClassName="shrink-0 text-sm text-zinc-600" />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <p className="text-sm text-zinc-700">
        {items.map((item, index) => (
          <span key={item.id}>
            {item.language} ({item.proficiency}){index < items.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-black">{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="text-xs text-zinc-600">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-zinc-600">{item.language}</span>}
            {item.description && <p className="mt-0.5 text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
                <span className="text-sm font-bold text-black">{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-600"> - {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-sm text-zinc-600">{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-bold text-black">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function BulletList({ items, className = 'list-disc pl-5' }: { items: string[]; className?: string }): React.ReactElement {
  return (
    <ul className={className}>
      {items.map((item, index) => <li key={index} className="text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function buildAtsSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm leading-relaxed text-zinc-700">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-700">, ${esc(item.company)}</span>` : ''}${item.location ? `<span class="text-sm text-zinc-500">, ${esc(item.location)}</span>` : ''}</div><span class="shrink-0 text-sm text-zinc-600">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-700"><span class="font-medium text-zinc-800">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="text-sm text-zinc-600">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-bold text-black">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-700')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-700">, ${esc(item.institution)}</span>` : ''}${item.location ? `<span class="text-sm text-zinc-500">, ${esc(item.location)}</span>` : ''}</div><span class="shrink-0 text-sm text-zinc-600">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-600">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-700')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((category) =>
      `<div><p class="text-sm font-bold text-black">${esc(category.name)}</p>${category.skills?.length ? `<ul class="mt-0.5 list-disc pl-4">${category.skills.map((skill) => `<li class="text-sm text-zinc-700">${esc(skill)}</li>`).join('')}</ul>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-sm text-zinc-600">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-700">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="text-sm text-zinc-600">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-700')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-bold text-black', issuerClass: 'text-zinc-700', dateClass: 'shrink-0 text-sm text-zinc-600' });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<p class="text-sm text-zinc-700">${items.map((item, index) => `${esc(item.language)} (${esc(item.proficiency)})${index < items.length - 1 ? ', ' : ''}`).join('')}</p>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-600">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs text-zinc-600">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-700">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-600"> - ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-sm text-zinc-600">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-700">${md(item.description)}</p>` : ''}
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
    return `<div class="space-y-1">${items.map((item) => `<div><span class="text-sm font-bold text-black">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-700">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: ReturnType<typeof getPersonalInfo>): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:#525252;font-size:12px">${entry.htmlIcon}</span><span style="color:#404040">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px;text-align:center">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px;text-align:center">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildAtsHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Arial,Helvetica,sans-serif">
    <div class="mb-4 ${pi.avatar ? 'flex items-center gap-4' : 'text-center'}">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-full object-cover"/>` : ''}
      <div>
        <h1 class="text-2xl font-bold text-black">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-0.5 text-base text-zinc-800">${esc(pi.jobTitle)}</p>` : ''}
        ${buildContactHtml(pi)}
      </div>
    </div>
    <hr class="mb-4 border-black"/>
    ${sections.map((section) => `<div class="mb-4" data-section>
      <h2 class="mb-1.5 border-b border-black pb-0.5 text-base font-bold uppercase text-black">${esc(section.title)}</h2>
      ${buildAtsSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const atsTemplate: UnifiedTemplate = {
  id: 'ats',
  name: 'ATS',
  PreviewComponent: AtsPreview,
  buildHtml: buildAtsHtml,
};
