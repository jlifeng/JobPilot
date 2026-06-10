import type {
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  CustomContent,
  GitHubContent,
} from '@/types/resume';
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';

function buildCleanSectionContent(s: Section, lang: string): string {
  const c = s.content as any;
  const TL = '#0d9488';

  if (s.type === 'summary') return `<div class="text-sm leading-relaxed text-zinc-600">${md(c.text)}</div>`;

  if (s.type === 'work_experience') {
    return `<div class="space-y-4">${(c.items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold text-zinc-800">${esc(it.position)}</span>${it.company ? `<span class="text-sm" style="color:${TL}"> | ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm text-zinc-400"> , ${esc(it.location)}</span>` : ''}</div>
        <span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span>
      </div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full border px-2 py-0.5 text-[10px] font-medium" style="border-color:${TL};color:${TL}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'education') {
    return `<div class="space-y-3">${(c.items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold text-zinc-800">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-zinc-500"> — ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-sm text-zinc-400"> , ${esc(it.location)}</span>` : ''}</div>
        <span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span>
      </div>
      ${it.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'skills') {
    return `<div class="flex flex-wrap gap-2">${(c.categories || []).flatMap((cat: any) =>
      (cat.skills || []).map((skill: string) =>
        `<span class="rounded-full border px-3 py-0.5 text-xs font-medium" style="border-color:${TL};color:${TL}">${esc(skill)}</span>`
      )
    ).join('')}</div>`;
  }

  if (s.type === 'projects') {
    const BL = '#0066cc';
    return `<div class="space-y-4">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TL}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full border px-2 py-0.5 text-[10px] font-medium" style="border-color:${TL};color:${TL}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'certifications') {
    const BL = '#0066cc';
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between text-sm"><div><span class="font-semibold" style="color:${BL}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer ? `<span class="text-zinc-600"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (s.type === 'languages') {
    const BL = '#0066cc';
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${((c as LanguagesContent).items || []).map((it: any) =>
      `<span class="text-sm"><span class="font-semibold" style="color:${BL}">${esc(it.language)}</span><span class="text-zinc-500"> — ${esc(it.proficiency)}</span></span>`
    ).join('')}</div>`;
  }

  if (s.type === 'custom') {
    const BL = '#0066cc';
    return `<div class="space-y-2">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${BL}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${TL}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-xs text-zinc-500">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
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

export function buildCleanHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts: string[] = [];
  if (pi.age) contacts.push(pi.age);
  if (pi.politicalStatus) contacts.push(pi.politicalStatus);
  if (pi.gender) contacts.push(pi.gender);
  if (pi.ethnicity) contacts.push(pi.ethnicity);
  if (pi.hometown) contacts.push(pi.hometown);
  if (pi.maritalStatus) contacts.push(pi.maritalStatus);
  if (pi.yearsOfExperience) contacts.push(pi.yearsOfExperience);
  if (pi.educationLevel) contacts.push(pi.educationLevel);
  if (pi.email) contacts.push(pi.email);
  if (pi.phone) contacts.push(pi.phone);
  if (pi.wechat) contacts.push(pi.wechat);
  if (pi.location) contacts.push(pi.location);
  if (pi.website) contacts.push(pi.website);
  const BL = '#0066cc';
  const TL = '#0d9488';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6">
      <div class="flex items-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded-full border-2 object-cover" style="border-color:${BL}"/>` : ''}
        <div>
          <h1 class="text-2xl font-bold" style="color:${BL}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-0.5 text-base" style="color:${TL}">${esc(pi.jobTitle)}</p>` : ''}
        </div>
      </div>
      ${contacts.length || pi.linkedin || pi.github ? `<div class="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">${contacts.map(c => `<span>${esc(c)}</span>`).join('')}${pi.linkedin ? `<span>LinkedIn: ${esc(pi.linkedin)}</span>` : ''}${pi.github ? `<span>GitHub: ${esc(pi.github)}</span>` : ''}</div>` : ''}
      <div class="mt-3 h-0.5 w-full rounded" style="background:linear-gradient(90deg,${BL},${TL})"></div>
    </div>
    ${sections.map(s => `<div class="mb-5" data-section>
      <h2 class="mb-2 text-sm font-bold uppercase tracking-wider" style="color:${BL}">${esc(s.title)}</h2>
      ${buildCleanSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
