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

const TEAL_800 = '#115e59';
const TEAL_500 = '#0d9488';
const TEAL_50 = '#f0fdfa';

function buildMedicalSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-sm leading-relaxed text-gray-600">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-lg border p-3" style="border-color:${TEAL_500};background-color:${TEAL_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-gray-600"> | ${esc(it.company)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm text-gray-600"><span class="font-medium text-gray-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium text-gray-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${it.highlights.map((h: string) => `<li class="text-sm text-gray-600">${md(h)}</li>`).join('')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-lg border p-3" style="border-color:${TEAL_500};background-color:${TEAL_50}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-gray-600"> - ${esc(it.institution)}</span>` : ''}</div><span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-sm text-gray-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${it.highlights.map((h: string) => `<li class="text-sm text-gray-600">${esc(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-32 shrink-0 font-semibold" style="color:${TEAL_800}">${esc(cat.name)}:</span><span class="text-gray-600">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-lg border p-3" style="border-color:${TEAL_500};background-color:${TEAL_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-gray-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-gray-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 list-disc pl-4">${it.highlights.map((h: string) => `<li class="text-sm text-gray-600">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.name)}</span>${it.issuer ? `<span class="text-sm text-gray-600"> — ${esc(it.issuer)}</span>` : ''}${it.date ? `<span class="text-sm text-gray-600"> (${esc(it.date)})</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.language)}</span><span class="text-sm text-gray-600"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-lg border p-3" style="border-color:${TEAL_500};background-color:${TEAL_50}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.name)}</span><span class="text-xs font-medium" style="color:${TEAL_500}">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-gray-400">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-gray-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEAL_800}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-gray-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs font-medium" style="color:${TEAL_500}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-gray-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div><span class="text-sm font-medium" style="color:${TEAL_800}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-gray-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildMedicalHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const { row1, row2 } = buildContactEntries(pi);
  const iconColor = '#6b7280';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#6b7280">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:8px;font-size:13px">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:13px">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 border-b-2 pb-5" style="border-color:${TEAL_500}">
      <div class="flex items-center gap-5">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-18 w-18 shrink-0 rounded-full object-cover" style="border:3px solid ${TEAL_500}"/>` : ''}
        <div class="flex-1">
          <h1 class="text-2xl font-bold" style="color:${TEAL_800}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-medium" style="color:${TEAL_500}">${esc(pi.jobTitle)}</p>` : ''}
          ${contactHtml}
        </div>
      </div>
    </div>
    ${sections.map(s => `<div class="mb-6" data-section>
      <h2 class="mb-3 inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white" style="background-color:${TEAL_500}">${esc(s.title)}</h2>
      ${buildMedicalSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
