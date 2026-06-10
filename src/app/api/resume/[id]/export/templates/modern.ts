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

function buildModernSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;
  if (section.type === 'summary') return `<div class="text-sm leading-relaxed text-zinc-600">${md((c as SummaryContent).text)}</div>`;
  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:#e94560">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold text-zinc-800">${esc(it.position)}</h3><span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.company ? `<p class="text-sm" style="color:#e94560">${esc(it.company)}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:#0f3460">
      <h3 class="text-sm font-semibold text-zinc-800">${esc(it.institution)}</h3>
      <p class="text-sm text-zinc-600">${esc(degreeField(it.degree, it.field))}</p>
      <span class="text-xs text-zinc-400">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span>
      ${it.gpa ? `<p class="mt-0.5 text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'skills') {
    const allSkills = ((c as SkillsContent).categories || []).flatMap((cat: any) => cat.skills || []);
    return `<div class="flex flex-wrap gap-2">${allSkills.map((skill: string) =>
      `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">${esc(skill)}</span>`
    ).join('')}</div>`;
  }
  if (section.type === 'projects') {
    return `<div class="space-y-4">${((c as ProjectsContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:#e94560">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3>${it.startDate ? `<span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    return `<div class="space-y-4">${((c as GitHubContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:#e94560">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3><span class="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-500">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between border-l-2 pl-4" style="border-color:#0f3460"><div><span class="text-sm font-semibold text-zinc-800">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer ? `<span class="text-sm text-zinc-500"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }
  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-2">${((c as LanguagesContent).items || []).map((it: any) =>
      `<span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">${esc(it.language)} <span class="text-zinc-400">— ${esc(it.proficiency)}</span></span>`
    ).join('')}</div>`;
  }
  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:#e94560">
      <div class="flex items-baseline justify-between"><div><h3 class="text-sm font-semibold text-zinc-800">${esc(it.title)}</h3>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="border-l-2 border-zinc-200 pl-4"><span class="text-sm font-medium text-zinc-700">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildModernHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="relative overflow-hidden px-10 py-8 text-white" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)">
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10" style="background:radial-gradient(circle,#e94560 0%,transparent 70%)"></div>
      <div class="absolute -bottom-6 right-20 h-24 w-24 rounded-full" style="opacity:0.08;background:radial-gradient(circle,#e94560 0%,transparent 70%)"></div>
      <div class="relative flex items-center gap-6">
        ${pi.avatar ? `<div class="shrink-0 rounded-full p-[2px]" style="background:linear-gradient(135deg,#e94560,#0f3460)"><img src="${esc(pi.avatar)}" alt="" class="h-[80px] w-[80px] rounded-full border-2 border-white/10 object-cover"/></div>` : ''}
        <div class="min-w-0 flex-1">
          <h1 class="text-3xl font-bold tracking-tight">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1.5 text-base font-light tracking-wide" style="color:#e94560">${esc(pi.jobTitle)}</p>` : ''}
          <div class="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-zinc-300">
            ${contacts.map((c, i) => `<span class="flex items-center gap-1.5">${esc(c)}${i < contacts.length - 1 ? '<span class="text-zinc-500">|</span>' : ''}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 h-[3px] w-full" style="background:linear-gradient(90deg,#e94560 0%,#0f3460 60%,transparent 100%)"></div>
    </div>
    <div class="p-8 pt-6">
      ${sections.map(s => `<div class="mb-6" data-section>
        <h2 class="mb-3 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider" style="color:#e94560">
          <span class="h-[3px] w-7 rounded-full" style="background:linear-gradient(90deg,#e94560,#0f3460)"></span>${esc(s.title)}
        </h2>
        ${buildModernSectionContent(s, resume.language || 'en')}
      </div>`).join('')}
    </div>
  </div>`;
}
