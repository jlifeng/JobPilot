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
import { md, esc, degreeField, extractMarkdownBulletItems, getPersonalInfo, visibleSections } from '../template-contract';

const PRIMARY = '#1e293b';
const ACCENT = '#0284c7';
const SECONDARY = '#64748b';
const BODY_TEXT = '#334155';
const RULE_COLOR = '#cbd5e1';
const LIGHT_BG = '#f1f5f9';
const MONO = 'JetBrains Mono, Consolas, monospace';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

function contactValues(pi: PersonalInfoContent): string[] {
  const values = [
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

  if (pi.linkedin) values.push(`LinkedIn: ${pi.linkedin}`);
  if (pi.github) values.push(`GitHub: ${pi.github}`);
  return values;
}

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} - ${localizedEndDate(endDate, current, lang)}`;
}

export function EngineerPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="px-8 py-6" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #334155 100%)` }}>
        <div className="flex items-center gap-5">
          {pi.avatar && <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={64} className="shrink-0" style={{ border: `2px solid ${ACCENT}` }} />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-0.5 text-sm font-medium" style={{ color: ACCENT }}>{pi.jobTitle}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="space-y-0.5 text-xs" style={{ color: '#94a3b8' }}>{contacts.map((contact, index) => <p key={`${contact}-${index}`}>{contact}</p>)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1">
          <div className="h-0.5 flex-1" style={{ backgroundColor: ACCENT }} />
          <div className="h-2 w-px" style={{ backgroundColor: ACCENT }} />
          <div className="h-0.5 w-8" style={{ backgroundColor: ACCENT }} />
          <div className="h-2 w-px" style={{ backgroundColor: ACCENT }} />
          <div className="h-0.5 flex-1" style={{ backgroundColor: ACCENT }} />
        </div>
      </div>

      <div className="p-8">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <SectionTitle title={section.title} />
            <EngineerSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <div className="mb-2 flex items-center gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>{title}</h2>
      <div className="h-px flex-1" style={{ backgroundColor: ACCENT }} />
      <div className="h-1.5 w-1.5" style={{ backgroundColor: ACCENT }} />
    </div>
  );
}

function TechTag({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="border px-2 py-0.5 text-[10px] font-medium" style={{ fontFamily: MONO, borderColor: ACCENT, color: ACCENT }}>{children}</span>;
}

function DotList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm" style={{ color: BODY_TEXT }}>
          <span className="mt-1.5 h-1 w-1 shrink-0" style={{ backgroundColor: ACCENT }} />
          <span dangerouslySetInnerHTML={{ __html: md(item) }} />
        </li>
      ))}
    </ul>
  );
}

function EngineerSectionContent({ section, lang }: { section: CanonicalResume['sections'][number]; lang: string }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return (
      <div className="border-l-2 pl-4 text-sm leading-relaxed" style={{ color: BODY_TEXT, borderColor: ACCENT }}>
        {summaryItems ? <DotList items={summaryItems} /> : <p dangerouslySetInnerHTML={{ __html: md(summaryText) }} />}
      </div>
    );
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return <div className="space-y-4">{items.map((item) => <EngineerExperience key={item.id} title={item.position} subtitle={item.company} date={dateRange(item.startDate, item.endDate, item.current, lang)} description={item.description} technologies={item.technologies} highlights={item.highlights} lang={lang} />)}</div>;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return <div className="space-y-3">{items.map((item) => <div key={item.id}><div className="flex items-baseline justify-between"><div><span className="text-sm font-bold" style={{ color: PRIMARY }}>{degreeField(item.degree, item.field)}</span>{item.institution && <span className="text-sm" style={{ color: SECONDARY }}> — {item.institution}</span>}</div><span className="shrink-0 text-xs" style={{ fontFamily: MONO, color: SECONDARY }}>{dateRange(item.startDate, item.endDate, true, lang)}</span></div>{item.gpa && <p className="text-xs" style={{ color: SECONDARY }}>GPA: {item.gpa}</p>}{item.highlights?.length > 0 && <div className="mt-1"><DotList items={item.highlights} /></div>}</div>)}</div>;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return <div className="space-y-2">{categories.map((category) => <div key={category.id}><span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: MONO, color: PRIMARY }}>{category.name}:</span><div className="mt-1 flex flex-wrap gap-1.5">{category.skills.map((skill) => <span key={skill} className="border px-2 py-0.5 text-[11px]" style={{ borderColor: RULE_COLOR, color: BODY_TEXT }}>{skill}</span>)}</div></div>)}</div>;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return <div className="space-y-3">{items.map((item) => <EngineerExperience key={item.id} title={item.name} date={item.startDate ? dateRange(item.startDate, item.endDate, true, lang) : undefined} description={item.description} technologies={item.technologies} highlights={item.highlights} />)}</div>;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return <div className="space-y-3">{items.map((item) => <EngineerExperience key={item.id} title={item.name} date={`★ ${item.stars?.toLocaleString() ?? 0}`} description={item.description} language={item.language} link={item.repoUrl} />)}</div>;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationRows items={items} />;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <BulletRow key={item.id} title={item.language} meta={` — ${item.proficiency}`} />)}</div>;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return <div className="space-y-3">{items.map((item) => <EngineerExperience key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />)}</div>;
  }
  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-2">{items.map((item) => <BulletRow key={item.id} title={item.name || item.title || item.language || ''} meta={item.description} markdownMeta />)}</div>;
  }
  return null;
}

function EngineerExperience({ title, subtitle, date, description, technologies, highlights, lang, language, link }: { title: string; subtitle?: string; date?: string; description?: string; technologies?: string[]; highlights?: string[]; lang?: string; language?: string; link?: string }): React.ReactElement {
  const responsibilityItems = lang ? extractMarkdownBulletItems(description) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-sm font-bold" style={{ color: PRIMARY }}>{title}
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-blue-500 hover:underline">{link}</a>}
          </span>
          {subtitle && <span className="text-sm font-medium" style={{ color: ACCENT }}> | {subtitle}</span>}
        </div>
        {date && <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style={{ fontFamily: MONO, color: SECONDARY, backgroundColor: LIGHT_BG }}>{date}</span>}
      </div>
      {language && <span className="text-xs" style={{ fontFamily: MONO, color: ACCENT }}>{language}</span>}
      {description && responsibilityItems && lang && <div className="mt-1"><p className="mb-0.5 text-xs font-medium" style={{ color: SECONDARY }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</p><DotList items={responsibilityItems} /></div>}
      {description && !responsibilityItems && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }}><span className="font-medium" style={{ color: PRIMARY }}>{lang ? (lang === 'zh' ? '职责' : 'Responsibilities') : ''}{lang ? ': ' : ''}</span><span dangerouslySetInnerHTML={{ __html: md(description) }} /></p>}
      {technologies && technologies.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{technologies.map((technology) => <TechTag key={technology}>{technology}</TechTag>)}</div>}
      {highlights && highlights.length > 0 && <div className="mt-1.5">{lang && <p className="mb-0.5 text-xs font-medium" style={{ color: SECONDARY }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>}<DotList items={highlights} /></div>}
      <div className="mt-2 h-px" style={{ backgroundColor: RULE_COLOR }} />
    </div>
  );
}

function BulletRow({ title, meta, markdownMeta }: { title: string; meta?: string; markdownMeta?: boolean }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1 w-1 shrink-0" style={{ backgroundColor: ACCENT }} />
      <span className="text-sm font-medium" style={{ color: PRIMARY }}>{title}</span>
      {meta && markdownMeta && <span className="text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: ` — ${md(meta)}` }} />}
      {meta && !markdownMeta && <span className="text-sm" style={{ color: SECONDARY }}>{meta}</span>}
    </div>
  );
}

function CertificationRows({ items }: { items: CertificationsContent['items'] }): React.ReactElement {
  return (
    <ul className="space-y-1.5 list-none">
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="h-1 w-1 shrink-0" style={{ backgroundColor: ACCENT }} />
            <span className="text-sm font-medium" style={{ color: PRIMARY }}>{item.name}</span>
            {item.issuer && <span className="text-sm" style={{ color: SECONDARY }}>— {item.issuer}</span>}
          </div>
          {item.date && <span className="shrink-0 text-xs" style={{ fontFamily: MONO, color: SECONDARY }}>{item.date}</span>}
        </li>
      ))}
    </ul>
  );
}

function QrCodeGrid({ content }: { content: Record<string, unknown> }): React.ReactElement | null {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
  if (!svgs) return null;
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 24px', paddingTop: '4px' }}>{validItems.map((qr) => <div key={qr.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 96 }}><div style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: svgs[qr.id] }} />{qr.label && <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 96 }}>{qr.label}</span>}</div>)}</div>;
}

function buildDotList(items: string[]): string {
  return `<ul class="space-y-0.5">${items.map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';
  return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`).join('')}</div>`;
}

function buildEngineerSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;
  const experienceHtml = (body: string) => `<div>${body}<div class="mt-2 h-px" style="background-color:${RULE_COLOR}"></div></div>`;
  const tagHtml = (value: string) => `<span class="border px-2 py-0.5 text-[10px] font-medium" style="font-family:${MONO};border-color:${ACCENT};color:${ACCENT}">${esc(value)}</span>`;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return `<div class="border-l-2 pl-4 text-sm leading-relaxed" style="color:${BODY_TEXT};border-color:${ACCENT}">${summaryItems ? buildDotList(summaryItems) : `<p>${md(summaryText)}</p>`}</div>`;
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => experienceHtml(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.position)}</span>${item.company ? `<span class="text-sm font-medium" style="color:${ACCENT}"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style="font-family:${MONO};color:${SECONDARY};background-color:${LIGHT_BG}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${SECONDARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildDotList(responsibilityItems)}</div>`; } return item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${item.technologies.map(tagHtml).join('')}</div>` : ''}${item.highlights?.length ? `<div class="mt-1.5"><p class="mb-0.5 text-xs font-medium" style="color:${SECONDARY}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildDotList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm" style="color:${SECONDARY}"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs" style="font-family:${MONO};color:${SECONDARY}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>${item.gpa ? `<p class="text-xs" style="color:${SECONDARY}">GPA: ${esc(item.gpa)}</p>` : ''}${item.highlights?.length ? `<div class="mt-1">${buildDotList(item.highlights)}</div>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((category) => `<div><span class="text-xs font-bold uppercase tracking-wider" style="font-family:${MONO};color:${PRIMARY}">${esc(category.name)}:</span><div class="mt-1 flex flex-wrap gap-1.5">${category.skills.map((skill) => `<span class="border px-2 py-0.5 text-[11px]" style="border-color:${RULE_COLOR};color:${BODY_TEXT}">${esc(skill)}</span>`).join('')}</div></div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => experienceHtml(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style="font-family:${MONO};color:${SECONDARY};background-color:${LIGHT_BG}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${item.technologies.map(tagHtml).join('')}</div>` : ''}${item.highlights?.length ? `<div class="mt-1.5">${buildDotList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => experienceHtml(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style="font-family:${MONO};color:${SECONDARY};background-color:${LIGHT_BG}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>${item.language ? `<span class="text-xs" style="font-family:${MONO};color:${ACCENT}">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<ul class="space-y-1.5 list-none">${items.map((item) => `<li class="flex items-baseline justify-between gap-3"><div class="flex min-w-0 items-baseline gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.name)}</span>${item.issuer ? `<span class="text-sm" style="color:${SECONDARY}">— ${esc(item.issuer)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs" style="font-family:${MONO};color:${SECONDARY}">${esc(item.date)}</span>` : ''}</li>`).join('')}</ul>`;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div class="flex items-center gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.language)}</span><span class="text-sm" style="color:${SECONDARY}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => experienceHtml(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm" style="color:${SECONDARY}"> | ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style="font-family:${MONO};color:${SECONDARY};background-color:${LIGHT_BG}">${esc(item.date)}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div class="flex items-center gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<span class="text-sm" style="color:${BODY_TEXT}"> — ${md(item.description)}</span>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildEngineerHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="px-8 py-6" style="background:linear-gradient(135deg,${PRIMARY} 0%,#334155 100%)">
      <div class="flex items-center gap-5">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded object-cover" style="border:2px solid ${ACCENT}"/>` : ''}
        <div class="flex-1"><h1 class="text-2xl font-bold text-white">${esc(pi.fullName || 'Your Name')}</h1>${pi.jobTitle ? `<p class="mt-0.5 text-sm font-medium" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}</div>
        <div class="shrink-0 text-right"><div class="space-y-0.5 text-xs" style="color:#94a3b8">${contacts.map((contact) => `<p>${esc(contact)}</p>`).join('')}</div></div>
      </div>
      <div class="mt-4 flex items-center gap-1"><div class="h-0.5 flex-1" style="background-color:${ACCENT}"></div><div class="h-2 w-px" style="background-color:${ACCENT}"></div><div class="h-0.5 w-8" style="background-color:${ACCENT}"></div><div class="h-2 w-px" style="background-color:${ACCENT}"></div><div class="h-0.5 flex-1" style="background-color:${ACCENT}"></div></div>
    </div>
    <div class="p-8">${sections.map((section) => `<div class="mb-6" data-section><div class="mb-2 flex items-center gap-3"><h2 class="text-sm font-bold uppercase tracking-wider" style="color:${PRIMARY}">${esc(section.title)}</h2><div class="h-px flex-1" style="background-color:${ACCENT}"></div><div class="h-1.5 w-1.5" style="background-color:${ACCENT}"></div></div>${buildEngineerSectionHtml(section, lang)}</div>`).join('')}</div>
  </div>`;
}

export const engineerTemplate: UnifiedTemplate = {
  id: 'engineer',
  name: 'Engineer',
  PreviewComponent: EngineerPreview,
  buildHtml: buildEngineerHtml,
};
