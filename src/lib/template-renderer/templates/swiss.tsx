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
import { md, esc, degreeField, extractMarkdownBulletItems, getPersonalInfo, visibleSections } from '../template-contract';

const RED = '#dc2626';
const TEXT = '#18181b';
const MUTED = '#52525b';
const BODY = '#3f3f46';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

function contactValues(pi: PersonalInfoContent): string[] {
  return [
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

function presentText(lang: string): string {
  return lang === 'zh' ? '至今' : 'Present';
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  const endText = endDate || (current ? presentText(lang) : '');
  if (!startDate) return endText;
  return endText ? `${startDate} – ${endText}` : startDate;
}

export function SwissPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
      <div className="mb-8">
        <div className="flex items-start gap-6">
          {pi.avatar && <AvatarImage src={pi.avatar} size={64} avatarStyle={resume.themeConfig.avatarStyle} className="shrink-0" />}
          <div className="flex-1">
            <h1 className="text-3xl font-bold uppercase tracking-tight" style={{ color: TEXT }}>{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-sm font-light uppercase tracking-[0.15em]" style={{ color: MUTED }}>{pi.jobTitle}</p>}
          </div>
        </div>
        {contacts.length > 0 && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-black pt-3 text-xs" style={{ color: TEXT }}>{contacts.map((contact) => <span key={contact}>{contact}</span>)}</div>}
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <div className="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ backgroundColor: RED }} />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: TEXT }}>{section.title}</h2>
          </div>
          <SwissSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function SwissSectionContent({ section, lang }: { section: CanonicalSection; lang: string }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return summaryItems
      ? <RedBulletList items={summaryItems} className="list-none space-y-0.5" />
      : <p className="text-sm leading-relaxed" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: md(summaryText) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return <div className="space-y-4">{items.map((item) => { const responsibilityItems = extractMarkdownBulletItems(item.description); return <SwissGridItem key={item.id} aside={dateRange(item.startDate, item.endDate, item.current, lang)}><h3 className="text-sm font-bold" style={{ color: TEXT }}>{item.position}</h3>{item.company && <p className="text-sm" style={{ color: RED }}>{item.company}</p>}{item.description && responsibilityItems && <HighlightBlock items={responsibilityItems} label={lang === 'zh' ? '职责' : 'Responsibilities'} />}{item.description && !responsibilityItems && <p className="mt-1 text-sm" style={{ color: BODY }}><span className="font-medium" style={{ color: TEXT }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}{item.technologies?.length > 0 && <p className="mt-0.5 text-xs" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}{item.highlights?.length > 0 && <HighlightBlock items={item.highlights} label={lang === 'zh' ? '主要成就' : 'Key Achievements'} />}</SwissGridItem>; })}</div>;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return <div className="space-y-3">{items.map((item) => <SwissGridItem key={item.id} aside={dateRange(item.startDate, item.endDate, false, lang)}><h3 className="text-sm font-bold" style={{ color: TEXT }}>{degreeField(item.degree, item.field)}</h3>{item.institution && <p className="text-sm" style={{ color: RED }}>{item.institution}</p>}{item.gpa && <p className="text-xs" style={{ color: MUTED }}>GPA: {item.gpa}</p>}{item.highlights?.length > 0 && <RedBulletList items={item.highlights} />}</SwissGridItem>)}</div>;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return <div className="space-y-1.5">{categories.map((category) => <div key={category.id} className="grid grid-cols-[140px_1fr] gap-4 text-sm"><span className="font-bold" style={{ color: TEXT }}>{category.name}</span><span style={{ color: BODY }}>{category.skills.join(' / ')}</span></div>)}</div>;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return <div className="space-y-3">{items.map((item) => <SwissGridItem key={item.id} aside={item.startDate ? dateRange(item.startDate, item.endDate, true, lang) : ''}><h3 className="text-sm font-bold" style={{ color: TEXT }}>{item.name}</h3>{item.description && <p className="mt-0.5 text-sm" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}{item.technologies?.length > 0 && <p className="mt-0.5 text-xs" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}{item.highlights?.length > 0 && <RedBulletList items={item.highlights} />}</SwissGridItem>)}</div>;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <SwissGridItem key={item.id} aside={item.date || '\u00A0'}><span className="text-sm font-bold" style={{ color: TEXT }}>{item.name}</span>{item.issuer && <span className="text-sm" style={{ color: BODY }}> — {item.issuer}</span>}</SwissGridItem>)}</div>;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <div className="flex flex-wrap gap-x-6 gap-y-1.5">{items.map((item) => <div key={item.id} className="text-sm"><span className="font-bold" style={{ color: TEXT }}>{item.language}</span><span style={{ color: MUTED }}> — {item.proficiency}</span></div>)}</div>;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return <div className="space-y-3">{items.map((item) => <SwissGridItem key={item.id} aside={`★ ${item.stars?.toLocaleString() ?? 0}`}><h3 className="text-sm font-bold" style={{ color: TEXT }}>{item.name}{item.repoUrl && (<a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-blue-500 hover:underline">{item.repoUrl}</a>)}</h3>{item.language && <span className="text-xs" style={{ color: RED }}>{item.language}</span>}{item.description && <p className="mt-0.5 text-sm" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</SwissGridItem>)}</div>;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return <div className="space-y-3">{items.map((item) => <SwissGridItem key={item.id} aside={item.date || ''}><h3 className="text-sm font-bold" style={{ color: TEXT }}>{item.title}</h3>{item.subtitle && <p className="text-sm" style={{ color: RED }}>{item.subtitle}</p>}{item.description && <p className="mt-0.5 text-sm" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</SwissGridItem>)}</div>;
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-2">{items.map((item) => <div key={item.id}><span className="text-sm font-bold" style={{ color: TEXT }}>{item.name || item.title || item.language}</span>{item.description && <p className="text-sm" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  return null;
}

function SwissGridItem({ aside, children }: { aside: string; children: React.ReactNode }): React.ReactElement {
  return <div className="grid grid-cols-[140px_1fr] gap-4"><span className="text-xs" style={{ color: MUTED }}>{aside || '\u00A0'}</span><div>{children}</div></div>;
}

function HighlightBlock({ items, label }: { items: string[]; label: string }): React.ReactElement {
  return <div className="mt-1"><p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{label}:</p><RedBulletList items={items} /></div>;
}

function RedBulletList({ items, className = 'mt-1 list-none space-y-0.5' }: { items: string[]; className?: string }): React.ReactElement {
  return <ul className={className}>{items.filter(Boolean).map((item, index) => <li key={index} className="flex items-start gap-2 text-sm" style={{ color: BODY }}><span className="mt-1.5 inline-block h-1 w-1 shrink-0" style={{ backgroundColor: RED }} /><span dangerouslySetInnerHTML={{ __html: md(item) }} /></li>)}</ul>;
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

function buildRedBulletList(items: string[] | undefined, className = 'mt-1 list-none space-y-0.5'): string {
  if (!items?.length) return '';
  return `<ul class="${className}">${items.filter(Boolean).map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY}"><span class="mt-1.5 inline-block h-1 w-1 shrink-0" style="background-color:${RED}"></span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function buildSwissGridItem(aside: string, body: string): string {
  return `<div class="grid grid-cols-[140px_1fr] gap-4"><span class="text-xs" style="color:${MUTED}">${esc(aside) || '&nbsp;'}</span><div>${body}</div></div>`;
}

function buildSwissSectionHtml(section: CanonicalSection, lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return summaryItems
      ? buildRedBulletList(summaryItems, 'list-none space-y-0.5')
      : `<p class="text-sm leading-relaxed" style="color:${BODY}">${md(summaryText)}</p>`;
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => buildSwissGridItem(dateRange(item.startDate, item.endDate, item.current, lang), `<h3 class="text-sm font-bold" style="color:${TEXT}">${esc(item.position)}</h3>${item.company ? `<p class="text-sm" style="color:${RED}">${esc(item.company)}</p>` : ''}${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildRedBulletList(responsibilityItems)}</div>`; } return item.description ? `<p class="mt-1 text-sm" style="color:${BODY}"><span class="font-medium" style="color:${TEXT}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}${item.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildRedBulletList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildSwissGridItem(dateRange(item.startDate, item.endDate, false, lang), `<h3 class="text-sm font-bold" style="color:${TEXT}">${esc(degreeField(item.degree, item.field))}</h3>${item.institution ? `<p class="text-sm" style="color:${RED}">${esc(item.institution)}</p>` : ''}${item.gpa ? `<p class="text-xs" style="color:${MUTED}">GPA: ${esc(item.gpa)}</p>` : ''}${buildRedBulletList(item.highlights)}`)).join('')}</div>`;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div class="grid grid-cols-[140px_1fr] gap-4 text-sm"><span class="font-bold" style="color:${TEXT}">${esc(category.name)}</span><span style="color:${BODY}">${esc(category.skills.join(' / '))}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildSwissGridItem(item.startDate ? dateRange(item.startDate, item.endDate, true, lang) : '', `<h3 class="text-sm font-bold" style="color:${TEXT}">${esc(item.name)}</h3>${item.description ? `<p class="mt-0.5 text-sm" style="color:${BODY}">${md(item.description)}</p>` : ''}${item.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}${buildRedBulletList(item.highlights)}`)).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => buildSwissGridItem(item.date || '', `<span class="text-sm font-bold" style="color:${TEXT}">${esc(item.name)}</span>${item.issuer ? `<span class="text-sm" style="color:${BODY}"> — ${esc(item.issuer)}</span>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-x-6 gap-y-1.5">${items.map((item) => `<div class="text-sm"><span class="font-bold" style="color:${TEXT}">${esc(item.language)}</span><span style="color:${MUTED}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildSwissGridItem(`★ ${item.stars?.toLocaleString() ?? 0}`, `<h3 class="text-sm font-bold" style="color:${TEXT}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</h3>${item.language ? `<span class="text-xs" style="color:${RED}">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-0.5 text-sm" style="color:${BODY}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildSwissGridItem(item.date || '', `<h3 class="text-sm font-bold" style="color:${TEXT}">${esc(item.title)}</h3>${item.subtitle ? `<p class="text-sm" style="color:${RED}">${esc(item.subtitle)}</p>` : ''}${item.description ? `<p class="mt-0.5 text-sm" style="color:${BODY}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-bold" style="color:${TEXT}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm" style="color:${BODY}">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildSwissHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif">
    <div class="mb-8">
      <div class="flex items-start gap-6">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 object-cover"/>` : ''}
        <div class="flex-1">
          <h1 class="text-3xl font-bold uppercase tracking-tight" style="color:${TEXT}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-light uppercase tracking-[0.15em]" style="color:${MUTED}">${esc(pi.jobTitle)}</p>` : ''}
        </div>
      </div>
      ${contacts.length ? `<div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-black pt-3 text-xs" style="color:${TEXT}">${contacts.map((contact) => `<span>${esc(contact)}</span>`).join('')}</div>` : ''}
    </div>
    ${sections.map((section) => `<div class="mb-6" data-section><div class="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-2"><span class="inline-block h-2.5 w-2.5 shrink-0" style="background-color:${RED}"></span><h2 class="text-xs font-bold uppercase tracking-[0.2em]" style="color:${TEXT}">${esc(section.title)}</h2></div>${buildSwissSectionHtml(section, lang)}</div>`).join('')}
  </div>`;
}

export const swissTemplate: UnifiedTemplate = {
  id: 'swiss',
  name: 'Swiss',
  PreviewComponent: SwissPreview,
  buildHtml: buildSwissHtml,
};
