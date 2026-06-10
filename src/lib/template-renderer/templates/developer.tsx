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
  extractMarkdownBulletItems,
  getPersonalInfo,
  visibleSections,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const DARK = '#282c34';
const GREEN = '#98c379';
const BLUE = '#61afef';
const ORANGE = '#e5c07b';

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

export function DeveloperPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
      <div className="px-8 py-6" style={{ background: DARK }}>
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
          <span className="ml-3 text-xs text-zinc-500">~/resume</span>
        </div>
        <div className="flex items-center gap-4">
          {pi.avatar && <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={64} className="shrink-0" />}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: GREEN }}>{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-0.5 text-sm" style={{ color: BLUE }}>{`// ${pi.jobTitle}`}</p>}
            <ContactInfo pi={pi} iconColor="#a1a1aa" style={{ color: '#a1a1aa' }} align="left" />
          </div>
        </div>
      </div>

      <div className="p-8">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <h2 className="mb-2 text-sm font-bold" style={{ color: ORANGE }}>
              {'> '}{section.title.toUpperCase()}
            </h2>
            <div className="border-l-2 pl-4" style={{ borderColor: '#3e4451' }}>
              <DeveloperSectionContent section={section} lang={lang} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptList({ items, className = '' }: { items: string[]; className?: string }): React.ReactElement {
  return (
    <ul className={className || 'space-y-0.5'}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-zinc-600">
          <span className="mt-1 shrink-0 text-xs" style={{ color: GREEN }}>$</span>
          <span dangerouslySetInnerHTML={{ __html: md(item) }} />
        </li>
      ))}
    </ul>
  );
}

function DeveloperSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return summaryItems
      ? <PromptList items={summaryItems} />
      : <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md(summaryText) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => {
          const responsibilityItems = extractMarkdownBulletItems(item.description);

          return (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: DARK }}>{item.position}</span>
                {item.company && <span className="text-sm" style={{ color: BLUE }}> @ {item.company}</span>}
              </div>
              <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ background: '#f0f0f0', color: '#636d83' }}>
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {item.description && responsibilityItems && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '职责' : 'Responsibilities'}:</p>
                <PromptList items={responsibilityItems} />
              </div>
            )}
            {item.description && !responsibilityItems && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs" style={{ color: BLUE }}>{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(' | ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <PromptList items={item.highlights} />
              </div>
            )}
          </div>
        )})}
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
                <span className="text-sm font-bold" style={{ color: DARK }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <PromptList items={item.highlights} className="mt-1 space-y-0.5" />}
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
            <span className="text-xs font-bold" style={{ color: ORANGE }}>{category.name}: </span>
            <span className="text-sm text-zinc-600">{category.skills.join(' | ')}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: DARK }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ background: '#f0f0f0', color: '#636d83' }}>
                  {dateRange(item.startDate, item.endDate, true, lang)}
                </span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs" style={{ color: BLUE }}>{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(' | ')}</p>}
            {item.highlights?.length > 0 && <PromptList items={item.highlights} className="mt-1 space-y-0.5" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-semibold" issuerClassName="text-zinc-500" titleStyle={{ color: DARK }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <span className="text-xs font-bold" style={{ color: ORANGE }}>{item.language}: </span>
            <span className="text-sm text-zinc-600">{item.proficiency}</span>
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
              <span className="text-sm font-bold" style={{ color: DARK }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs" style={{ color: BLUE }}>{item.language}</span>}
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
                <span className="text-sm font-bold" style={{ color: DARK }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
            <span className="text-sm font-medium" style={{ color: DARK }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function buildPromptList(items: string[] | undefined, listClass: string): string {
  if (!items?.length) return '';
  return `<ul class="${listClass}">${items.filter(Boolean).map((item) => `<li class="flex items-start gap-2 text-sm text-zinc-600"><span class="mt-1 shrink-0 text-xs" style="color:${GREEN}">$</span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function buildDeveloperSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return summaryItems
      ? buildPromptList(summaryItems, 'space-y-0.5')
      : `<p class="text-sm leading-relaxed text-zinc-600">${md(summaryText)}</p>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${DARK}">${esc(item.position)}</span>${item.company ? `<span class="text-sm" style="color:${BLUE}"> @ ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style="background:#f0f0f0;color:#636d83">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildPromptList(responsibilityItems, 'space-y-0.5')}</div>`; } return item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:${BLUE}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(' | '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildPromptList(item.highlights, 'space-y-0.5')}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${DARK}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-500"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${buildPromptList(item.highlights, 'mt-1 space-y-0.5')}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((category) => `<div><span class="text-xs font-bold" style="color:${ORANGE}">${esc(category.name)}: </span><span class="text-sm text-zinc-600">${esc(category.skills.join(' | '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${DARK}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style="background:#f0f0f0;color:#636d83">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:${BLUE}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(' | '))}</p>` : ''}
      ${buildPromptList(item.highlights, 'mt-1 space-y-0.5')}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-semibold', issuerClass: 'text-zinc-500', titleStyle: `color:${DARK}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1">${items.map((item) => `<div><span class="text-xs font-bold" style="color:${ORANGE}">${esc(item.language)}: </span><span class="text-sm text-zinc-600">${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${DARK}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 text-xs text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs" style="color:${BLUE}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${DARK}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${DARK}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: ReturnType<typeof getPersonalInfo>): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0"><span style="color:#a1a1aa">${entry.htmlIcon}</span><span style="color:#a1a1aa">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:8px;font-size:12px">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '4px' : '8px'};font-size:12px">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildDeveloperHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:'JetBrains Mono','Fira Code',monospace">
    <div class="px-8 py-6" style="background:${DARK}">
      <div class="mb-3 flex items-center gap-1.5">
        <div class="h-3 w-3 rounded-full bg-[#ff5f56]"></div>
        <div class="h-3 w-3 rounded-full bg-[#ffbd2e]"></div>
        <div class="h-3 w-3 rounded-full bg-[#27c93f]"></div>
        <span class="ml-3 text-xs text-zinc-500">~/resume</span>
      </div>
      <div class="flex items-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-lg object-cover"/>` : ''}
        <div>
          <h1 class="text-2xl font-bold" style="color:${GREEN}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-0.5 text-sm" style="color:${BLUE}">// ${esc(pi.jobTitle)}</p>` : ''}
          ${buildContactHtml(pi)}
        </div>
      </div>
    </div>
    <div class="p-8">
      ${sections.map((section) => `<div class="mb-6" data-section>
        <h2 class="mb-2 text-sm font-bold" style="color:${ORANGE}">&gt; ${esc(section.title).toUpperCase()}</h2>
        <div class="border-l-2 pl-4" style="border-color:#3e4451">
          ${buildDeveloperSectionHtml(section, lang)}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

export const developerTemplate: UnifiedTemplate = {
  id: 'developer',
  name: 'Developer',
  PreviewComponent: DeveloperPreview,
  buildHtml: buildDeveloperHtml,
};
