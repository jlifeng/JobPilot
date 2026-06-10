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

const CHARCOAL = '#2d3436';
const EMERALD = '#00b894';

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

export function ExecutivePreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="px-8 py-8" style={{ background: CHARCOAL }}>
        <div className="flex items-center gap-6">
          {pi.avatar && (
            <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={80} className="shrink-0" style={{ border: `2px solid ${EMERALD}` }} />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-base font-light" style={{ color: EMERALD }}>{pi.jobTitle}</p>}
            <ContactInfo pi={pi} iconColor="#a1a1aa" style={{ color: '#a1a1aa' }} align="left" />
          </div>
        </div>
      </div>

      <div className="p-8">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <h2 className="mb-3 border-b-2 pb-1 text-sm font-bold uppercase tracking-wider" style={{ color: CHARCOAL, borderColor: EMERALD }}>
              {section.title}
            </h2>
            <ExecutiveSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TagList({ values, variant = 'skill' }: { values: string[]; variant?: 'skill' | 'language' }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value, index) => (
        <span key={index} className="rounded border px-2.5 py-1 text-xs font-medium" style={{ borderColor: EMERALD, color: CHARCOAL }}>
          {value}
          {variant === 'language' ? null : null}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items, className = 'list-disc pl-5' }: { items: string[]; className?: string }): React.ReactElement {
  return (
    <ul className={className}>
      {items.map((item, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function ExecutiveSectionContent({
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
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{item.position}</span>
                {item.company && <span className="text-sm text-zinc-600"> | {item.company}</span>}
              </div>
              <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: EMERALD }}>
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
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
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-600"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-5" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return <TagList values={categories.flatMap((category) => category.skills || [])} />;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: EMERALD }}>
                  {dateRange(item.startDate, item.endDate, true, lang)}
                </span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-5" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-bold" issuerClassName="text-zinc-600" titleStyle={{ color: CHARCOAL }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <TagList values={items.map((item) => `${item.language} — ${item.proficiency}`)} variant="language" />;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="text-xs text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-zinc-400">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
                <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{item.title}</span>
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
    return <QrCodeGrid content={content} />;
  }

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: CHARCOAL }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function QrCodeGrid({ content }: { content: Record<string, unknown> }): React.ReactElement | null {
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

function buildExecutiveSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${CHARCOAL}">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-600"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white" style="background:${EMERALD}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${CHARCOAL}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-600"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="flex flex-wrap gap-2">${categories.flatMap((category) => category.skills || []).map((skill) => `<span class="rounded border px-2.5 py-1 text-xs font-medium" style="border-color:${EMERALD};color:${CHARCOAL}">${esc(skill)}</span>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${CHARCOAL}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white" style="background:${EMERALD}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-bold', issuerClass: 'text-zinc-600', titleStyle: `color:${CHARCOAL}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-2">${items.map((item) => `<span class="rounded border px-2.5 py-1 text-xs font-medium" style="border-color:${EMERALD};color:${CHARCOAL}">${esc(item.language)}<span class="text-zinc-500"> — ${esc(item.proficiency)}</span></span>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${CHARCOAL}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs text-zinc-400">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${CHARCOAL}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') {
    return buildQrCodesHtml(content);
  }

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${CHARCOAL}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';
  return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`).join('')}</div>`;
}

function buildContactHtml(pi: ReturnType<typeof getPersonalInfo>): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0"><span style="color:#a1a1aa">${entry.htmlIcon}</span><span style="color:#a1a1aa">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:8px;font-size:13px">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '4px' : '8px'};font-size:13px">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildExecutiveHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="px-8 py-8" style="background:${CHARCOAL}">
      <div class="flex items-center gap-6">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-20 w-20 shrink-0 rounded-lg border-2 object-cover" style="border-color:${EMERALD}"/>` : ''}
        <div class="flex-1">
          <h1 class="text-3xl font-bold tracking-tight text-white">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-base font-light" style="color:${EMERALD}">${esc(pi.jobTitle)}</p>` : ''}
          ${buildContactHtml(pi)}
        </div>
      </div>
    </div>
    <div class="p-8">
      ${sections.map((section) => `<div class="mb-6" data-section>
        <h2 class="mb-3 border-b-2 pb-1 text-sm font-bold uppercase tracking-wider" style="color:${CHARCOAL};border-color:${EMERALD}">${esc(section.title)}</h2>
        ${buildExecutiveSectionHtml(section, lang)}
      </div>`).join('')}
    </div>
  </div>`;
}

export const executiveTemplate: UnifiedTemplate = {
  id: 'executive',
  name: 'Executive',
  PreviewComponent: ExecutivePreview,
  buildHtml: buildExecutiveHtml,
};
