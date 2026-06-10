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
  markdownListStyle,
} from '../template-contract';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const GOLD = '#d4af37';
const TEXT = '#2c2c2c';
const FONT_FAMILY = 'Georgia, "Times New Roman", serif';

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

export function ElegantPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: FONT_FAMILY }}>
      <div className="mb-8 text-center">
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            avatarStyle={resume.themeConfig.avatarStyle}
            size={80}
            className="mx-auto mb-3"
            style={{ border: `2px solid ${GOLD}` }}
          />
        )}
        <h1 className="text-3xl font-bold tracking-wide" style={{ color: TEXT }}>{pi.fullName || 'Your Name'}</h1>
        {pi.jobTitle && <p className="mt-1 text-base uppercase tracking-widest text-zinc-500">{pi.jobTitle}</p>}
        <div className="mx-auto mt-3 flex items-center justify-center gap-1">
          <div className="h-px max-w-16 flex-1" style={{ background: GOLD }} />
          <div className="h-2 w-2 rotate-45" style={{ background: GOLD }} />
          <div className="h-px max-w-16 flex-1" style={{ background: GOLD }} />
        </div>
        {contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">
            {contacts.map((contact, index) => <span key={index}>{contact}</span>)}
          </div>
        )}
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: GOLD }} />
            <h2 className="shrink-0 text-sm font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>{section.title}</h2>
            <div className="h-px flex-1" style={{ background: GOLD }} />
          </div>
          <ElegantSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function ElegantSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="text-center text-sm italic leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: TEXT }}>{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> — {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs italic text-zinc-400">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs italic text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <Highlights highlights={item.highlights} label={lang === 'zh' ? '主要成就' : 'Key Achievements'} />}
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
                <span className="text-sm font-bold" style={{ color: TEXT }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs italic text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
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
            <span className="w-32 shrink-0 font-semibold" style={{ color: GOLD }}>{category.name}:</span>
            <span className="text-zinc-600">{category.skills.join(', ')}</span>
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
              <span className="text-sm font-bold" style={{ color: TEXT }}>{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs italic text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs italic text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-semibold" issuerClassName="text-zinc-500" dateClassName="shrink-0 text-xs italic text-zinc-400" titleStyle={{ color: TEXT }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {items.map((item) => (
          <span key={item.id} className="text-sm">
            <span className="font-semibold" style={{ color: GOLD }}>{item.language}</span>
            <span className="text-zinc-500"> — {item.proficiency}</span>
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: TEXT }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="text-xs italic text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs italic text-zinc-400">{item.language}</span>}
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
                <span className="text-sm font-semibold" style={{ color: TEXT }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs italic text-zinc-400">{item.date}</span>}
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
            <span className="text-sm font-medium" style={{ color: TEXT }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function Highlights({ highlights, label }: { highlights: string[]; label: string }): React.ReactElement {
  return (
    <div className="mt-1">
      <p className="mb-0.5 text-xs font-medium text-zinc-500">{label}:</p>
      <BulletList items={highlights} />
    </div>
  );
}

function BulletList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="mt-1 list-disc pl-5">
      {items.map((item, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function buildElegantSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-center text-sm leading-relaxed text-zinc-600 italic">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEXT}">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-500"> — ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs italic text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400 italic">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEXT}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-500"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs italic text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1">${categories.map((category) => `<div class="flex text-sm"><span class="w-32 shrink-0 font-semibold" style="color:${GOLD}">${esc(category.name)}:</span><span class="text-zinc-600">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEXT}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs italic text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400 italic">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-semibold', issuerClass: 'text-zinc-500', dateClass: 'shrink-0 text-xs italic text-zinc-400', titleStyle: `color:${TEXT}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${items.map((item) => `<span class="text-sm"><span class="font-semibold" style="color:${GOLD}">${esc(item.language)}</span><span class="text-zinc-500"> — ${esc(item.proficiency)}</span></span>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEXT}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="text-xs italic text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs text-zinc-400 italic">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${TEXT}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs italic text-zinc-400">${esc(item.date)}</span>` : ''}</div>
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${TEXT}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildElegantHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Georgia,'Times New Roman',serif">
    <div class="mb-8 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-20 w-20 rounded-full border-2 object-cover" style="border-color:${GOLD}"/>` : ''}
      <h1 class="text-3xl font-bold tracking-wide" style="color:${TEXT}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-base tracking-widest text-zinc-500 uppercase">${esc(pi.jobTitle)}</p>` : ''}
      <div class="mx-auto mt-3 flex items-center justify-center gap-1">
        <div class="h-px flex-1" style="max-width:4rem;background:${GOLD}"></div>
        <div class="h-2 w-2 rotate-45" style="background:${GOLD}"></div>
        <div class="h-px flex-1" style="max-width:4rem;background:${GOLD}"></div>
      </div>
      ${contacts.length > 0 ? `<div class="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">${contacts.map((contact) => `<span>${esc(contact)}</span>`).join('')}</div>` : ''}
    </div>
    ${sections.map((section) => `<div class="mb-6" data-section>
      <div class="mb-3 flex items-center gap-3">
        <div class="h-px flex-1" style="background:${GOLD}"></div>
        <h2 class="shrink-0 text-sm font-bold uppercase tracking-[0.2em]" style="color:${GOLD}">${esc(section.title)}</h2>
        <div class="h-px flex-1" style="background:${GOLD}"></div>
      </div>
      ${buildElegantSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const elegantTemplate: UnifiedTemplate = {
  id: 'elegant',
  name: 'Elegant',
  PreviewComponent: ElegantPreview,
  buildHtml: buildElegantHtml,
};
