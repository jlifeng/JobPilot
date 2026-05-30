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
  extractMarkdownBulletItems,
  getPersonalInfo,
  visibleSections,
  buildHighlights,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

const TEAL_800 = '#115e59';
const TEAL_500 = '#0d9488';
const TEAL_50 = '#f0fdfa';

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

export function MedicalPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6 border-b-2 pb-5" style={{ borderColor: TEAL_500 }}>
        <div className="flex items-center gap-5">
          {pi.avatar && <AvatarImage src={pi.avatar} size={72} avatarStyle={resume.themeConfig.avatarStyle} className="shrink-0" style={{ border: `3px solid ${TEAL_500}` }} />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: TEAL_800 }}>{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-sm font-medium" style={{ color: TEAL_500 }}>{pi.jobTitle}</p>}
            <ContactInfo pi={pi} iconColor="#6b7280" style={{ color: '#6b7280' }} align="left" />
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-3 inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: TEAL_500 }}>
            {section.title}
          </h2>
          <MedicalSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function MedicalCard({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="rounded-lg border p-3" style={{ borderColor: TEAL_500, backgroundColor: TEAL_50 }}>{children}</div>;
}

function MedicalSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    const summaryItems = extractMarkdownBulletItems((content as unknown as SummaryContent).text);
    if (summaryItems?.length) {
      return <BulletList items={summaryItems} className="list-disc pl-4" />;
    }
    return <p className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => {
          const responsibilityItems = extractMarkdownBulletItems(item.description);

          return (
          <MedicalCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: TEAL_800 }}>{item.position}</span>
                {item.company && <span className="text-sm text-gray-600"> | {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: TEAL_500 }}>{dateRange(item.startDate, item.endDate, item.current, lang)}</span>
            </div>
            {item.description && responsibilityItems && <div className="mt-1"><p className="mb-0.5 text-xs font-semibold" style={{ color: TEAL_800 }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</p><BulletList items={responsibilityItems} className="list-disc pl-4" /></div>}
            {item.description && !responsibilityItems && <p className="mt-1 text-sm text-gray-600"><span className="font-semibold" style={{ color: TEAL_800 }}>{lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <div className="mt-1.5"><p className="mb-0.5 text-xs font-semibold" style={{ color: TEAL_800 }}>{lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><BulletList items={item.highlights} className="list-disc pl-4" /></div>}
          </MedicalCard>
        )})}
      </div>
    );
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <MedicalCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: TEAL_800 }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-gray-600"> - {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: TEAL_500 }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>
            </div>
            {item.gpa && <p className="text-sm text-gray-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1.5 list-disc pl-4" />}
          </MedicalCard>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-1.5">
        {categories.map((category) => (
          <div key={category.id} className="flex text-sm">
            <span className="w-32 shrink-0 font-semibold" style={{ color: TEAL_800 }}>{category.name}:</span>
            <span className="text-gray-600">{category.skills.join(', ')}</span>
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
          <MedicalCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: TEAL_800 }}>{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs font-medium" style={{ color: TEAL_500 }}>{dateRange(item.startDate, item.endDate, true, lang)}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{lang === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && <BulletList items={item.highlights} className="mt-1.5 list-disc pl-4" />}
          </MedicalCard>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-bold" issuerClassName="text-gray-600" dateClassName="shrink-0 text-xs font-medium" titleStyle={{ color: TEAL_800 }} dateStyle={{ color: TEAL_500 }} />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return <div className="space-y-1.5">{items.map((item) => <div key={item.id}><span className="text-sm font-bold" style={{ color: TEAL_800 }}>{item.language}</span><span className="text-sm text-gray-600"> — {item.proficiency}</span></div>)}</div>;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <MedicalCard key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: TEAL_800 }}>{item.name}</span>
              <span className="text-xs font-medium" style={{ color: TEAL_500 }}>★ {item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-gray-400">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </MedicalCard>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return <div className="space-y-3">{items.map((item) => <div key={item.id}><div className="flex items-baseline justify-between"><div><span className="text-sm font-bold" style={{ color: TEAL_800 }}>{item.title}</span>{item.subtitle && <span className="text-sm text-gray-500"> — {item.subtitle}</span>}</div>{item.date && <span className="shrink-0 text-xs font-medium" style={{ color: TEAL_500 }}>{item.date}</span>}</div>{item.description && <p className="mt-0.5 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  if (section.type === 'qr_codes') return <QrCodeGrid content={content} />;

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return <div className="space-y-2">{items.map((item) => <div key={item.id}><span className="text-sm font-medium" style={{ color: TEAL_800 }}>{item.name || item.title || item.language}</span>{item.description && <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}</div>)}</div>;
  }

  return null;
}

function BulletList({ items, className = 'mt-1.5 list-disc pl-4' }: { items: string[]; className?: string }): React.ReactElement {
  return <ul className={className}>{items.map((item, index) => <li key={index} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}</ul>;
}

function QrCodeGrid({ content }: { content: Record<string, unknown> }): React.ReactElement | null {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
  if (!svgs) return null;
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 24px', paddingTop: '4px' }}>{validItems.map((qr) => <div key={qr.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 96 }}><div style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: svgs[qr.id] }} />{qr.label && <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 96 }}>{qr.label}</span>}</div>)}</div>;
}

function buildMedicalSectionHtml(section: CanonicalResume['sections'][number], lang: string): string {
  const content = section.content as unknown as Record<string, unknown>;
  const card = (body: string) => `<div class="rounded-lg border p-3" style="border-color:${TEAL_500};background-color:${TEAL_50}">${body}</div>`;

  if (section.type === 'summary') {
    const summaryItems = extractMarkdownBulletItems((content as unknown as SummaryContent).text);
    if (summaryItems?.length) {
      return `<ul class="list-disc pl-4">${buildHighlights(summaryItems, 'text-sm text-gray-600')}</ul>`;
    }
    return `<p class="text-sm leading-relaxed text-gray-600">${md((content as unknown as SummaryContent).text)}</p>`;
  }
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => card(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(item.position)}</span>${item.company ? `<span class="text-sm text-gray-600"> | ${esc(item.company)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span></div>${(() => { const responsibilityItems = extractMarkdownBulletItems(item.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-semibold" style="color:${TEAL_800}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p><ul class="list-disc pl-4">${buildHighlights(responsibilityItems, 'text-sm text-gray-600')}</ul></div>`; } return item.description ? `<p class="mt-1 text-sm text-gray-600"><span class="font-semibold" style="color:${TEAL_800}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''; })()}${item.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}${item.highlights?.length ? `<div class="mt-1.5"><p class="mb-0.5 text-xs font-semibold" style="color:${TEAL_800}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-gray-600')}</ul></div>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => card(`<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(degreeField(item.degree, item.field))}</span>${item.institution ? `<span class="text-sm text-gray-600"> - ${esc(item.institution)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span></div>${item.gpa ? `<p class="text-sm text-gray-500">GPA: ${esc(item.gpa)}</p>` : ''}${item.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-gray-600')}</ul>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-1.5">${categories.map((category) => `<div class="flex text-sm"><span class="w-32 shrink-0 font-semibold" style="color:${TEAL_800}">${esc(category.name)}:</span><span class="text-gray-600">${esc(category.skills.join(', '))}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-3">${items.map((item) => card(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(item.name)}</span>${item.startDate ? `<span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>${item.description ? `<p class="mt-1 text-sm text-gray-600">${md(item.description)}</p>` : ''}${item.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(item.technologies.join(', '))}</p>` : ''}${item.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-gray-600')}</ul>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-bold', issuerClass: 'text-gray-600', dateClass: 'shrink-0 text-xs font-medium', titleStyle: `color:${TEAL_800}`, dateStyle: `color:${TEAL_500}` });
  }
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="space-y-1.5">${items.map((item) => `<div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(item.language)}</span><span class="text-sm text-gray-600"> — ${esc(item.proficiency)}</span></div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-3">${items.map((item) => card(`<div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(item.name)}</span><span class="text-xs font-medium" style="color:${TEAL_500}">★ ${item.stars?.toLocaleString() ?? 0}</span></div>${item.language ? `<span class="text-xs text-gray-400">${esc(item.language)}</span>` : ''}${item.description ? `<p class="mt-1 text-sm text-gray-600">${md(item.description)}</p>` : ''}`)).join('')}</div>`;
  }
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div><div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(item.title)}</span>${item.subtitle ? `<span class="text-sm text-gray-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(item.date)}</span>` : ''}</div>${item.description ? `<p class="mt-0.5 text-sm text-gray-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(content);
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium" style="color:${TEAL_800}">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-gray-600">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
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
  const renderRow = (entries: typeof row1) => entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0"><span style="color:#6b7280">${entry.htmlIcon}</span><span style="color:#6b7280">${esc(entry.value)}</span></span>`).join('');
  const firstRow = row1.length > 0 ? `<div style="margin-top:8px;font-size:13px">${renderRow(row1)}</div>` : '';
  const secondRow = row2.length > 0 ? `<div style="margin-top:${row1.length > 0 ? '4px' : '8px'};font-size:13px">${renderRow(row2)}</div>` : '';
  return firstRow + secondRow;
}

export function buildMedicalHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 border-b-2 pb-5" style="border-color:${TEAL_500}"><div class="flex items-center gap-5">${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-18 w-18 shrink-0 rounded-full object-cover" style="border:3px solid ${TEAL_500}"/>` : ''}<div class="flex-1"><h1 class="text-2xl font-bold" style="color:${TEAL_800}">${esc(pi.fullName || 'Your Name')}</h1>${pi.jobTitle ? `<p class="mt-1 text-sm font-medium" style="color:${TEAL_500}">${esc(pi.jobTitle)}</p>` : ''}${buildContactHtml(pi)}</div></div></div>
    ${sections.map((section) => `<div class="mb-6" data-section><h2 class="mb-3 inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white" style="background-color:${TEAL_500}">${esc(section.title)}</h2>${buildMedicalSectionHtml(section, lang)}</div>`).join('')}
  </div>`;
}

export const medicalTemplate: UnifiedTemplate = {
  id: 'medical',
  name: 'Medical',
  PreviewComponent: MedicalPreview,
  buildHtml: buildMedicalHtml,
};
