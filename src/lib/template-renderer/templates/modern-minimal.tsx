/**
 * Modern Minimal Template — Unified Implementation
 *
 * Clean, tech-forward aesthetic: white card on gray background,
 * blue accent (#2563EB), timeline work experience, card-based projects,
 * pill-style skills, Lucide React icons for section headers.
 */

import React from 'react';
import {
  Briefcase,
  FolderOpen,
  GraduationCap,
  Award,
  Languages,
  Code2,
  LinkIcon,
} from 'lucide-react';
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
} from '@/types/resume';
import type { CanonicalResume, UnifiedTemplate, TemplateProps } from '../types';
import {
  md,
  esc,
  degreeField,
  formatDate,
  getPersonalInfo,
  buildHighlights,
  visibleSections,
} from '../template-contract';
import { ContactInfo, buildContactEntries } from '../contact-info';

// ============================================================================
// Constants
// ============================================================================

const ACCENT = '#2563EB';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const DIVIDER = '#E5E7EB';
const BG_PAGE = '#F3F4F6';
const SKILL_BG = '#F3F4F6';
const TECH_BG = '#EFF6FF';
const TECH_BORDER = '#BFDBFE';

// ============================================================================
// Section Icon Map
// ============================================================================

const SECTION_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  work_experience: Briefcase,
  projects: FolderOpen,
  education: GraduationCap,
  certifications: Award,
  languages: Languages,
  skills: Code2,
  github: Code2,
  custom: Code2,
  summary: Code2,
};

// Unicode fallbacks for HTML export (no React)
const SECTION_ICON_HTML: Record<string, string> = {
  work_experience: '●',  // ●
  projects: '■',         // ■
  education: '▲',        // ▲
  certifications: '★',   // ★
  languages: '◆',        // ◆
  skills: '●',
  github: '●',
  custom: '●',
  summary: '●',
};

// ============================================================================
// Preview Component (React)
// ============================================================================

export function ModernMinimalPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div
      className="mx-auto max-w-[794px]"
      style={{ fontFamily: 'Inter, sans-serif', background: BG_PAGE, padding: '24px' }}
    >
      <div
        className="overflow-hidden"
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: TEXT_PRIMARY }}>
                {pi.fullName || 'Your Name'}
              </h1>
              {pi.jobTitle && (
                <p className="mt-1 text-base" style={{ color: TEXT_SECONDARY }}>
                  {pi.jobTitle}
                </p>
              )}
            </div>
            {pi.avatar && (
              <img
                src={pi.avatar}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            )}
          </div>
          <ContactInfo pi={pi} iconColor={ACCENT} align="left" />
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.id} className="px-8 pb-6" data-section>
            {/* Divider */}
            <div className="mb-4 border-t" style={{ borderColor: DIVIDER }} />

            {/* Section Header */}
            <div className="mb-3 flex items-center gap-2">
              {(() => {
                const Icon = SECTION_ICONS[section.type] || Code2;
                return <Icon size={16} color={ACCENT} />;
              })()}
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: TEXT_PRIMARY }}>
                {section.title}
              </h2>
            </div>

            {/* Section Content */}
            <ModernMinimalSectionContent section={section} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section Content Renderer (React)
// ============================================================================

function ModernMinimalSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  // -- Summary --
  if (section.type === 'summary') {
    return (
      <p
        className="text-sm leading-relaxed"
        style={{ color: TEXT_SECONDARY }}
        dangerouslySetInnerHTML={{ __html: md((content as unknown as SummaryContent).text) }}
      />
    );
  }

  // -- Work Experience (Timeline) --
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    return (
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[88px] top-2 bottom-2 w-[2px]" style={{ background: DIVIDER }} />
        {items.map((item, idx) => (
          <div key={item.id} className="relative flex gap-4 mb-4 last:mb-0">
            {/* Timeline dot */}
            <div
              className="absolute left-[85px] top-1.5 z-10 h-[6px] w-[6px] rounded-full"
              style={{ background: ACCENT }}
            />
            {/* Date column */}
            <div className="w-20 shrink-0 pr-2">
              <span className="text-xs" style={{ color: TEXT_SECONDARY }}>
                {formatDate(item.startDate, item.endDate, item.current, lang)}
              </span>
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1 pl-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {item.position}
                </span>
                {item.company && (
                  <span className="text-sm" style={{ color: ACCENT }}>
                    {item.company}
                  </span>
                )}
              </div>
              {item.location && (
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>{item.location}</p>
              )}
              {item.description && (
                <p
                  className="mt-1 text-sm"
                  style={{ color: TEXT_SECONDARY }}
                  dangerouslySetInnerHTML={{ __html: md(item.description) }}
                />
              )}
              {item.technologies?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.technologies.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: TECH_BG, color: ACCENT, border: `1px solid ${TECH_BORDER}` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {item.highlights?.length > 0 && (
                <ul className="mt-1.5 list-disc pl-4">
                  {item.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="text-sm"
                      style={{ color: TEXT_SECONDARY }}
                      dangerouslySetInnerHTML={{ __html: md(h) }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // -- Projects (Card List) --
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border p-4"
            style={{ borderColor: DIVIDER, background: 'white' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                {item.name}
              </span>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                  style={{ color: ACCENT }}
                >
                  <LinkIcon size={12} />
                </a>
              )}
            </div>
            {item.startDate && (
              <p className="mt-0.5 text-xs" style={{ color: TEXT_SECONDARY }}>
                {formatDate(item.startDate, item.endDate || null, false, lang)}
              </p>
            )}
            {item.description && (
              <p
                className="mt-1.5 text-sm leading-relaxed"
                style={{ color: TEXT_SECONDARY }}
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
            {item.technologies?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.technologies.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: TECH_BG, color: ACCENT, border: `1px solid ${TECH_BORDER}` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {item.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-sm"
                    style={{ color: TEXT_SECONDARY }}
                    dangerouslySetInnerHTML={{ __html: md(h) }}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  // -- Skills (Category List) --
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
              {cat.name}
            </span>
            <ul className="mt-1 list-disc pl-4">
              {(cat.skills || []).map((skill, i) => (
                <li
                  key={i}
                  className="text-sm"
                  style={{ color: TEXT_SECONDARY }}
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  // -- Education --
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {degreeField(item.degree, item.field)}
                </span>
                {item.institution && (
                  <span className="text-sm" style={{ color: TEXT_SECONDARY }}> — {item.institution}</span>
                )}
              </div>
              <span className="shrink-0 text-xs" style={{ color: TEXT_SECONDARY }}>
                {formatDate(item.startDate, item.endDate, false, lang)}
              </span>
            </div>
            {item.gpa && (
              <p className="text-xs" style={{ color: TEXT_SECONDARY }}>GPA: {item.gpa}</p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-sm"
                    style={{ color: TEXT_SECONDARY }}
                    dangerouslySetInnerHTML={{ __html: md(h) }}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  // -- GitHub --
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border p-3"
            style={{ borderColor: DIVIDER }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                {item.name}
              </span>
              {item.stars != null && (
                <span className="text-xs" style={{ color: TEXT_SECONDARY }}>
                  {'★'} {item.stars.toLocaleString()}
                </span>
              )}
            </div>
            {item.language && (
              <span className="text-xs" style={{ color: ACCENT }}>{item.language}</span>
            )}
            {item.description && (
              <p
                className="mt-1 text-xs"
                style={{ color: TEXT_SECONDARY }}
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // -- Certifications --
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-baseline justify-between">
            <div>
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                {item.name}
              </span>
              {item.issuer && (
                <span className="text-sm" style={{ color: TEXT_SECONDARY }}> / {item.issuer}</span>
              )}
            </div>
            {item.date && (
              <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{item.date}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // -- Languages --
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
              {item.language}
            </span>
            <span className="text-xs" style={{ color: TEXT_SECONDARY }}>
              {item.proficiency}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // -- Custom --
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-sm" style={{ color: TEXT_SECONDARY }}> — {item.subtitle}</span>
                )}
              </div>
              {item.date && (
                <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{item.date}</span>
              )}
            </div>
            {item.description && (
              <p
                className="mt-0.5 text-sm"
                style={{ color: TEXT_SECONDARY }}
                dangerouslySetInnerHTML={{ __html: md(item.description) }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Generic fallback
  if ('items' in content && Array.isArray(content.items)) {
    return (
      <div className="space-y-2">
        {(content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>).map((item) => (
          <div key={item.id}>
            <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>
              {item.name || item.title || item.language}
            </span>
            {item.description && (
              <p
                className="text-sm"
                style={{ color: TEXT_SECONDARY }}
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

// ============================================================================
// Export Builder (HTML String)
// ============================================================================

function buildModernMinimalSectionHtml(
  section: CanonicalResume['sections'][number],
  lang: string,
): string {
  const content = section.content as unknown as Record<string, unknown>;
  const icon = SECTION_ICON_HTML[section.type] || '●';

  const sectionHeader = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <span style="color:${ACCENT};font-size:14px">${icon}</span>
    <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${TEXT_PRIMARY};margin:0">${esc(section.title)}</h2>
  </div>`;

  // Summary
  if (section.type === 'summary') {
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <p style="font-size:14px;line-height:1.6;color:${TEXT_SECONDARY};margin:0">${md((content as unknown as SummaryContent).text)}</p>
    </div>`;
  }

  // Work Experience
  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    const itemsHtml = items.map((it, idx) => {
      const techs = it.technologies?.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${it.technologies.map((t) => `<span style="background:${TECH_BG};color:${ACCENT};border:1px solid ${TECH_BORDER};border-radius:9999px;padding:2px 8px;font-size:11px">${esc(t)}</span>`).join('')}</div>`
        : '';
      const highlights = it.highlights?.length
        ? `<ul style="margin:6px 0 0 16px;padding:0">${buildHighlights(it.highlights, `font-size:13px;color:${TEXT_SECONDARY}`)}</ul>`
        : '';
      const marginBottom = idx < items.length - 1 ? 'margin-bottom:16px' : '';
      return `<div style="position:relative;display:flex;gap:16px;${marginBottom}">
        <div style="position:absolute;left:85px;top:6px;z-index:10;width:6px;height:6px;border-radius:50%;background:${ACCENT}"></div>
        <div style="width:80px;shrink:0;padding-right:8px">
          <span style="font-size:11px;color:${TEXT_SECONDARY}">${esc(formatDate(it.startDate, it.endDate, it.current, lang))}</span>
        </div>
        <div style="flex:1;padding-left:16px">
          <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px">
            <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.position)}</span>
            ${it.company ? `<span style="font-size:13px;color:${ACCENT}">${esc(it.company)}</span>` : ''}
          </div>
          ${it.location ? `<p style="font-size:11px;color:${TEXT_SECONDARY};margin:2px 0 0">${esc(it.location)}</p>` : ''}
          ${it.description ? `<p style="font-size:13px;color:${TEXT_SECONDARY};margin:4px 0 0">${md(it.description)}</p>` : ''}
          ${techs}${highlights}
        </div>
      </div>`;
    }).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="position:relative">
        <div style="position:absolute;left:88px;top:8px;bottom:8px;width:2px;background:${DIVIDER}"></div>
        ${itemsHtml}
      </div>
    </div>`;
  }

  // Projects
  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    const cardsHtml = items.map((it) => {
      const techs = it.technologies?.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${it.technologies.map((t) => `<span style="background:${TECH_BG};color:${ACCENT};border:1px solid ${TECH_BORDER};border-radius:9999px;padding:2px 8px;font-size:11px">${esc(t)}</span>`).join('')}</div>`
        : '';
      const highlights = it.highlights?.length
        ? `<ul style="margin:8px 0 0 16px;padding:0">${buildHighlights(it.highlights, `font-size:13px;color:${TEXT_SECONDARY}`)}</ul>`
        : '';
      const linkHtml = it.url ? `<a href="${esc(it.url)}" style="color:${ACCENT};text-decoration:none;font-size:12px">↗</a>` : '';
      return `<div style="border:1px solid ${DIVIDER};border-radius:12px;padding:16px;background:white">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.name)}</span>
          ${linkHtml}
        </div>
        ${it.startDate ? `<p style="font-size:11px;color:${TEXT_SECONDARY};margin:2px 0 0">${formatDate(it.startDate, it.endDate || null, false, lang)}</p>` : ''}
        ${it.description ? `<p style="font-size:13px;line-height:1.5;color:${TEXT_SECONDARY};margin:6px 0 0">${md(it.description)}</p>` : ''}
        ${techs}${highlights}
      </div>`;
    }).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-direction:column;gap:12px">${cardsHtml}</div>
    </div>`;
  }

  // Skills
  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    const catsHtml = categories.map((cat) =>
      `<div style="margin-bottom:12px">
        <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(cat.name)}</span>
        <ul style="margin:4px 0 0 16px;padding:0">${(cat.skills || []).map((s) =>
          `<li style="font-size:13px;color:${TEXT_SECONDARY}">${esc(s)}</li>`
        ).join('')}</ul>
      </div>`
    ).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      ${catsHtml}
    </div>`;
  }

  // Education
  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    const itemsHtml = items.map((it) => `<div>
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <div>
          <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(degreeField(it.degree, it.field))}</span>
          ${it.institution ? `<span style="font-size:13px;color:${TEXT_SECONDARY}"> — ${esc(it.institution)}</span>` : ''}
        </div>
        <span style="font-size:11px;color:${TEXT_SECONDARY}">${formatDate(it.startDate, it.endDate, false, lang)}</span>
      </div>
      ${it.gpa ? `<p style="font-size:11px;color:${TEXT_SECONDARY};margin:2px 0 0">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul style="margin:4px 0 0 16px;padding:0">${buildHighlights(it.highlights, `font-size:13px;color:${TEXT_SECONDARY}`)}</ul>` : ''}
    </div>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-direction:column;gap:12px">${itemsHtml}</div>
    </div>`;
  }

  // GitHub
  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    const cardsHtml = items.map((it) => `<div style="border:1px solid ${DIVIDER};border-radius:12px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.name)}</span>
        ${it.stars != null ? `<span style="font-size:11px;color:${TEXT_SECONDARY}">★ ${it.stars.toLocaleString()}</span>` : ''}
      </div>
      ${it.language ? `<span style="font-size:11px;color:${ACCENT}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<p style="font-size:12px;color:${TEXT_SECONDARY};margin:4px 0 0">${md(it.description)}</p>` : ''}
    </div>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${cardsHtml}</div>
    </div>`;
  }

  // Certifications
  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    const itemsHtml = items.map((it) => `<div style="display:flex;align-items:baseline;justify-content:space-between">
      <div>
        <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.name)}</span>
        ${it.issuer ? `<span style="font-size:13px;color:${TEXT_SECONDARY}"> / ${esc(it.issuer)}</span>` : ''}
      </div>
      ${it.date ? `<span style="font-size:11px;color:${TEXT_SECONDARY}">${esc(it.date)}</span>` : ''}
    </div>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-direction:column;gap:4px">${itemsHtml}</div>
    </div>`;
  }

  // Languages
  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    const itemsHtml = items.map((it) => `<span style="display:inline-flex;align-items:baseline;gap:6px">
      <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.language)}</span>
      <span style="font-size:11px;color:${TEXT_SECONDARY}">${esc(it.proficiency)}</span>
    </span>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-wrap:wrap;gap:12px">${itemsHtml}</div>
    </div>`;
  }

  // Custom
  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    const itemsHtml = items.map((it) => `<div>
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <div>
          <span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">${esc(it.title)}</span>
          ${it.subtitle ? `<span style="font-size:13px;color:${TEXT_SECONDARY}"> — ${esc(it.subtitle)}</span>` : ''}
        </div>
        ${it.date ? `<span style="font-size:11px;color:${TEXT_SECONDARY}">${esc(it.date)}</span>` : ''}
      </div>
      ${it.description ? `<p style="font-size:13px;color:${TEXT_SECONDARY};margin:2px 0 0">${md(it.description)}</p>` : ''}
    </div>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-direction:column;gap:8px">${itemsHtml}</div>
    </div>`;
  }

  // Generic fallback
  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as Array<{ id: string; name?: string; title?: string; language?: string; description?: string }>;
    const itemsHtml = items.map((it) => `<div>
      <span style="font-size:14px;font-weight:500;color:${TEXT_PRIMARY}">${esc(it.name || it.title || it.language || '')}</span>
      ${it.description ? `<p style="font-size:13px;color:${TEXT_SECONDARY};margin:2px 0 0">${md(it.description)}</p>` : ''}
    </div>`).join('');
    return `<div data-section style="padding:0 32px 24px">
      <div style="border-top:1px solid ${DIVIDER};margin-bottom:16px"></div>
      ${sectionHeader}
      <div style="display:flex;flex-direction:column;gap:8px">${itemsHtml}</div>
    </div>`;
  }

  return '';
}

export function buildModernMinimalHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const { row1, row2 } = buildContactEntries(pi);

  const renderRow = (entries: typeof row1, accent: string) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 16px 2px 0"><span style="color:${accent};font-size:13px;flex-shrink:0">${c.htmlIcon}</span><span>${esc(c.value)}</span></span>`).join('');

  const contactR1 = row1.length > 0
    ? `<div style="margin-top:4px;font-size:13px;color:${TEXT_SECONDARY}">${renderRow(row1, ACCENT)}</div>`
    : '';
  const contactR2 = row2.length > 0
    ? `<div style="margin-top:${row1.length > 0 ? '2px' : '4px'};font-size:13px;color:${TEXT_SECONDARY}">${renderRow(row2, ACCENT)}</div>`
    : '';

  return `<div style="max-width:794px;margin:0 auto;background:${BG_PAGE};padding:24px;font-family:Inter,sans-serif">
    <div style="background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden">
      <div style="padding:32px 32px 24px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <h1 style="font-size:28px;font-weight:700;color:${TEXT_PRIMARY};margin:0">${esc(pi.fullName || 'Your Name')}</h1>
            ${pi.jobTitle ? `<p style="font-size:16px;color:${TEXT_SECONDARY};margin:4px 0 0">${esc(pi.jobTitle)}</p>` : ''}
          </div>
          ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0"/>` : ''}
        </div>
        ${contactR1}${contactR2}
      </div>
      ${sections.map((s) => buildModernMinimalSectionHtml(s, lang)).join('')}
    </div>
  </div>`;
}

// ============================================================================
// Template Registration
// ============================================================================

export const modernMinimalTemplate: UnifiedTemplate = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  PreviewComponent: ModernMinimalPreview,
  buildHtml: buildModernMinimalHtml,
};
