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

const PRIMARY = '#9a3412';
const ACCENT = '#ea580c';
const WARM_BG = '#fff7ed';
const BODY_TEXT = '#374151';
const MUTED = '#78716c';
const TAG_BG = '#fed7aa';

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

  if (pi.linkedin) values.push(pi.linkedin);
  if (pi.github) values.push(pi.github);
  return values;
}

function localizedEndDate(endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(startDate: string | undefined, endDate: string | null | undefined, current: boolean | undefined, lang: string): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} - ${localizedEndDate(endDate, current, lang)}`;
}

export function TeacherPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const contacts = contactValues(pi);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6 flex items-center gap-5">
        {pi.avatar && (
          <AvatarImage src={pi.avatar} size={72} avatarStyle={resume.themeConfig.avatarStyle} className="shrink-0" style={{ border: `3px solid ${ACCENT}` }} />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: ACCENT }}>{pi.jobTitle}</p>}
          {contacts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: MUTED }}>
              {contacts.map((contact, index) => <span key={index} className={contact.startsWith('http') ? 'break-all' : undefined}>{contact}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 h-0.5 w-full rounded-full" style={{ backgroundColor: ACCENT, opacity: 0.3 }} />

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-3 inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: PRIMARY }}>
            {section.title}
          </h2>
          <TeacherSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function TeacherCard({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="rounded-lg border-l-3 p-3" style={{ borderColor: ACCENT, backgroundColor: WARM_BG }}>{children}</div>;
}

function Pill({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: TAG_BG, color: PRIMARY }}>{children}</span>;
}

function DotList({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm" style={{ color: BODY_TEXT }}>
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
          <span dangerouslySetInnerHTML={{ __html: md(item) }} />
        </li>
      ))}
    </ul>
  );
}

function TeacherSectionContent({
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

    return (
      <div className="rounded-lg p-3 text-sm leading-relaxed" style={{ color: BODY_TEXT, backgroundColor: WARM_BG }}>
        {summaryItems ? <DotList items={summaryItems} /> : <p dangerouslySetInnerHTML={{ __html: md(summaryText) }} />}
      </div>
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => {
          const responsibilityItems = extractMarkdownBulletItems(item.description);

          return (
          <TeacherCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.position}</span>
                {item.company && <span className="text-sm" style={{ color: ACCENT }}> at {item.company}</span>}
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: TAG_BG, color: PRIMARY }}>{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && responsibilityItems && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</p>
                <DotList items={responsibilityItems} />
              </div>
            )}
            {item.description && !responsibilityItems && (
              <p className="mt-1 text-sm" style={{ color: BODY_TEXT }}>
                <span className="font-medium" style={{ color: PRIMARY }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{item.technologies.map((technology) => <Pill key={technology}>{technology}</Pill>)}</div>}
            {item.highlights?.length > 0 && (
              <div className="mt-1.5">
                <p className="mb-0.5 text-xs font-medium" style={{ color: MUTED }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <DotList items={item.highlights} />
              </div>
            )}
          </TeacherCard>
        )})}
      </div>
    );
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <TeacherCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm" style={{ color: MUTED }}> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-xs" style={{ color: MUTED }}>GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <div className="mt-1"><DotList items={item.highlights} /></div>}
          </TeacherCard>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg p-2.5" style={{ backgroundColor: WARM_BG }}>
            <span className="text-xs font-bold" style={{ color: PRIMARY }}>{category.name}</span>
            {category.skills?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{category.skills.map((skill) => <Pill key={skill}>{skill}</Pill>)}</div>}
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
          <TeacherCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs" style={{ color: MUTED }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{item.technologies.map((technology) => <Pill key={technology}>{technology}</Pill>)}</div>}
            {item.highlights?.length > 0 && <div className="mt-1.5"><DotList items={item.highlights} /></div>}
          </TeacherCard>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <ul className="space-y-1.5 list-none">
        {items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
              <span className="text-sm font-medium" style={{ color: PRIMARY }}>{item.name}</span>
              {item.issuer && <span className="text-sm" style={{ color: MUTED }}>— {item.issuer}</span>}
            </div>
            {item.date && <span className="shrink-0 text-xs" style={{ color: MUTED }}>{item.date}</span>}
          </li>
        ))}
      </ul>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-full px-3 py-1 text-sm" style={{ backgroundColor: WARM_BG }}>
            <span className="font-medium" style={{ color: PRIMARY }}>{item.language}</span>
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
          <TeacherCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: TAG_BG, color: PRIMARY }}>★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs" style={{ color: ACCENT }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </TeacherCard>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <TeacherCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: PRIMARY }}>{item.title}</span>
                {item.subtitle && <span className="text-sm" style={{ color: MUTED }}> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs" style={{ color: MUTED }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </TeacherCard>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
            <span className="text-sm font-medium" style={{ color: PRIMARY }}>{item.name || item.title || item.language}</span>
            {item.description && <span className="text-sm" style={{ color: BODY_TEXT }} dangerouslySetInnerHTML={{ __html: ` — ${md(item.description)}` }} />}
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

function buildDotList(items: string[]): string {
  return `<ul class="space-y-0.5">${items.map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background-color:${ACCENT}"></span><span>${md(item)}</span></li>`).join('')}</ul>`;
}

function cardHtml(body: string): string {
  return `<div class="rounded-lg border-l-3 p-3" style="border-color:${ACCENT};background-color:${WARM_BG}">${body}</div>`;
}

function pillHtml(value: string): string {
  return `<span class="rounded-full px-2 py-0.5 text-[10px]" style="background-color:${TAG_BG};color:${PRIMARY}">${esc(value)}</span>`;
}

function buildTeacherSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryText = (content as unknown as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);

    return `<div class="rounded-lg p-3 text-sm leading-relaxed" style="color:${BODY_TEXT};background-color:${WARM_BG}">${summaryItems ? buildDotList(summaryItems) : `<p>${md(summaryText)}</p>`}</div>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => cardHtml(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.position)}</span>${item.company ? `<span class="text-sm" style="color:${ACCENT}"> at ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background-color:${TAG_BG};color:${PRIMARY}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildDotList(responsibilityItems)}</div>`; } return item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${item.technologies.map((technology) => pillHtml(technology)).join('')}</div>` : ''}${item.highlights?.length ? `<div class="mt-1.5"><p class="mb-0.5 text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildDotList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => cardHtml(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm" style="color:${MUTED}"> — ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>${item.gpa ? `<p class="text-xs" style="color:${MUTED}">GPA: ${esc(item.gpa)}</p>` : ''}${item.highlights?.length ? `<div class="mt-1">${buildDotList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="flex flex-wrap gap-2">${categories.map((category) => `<div class="rounded-lg p-2.5" style="background-color:${WARM_BG}"><span class="text-xs font-bold" style="color:${PRIMARY}">${esc(category.name)}</span>${category.skills?.length ? `<div class="mt-1 flex flex-wrap gap-1">${category.skills.map((skill) => pillHtml(skill)).join('')}</div>` : ''}</div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => cardHtml(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs" style="color:${MUTED}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}${item.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${item.technologies.map((technology) => pillHtml(technology)).join('')}</div>` : ''}${item.highlights?.length ? `<div class="mt-1.5">${buildDotList(item.highlights)}</div>` : ''}`)).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<ul class="space-y-1.5 list-none">${items.map((item) => `<li class="flex items-baseline justify-between gap-3"><div class="flex min-w-0 items-baseline gap-2"><span class="h-1.5 w-1.5 shrink-0 rounded-full" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.name)}</span>${item.issuer ? `<span class="text-sm" style="color:${MUTED}">— ${esc(item.issuer)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs" style="color:${MUTED}">${esc(item.date)}</span>` : ''}</li>`).join('')}</ul>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-2">${items.map((item) => `<div class="rounded-full px-3 py-1 text-sm" style="background-color:${WARM_BG}"><span class="font-medium" style="color:${PRIMARY}">${esc(item.language)}</span><span style="color:${MUTED}"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => cardHtml(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(item.repoUrl)}</a>` : ''}</span><span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background-color:${TAG_BG};color:${PRIMARY}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>${item.language ? `<span class="text-xs" style="color:${ACCENT}">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => cardHtml(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm" style="color:${MUTED}"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs" style="color:${MUTED}">${esc(item.date)}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(content);

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div class="flex items-center gap-2"><span class="h-1.5 w-1.5 shrink-0 rounded-full" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<span class="text-sm" style="color:${BODY_TEXT}"> — ${md(item.description)}</span>` : ''}</div>`).join('')}</div>`;
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
  const contacts = contactValues(pi);
  if (contacts.length === 0) return '';
  return `<div class="mt-2 flex flex-wrap gap-3 text-xs" style="color:${MUTED}">${contacts.map((contact) => `<span${contact.startsWith('http') ? ' class="break-all"' : ''}>${esc(contact)}</span>`).join('')}</div>`;
}

export function buildTeacherHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 flex items-center gap-5">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-18 w-18 shrink-0 rounded-full object-cover" style="border:3px solid ${ACCENT}"/>` : ''}
      <div class="flex-1">
        <h1 class="text-2xl font-bold" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-medium text-white" style="background-color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
        ${buildContactHtml(pi)}
      </div>
    </div>
    <div class="mb-6 h-0.5 w-full rounded-full" style="background-color:${ACCENT};opacity:0.3"></div>
    ${sections.map((section) => `<div class="mb-6" data-section>
      <h2 class="mb-3 inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white" style="background-color:${PRIMARY}">${esc(section.title)}</h2>
      ${buildTeacherSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const teacherTemplate: UnifiedTemplate = {
  id: 'teacher',
  name: 'Teacher',
  PreviewComponent: TeacherPreview,
  buildHtml: buildTeacherHtml,
};
