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
  extractMarkdownBulletItems,
  getPersonalInfo,
  visibleSections,
} from '../template-contract';

const PRIMARY = '#0f172a';
const ACCENT = '#0891b2';
const GRID_LINE = '#e2e8f0';
const BODY_TEXT = '#334155';
const MUTED = '#64748b';

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
  return `${startDate} - ${localizedEndDate(endDate, current, lang)}`;
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
    pi.linkedin,
    pi.github,
  ].filter(Boolean) as string[];
}

export function ScientistPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
      <div className="mb-6 text-center">
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            avatarStyle={resume.themeConfig.avatarStyle}
            size={56}
            className="mx-auto mb-3"
            style={{ border: `2px solid ${ACCENT}` }}
          />
        )}
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{pi.fullName || 'Your Name'}</h1>
        {pi.jobTitle && <p className="mt-1 text-sm italic" style={{ color: ACCENT }}>{pi.jobTitle}</p>}
        {contacts.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs" style={{ color: MUTED }}>
            {contacts.map((contact, index) => <span key={index}>{contact}</span>)}
          </div>
        )}
      </div>

      <div className="mb-6 h-px w-full" style={{ backgroundColor: PRIMARY }} />

      {sections.map((section, index) => (
        <div key={section.id} className="mb-6" data-section>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-sm font-bold" style={{ color: ACCENT }}>{index + 1}.</span>
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>{section.title}</h2>
          </div>
          <div className="h-px w-full" style={{ backgroundColor: GRID_LINE }} />
          <div className="mt-2">
            <ScientistSectionContent section={section} lang={lang} />
          </div>
        </div>
      ))}

      <div className="mt-8 h-px w-full" style={{ backgroundColor: PRIMARY }} />
    </div>
  );
}

function NumberedLabel({ index }: { index: number }): React.ReactElement {
  return <span className="text-xs font-bold" style={{ color: ACCENT }}>[{index + 1}]</span>;
}

function DashList({ items, className = '' }: { items: string[]; className?: string }): React.ReactElement {
  return (
    <ul className={className || 'space-y-0.5'}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm" style={{ color: BODY_TEXT }}>
          <span className="mt-1.5 shrink-0 text-xs" style={{ color: ACCENT }}>-</span>
          <span dangerouslySetInnerHTML={{ __html: md(item) }} />
        </li>
      ))}
    </ul>
  );
}

function ScientistSectionContent({
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
      ? <DashList items={summaryItems} className="space-y-0.5 pl-6" />
      : <p className="text-sm italic leading-relaxed" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(summaryText) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item, index) => {
          const responsibilityItems = extractMarkdownBulletItems(item.description);

          return (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <NumberedLabel index={index} />
                <span className="ml-1.5 text-sm font-bold" style={{ color: PRIMARY }}>{item.position}</span>
                {item.company && <span className="text-sm" style={{ color: MUTED }}>, {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && responsibilityItems && (
              <div className="mt-1 pl-6">
                <p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</p>
                <DashList items={responsibilityItems} />
              </div>
            )}
            {item.description && !responsibilityItems && (
              <p className="mt-1 pl-6 text-sm" style={{ color: BODY_TEXT }}>
                <span className="font-medium" style={{ color: PRIMARY }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <p className="pl-6 text-xs italic" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Methods/Tools'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1 pl-6">
                <p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <DashList items={item.highlights} />
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
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <NumberedLabel index={index} />
                <span className="ml-1.5 text-sm font-bold" style={{ color: PRIMARY }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm" style={{ color: MUTED }}>, {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="pl-6 text-xs" style={{ color: MUTED }}>GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <DashList items={item.highlights} className="mt-1 space-y-0.5 pl-6" />}
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
            <span className="font-bold italic" style={{ color: PRIMARY }}>{category.name}: </span>
            <span style={{ color: BODY_TEXT }}>{category.skills.join('; ')}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <NumberedLabel index={index} />
                <span className="ml-1.5 text-sm font-bold" style={{ color: PRIMARY }}>{item.name}</span>
              </div>
              {item.startDate && <span className="shrink-0 text-xs" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 pl-6 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="pl-6 text-xs italic" style={{ color: MUTED }}>{lang === 'zh' ? '技术栈' : 'Methods/Tools'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <DashList items={item.highlights} className="mt-1 space-y-0.5 pl-6" />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={item.id} className="text-sm">
            <NumberedLabel index={index} />
            <span className="ml-1.5 font-medium" style={{ color: PRIMARY }}>{item.name}</span>
            {(item.issuer || item.date) && <span style={{ color: MUTED }}>{item.issuer && <>, {item.issuer}</>}{item.date && <>, {item.date}</>}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="text-sm">
            <span className="font-bold italic" style={{ color: PRIMARY }}>{item.language}</span>
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
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <NumberedLabel index={index} />
                <span className="ml-1.5 text-sm font-bold" style={{ color: PRIMARY }}>{item.name}
                  {item.repoUrl && (
                    <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                       className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                      {item.repoUrl}
                    </a>
                  )}
                </span>
              </div>
              <span className="shrink-0 text-xs" style={{ color: MUTED }}>★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="pl-6 text-xs italic" style={{ color: ACCENT }}>{item.language}</span>}
            {item.description && <p className="mt-0.5 pl-6 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <NumberedLabel index={index} />
                <span className="ml-1.5 text-sm font-bold" style={{ color: PRIMARY }}>{item.title}</span>
                {item.subtitle && <span className="text-sm" style={{ color: MUTED }}>, {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs" style={{ color: MUTED }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 pl-6 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
            <span className="text-sm font-medium" style={{ color: PRIMARY }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function buildDashList(items: string[] | undefined, listClass: string): string {
  if (!items?.length) return '';
  return `<ul class="${listClass}">${items.filter(Boolean).map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 shrink-0 text-xs" style="color:${ACCENT}">-</span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function buildScientistSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return summaryItems
      ? buildDashList(summaryItems, 'space-y-0.5 pl-6')
      : `<p class="text-sm italic leading-relaxed" style="color:${BODY_TEXT}">${md(summaryText)}</p>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item, index) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 text-sm font-bold" style="color:${PRIMARY}">${esc(item.position)}</span>${item.company ? `<span class="text-sm" style="color:${MUTED}">, ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>
      ${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1 pl-6"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildDashList(responsibilityItems, 'space-y-0.5')}</div>`; } return item.description ? `<p class="mt-1 pl-6 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}
      ${item.technologies?.length ? `<p class="pl-6 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Methods/Tools'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1 pl-6"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildDashList(item.highlights, 'space-y-0.5')}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item, index) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm" style="color:${MUTED}">, ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>
      ${item.gpa ? `<p class="pl-6 text-xs" style="color:${MUTED}">GPA: ${esc(item.gpa)}</p>` : ''}
      ${buildDashList(item.highlights, 'mt-1 space-y-0.5 pl-6')}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div class="text-sm"><span class="font-bold italic" style="color:${PRIMARY}">${esc(category.name)}: </span><span style="color:${BODY_TEXT}">${esc(category.skills.join('; '))}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item, index) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}</span></div>${item.startDate ? `<span class="shrink-0 text-xs" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 pl-6 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="pl-6 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Methods/Tools'}: ${esc(item.technologies.join(', '))}</p>` : ''}
      ${buildDashList(item.highlights, 'mt-1 space-y-0.5 pl-6')}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div class="space-y-1.5">${items.map((item, index) => `<div class="text-sm"><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 font-medium" style="color:${PRIMARY}">${esc(item.name)}</span><span style="color:${MUTED}">${item.issuer ? `, ${esc(item.issuer)}` : ''}${item.date ? `, ${esc(item.date)}` : ''}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1">${items.map((item) => `<div class="text-sm"><span class="font-bold italic" style="color:${PRIMARY}">${esc(item.language)}</span><span style="color:${MUTED}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item, index) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span></div><span class="shrink-0 text-xs" style="color:${MUTED}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="pl-6 text-xs italic" style="color:${ACCENT}">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-0.5 pl-6 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item, index) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold" style="color:${ACCENT}">[${index + 1}]</span><span class="ml-1.5 text-sm font-bold" style="color:${PRIMARY}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm" style="color:${MUTED}">, ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs" style="color:${MUTED}">${esc(item.date)}</span>` : ''}</div>
      ${item.description ? `<p class="mt-0.5 pl-6 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildScientistHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const contacts = contactValues(pi);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Georgia,serif">
    <div class="mb-6 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-14 w-14 rounded-full object-cover" style="border:2px solid ${ACCENT}"/>` : ''}
      <h1 class="text-2xl font-bold" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-sm italic" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
      ${contacts.length ? `<div class="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs" style="color:${MUTED}">${contacts.map((contact) => `<span>${esc(contact)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="mb-6 h-px w-full" style="background-color:${PRIMARY}"></div>
    ${sections.map((section, index) => `<div class="mb-6" data-section>
      <div class="mb-2 flex items-baseline gap-2"><span class="text-sm font-bold" style="color:${ACCENT}">${index + 1}.</span><h2 class="text-sm font-bold uppercase tracking-wider" style="color:${PRIMARY}">${esc(section.title)}</h2></div>
      <div class="h-px w-full" style="background-color:${GRID_LINE}"></div>
      <div class="mt-2">${buildScientistSectionHtml(section, lang)}</div>
    </div>`).join('')}
    <div class="mt-8 h-px w-full" style="background-color:${PRIMARY}"></div>
  </div>`;
}

export const scientistTemplate: UnifiedTemplate = {
  id: 'scientist',
  name: 'Scientist',
  PreviewComponent: ScientistPreview,
  buildHtml: buildScientistHtml,
};
