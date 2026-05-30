import React from 'react';
import type {
  SummaryContent,
  WorkExperienceContent,
  EducationContent,
  SkillsContent,
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  GitHubContent,
  CustomContent,
  QrCodeItem,
} from '@/types/resume';
import { AvatarImage } from '@/components/preview/avatar-image';
import type { CanonicalResume, TemplateProps, UnifiedTemplate } from '../types';
import { md, esc, degreeField, extractMarkdownBulletItems, getPersonalInfo, visibleSections } from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';

const GRADIENT = 'linear-gradient(135deg, #7c3aed 0%, #f97316 100%)';
const EXPORT_GRADIENT = 'linear-gradient(135deg,#7c3aed 0%,#f97316 100%)';
const PRIMARY = '#7c3aed';

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

export function CreativePreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="relative px-8 py-10 text-white" style={{ background: GRADIENT }}>
        <div className="absolute right-8 top-6 h-32 w-32 rounded-full border-4 border-white/10" />
        <div className="absolute right-20 top-16 h-16 w-16 rounded-full border-2 border-white/10" />
        <div className="absolute bottom-4 left-4 h-20 w-20 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-6">
          {pi.avatar && <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig.avatarStyle} size={96} className="shrink-0" wrapperClassName="shrink-0 p-0.5" wrapperStyle={{ border: '4px solid rgba(255,255,255,0.3)' }} />}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-lg font-light text-white/80">{pi.jobTitle}</p>}
            <ContactInfo pi={pi} align="left" iconColor="rgba(255,255,255,0.6)" style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>
        </div>
      </div>

      <div className="p-8">
        {sections.map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full" style={{ background: GRADIENT }} />
              <h2 className="text-base font-extrabold uppercase tracking-wide" style={{ color: PRIMARY }}>{section.title}</h2>
            </div>
            <CreativeSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GradientPill({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: GRADIENT }}>{children}</span>;
}

function DotList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-zinc-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GRADIENT }} />
          <span dangerouslySetInnerHTML={{ __html: md(item) }} />
        </li>
      ))}
    </ul>
  );
}

function CreativeSectionContent({ section, lang }: { section: CanonicalResume['sections'][number]; lang: string }): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return (
      <div className="rounded-lg bg-zinc-50 p-4 text-sm italic leading-relaxed text-zinc-600">
        {summaryItems ? <DotList items={summaryItems} /> : <p dangerouslySetInnerHTML={{ __html: md(summaryText) }} />}
      </div>
    );
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return <div className="space-y-4">{items.map((item) => <CreativeCard key={item.id} title={item.position} subtitle={item.company} location={item.location} date={dateRange(item.startDate, item.endDate, item.current, lang)} description={item.description} technologies={item.technologies} highlights={item.highlights} label={lang === 'zh' ? '职责' : 'Responsibilities'} highlightLabel={lang === 'zh' ? '主要成就' : 'Key Achievements'} accentBar />)}</div>;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return <div className="space-y-3">{items.map((item) => <CreativeCard key={item.id} title={item.institution} date={dateRange(item.startDate, item.endDate, true, lang)} description={`${degreeField(item.degree, item.field)}${item.location ? `, ${item.location}` : ''}`} highlights={item.highlights} gpa={item.gpa} />)}</div>;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return <div className="space-y-3">{categories.map((category) => <div key={category.id}><p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">{category.name}</p><div className="flex flex-wrap gap-1.5">{category.skills.map((skill) => <span key={skill} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-zinc-700" style={{ borderColor: `${PRIMARY}40`, backgroundColor: `${PRIMARY}08` }}>{skill}</span>)}</div></div>)}</div>;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{items.map((item) => <CreativeCard key={item.id} title={item.name} date={item.startDate ? dateRange(item.startDate, item.endDate, true, lang) : undefined} description={item.description} technologies={item.technologies} highlights={item.highlights} />)}</div>;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <div className="flex flex-wrap gap-2">{items.map((item) => <div key={item.id} className="rounded-lg border border-zinc-100 px-4 py-2"><p className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name}</p>{(item.issuer || item.date) && <p className="text-xs text-zinc-500">{item.issuer}{item.issuer && item.date ? ' | ' : ''}{item.date}</p>}</div>)}</div>;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <div className="flex flex-wrap gap-3">{items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-full border border-zinc-100 px-4 py-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GRADIENT }} /><span className="text-sm font-medium text-zinc-700">{item.language}</span><span className="text-xs text-zinc-400">{item.proficiency}</span></div>)}</div>;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return <div className="space-y-3">{items.map((item) => <CreativeCard key={item.id} title={item.name} date={`★ ${item.stars?.toLocaleString() ?? 0}`} description={item.description} subtitle={item.language} />)}</div>;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return <div className="space-y-3">{items.map((item) => <CreativeCard key={item.id} title={item.title} subtitle={item.subtitle} date={item.date} description={item.description} />)}</div>;
  }
  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-2">{items.map((item) => <CreativeCard key={item.id} title={item.name || item.title || item.language || ''} description={item.description} />)}</div>;
  }
  return null;
}

function CreativeCard({ title, subtitle, location, date, description, technologies, highlights, label, highlightLabel, accentBar, gpa }: { title: string; subtitle?: string; location?: string; date?: string; description?: string; technologies?: string[]; highlights?: string[]; label?: string; highlightLabel?: string; accentBar?: boolean; gpa?: string }): React.ReactElement {
  const descriptionBulletItems = label ? extractMarkdownBulletItems(description) : null;

  return (
    <div className="relative rounded-lg border border-zinc-100 p-4">
      {accentBar && <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ background: GRADIENT }} />}
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold" style={{ color: subtitle ? undefined : PRIMARY }}>{title}</h3>
        {date && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: PRIMARY }}>{date}</span>}
      </div>
      {subtitle && <p className="text-sm font-medium" style={{ color: PRIMARY }}>{subtitle}{location && <span className="text-xs font-normal text-zinc-400">, {location}</span>}</p>}
      {description && descriptionBulletItems && <div className="mt-1">{label && <p className="mb-0.5 text-xs font-medium text-zinc-500">{label}:</p>}<DotList items={descriptionBulletItems} /></div>}
      {description && !descriptionBulletItems && <p className="mt-1 text-sm text-zinc-600">{label && <span className="font-medium text-zinc-700">{label}: </span>}<span dangerouslySetInnerHTML={{ __html: md(description) }} /></p>}
      {gpa && <p className="text-xs text-zinc-500">GPA: {gpa}</p>}
      {technologies && technologies.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{technologies.map((technology) => <GradientPill key={technology}>{technology}</GradientPill>)}</div>}
      {highlights && highlights.length > 0 && <div className="mt-1.5">{highlightLabel && <p className="mb-0.5 text-xs font-medium text-zinc-500">{highlightLabel}:</p>}<DotList items={highlights} /></div>}
    </div>
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

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';
  return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`).join('')}</div>`;
}

function buildDotList(items: string[]): string {
  return `<ul class="space-y-0.5">${items.map((item) => `<li class="flex items-start gap-2 text-sm text-zinc-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background:${EXPORT_GRADIENT}"></span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function buildCreativeCardHtml({ title, subtitle, location, date, description, technologies, highlights, label, highlightLabel, accentBar, gpa, titlePrimary = false }: { title: string; subtitle?: string; location?: string; date?: string; description?: string; technologies?: string[]; highlights?: string[]; label?: string; highlightLabel?: string; accentBar?: boolean; gpa?: string; titlePrimary?: boolean }): string {
  const descriptionBulletItems = label ? extractMarkdownBulletItems(description) : null;

  return `<div class="relative rounded-lg border border-zinc-100 p-4">
    ${accentBar ? `<div class="absolute left-0 top-0 h-full w-1 rounded-l-lg" style="background:${EXPORT_GRADIENT}"></div>` : ''}
    <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold"${titlePrimary ? ` style="color:${PRIMARY}"` : ''}>${esc(title)}</h3>${date ? `<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style="background:${PRIMARY}">${esc(date)}</span>` : ''}</div>
    ${subtitle ? `<p class="text-sm font-medium" style="color:${PRIMARY}">${esc(subtitle)}${location ? `<span class="text-xs font-normal text-zinc-400">, ${esc(location)}</span>` : ''}</p>` : ''}
    ${description && descriptionBulletItems ? `<div class="mt-1">${label ? `<p class="mb-0.5 text-xs font-medium text-zinc-500">${esc(label)}:</p>` : ''}${buildDotList(descriptionBulletItems)}</div>` : ''}
    ${description && !descriptionBulletItems ? `<p class="mt-1 text-sm text-zinc-600">${label ? `<span class="font-medium text-zinc-700">${esc(label)}: </span>` : ''}<span>${md(description)}</span></p>` : ''}
  ${gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(gpa)}</p>` : ''}
    ${technologies?.length ? `<div class="mt-2 flex flex-wrap gap-1">${technologies.map((technology) => `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style="background:${EXPORT_GRADIENT}">${esc(technology)}</span>`).join('')}</div>` : ''}
    ${highlights?.length ? `<div class="mt-1.5">${highlightLabel ? `<p class="mb-0.5 text-xs font-medium text-zinc-500">${esc(highlightLabel)}:</p>` : ''}${buildDotList(highlights)}</div>` : ''}
  </div>`;
}

function buildCreativeSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return `<div class="rounded-lg bg-zinc-50 p-4 text-sm italic leading-relaxed text-zinc-600">${summaryItems ? buildDotList(summaryItems) : `<p>${md(summaryText)}</p>`}</div>`;
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => buildCreativeCardHtml({ title: item.position, subtitle: item.company, location: item.location, date: dateRange(item.startDate, item.endDate, item.current, lang), description: item.description, technologies: item.technologies, highlights: item.highlights, label: lang === 'zh' ? '职责' : 'Responsibilities', highlightLabel: lang === 'zh' ? '主要成就' : 'Key Achievements', accentBar: true })).join('')}</div>`;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildCreativeCardHtml({ title: item.institution, date: dateRange(item.startDate, item.endDate, true, lang), description: `${degreeField(item.degree, item.field)}${item.location ? `, ${item.location}` : ''}`, highlights: item.highlights, gpa: item.gpa })).join('')}</div>`;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-3">${categories.map((category) => `<div><p class="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">${esc(category.name)}</p><div class="flex flex-wrap gap-1.5">${category.skills.map((skill) => `<span class="rounded-full border px-2.5 py-0.5 text-xs font-medium text-zinc-700" style="border-color:${PRIMARY}40;background-color:${PRIMARY}08">${esc(skill)}</span>`).join('')}</div></div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">${items.map((item) => buildCreativeCardHtml({ title: item.name, date: item.startDate ? dateRange(item.startDate, item.endDate, true, lang) : undefined, description: item.description, technologies: item.technologies, highlights: item.highlights, titlePrimary: true })).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="flex flex-wrap gap-2">${items.map((item) => `<div class="rounded-lg border border-zinc-100 px-4 py-2"><p class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}</p>${item.issuer || item.date ? `<p class="text-xs text-zinc-500">${item.issuer ? esc(item.issuer) : ''}${item.issuer && item.date ? ' | ' : ''}${item.date ? esc(item.date) : ''}</p>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-3">${items.map((item) => `<div class="flex items-center gap-2 rounded-full border border-zinc-100 px-4 py-1.5"><span class="h-2 w-2 rounded-full" style="background:${EXPORT_GRADIENT}"></span><span class="text-sm font-medium text-zinc-700">${esc(item.language)}</span><span class="text-xs text-zinc-400">${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildCreativeCardHtml({ title: item.name, date: `★ ${item.stars?.toLocaleString() ?? 0}`, subtitle: item.language, description: item.description, titlePrimary: true })).join('')}</div>`;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => buildCreativeCardHtml({ title: item.title, subtitle: item.subtitle, date: item.date, description: item.description, titlePrimary: true })).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => buildCreativeCardHtml({ title: item.name || item.title || item.language || '', description: item.description, titlePrimary: true })).join('')}</div>`;
  }
  return '';
}

function buildContactHtml(pi: ReturnType<typeof getPersonalInfo>): string {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return '';
  const renderRow = (entries: typeof row1) => entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0"><span style="color:rgba(255,255,255,0.6);font-size:12px">${entry.htmlIcon}</span><span style="color:rgba(255,255,255,0.7)">${esc(entry.value)}</span></span>`).join('');
  const firstRow = row1.length > 0 ? `<div style="margin-top:4px;font-size:13px">${renderRow(row1)}</div>` : '';
  const secondRow = row2.length > 0 ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px">${renderRow(row2)}</div>` : '';
  return firstRow + secondRow;
}

export function buildCreativeHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="relative px-8 py-10 text-white" style="background:${EXPORT_GRADIENT}">
      <div class="absolute right-8 top-6 h-32 w-32 rounded-full border-4 border-white/10"></div><div class="absolute right-20 top-16 h-16 w-16 rounded-full border-2 border-white/10"></div><div class="absolute bottom-4 left-4 h-20 w-20 rounded-full bg-white/5"></div>
      <div class="relative flex items-center gap-6">${pi.avatar ? `<div class="shrink-0 rounded-2xl border-4 border-white/30 p-0.5"><img src="${esc(pi.avatar)}" alt="" class="h-24 w-24 rounded-xl object-cover"/></div>` : ''}<div><h1 class="text-3xl font-extrabold tracking-tight">${esc(pi.fullName || 'Your Name')}</h1>${pi.jobTitle ? `<p class="mt-1 text-lg font-light text-white/80">${esc(pi.jobTitle)}</p>` : ''}${buildContactHtml(pi)}</div></div>
    </div>
    <div class="p-8">${sections.map((section) => `<div class="mb-6" data-section><div class="mb-3 flex items-center gap-3"><div class="h-8 w-1 rounded-full" style="background:${EXPORT_GRADIENT}"></div><h2 class="text-base font-extrabold uppercase tracking-wide" style="color:${PRIMARY}">${esc(section.title)}</h2></div>${buildCreativeSectionHtml(section, lang)}</div>`).join('')}</div>
  </div>`;
}

export const creativeTemplate: UnifiedTemplate = {
  id: 'creative',
  name: 'Creative',
  PreviewComponent: CreativePreview,
  buildHtml: buildCreativeHtml,
};
