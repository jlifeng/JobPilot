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
import { md, esc, degreeField, getPersonalInfo, visibleSections, buildHighlights } from '../template-contract';

const LEFT_TYPES = new Set(['skills', 'languages', 'certifications', 'custom']);
const SIDEBAR_BG = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)';
const DARK = '#1a1a2e';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

interface ContactRow {
  label: string;
  value: string;
  breakAll?: boolean;
}

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} – ${localizedEndDate(endDate, current, lang)}`;
}

function contactRows(pi: PersonalInfoContent): ContactRow[] {
  return [
    pi.age ? { label: 'Age:', value: pi.age } : null,
    pi.politicalStatus ? { label: 'Political:', value: pi.politicalStatus } : null,
    pi.gender ? { label: 'Gender:', value: pi.gender } : null,
    pi.ethnicity ? { label: 'Ethnicity:', value: pi.ethnicity } : null,
    pi.hometown ? { label: 'Hometown:', value: pi.hometown } : null,
    pi.maritalStatus ? { label: 'Marital:', value: pi.maritalStatus } : null,
    pi.yearsOfExperience ? { label: 'Experience:', value: pi.yearsOfExperience } : null,
    pi.educationLevel ? { label: 'Education:', value: pi.educationLevel } : null,
    pi.email ? { label: 'Email:', value: pi.email, breakAll: true } : null,
    pi.phone ? { label: 'Phone:', value: pi.phone } : null,
    pi.wechat ? { label: 'WeChat:', value: pi.wechat } : null,
    pi.location ? { label: 'Location:', value: pi.location } : null,
    pi.website ? { label: 'Web:', value: pi.website, breakAll: true } : null,
    pi.linkedin ? { label: 'LinkedIn:', value: pi.linkedin, breakAll: true } : null,
    pi.github ? { label: 'GitHub:', value: pi.github, breakAll: true } : null,
  ].filter(Boolean) as ContactRow[];
}

export function TwoColumnPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const leftSections = sections.filter((section) => LEFT_TYPES.has(section.type));
  const rightSections = sections.filter((section) => !LEFT_TYPES.has(section.type));
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto flex max-w-[210mm] overflow-hidden bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif', minHeight: '297mm' }}>
      <div className="w-[35%] shrink-0 p-6 text-white" style={{ background: SIDEBAR_BG }}>
        <div className="mb-6 text-center">
          {pi.avatar && (
            <AvatarImage
              src={pi.avatar}
              size={80}
              avatarStyle={resume.themeConfig.avatarStyle}
              wrapperClassName="mx-auto mb-3 w-fit overflow-hidden"
            />
          )}
          <h1 className="text-xl font-bold tracking-tight text-white">{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-1 text-sm font-light text-zinc-300">{pi.jobTitle}</p>}
        </div>

        <div className="mb-6 space-y-1.5 text-xs">
          {contactRows(pi).map((row) => (
            <div key={`${row.label}-${row.value}`} className="flex items-start gap-2 text-zinc-300">
              <span className="shrink-0 text-zinc-400">{row.label}</span>
              <span className={row.breakAll ? 'break-all' : undefined}>{row.value}</span>
            </div>
          ))}
        </div>

        {leftSections.map((section) => (
          <div key={section.id} className="mb-5" data-section>
            <h2 className="mb-2 border-b border-white/20 pb-1 text-xs font-bold uppercase tracking-wider text-white">{section.title}</h2>
            <TwoColumnLeftContent section={section} />
          </div>
        ))}
      </div>

      <div className="flex-1 p-6">
        {rightSections.map((section) => (
          <div key={section.id} className="mb-5" data-section>
            <h2 className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase tracking-wider" style={{ color: DARK, borderColor: DARK }}>{section.title}</h2>
            <TwoColumnRightContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoColumnLeftContent({ section }: { section: CanonicalSection }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id}>
            <p className="text-xs font-semibold text-zinc-200">{category.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {category.skills.map((skill) => <span key={skill} className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">{skill}</span>)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <div key={item.id} className="flex items-center justify-between text-xs"><span className="text-zinc-200">{item.language}</span><span className="text-zinc-400">{item.proficiency}</span></div>)}</div>;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <div key={item.id}><p className="text-xs font-semibold text-zinc-200">{item.name}</p>{(item.issuer || item.date) && <p className="text-[10px] text-zinc-400">{item.issuer}{item.date ? ` (${item.date})` : ''}</p>}</div>)}</div>;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <div key={item.id}><p className="text-xs font-semibold text-zinc-200">{item.title}</p>{item.subtitle && <p className="text-[10px] text-zinc-400">{item.subtitle}</p>}{item.description && <p className="text-[10px] text-zinc-400" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-1.5">{items.map((item) => <div key={item.id}><span className="text-xs font-medium text-zinc-200">{item.name || item.title || item.language}</span>{item.description && <p className="text-[10px] text-zinc-400" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  return null;
}

function TwoColumnRightContent({ section, lang }: { section: CanonicalSection; lang: string }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-semibold text-zinc-800">{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> | {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600"><span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{item.technologies.map((technology) => <span key={technology} className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{technology}</span>)}</div>}
            {item.highlights?.length > 0 && <HighlightBlock items={item.highlights} label={lang === 'zh' ? '主要成就' : 'Key Achievements'} />}
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
              <span className="text-sm font-semibold text-zinc-800">{item.institution}</span>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            <p className="text-sm text-zinc-600">{degreeField(item.degree, item.field)}</p>
            {item.gpa && <p className="text-xs text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
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
              <span className="text-sm font-semibold text-zinc-800">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{item.technologies.map((technology) => <span key={technology} className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{technology}</span>)}</div>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return <div className="space-y-3">{items.map((item) => <div key={item.id}><div className="flex items-baseline justify-between"><span className="text-sm font-semibold text-zinc-800">{item.name}</span><span className="shrink-0 text-xs text-zinc-400">{item.stars?.toLocaleString()}</span></div>{item.language && <span className="text-xs text-zinc-500">{item.language}</span>}{item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-2">{items.map((item) => <div key={item.id}><span className="text-sm font-medium text-zinc-700">{item.name || item.title || item.language}</span>{item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  return null;
}

function HighlightBlock({ items, label }: { items: string[]; label: string }): React.ReactElement {
  return (
    <div className="mt-1">
      <p className="mb-0.5 text-xs font-medium text-zinc-500">{label}:</p>
      <BulletList items={items} />
    </div>
  );
}

function BulletList({ items }: { items: string[] }): React.ReactElement {
  return <ul className="list-disc pl-4">{items.map((item, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}</ul>;
}

function QrCodeGrid({ content }: { content: Record<string, unknown> }): React.ReactElement | null {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
  if (!svgs) return null;
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 24px', paddingTop: '4px' }}>{validItems.map((qr) => <div key={qr.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 96 }}><div style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: svgs[qr.id] }} />{qr.label && <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 96 }}>{qr.label}</span>}</div>)}</div>;
}

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';
  return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`).join('')}</div>`;
}

function buildContactRowsHtml(pi: PersonalInfoContent): string {
  return contactRows(pi).map((row) => `<div class="flex items-start gap-2 text-zinc-300"><span class="shrink-0 text-zinc-400">${esc(row.label)}</span><span${row.breakAll ? ' class="break-all"' : ''}>${esc(row.value)}</span></div>`).join('');
}

function buildTwoColumnLeftHtml(section: CanonicalSection): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((category) => `<div><p class="text-xs font-semibold text-zinc-200">${esc(category.name)}</p><div class="mt-1 flex flex-wrap gap-1">${category.skills.map((skill) => `<span class="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">${esc(skill)}</span>`).join('')}</div></div>`).join('')}</div>`;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div class="flex items-center justify-between text-xs"><span class="text-zinc-200">${esc(item.language)}</span><span class="text-zinc-400">${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div><p class="text-xs font-semibold text-zinc-200">${esc(item.name)}</p>${item.issuer || item.date ? `<p class="text-[10px] text-zinc-400">${item.issuer ? esc(item.issuer) : ''}${item.date ? ` (${esc(item.date)})` : ''}</p>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div><p class="text-xs font-semibold text-zinc-200">${esc(item.title)}</p>${item.subtitle ? `<p class="text-[10px] text-zinc-400">${esc(item.subtitle)}</p>` : ''}${item.description ? `<p class="text-[10px] text-zinc-400">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-1.5">${items.map((item) => `<div><span class="text-xs font-medium text-zinc-200">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-[10px] text-zinc-400">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

function buildTwoColumnRightHtml(section: CanonicalSection, lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold text-zinc-800">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-500"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${item.technologies.map((technology) => `<span class="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">${esc(technology)}</span>`).join('')}</div>` : ''}${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><span class="text-sm font-semibold text-zinc-800">${esc(item.institution)}</span><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div><p class="text-sm text-zinc-600">${esc(degreeField(item.degree, item.field))}</p>${item.gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}${item.highlights?.length ? `<ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><span class="text-sm font-semibold text-zinc-800">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${item.technologies.map((technology) => `<span class="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">${esc(technology)}</span>`).join('')}</div>` : ''}${item.highlights?.length ? `<ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><span class="text-sm font-semibold text-zinc-800">${esc(item.name)}</span><span class="shrink-0 text-xs text-zinc-400">${item.stars?.toLocaleString() ?? 0}</span></div>${item.language ? `<span class="text-xs text-zinc-500">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium text-zinc-700">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildTwoColumnHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const leftSections = sections.filter((section) => LEFT_TYPES.has(section.type));
  const rightSections = sections.filter((section) => !LEFT_TYPES.has(section.type));
  const lang = resume.language || 'en';

  return `<div class="mx-auto flex max-w-[210mm] overflow-hidden bg-white shadow-lg" style="font-family:Inter,sans-serif;min-height:297mm">
    <div class="w-[35%] shrink-0 p-6 text-white" style="background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)">
      <div class="mb-6 text-center">
        ${pi.avatar ? `<div class="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full"><img src="${esc(pi.avatar)}" alt="" class="h-full w-full object-cover"/></div>` : ''}
        <h1 class="text-xl font-bold tracking-tight text-white">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-sm font-light text-zinc-300">${esc(pi.jobTitle)}</p>` : ''}
      </div>
      <div class="mb-6 space-y-1.5 text-xs">${buildContactRowsHtml(pi)}</div>
      ${leftSections.map((section) => `<div class="mb-5" data-section><h2 class="mb-2 border-b border-white/20 pb-1 text-xs font-bold uppercase tracking-wider text-white">${esc(section.title)}</h2>${buildTwoColumnLeftHtml(section)}</div>`).join('')}
    </div>
    <div class="flex-1 p-6">
      ${rightSections.map((section) => `<div class="mb-5" data-section><h2 class="mb-2 border-b-2 pb-1 text-sm font-bold uppercase tracking-wider" style="color:${DARK};border-color:${DARK}">${esc(section.title)}</h2>${buildTwoColumnRightHtml(section, lang)}</div>`).join('')}
    </div>
  </div>`;
}

export const twoColumnTemplate: UnifiedTemplate = {
  id: 'two-column',
  name: 'Two Column',
  PreviewComponent: TwoColumnPreview,
  buildHtml: buildTwoColumnHtml,
};
