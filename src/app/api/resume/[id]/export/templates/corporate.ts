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

const NAVY = '#0f172a';
const BLUE = '#2563eb';

function buildCorporateSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-sm leading-relaxed text-slate-600">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-slate-600"> | ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm text-slate-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white" style="background:${BLUE}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm text-slate-600"><span class="font-medium text-slate-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-slate-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-slate-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5">${it.highlights.map((h: string) => `<li class="text-sm text-slate-600">${md(h)}</li>`).join('')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${NAVY}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-slate-600"> - ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-sm text-slate-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-xs text-slate-400">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-sm text-slate-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${it.highlights.map((h: string) => `<li class="text-sm text-slate-600">${esc(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-32 shrink-0 font-semibold" style="color:${NAVY}">${esc(cat.name)}:</span><span class="text-slate-600">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs text-slate-400">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-slate-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-slate-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5">${it.highlights.map((h: string) => `<li class="text-sm text-slate-600">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.name)}</span><span class="text-sm text-slate-600">${it.issuer ? ` — ${esc(it.issuer)}` : ''}${it.date ? ` (${esc(it.date)})` : ''}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.language)}</span><span class="text-sm text-slate-600"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.name)}</span><span class="text-xs text-slate-400">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-slate-400">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-slate-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${NAVY}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-slate-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-slate-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-slate-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div><span class="text-sm font-medium" style="color:${NAVY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-slate-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildCorporateHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const { row1, row2 } = buildContactEntries(pi);
  const iconColor = '#94a3b8';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#94a3b8">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:8px;font-size:13px">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:13px">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="px-8 py-8" style="background:${NAVY}">
      <div class="flex items-center gap-5">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-20 w-20 shrink-0 rounded object-cover" style="border:2px solid ${BLUE}"/>` : ''}
        <div class="flex-1">
          <h1 class="text-3xl font-bold tracking-tight text-white">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-base font-light" style="color:${BLUE}">${esc(pi.jobTitle)}</p>` : ''}
          ${contactHtml}
        </div>
      </div>
    </div>
    <div class="p-8">
      ${sections.map(s => `<div class="mb-6" data-section>
        <h2 class="mb-3 border-b-2 pb-1.5 text-sm font-bold uppercase tracking-wider" style="color:${NAVY};border-color:${BLUE}">${esc(s.title)}</h2>
        ${buildCorporateSectionContent(s, resume.language || 'en')}
      </div>`).join('')}
    </div>
  </div>`;
}
