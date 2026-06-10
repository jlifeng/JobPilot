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
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';
import { buildContactEntries } from '@/lib/template-renderer/contact-info';

const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';
const SLATE_50 = '#f8fafc';

function buildNordicSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-sm font-light leading-relaxed" style="color:${SLATE_500}">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.position)}</span>${it.company ? `<span class="text-sm font-light" style="color:${SLATE_400}"> | ${esc(it.company)}</span>` : ''}</div><span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm font-light" style="color:${SLATE_500}"><span class="font-medium" style="color:${SLATE_500}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs font-light" style="color:${SLATE_400}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium mb-0.5" style="color:${SLATE_400}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${it.highlights.map((h: string) => `<li class="text-sm font-light" style="color:${SLATE_500}">${md(h)}</li>`).join('')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm font-light" style="color:${SLATE_400}"> - ${esc(it.institution)}</span>` : ''}</div><span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-xs font-light" style="color:${SLATE_400}">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${it.highlights.filter(Boolean).map((h: string) => `<li class="text-sm font-light" style="color:${SLATE_500}">${esc(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${SLATE_500}">${esc(cat.name)}:</span><span class="font-light" style="color:${SLATE_400}">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.startDate ? `<span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm font-light" style="color:${SLATE_500}">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs font-light" style="color:${SLATE_400}">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${it.highlights.map((h: string) => `<li class="text-sm font-light" style="color:${SLATE_500}">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer ? `<span class="text-sm font-light" style="color:${SLATE_400}"> — ${esc(it.issuer)}</span>` : ''}${it.date ? `<span class="text-sm font-light" style="color:${SLATE_400}"> (${esc(it.date)})</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.language)}</span><span class="text-sm font-light" style="color:${SLATE_400}"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-sm p-3" style="background-color:${SLATE_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-xs font-light" style="color:${SLATE_400}">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs font-light" style="color:${SLATE_400}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm font-light" style="color:${SLATE_500}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm font-light" style="color:${SLATE_400}"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs font-light" style="color:${SLATE_400}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm font-light" style="color:${SLATE_500}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div><span class="text-sm font-medium" style="color:${SLATE_500}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm font-light" style="color:${SLATE_400}">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildNordicHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const { row1, row2 } = buildContactEntries(pi);
  const iconColor = SLATE_400;

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:${SLATE_400}">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:12px;font-size:12px;text-align:center">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:12px;text-align:center">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-8 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-16 w-16 rounded-full object-cover" style="border:2px solid ${SLATE_400}"/>` : ''}
      <h1 class="text-2xl font-light tracking-wide" style="color:${SLATE_500}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-sm font-light tracking-wider" style="color:${SLATE_400}">${esc(pi.jobTitle)}</p>` : ''}
      ${contactHtml}
    </div>
    <div class="mx-auto mb-8 h-px w-full" style="background-color:${SLATE_400}"></div>
    ${sections.map(s => `<div class="mb-7" data-section>
      <h2 class="mb-3 text-xs font-medium uppercase tracking-[0.2em]" style="color:${SLATE_500}">${esc(s.title)}</h2>
      ${buildNordicSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
