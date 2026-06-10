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

const RED = '#dc2626';
const TEXT = '#18181b';

function buildSwissSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') return `<div class="text-sm leading-relaxed" style="color:#3f3f46">${md((c as SummaryContent).text)}</div>`;

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="grid grid-cols-[140px_1fr] gap-4">
      <div class="text-xs" style="color:#71717a"><span>${esc(it.startDate)} &ndash; ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      <div>
        <h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.position)}</h3>
        ${it.company ? `<p class="text-sm" style="color:${RED}">${esc(it.company)}</p>` : ''}
        ${it.description ? `<div class="mt-1 text-sm" style="color:#3f3f46"><span class="font-medium" style="color:#18181b">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
        ${it.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:#71717a">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
        ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium mb-0.5" style="color:#71717a">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-none space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:#3f3f46"><span class="mt-1.5 inline-block h-1 w-1 shrink-0" style="background-color:${RED}"></span>${md(h)}</li>`).join('')}</ul></div>` : ''}
      </div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="grid grid-cols-[140px_1fr] gap-4">
      <span class="text-xs" style="color:#71717a">${esc(it.startDate)} &ndash; ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span>
      <div>
        <h3 class="text-sm font-bold" style="color:${TEXT}">${esc(degreeField(it.degree, it.field))}</h3>
        ${it.institution ? `<p class="text-sm" style="color:${RED}">${esc(it.institution)}</p>` : ''}
        ${it.gpa ? `<p class="text-xs" style="color:#71717a">GPA: ${esc(it.gpa)}</p>` : ''}
        ${it.highlights?.length ? `<ul class="mt-1 list-none space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:#3f3f46"><span class="mt-1.5 inline-block h-1 w-1 shrink-0" style="background-color:${RED}"></span>${md(h)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="grid grid-cols-[140px_1fr] gap-4 text-sm"><span class="font-bold" style="color:${TEXT}">${esc(cat.name)}</span><span style="color:#3f3f46">${esc((cat.skills || []).join(' / '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="grid grid-cols-[140px_1fr] gap-4">
      ${it.startDate ? `<span class="text-xs" style="color:#71717a">${esc(it.startDate)} \u2013 ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : '<span></span>'}
      <div>
        <h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3>
        ${it.description ? `<div class="mt-0.5 text-sm" style="color:#3f3f46">${md(it.description)}</div>` : ''}
        ${it.technologies?.length ? `<p class="mt-0.5 text-xs" style="color:#71717a">${lang === 'zh' ? '技术栈' : 'Tech'}: ${esc(it.technologies.join(', '))}</p>` : ''}
        ${it.highlights?.length ? `<ul class="mt-1 list-none space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:#3f3f46"><span class="mt-1.5 inline-block h-1 w-1 shrink-0" style="background-color:${RED}"></span>${md(h)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="grid grid-cols-[140px_1fr] gap-4"><span class="text-xs" style="color:#71717a">${it.date ? esc(it.date) : '&nbsp;'}</span><div><span class="text-sm font-bold" style="color:${TEXT}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer ? `<span class="text-sm" style="color:#3f3f46"> &mdash; ${esc(it.issuer)}</span>` : ''}</div></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-x-6 gap-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="text-sm"><span class="font-bold" style="color:${TEXT}">${esc(it.language)}</span><span style="color:#71717a"> &mdash; ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="grid grid-cols-[140px_1fr] gap-4">
      <span class="text-xs" style="color:#71717a">&#11088; ${it.stars?.toLocaleString() ?? 0}</span>
      <div>
        <h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3>
        ${it.language ? `<span class="text-xs" style="color:${RED}">${esc(it.language)}</span>` : ''}
        ${it.description ? `<div class="mt-0.5 text-sm" style="color:#3f3f46">${md(it.description)}</div>` : ''}
      </div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="grid grid-cols-[140px_1fr] gap-4">
      ${it.date ? `<span class="text-xs" style="color:#71717a">${esc(it.date)}</span>` : '<span></span>'}
      <div>
        <h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.title)}</h3>
        ${it.subtitle ? `<p class="text-sm" style="color:${RED}">${esc(it.subtitle)}</p>` : ''}
        ${it.description ? `<div class="mt-0.5 text-sm" style="color:#3f3f46">${md(it.description)}</div>` : ''}
      </div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div><span class="text-sm font-bold" style="color:${TEXT}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm" style="color:#3f3f46">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildSwissHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif">
    <div class="mb-8">
      <div class="flex items-start gap-6">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 object-cover"/>` : ''}
        <div class="flex-1">
          <h1 class="text-3xl font-bold uppercase tracking-tight" style="color:${TEXT}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-light uppercase tracking-[0.15em]" style="color:#71717a">${esc(pi.jobTitle)}</p>` : ''}
        </div>
      </div>
      ${contacts.length ? `<div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-black pt-3 text-xs" style="color:${TEXT}">${contacts.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    </div>
    ${sections.map(s => `<div class="mb-6" data-section>
      <div class="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-2">
        <span class="inline-block h-2.5 w-2.5 shrink-0" style="background-color:${RED}"></span>
        <h2 class="text-xs font-bold uppercase tracking-[0.2em]" style="color:${TEXT}">${esc(s.title)}</h2>
      </div>
      ${buildSwissSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
