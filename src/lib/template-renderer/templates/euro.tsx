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
} from '../template-contract';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const BLUE = '#1e40af';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

interface EuroContactRow {
  label: string;
  value?: string;
}

const EURO_CONTACT_LABELS: Array<[keyof PersonalInfoContent, string]> = [
  ['age', 'Age'],
  ['politicalStatus', 'Political'],
  ['gender', 'Gender'],
  ['ethnicity', 'Ethnicity'],
  ['hometown', 'Hometown'],
  ['maritalStatus', 'Marital'],
  ['yearsOfExperience', 'Experience'],
  ['educationLevel', 'Education'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['wechat', 'WeChat'],
  ['location', 'Address'],
  ['website', 'Website'],
  ['linkedin', 'LinkedIn'],
  ['github', 'GitHub'],
];

function euroContactRows(pi: PersonalInfoContent): EuroContactRow[] {
  return EURO_CONTACT_LABELS.map(([field, label]) => ({
    label,
    value: pi[field] as string | undefined,
  })).filter((row) => Boolean(row.value));
}

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} – ${localizedEndDate(endDate, current, lang)}`;
}

export function EuroPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6 flex items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ color: BLUE }}>{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-1 text-base text-zinc-500">{pi.jobTitle}</p>}
          <div className="mt-3 space-y-0.5 text-sm text-zinc-600">
            {euroContactRows(pi).map((row) => (
              <div key={row.label} className="flex gap-2">
                <span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>{row.label}</span>
                <span className="min-w-0">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            avatarStyle={resume.themeConfig.avatarStyle}
            size={88}
            className="shrink-0 border-2"
            style={{ borderColor: BLUE }}
          />
        )}
      </div>

      <div className="h-1 w-full rounded" style={{ background: BLUE }} />

      <div className="mt-6">
        {sections.map((section) => (
          <div key={section.id} className="mb-5 flex gap-4" data-section>
            <div className="w-28 shrink-0 pt-0.5 text-right">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: BLUE }}>{section.title}</h2>
            </div>
            <div className="flex-1 border-l-2 pl-4" style={{ borderColor: '#dbeafe' }}>
              <EuroSectionContent section={section} lang={lang} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EuroSectionContent({
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
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-800">{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> — {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-4">
                  {item.highlights.map((highlight, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
                </ul>
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
                <span className="text-sm font-bold text-zinc-800">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
              </ul>
            )}
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
            <span className="w-28 shrink-0 font-medium" style={{ color: BLUE }}>{category.name}:</span>
            <span className="text-zinc-600">{category.skills.join(', ')}</span>
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
              <span className="text-sm font-bold text-zinc-800">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs text-zinc-400">{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(highlight) }} />)}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex text-sm">
            <span className="w-28 shrink-0 font-medium" style={{ color: BLUE }}>{item.language}:</span>
            <span className="text-zinc-600">{item.proficiency}</span>
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
              <span className="text-sm font-bold text-zinc-800">{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="text-xs text-zinc-400">★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-zinc-500">{item.language}</span>}
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
                <span className="text-sm font-semibold text-zinc-800">{item.title}</span>
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
            <span className="text-sm font-medium text-zinc-700">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function buildEuroSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-zinc-500"> — ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-zinc-500"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1">${categories.map((category) => `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${BLUE}">${esc(category.name)}:</span><span class="text-zinc-600">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-zinc-800">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items);
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1">${items.map((item) => `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${BLUE}">${esc(item.language)}:</span><span class="text-zinc-600">${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-zinc-800">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-400">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs text-zinc-500">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold text-zinc-800">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') {
    const items = (content as unknown as { items: QrCodeItem[] }).items || [];
    const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
    const validItems = items.filter((qr) => svgs[qr.id]);
    if (validItems.length === 0) return '';
    return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px 24px;padding-top:4px">${validItems.map((qr) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}<span style="font-size:10px;color:#6b7280;line-height:1.2;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span></div>`
    ).join('')}</div>`;
  }

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium text-zinc-700">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildEuroContactHtml(pi: PersonalInfoContent): string {
  const rows = euroContactRows(pi);
  if (rows.length === 0) return '';

  return `<div class="mt-3 space-y-0.5 text-sm text-zinc-600">${rows.map((row) =>
    `<div class="flex gap-2"><span class="w-28 shrink-0 font-semibold uppercase text-zinc-400" style="font-size:11px">${esc(row.label)}</span><span class="min-w-0">${esc(row.value)}</span></div>`
  ).join('')}</div>`;
}

export function buildEuroHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 flex items-start gap-6">
      <div class="flex-1">
        <h1 class="text-3xl font-bold" style="color:${BLUE}">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-base text-zinc-500">${esc(pi.jobTitle)}</p>` : ''}
        ${buildEuroContactHtml(pi)}
      </div>
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-28 shrink-0 rounded border-2 object-cover" style="width:5.5rem;border-color:${BLUE}"/>` : ''}
    </div>
    <div class="h-1 w-full rounded" style="background:${BLUE}"></div>
    <div class="mt-6">
      ${sections.map((section) => `<div class="mb-5 flex gap-4" data-section>
        <div class="w-28 shrink-0 pt-0.5 text-right">
          <h2 class="text-xs font-bold uppercase tracking-wider" style="color:${BLUE}">${esc(section.title)}</h2>
        </div>
        <div class="flex-1 border-l-2 pl-4" style="border-color:#dbeafe">
          ${buildEuroSectionHtml(section, lang)}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

export const euroTemplate: UnifiedTemplate = {
  id: 'euro',
  name: 'Euro',
  PreviewComponent: EuroPreview,
  buildHtml: buildEuroHtml,
};
