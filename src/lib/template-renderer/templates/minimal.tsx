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
  getPersonalInfo,
  visibleSections,
  buildHighlights,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';
import { CertificationList, buildCertificationListHtml } from '../certifications-list';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

function localizedEndDate(
  endDate: string | null | undefined,
  current: boolean | undefined,
  lang: string,
): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function dateRange(
  startDate: string | undefined,
  endDate: string | null | undefined,
  current: boolean | undefined,
  lang: string,
): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  return `${startDate} - ${localizedEndDate(endDate, current, lang)}`;
}

export function MinimalPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          {pi.avatar && (
            <AvatarImage
              src={pi.avatar}
              avatarStyle={resume.themeConfig.avatarStyle}
              size={48}
              className="shrink-0"
            />
          )}
          <div>
            <h1 className="text-xl font-medium text-zinc-900">{pi.fullName || 'Your Name'}</h1>
            <ContactInfo pi={pi} align="left" iconSize={12} variant="profile" />
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="mb-6" data-section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
            {section.title}
          </h2>
          <MinimalSectionContent section={section} lang={resume.language || 'en'} />
        </div>
      ))}
    </div>
  );
}

function MinimalSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return (
      <p
        className="text-sm leading-relaxed text-zinc-600"
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
    );
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <p className="text-sm">
              <span className="font-medium text-zinc-800">{item.position}</span>
              {item.company && <span className="text-zinc-500"> / {item.company}</span>}
            </p>
            <p className="text-xs text-zinc-400">
              {dateRange(item.startDate, item.endDate, item.current, lang)}
            </p>
            {item.description && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">{lang === 'zh' ? '职责' : 'Responsibilities'}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: md(item.description) }} />
              </p>
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">{item.technologies.join(' / ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="mb-0.5 text-xs font-medium text-zinc-500">
                  {lang === 'zh' ? '主要成就' : 'Key Achievements'}:
                </p>
                <ul className="list-disc pl-4">
                  {item.highlights.map((highlight, index) => (
                    <li
                      key={index}
                      className="text-sm text-zinc-500"
                      dangerouslySetInnerHTML={{ __html: md(highlight) }}
                    />
                  ))}
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
            <p className="text-sm">
              <span className="font-medium text-zinc-800">{item.institution}</span>
            </p>
            <p className="text-sm text-zinc-600">{degreeField(item.degree, item.field)}</p>
            <p className="text-xs text-zinc-400">
              {dateRange(item.startDate, item.endDate, true, lang)}
            </p>
            {item.gpa && <p className="text-xs text-zinc-400">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="text-sm text-zinc-500"
                    dangerouslySetInnerHTML={{ __html: md(highlight) }}
                  />
                ))}
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
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id}>
            <p className="text-sm font-medium text-zinc-700">{category.name}</p>
            {category.skills?.length > 0 && (
              <ul className="mt-0.5 list-disc pl-4">
                {category.skills.map((skill, index) => (
                  <li key={index} className="text-sm text-zinc-600">{skill}</li>
                ))}
              </ul>
            )}
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
              <span className="text-sm font-medium text-zinc-800">{item.name}</span>
              {item.startDate && (
                <span className="text-xs text-zinc-400">
                  {dateRange(item.startDate, item.endDate, true, lang)}
                </span>
              )}
            </div>
            {item.description && (
              <p
                className="mt-1 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-zinc-400">{item.technologies.join(' / ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="text-sm text-zinc-500"
                    dangerouslySetInnerHTML={{ __html: md(highlight) }}
                  />
                ))}
              </ul>
            )}
          </div>
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
              <span className="text-sm font-medium text-zinc-800">{item.name}</span>
              <span className="text-xs text-zinc-400">{item.stars?.toLocaleString()}</span>
            </div>
            {item.language && <span className="text-xs text-zinc-400">{item.language}</span>}
            {item.description && (
              <p
                className="mt-1 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return <CertificationList items={items} titleClassName="font-medium text-zinc-800" issuerClassName="text-zinc-500" />;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {items.map((item) => (
          <span key={item.id} className="text-sm">
            <span className="font-medium text-zinc-800">{item.language}</span>
            <span className="text-zinc-400"> — {item.proficiency}</span>
          </span>
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
              <div className="text-sm">
                <span className="font-medium text-zinc-800">{item.title}</span>
                {item.subtitle && <span className="text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="text-xs text-zinc-400">{item.date}</span>}
            </div>
            {item.description && (
              <p
                className="mt-0.5 text-sm text-zinc-600"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
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
            {qr.label && (
              <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-all', maxWidth: 96 }}>{qr.label}</span>
            )}
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
            {item.description && (
              <p
                className="text-sm text-zinc-500"
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function buildMinimalSectionHtml(
  section: CanonicalResume['sections'][number],
  lang: string,
): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<p class="text-sm leading-relaxed text-zinc-600">${md((content as unknown as SummaryContent).text)}</p>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <p class="text-sm"><span class="font-medium text-zinc-800">${esc(item.position)}</span>${item.company ? ` <span class="text-zinc-500">/ ${esc(item.company)}</span>` : ''}</p>
      <p class="text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</p>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> <span>${md(item.description)}</span></p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${esc(item.technologies.join(' / '))}</p>` : ''}
      ${item.highlights?.length ? `<div class="mt-1"><p class="mb-0.5 text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-500')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <p class="text-sm"><span class="font-medium text-zinc-800">${esc(item.institution)}</span></p>
      <p class="text-sm text-zinc-600">${esc(degreeField(item.degree, item.field))}</p>
      <p class="text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</p>
      ${item.gpa ? `<p class="text-xs text-zinc-400">GPA: ${esc(item.gpa)}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-500')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div class="space-y-2">${categories.map((category) =>
      `<div><p class="text-sm font-medium text-zinc-700">${esc(category.name)}</p>${category.skills?.length ? `<ul class="mt-0.5 list-disc pl-4">${category.skills.map((skill) => `<li class="text-sm text-zinc-600">${esc(skill)}</li>`).join('')}</ul>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium text-zinc-800">${esc(item.name)}</span>${item.startDate ? `<span class="text-xs text-zinc-400">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
      ${item.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${esc(item.technologies.join(' / '))}</p>` : ''}
      ${item.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(item.highlights, 'text-sm text-zinc-500')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return `<div class="space-y-4">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium text-zinc-800">${esc(item.name)}</span><span class="text-xs text-zinc-400">${item.stars?.toLocaleString() ?? 0}</span></div>
      ${item.language ? `<span class="text-xs text-zinc-400">${esc(item.language)}</span>` : ''}
      ${item.description ? `<p class="mt-1 text-sm text-zinc-600">${md(item.description)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return buildCertificationListHtml(items, { titleClass: 'font-medium text-zinc-800', issuerClass: 'text-zinc-500' });
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${items.map((item) =>
      `<span class="text-sm"><span class="font-medium text-zinc-800">${esc(item.language)}</span><span class="text-zinc-400"> — ${esc(item.proficiency)}</span></span>`
    ).join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div class="space-y-3">${items.map((item) => `<div>
      <div class="flex items-baseline justify-between"><div class="text-sm"><span class="font-medium text-zinc-800">${esc(item.title)}</span>${item.subtitle ? `<span class="text-zinc-500"> — ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span class="text-xs text-zinc-400">${esc(item.date)}</span>` : ''}</div>
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
    return `<div class="space-y-2">${items.map((item) => `<div><span class="text-sm font-medium text-zinc-700">${esc(item.name || item.title || item.language || '')}</span>${item.description ? `<p class="text-sm text-zinc-500">${md(item.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

function buildContactHtml(pi: ReturnType<typeof getPersonalInfo>): string {
  const { row1, row2 } = buildContactEntries(pi, { variant: 'profile' });
  if (row1.length === 0 && row2.length === 0) return '';

  const renderRow = (entries: typeof row1) =>
    entries.map((entry) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 12px 2px 0"><span style="color:#71717a;font-size:12px">${entry.htmlIcon}</span><span style="color:#6B7280">${esc(entry.value)}</span></span>`).join('');

  const firstRow = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px">${renderRow(row1)}</div>`
    : '';
  const secondRow = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px">${renderRow(row2)}</div>`
    : '';

  return firstRow + secondRow;
}

export function buildMinimalHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-8">
      <div class="flex items-center gap-3">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-12 w-12 shrink-0 rounded-full object-cover"/>` : ''}
        <div>
          <h1 class="text-xl font-medium text-zinc-900">${esc(pi.fullName || 'Your Name')}</h1>
          ${buildContactHtml(pi)}
        </div>
      </div>
    </div>
    ${sections.map((section) => `<div class="mb-6" data-section>
      <h2 class="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">${esc(section.title)}</h2>
      ${buildMinimalSectionHtml(section, lang)}
    </div>`).join('')}
  </div>`;
}

export const minimalTemplate: UnifiedTemplate = {
  id: 'minimal',
  name: 'Minimal',
  PreviewComponent: MinimalPreview,
  buildHtml: buildMinimalHtml,
};
