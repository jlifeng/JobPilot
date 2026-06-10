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
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';

const CORAL = '#ff6b6b';

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

export function DesignerPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex">
        <div className="flex-1 px-8 py-8">
          <h1 className="text-4xl font-black tracking-tight text-black">{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-1 text-lg font-light" style={{ color: CORAL }}>{pi.jobTitle}</p>}
          <ContactInfo pi={pi} iconColor="#71717a" style={{ color: '#6b7280' }} align="left" />
        </div>
        {pi.avatar && (
          <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={128} wrapperClassName="w-32 shrink-0" />
        )}
      </div>

      <div className="h-1 w-full" style={{ background: CORAL }} />

      <div className="p-8">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <h2 className="mb-3 text-xs font-black uppercase tracking-[0.3em]" style={{ color: CORAL }}>
              {section.title}
            </h2>
            <DesignerSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PillList({ values, small = false }: { values: string[]; small?: boolean }): React.ReactElement {
  return (
    <div className={small ? 'mt-1.5 flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'}>
      {values.map((value, index) => (
        <span key={index} className={small ? 'rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white' : 'rounded-full px-3 py-1 text-xs font-medium text-white'} style={{ background: CORAL }}>
          {value}
        </span>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="rounded-lg bg-zinc-50 p-4">{children}</div>;
}

function BulletList({ items, className = 'list-disc pl-4' }: { items: string[]; className?: string }): React.ReactElement {
  return (
    <ul className={className}>
      {items.map((item, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function DesignerSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="border-l-4 pl-4 text-sm leading-relaxed text-zinc-600" style={{ borderColor: CORAL }} dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-black">{item.position}</h3>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.company && <p className="text-sm font-medium" style={{ color: CORAL }}>{item.company}</p>}
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <PillList values={item.technologies} small />}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <BulletList items={item.highlights} />
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-black">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-4" />}
          </Card>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return <PillList values={categories.flatMap((category) => category.skills || [])} />;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-black">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <PillList values={item.technologies} small />}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1 list-disc pl-4" />}
          </Card>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-baseline justify-between rounded-lg bg-zinc-50 px-4 py-2">
            <div>
              <span className="text-sm font-semibold text-black">{item.name}</span>
              {item.issuer && <span className="text-sm text-zinc-500"> — {item.issuer}</span>}
            </div>
            {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <PillList values={items.map((item) => `${item.language} — ${item.proficiency}`)} />;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-black">{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs font-medium" style={{ color: CORAL }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </Card>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-black">{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </Card>
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
          <div key={item.id} className="rounded-lg bg-zinc-50 p-3">
            <span className="text-sm font-medium text-black">{item.name || item.title || item.language}</span>
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

function buildPills(values: string[], small = false): string {
  const className = small
    ? 'rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white'
    : 'rounded-full px-3 py-1 text-xs font-medium text-white';
  return values.map((value) => `<span class="${className}" style="background:${CORAL}">${esc(value)}</span>`).join('');
}

function buildDesignerSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="border-l-4 pl-4 text-sm leading-relaxed text-zinc-600" style="border-color:${CORAL}">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold text-black">${esc(item.position)}</h3><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.company ? `<p class="text-sm font-medium" style="color:${CORAL}">${esc(item.company)}</p>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}
      ${item.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1.5">${buildPills(item.technologies, true)}</div>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-500"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="flex flex-wrap gap-2">${buildPills(categories.flatMap((category) => category.skills || []))}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1.5">${buildPills(item.technologies, true)}</div>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div class="flex items-baseline justify-between rounded-lg bg-zinc-50 px-4 py-2"><div><span class="text-sm font-semibold text-black">${esc(item.name)}</span>${item.issuer ? `<span class="text-sm text-zinc-500"> — ${esc(item.issuer)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>`).join('')}</div>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-2">${buildPills(items.map((item) => `${item.language} — ${item.proficiency}`))}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 text-xs text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs font-medium" style="color:${CORAL}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(content);

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div class="rounded-lg bg-zinc-50 p-3"><span class="text-sm font-medium text-black">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
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
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 12px 2px 0"><span style="color:#71717a">${entry.htmlIcon}</span><span style="color:#6b7280">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:12px;font-size:13px">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '4px' : '12px'};font-size:13px">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildDesignerHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="flex">
      <div class="flex-1 px-8 py-8">
        <h1 class="text-4xl font-black tracking-tight text-black">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-lg font-light" style="color:${CORAL}">${esc(pi.jobTitle)}</p>` : ''}
        ${buildContactHtml(pi)}
      </div>
      ${pi.avatar ? `<div class="w-32 shrink-0"><img src="${esc(pi.avatar)}" alt="" class="h-full w-full object-cover"/></div>` : ''}
    </div>
    <div class="h-1 w-full" style="background:${CORAL}"></div>
    <div class="p-8">
      ${sections.map((section) => `<div class="mb-6" data-section>
        <h2 class="mb-3 text-xs font-black uppercase tracking-[0.3em]" style="color:${CORAL}">${esc(section.title)}</h2>
        ${buildDesignerSectionHtml(section, lang)}
      </div>`).join('')}
    </div>
  </div>`;
}

export const designerTemplate: UnifiedTemplate = {
  id: 'designer',
  name: 'Designer',
  PreviewComponent: DesignerPreview,
  buildHtml: buildDesignerHtml,
};
