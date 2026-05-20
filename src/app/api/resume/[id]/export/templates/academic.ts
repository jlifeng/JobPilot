import type {
  SummaryContent,
  WorkExperienceContent,
  EducationContent,
  SkillsContent,
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  GitHubContent,
  CustomContent,
} from '@/types/resume';
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';
import { buildContactEntries } from '@/lib/template-renderer/contact-info';

function buildAcademicSectionContent(section: Section, lang: string): string {
  const c = section.content as any;
  if (section.type === 'summary') return `<div class="text-sm leading-relaxed text-zinc-600">${md((c as SummaryContent).text)}</div>`;
  if (section.type === 'work_experience') {
    return `<div class="space-y-2.5">${((c as WorkExperienceContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-zinc-600">, ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm text-zinc-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-500">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="text-xs text-zinc-500 italic">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-0.5"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    return `<div class="space-y-2.5">${((c as EducationContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(degreeField(it.degree, it.field))}</span></div><span class="shrink-0 text-xs text-zinc-500">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      <p class="text-sm text-zinc-600">${esc(it.institution)}${it.location ? `, ${esc(it.location)}` : ''}</p>
      ${it.gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-0.5 list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'skills') {
    return `<div class="space-y-0.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<p class="text-sm text-zinc-600"><span class="font-bold text-zinc-700">${esc(cat.name)}: </span>${esc((cat.skills || []).join(', '))}</p>`
    ).join('')}</div>`;
  }
  if (section.type === 'projects') {
    return `<div class="space-y-2.5">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(it.name)}</span>${it.url ? `<span class="text-xs text-zinc-400 ml-1">[${esc(it.url)}]</span>` : ''}</div>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-500">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="text-xs text-zinc-500 italic">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-0.5 list-disc pl-5">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    return `<div class="space-y-1">${((c as CertificationsContent).items || []).map((it: any) =>
      `<p class="text-sm text-zinc-600"><span class="font-bold text-zinc-700">${esc(it.name)}</span>${it.issuer ? `<span>, ${esc(it.issuer)}</span>` : ''}${it.date ? `<span class="text-zinc-500"> (${esc(it.date)})</span>` : ''}</p>`
    ).join('')}</div>`;
  }
  if (section.type === 'languages') {
    return `<p class="text-sm text-zinc-600">${((c as LanguagesContent).items || []).map((it: any, i: number, arr: any[]) =>
      `<span class="font-bold text-zinc-700">${esc(it.language)}</span> (${esc(it.proficiency)})${i < arr.length - 1 ? '; ' : ''}`
    ).join('')}</p>`;
  }
  if (section.type === 'github') {
    return `<div class="space-y-2.5">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-zinc-800">${esc(it.name)}</span><span class="text-xs text-zinc-500">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500 italic">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'custom') {
    return `<div class="space-y-2">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold text-zinc-800">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-600">, ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-500">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-1">${c.items.map((it: any) => `<div><span class="text-sm font-bold text-zinc-700">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildAcademicHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const lang = resume.language || 'en';
  const { row1, row2 } = buildContactEntries(pi);
  const iconColor = '#71717a';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#52525b">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:6px;font-size:12px">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:12px">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:'Computer Modern','CMU Serif',Georgia,'Times New Roman',serif">
    <div class="mb-6">
      <div class="${pi.avatar ? 'flex items-center gap-4' : 'text-center'}">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-full object-cover"/>` : ''}
        <div>
          <h1 class="text-2xl font-bold text-zinc-900" style="letter-spacing:0.02em">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-0.5 text-base text-zinc-500 italic">${esc(pi.jobTitle)}</p>` : ''}
          ${contactHtml}
        </div>
      </div>
      <div class="mt-3 border-b-2 border-zinc-800"></div>
    </div>
    ${sections.map(s => `<div class="mb-4" data-section>
      <h2 class="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-zinc-800" style="border-bottom:1px solid #d4d4d8;padding-bottom:2px">${esc(s.title)}</h2>
      ${buildAcademicSectionContent(s, lang)}
    </div>`).join('')}
  </div>`;
}
