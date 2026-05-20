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

function buildCompactRightContent(section: Section, lang: string): string {
  const c = section.content as any;
  if (section.type === 'summary') return `<div class="text-xs leading-relaxed text-zinc-600">${md((c as SummaryContent).text)}</div>`;
  if (section.type === 'work_experience') {
    return `<div class="space-y-2.5">${((c as WorkExperienceContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold text-zinc-800">${esc(it.position)}</span>${it.company ? `<span class="text-xs text-zinc-500"> | ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-xs text-zinc-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-[10px] text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-0.5 text-xs text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-[10px] text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-0.5"><p class="text-[10px] font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-3.5">${buildHighlights(it.highlights, 'text-xs text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    return `<div class="space-y-2">${((c as EducationContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-xs font-bold text-zinc-800">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-xs text-zinc-500"> — ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-xs text-zinc-400">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-[10px] text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-[10px] text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-0.5 list-disc pl-3.5">${buildHighlights(it.highlights, 'text-xs text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    return `<div class="space-y-2">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-xs font-bold text-zinc-800">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-[10px] text-zinc-400">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-xs text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-[10px] text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-0.5 list-disc pl-3.5">${buildHighlights(it.highlights, 'text-xs text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    return `<div class="space-y-2">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-xs font-bold text-zinc-800">${esc(it.name)}</span><span class="text-[10px] text-zinc-400">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-[10px] text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-0.5 text-xs text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-1.5">${c.items.map((it: any) => `<div>
      <span class="text-xs font-medium text-zinc-700">${esc(it.name || it.title || it.language)}</span>
      ${it.description ? `<div class="text-xs text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  return '';
}

function buildCompactLeftContent(section: Section): string {
  const c = section.content as any;
  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div><p class="text-[10px] font-semibold text-zinc-600">${esc(cat.name)}</p><p class="text-[10px] text-zinc-500">${esc((cat.skills || []).join(', '))}</p></div>`
    ).join('')}</div>`;
  }
  if (section.type === 'languages') {
    return `<div class="space-y-0.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-center justify-between text-[10px]"><span class="font-medium text-zinc-700">${esc(it.language)}</span><span class="text-zinc-400">${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    return `<div class="space-y-1">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div><p class="text-[10px] font-semibold text-zinc-700">${esc(it.name)}</p>${it.issuer || it.date ? `<p class="text-[9px] text-zinc-400">${it.issuer ? esc(it.issuer) : ''}${it.date ? ` (${esc(it.date)})` : ''}</p>` : ''}</div>`
    ).join('')}</div>`;
  }
  if (section.type === 'custom') {
    return `<div class="space-y-1.5">${((c as CustomContent).items || []).map((it: any) => `<div>
      <p class="text-[10px] font-semibold text-zinc-700">${esc(it.title)}</p>
      ${it.subtitle ? `<p class="text-[9px] text-zinc-500">${esc(it.subtitle)}</p>` : ''}
      ${it.date ? `<p class="text-[9px] text-zinc-400">${esc(it.date)}</p>` : ''}
      ${it.description ? `<div class="text-[9px] text-zinc-400">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-1">${c.items.map((it: any) => `<div>
      <span class="text-[10px] font-medium text-zinc-700">${esc(it.name || it.title || it.language)}</span>
      ${it.description ? `<div class="text-[9px] text-zinc-400">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  return '';
}

export function buildCompactHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const LEFT_TYPES = new Set(['skills', 'languages', 'certifications', 'custom']);
  const sections = visibleSections(resume);
  const leftSections = sections.filter(s => LEFT_TYPES.has(s.type));
  const rightSections = sections.filter(s => !LEFT_TYPES.has(s.type));

  const contactParts: string[] = [];
  if (pi.jobTitle) contactParts.push(`<span class="font-medium text-zinc-700">${esc(pi.jobTitle)}</span>`);
  if (pi.age) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.age)}</span>`); }
  if (pi.politicalStatus) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.politicalStatus)}</span>`); }
  if (pi.gender) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.gender)}</span>`); }
  if (pi.ethnicity) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.ethnicity)}</span>`); }
  if (pi.hometown) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.hometown)}</span>`); }
  if (pi.maritalStatus) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.maritalStatus)}</span>`); }
  if (pi.yearsOfExperience) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.yearsOfExperience)}</span>`); }
  if (pi.educationLevel) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.educationLevel)}</span>`); }
  if (pi.email) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.email)}</span>`); }
  if (pi.phone) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.phone)}</span>`); }
  if (pi.wechat) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.wechat)}</span>`); }
  if (pi.location) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.location)}</span>`); }
  if (pi.website) { contactParts.push(`<span class="text-zinc-300">|</span>`); contactParts.push(`<span>${esc(pi.website)}</span>`); }

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="border-b border-zinc-200 px-6 py-4">
      <div class="flex items-center gap-3">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-12 w-12 shrink-0 rounded-full object-cover"/>` : ''}
        <div class="flex-1">
          <h1 class="text-xl font-bold text-zinc-900">${esc(pi.fullName || 'Your Name')}</h1>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">${contactParts.join('')}</div>
        </div>
      </div>
    </div>
    <div class="flex">
      <div class="w-[32%] shrink-0 border-r border-zinc-100 bg-zinc-50 p-4">
        ${leftSections.map(s => `<div class="mb-4" data-section>
          <h2 class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">${esc(s.title)}</h2>
          ${buildCompactLeftContent(s)}
        </div>`).join('')}
      </div>
      <div class="flex-1 p-4">
        ${rightSections.map(s => `<div class="mb-4" data-section>
          <h2 class="mb-1.5 border-b border-zinc-200 pb-0.5 text-xs font-bold uppercase tracking-wider text-zinc-700">${esc(s.title)}</h2>
          ${buildCompactRightContent(s, resume.language || 'en')}
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}
