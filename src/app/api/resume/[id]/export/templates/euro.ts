import type {
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  CustomContent,
  GitHubContent,
} from '@/types/resume';
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';

function buildEuroSectionContent(s: Section, lang: string): string {
  const c = s.content as any;
  const BL = '#1e40af';

  if (s.type === 'summary') return `<div class="text-sm leading-relaxed text-zinc-600">${md(c.text)}</div>`;

  if (s.type === 'work_experience') {
    return `<div class="space-y-3">${(c.items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold text-zinc-800">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-zinc-500"> — ${esc(it.company)}</span>` : ''}</div>
        <span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span>
      </div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'education') {
    return `<div class="space-y-3">${(c.items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold text-zinc-800">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-zinc-500"> — ${esc(it.institution)}</span>` : ''}</div>
        <span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span>
      </div>
      ${it.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'skills') {
    return `<div class="space-y-1">${(c.categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${BL}">${esc(cat.name)}:</span><span class="text-zinc-600">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (s.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs text-zinc-400">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between text-sm"><div><span class="font-semibold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer ? `<span class="text-zinc-500"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (s.type === 'languages') {
    return `<div class="space-y-1">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${BL}">${esc(it.language)}:</span><span class="text-zinc-600">${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (s.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-400">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold text-zinc-800">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'qr_codes') return buildQrCodesHtml(s);
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div>
      <span class="text-sm font-medium text-zinc-700">${esc(it.name || it.title || it.language)}</span>
      ${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  return '';
}

export function buildEuroHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const BL = '#1e40af';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 flex items-start gap-6">
      <div class="flex-1">
        <h1 class="text-3xl font-bold" style="color:${BL}">${esc(pi.fullName || 'Your Name')}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-base text-zinc-500">${esc(pi.jobTitle)}</p>` : ''}
        <div class="mt-3 space-y-0.5 text-sm text-zinc-600">
          ${pi.age ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Age</span>${esc(pi.age)}</div>` : ''}
          ${pi.politicalStatus ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Political</span>${esc(pi.politicalStatus)}</div>` : ''}
          ${pi.gender ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Gender</span>${esc(pi.gender)}</div>` : ''}
          ${pi.ethnicity ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Ethnicity</span>${esc(pi.ethnicity)}</div>` : ''}
          ${pi.hometown ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Hometown</span>${esc(pi.hometown)}</div>` : ''}
          ${pi.maritalStatus ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Marital</span>${esc(pi.maritalStatus)}</div>` : ''}
          ${pi.yearsOfExperience ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Experience</span>${esc(pi.yearsOfExperience)}</div>` : ''}
          ${pi.educationLevel ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Education</span>${esc(pi.educationLevel)}</div>` : ''}
          ${pi.email ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Email</span>${esc(pi.email)}</div>` : ''}
          ${pi.phone ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Phone</span>${esc(pi.phone)}</div>` : ''}
          ${pi.wechat ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">WeChat</span>${esc(pi.wechat)}</div>` : ''}
          ${pi.location ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Address</span>${esc(pi.location)}</div>` : ''}
          ${pi.website ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">Website</span>${esc(pi.website)}</div>` : ''}
          ${pi.linkedin ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">LinkedIn</span>${esc(pi.linkedin)}</div>` : ''}
          ${pi.github ? `<div><span class="inline-block w-20 text-xs font-semibold uppercase text-zinc-400">GitHub</span>${esc(pi.github)}</div>` : ''}
        </div>
      </div>
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-28 shrink-0 rounded border-2 object-cover" style="width:5.5rem;border-color:${BL}"/>` : ''}
    </div>
    <div class="h-1 w-full rounded" style="background:${BL}"></div>
    <div class="mt-6">
      ${sections.map(s => `<div class="mb-5 flex gap-4" data-section>
        <div class="w-28 shrink-0 pt-0.5 text-right">
          <h2 class="text-xs font-bold uppercase tracking-wider" style="color:${BL}">${esc(s.title)}</h2>
        </div>
        <div class="flex-1 border-l-2 pl-4" style="border-color:#dbeafe">
          ${buildEuroSectionContent(s, resume.language || 'en')}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}
