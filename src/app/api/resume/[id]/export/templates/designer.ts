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
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';
import { buildContactEntries } from '@/lib/template-renderer/contact-info';

function buildDesignerSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;
  const CORAL = '#ff6b6b';
  if (section.type === 'summary') return `<div class="border-l-4 pl-4 text-sm leading-relaxed text-zinc-600" style="border-color:${CORAL}">${md((c as SummaryContent).text)}</div>`;
  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold text-black">${esc(it.position)}</h3><span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.company ? `<p class="text-sm font-medium" style="color:${CORAL}">${esc(it.company)}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style="background:${CORAL}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-zinc-500"> — ${esc(it.institution)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'skills') {
    return `<div class="flex flex-wrap gap-2">${((c as SkillsContent).categories || []).flatMap((cat: any) =>
      (cat.skills || []).map((skill: string) => `<span class="rounded-full px-3 py-1 text-xs font-medium text-white" style="background:${CORAL}">${esc(skill)}</span>`)
    ).join('')}</div>`;
  }
  if (section.type === 'projects') {
    return `<div class="space-y-4">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style="background:${CORAL}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between rounded-lg bg-zinc-50 px-4 py-2"><div><span class="text-sm font-semibold text-black">${esc(it.name)}</span>${it.issuer ? `<span class="text-sm text-zinc-500"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }
  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-2">${((c as LanguagesContent).items || []).map((it: any) =>
      `<span class="rounded-full px-3 py-1 text-xs font-medium text-white" style="background:${CORAL}">${esc(it.language)} — ${esc(it.proficiency)}</span>`
    ).join('')}</div>`;
  }
  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-black">${esc(it.name)}</span><span class="shrink-0 text-xs text-zinc-400">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs font-medium" style="color:${CORAL}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="rounded-lg bg-zinc-50 p-4">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-black">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="rounded-lg bg-zinc-50 p-3"><span class="text-sm font-medium text-black">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildDesignerHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const { row1, row2 } = buildContactEntries(pi);
  const CORAL = '#ff6b6b';
  const iconColor = '#71717a';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 12px 2px 0"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#6b7280">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:12px;font-size:13px">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:13px">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="flex">
      <div class="flex-1 px-8 py-8">
        <h1 class="text-4xl font-black tracking-tight text-black">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-lg font-light" style="color:${CORAL}">${esc(pi.jobTitle)}</p>` : ''}
        ${contactHtml}
      </div>
      ${pi.avatar ? `<div class="w-32 shrink-0"><img src="${esc(pi.avatar)}" alt="" class="h-full w-full object-cover"/></div>` : ''}
    </div>
    <div class="h-1 w-full" style="background:${CORAL}"></div>
    <div class="p-8">
      ${sections.map(s => `<div class="mb-6" data-section>
        <h2 class="mb-3 text-xs font-black uppercase tracking-[0.3em]" style="color:${CORAL}">${esc(s.title)}</h2>
        ${buildDesignerSectionContent(s, resume.language || 'en')}
      </div>`).join('')}
    </div>
  </div>`;
}
