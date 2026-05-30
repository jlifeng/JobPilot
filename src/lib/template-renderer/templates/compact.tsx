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
import type { CanonicalResume, CanonicalSection, TemplateProps, UnifiedTemplate } from '../types';
import {
  md,
  esc,
  degreeField,
  getPersonalInfo,
  visibleSections,
  buildHighlights,
  markdownListStyle,
} from '../template-contract';

const LEFT_TYPES = new Set(['skills', 'languages', 'certifications', 'custom']);

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

function contactValues(pi: PersonalInfoContent): string[] {
  return [
    pi.jobTitle,
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

export function CompactPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const leftSections = sections.filter((section) => LEFT_TYPES.has(section.type));
  const rightSections = sections.filter((section) => !LEFT_TYPES.has(section.type));
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center gap-3">
          {pi.avatar && <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={48} className="shrink-0" />}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900">{pi.fullName || 'Your Name'}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              {contacts.map((contact, index) => (
                <React.Fragment key={`${contact}-${index}`}>
                  {index > 0 && <span className="text-zinc-300">|</span>}
                  <span className={index === 0 && pi.jobTitle ? 'font-medium text-zinc-700' : undefined}>{contact}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-[32%] shrink-0 border-r border-zinc-100 bg-zinc-50 p-4">
          {leftSections.map((section) => (
            <div key={section.id} className="mb-4" data-section>
              <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{section.title}</h2>
              <CompactLeftContent section={section} />
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          {rightSections.map((section) => (
            <div key={section.id} className="mb-4" data-section>
              <h2 className="mb-1.5 border-b border-zinc-200 pb-0.5 text-xs font-bold uppercase tracking-wider text-zinc-700">{section.title}</h2>
              <CompactRightContent section={section} lang={lang} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompactLeftContent({ section }: { section: CanonicalSection }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-1.5">
        {categories.map((category) => (
          <div key={category.id}>
            <p className="text-[10px] font-semibold text-zinc-600">{category.name}</p>
            <p className="text-[10px] text-zinc-500">{category.skills.join(', ')}</p>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-zinc-700">{item.language}</span>
            <span className="text-zinc-400">{item.proficiency}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <p className="text-[10px] font-semibold text-zinc-700">{item.name}</p>
            {(item.issuer || item.date) && <p className="text-[9px] text-zinc-400">{item.issuer}{item.date ? ` (${item.date})` : ''}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <p className="text-[10px] font-semibold text-zinc-700">{item.title}</p>
            {item.subtitle && <p className="text-[9px] text-zinc-500">{item.subtitle}</p>}
            {item.date && <p className="text-[9px] text-zinc-400">{item.date}</p>}
            {item.description && <p className="text-[9px] text-zinc-400" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-[10px] font-medium text-zinc-700">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-[9px] text-zinc-400" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function CompactRightContent({ section, lang }: { section: CanonicalSection; lang: string }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="text-xs leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-800">{item.position}</span>
                {item.company && <span className="text-xs text-zinc-500"> | {item.company}</span>}
                {item.location && <span className="text-xs text-zinc-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-[10px] text-zinc-400">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('0.875rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-[10px] text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-0.5">
                <p className="text-[10px] font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <TinyBulletList items={item.highlights} />
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
                <span className="text-xs font-bold text-zinc-800">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-xs text-zinc-500"> — {item.institution}</span>}
                {item.location && <span className="text-xs text-zinc-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-[10px] text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-[10px] text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <TinyBulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-zinc-800">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-[10px] text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-xs text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-[10px] text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <TinyBulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-zinc-800">{item.name}</span>
              <span className="text-[10px] text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-[10px] text-zinc-500">{item.language}</span>}
            {item.description && <p className="mt-0.5 text-xs text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-xs font-medium text-zinc-700">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-xs text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function TinyBulletList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="mt-0.5 list-disc pl-3.5">
      {items.map((item, index) => <li key={index} className="text-xs text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function QrCodeGrid({ content }: { content: Record<string, unknown> }): React.ReactElement | null {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
  if (!svgs) return null;
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 16px', paddingTop: '4px' }}>
      {validItems.map((qr) => (
        <div key={qr.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 72 }}>
          <div style={{ width: 64, height: 64 }} dangerouslySetInnerHTML={{ __html: svgs[qr.id] }} />
          {qr.label && <span style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 72 }}>{qr.label}</span>}
        </div>
      ))}
    </div>
  );
}

function buildContactHtml(pi: PersonalInfoContent): string {
  return contactValues(pi)
    .map((value, index) => `${index > 0 ? '<span class="text-zinc-300">|</span>' : ''}<span${index === 0 && pi.jobTitle ? ' class="font-medium text-zinc-700"' : ''}>${esc(value)}</span>`)
    .join('');
}

function buildCompactLeftHtml(section: CanonicalSection): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div><p class="text-[10px] font-semibold text-zinc-600">${esc(category.name)}</p><p class="text-[10px] text-zinc-500">${esc(category.skills.join(', '))}</p></div>`).join('')}</div>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-0.5">${items.map((item) => `<div class="flex items-center justify-between text-[10px]"><span class="font-medium text-zinc-700">${esc(item.language)}</span><span class="text-zinc-400">${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1">${items.map((item) => `<div><p class="text-[10px] font-semibold text-zinc-700">${esc(item.name)}</p>${item.issuer || item.date ? `<p class="text-[9px] text-zinc-400">${item.issuer ? esc(item.issuer) : ''}${item.date ? ` (${esc(item.date)})` : ''}</p>` : ''}</div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div><p class="text-[10px] font-semibold text-zinc-700">${esc(item.title)}</p>${item.subtitle ? `<p class="text-[9px] text-zinc-500">${esc(item.subtitle)}</p>` : ''}${item.date ? `<p class="text-[9px] text-zinc-400">${esc(item.date)}</p>` : ''}${item.description ? `<p class="text-[9px] text-zinc-400">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(content);

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-1">${items.map((item) => `<div><span class="text-[10px] font-medium text-zinc-700">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-[9px] text-zinc-400">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildCompactRightHtml(section: CanonicalSection, lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-xs leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-2.5">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold text-zinc-800">${esc(item.position)}</span>${item.company ? `<span class="text-xs text-zinc-500"> | ${esc(item.company)}</span>` : ''}${item.location ? `<span class="text-xs text-zinc-400">, ${esc(item.location)}</span>` : ''}</div><span class="shrink-0 text-[10px] text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-0.5 text-xs text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description, { listStyle: markdownListStyle('0.875rem') })}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-[10px] text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-0.5"><p class="text-[10px] font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="mt-0.5 list-disc pl-3.5">${buildHighlights(item.highlights, 'text-xs text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold text-zinc-800">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-xs text-zinc-500"> — ${esc(item.institution)}</span>` : ''}${item.location ? `<span class="text-xs text-zinc-400">, ${esc(item.location)}</span>` : ''}</div><span class="shrink-0 text-[10px] text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-[10px] text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-0.5 list-disc pl-3.5">${buildHighlights(item.highlights, 'text-xs text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-xs font-bold text-zinc-800">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-[10px] text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-xs text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-[10px] text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-0.5 list-disc pl-3.5">${buildHighlights(item.highlights, 'text-xs text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-2">${items.map((item) => `<div><div class="flex items-baseline justify-between"><span class="text-xs font-bold text-zinc-800">${esc(item.name)}</span><span class="text-[10px] text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>${item.language ? `<span class="text-[10px] text-zinc-500">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-0.5 text-xs text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(content);

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-1.5">${items.map((item) => `<div><span class="text-xs font-medium text-zinc-700">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-xs text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';
  return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px 16px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:72px">${svgs[qr.id]}<span style="font-size:9px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:72px">${esc(qr.label)}</span></div>`).join('')}</div>`;
}

export function buildCompactHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const leftSections = sections.filter((section) => LEFT_TYPES.has(section.type));
  const rightSections = sections.filter((section) => !LEFT_TYPES.has(section.type));
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="border-b border-zinc-200 px-6 py-4">
      <div class="flex items-center gap-3">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-12 w-12 shrink-0 rounded-full object-cover"/>` : ''}
        <div class="flex-1">
          <h1 class="text-xl font-bold text-zinc-900">${esc(pi.fullName || 'Your Name')}</h1>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">${buildContactHtml(pi)}</div>
        </div>
      </div>
    </div>
    <div class="flex">
      <div class="w-[32%] shrink-0 border-r border-zinc-100 bg-zinc-50 p-4">
        ${leftSections.map((section) => `<div class="mb-4" data-section><h2 class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">${esc(section.title)}</h2>${buildCompactLeftHtml(section)}</div>`).join('')}
      </div>
      <div class="flex-1 p-4">
        ${rightSections.map((section) => `<div class="mb-4" data-section><h2 class="mb-1.5 border-b border-zinc-200 pb-0.5 text-xs font-bold uppercase tracking-wider text-zinc-700">${esc(section.title)}</h2>${buildCompactRightHtml(section, lang)}</div>`).join('')}
      </div>
    </div>
  </div>`;
}

export const compactTemplate: UnifiedTemplate = {
  id: 'compact',
  name: 'Compact',
  PreviewComponent: CompactPreview,
  buildHtml: buildCompactHtml,
};
