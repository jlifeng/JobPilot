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

const PRIMARY = '#1a472a';
const ACCENT = '#15803d';
const BORDER = '#166534';
const BODY_TEXT = '#374151';
const MUTED = '#6b7280';

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

export function LegalPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
      <div className="mb-6 text-center">
        {pi.avatar && (
          <AvatarImage src={pi.avatar} size={64} avatarStyle={resume.themeConfig.avatarStyle} className="mx-auto mb-3" style={{ border: `2px solid ${PRIMARY}` }} />
        )}
        <h1 className="text-2xl font-bold tracking-wide" style={{ color: PRIMARY }}>{pi.fullName || 'Your Name'}</h1>
        {pi.jobTitle && <p className="mt-1 text-sm italic" style={{ color: ACCENT }}>{pi.jobTitle}</p>}
        {contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: MUTED }}>
            {contacts.map((contact, index) => <span key={index}>{contact}</span>)}
          </div>
        )}
      </div>

      <DoubleLine className="mb-6" opacity={1} />

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>{section.title}</h2>
          <DoubleLine className="mb-3" opacity={0.5} />
          <LegalSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function DoubleLine({ className, opacity }: { className: string; opacity: number }): React.ReactElement {
  return (
    <div className={className}>
      <div className="h-px w-full" style={{ backgroundColor: BORDER, opacity }} />
      <div className="mt-0.5 h-px w-full" style={{ backgroundColor: BORDER, opacity }} />
    </div>
  );
}

function LegalSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <p className="text-sm italic leading-relaxed" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.position}</span>
                {item.company && <span className="text-sm" style={{ color: ACCENT }}>, {item.company}</span>}
                {item.location && <span className="text-sm" style={{ color: MUTED }}> ({item.location})</span>}
              </div>
              <span className="shrink-0 text-xs italic" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && (
              <p className="mt-1 text-sm" style={{ color: BODY_TEXT }}>
                <span className="font-medium" style={{ color: PRIMARY }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description, { listStyle: markdownListStyle('1.25rem') }) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs italic" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Technologies'}: {item.technologies.join(', ')}</p>}
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
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm" style={{ color: MUTED }}>, {item.institution}</span>}
                {item.location && <span className="text-sm" style={{ color: MUTED }}> ({item.location})</span>}
              </div>
              <span className="shrink-0 text-xs italic" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-xs" style={{ color: MUTED }}>GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-1.5">
        {categories.map((category) => (
          <div key={category.id} className="text-sm">
            <span className="font-bold" style={{ color: PRIMARY }}>{category.name}: </span>
            <span style={{ color: BODY_TEXT }}>{category.skills.join(', ')}</span>
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
              <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs italic" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs italic" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Technologies'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-bold" issuerClassName="" dateClassName="shrink-0 text-xs italic" titleStyle={{ color: PRIMARY }} issuerStyle={{ color: MUTED }} dateStyle={{ color: MUTED }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="text-sm">
            <span className="font-bold" style={{ color: PRIMARY }}>{item.language}</span>
            <span style={{ color: MUTED }}> — {item.proficiency}</span>
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
              <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="shrink-0 text-xs italic" style={{ color: MUTED }}>★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs" style={{ color: ACCENT }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.title}</span>
                {item.subtitle && <span className="text-sm" style={{ color: MUTED }}>, {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs italic" style={{ color: MUTED }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
            <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function Highlights({ highlights, label }: { highlights: string[]; label: string }): React.ReactElement {
  return (
    <div className="mt-1.5">
      <p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{label}:</p>
      <BulletList items={highlights} />
    </div>
  );
}

function BulletList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5">
      {items.map((item, index) => <li key={index} className="text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item) }} />)}
    </ul>
  );
}

function buildLegalSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') return `<p class="text-sm italic leading-relaxed" style="color:${BODY_TEXT}">${md((content as unknown as SummaryContent).text)}</p>`;

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.position)}</span>${item.company ? `<span class="text-sm" style="color:${ACCENT}">, ${esc(item.company)}</span>` : ''}${item.location ? `<span class="text-sm" style="color:${MUTED}"> (${esc(item.location)})</span>` : ''}</div><span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description, { listStyle: markdownListStyle('1.25rem') })}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1.5"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5 space-y-0.5">${buildHighlights(item.highlights, 'text-sm')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm" style="color:${MUTED}">, ${esc(item.institution)}</span>` : ''}${item.location ? `<span class="text-sm" style="color:${MUTED}"> (${esc(item.location)})</span>` : ''}</div><span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="text-xs" style="color:${MUTED}">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5 space-y-0.5">${buildHighlights(item.highlights, 'text-sm')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div class="text-sm"><span class="font-bold" style="color:${PRIMARY}">${esc(category.name)}: </span><span style="color:${BODY_TEXT}">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-5 space-y-0.5">${buildHighlights(item.highlights, 'text-sm')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-bold', issuerClass: '', dateClass: 'shrink-0 text-xs italic', titleStyle: `color:${PRIMARY}`, issuerStyle: `color:${MUTED}`, dateStyle: `color:${MUTED}` });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div class="text-sm"><span class="font-bold" style="color:${PRIMARY}">${esc(item.language)}</span><span style="color:${MUTED}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 text-xs italic" style="color:${MUTED}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs" style="color:${ACCENT}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm" style="color:${MUTED}">, ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildLegalHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Georgia,Times New Roman,serif">
    <div class="mb-6 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-16 w-16 rounded-full object-cover" style="border:2px solid ${PRIMARY}"/>` : ''}
      <h1 class="text-2xl font-bold tracking-wide" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-sm italic" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
      ${contacts.length ? `<div class="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs" style="color:${MUTED}">${contacts.map((contact) => `<span>${esc(contact)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="mb-6"><div class="h-px w-full" style="background-color:${BORDER}"></div><div class="mt-0.5 h-px w-full" style="background-color:${BORDER}"></div></div>
    ${sections.map((section) => `<div class="mb-6" data-section>
      <h2 class="mb-1 text-sm font-bold uppercase tracking-wider" style="color:${PRIMARY}">${esc(section.title)}</h2>
      <div class="mb-3"><div class="h-px w-full" style="background-color:${BORDER};opacity:0.5"></div><div class="mt-0.5 h-px w-full" style="background-color:${BORDER};opacity:0.5"></div></div>
      ${buildLegalSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const legalTemplate: UnifiedTemplate = {
  id: 'legal',
  name: 'Legal',
  PreviewComponent: LegalPreview,
  buildHtml: buildLegalHtml,
};
