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
import { esc, md, degreeField, extractMarkdownBulletItems, getPersonalInfo, visibleSections, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';

const BLUE = '#2563eb';
const YELLOW = '#eab308';
const RED_B = '#dc2626';
const TEXT = '#18181b';

function buildBerlinBulletList(items: string[] | undefined, className = 'space-y-0.5'): string {
  if (!items?.length) return '';
  return `<ul class="${className}">${items.filter(Boolean).map((item: string) => `<li class="flex items-start gap-2 text-sm text-zinc-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0" style="background-color:${RED_B}"></span>${md(item)}</li>`).join('')}</ul>`;
}

function buildBerlinSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    const summaryItems = extractMarkdownBulletItems((c as SummaryContent).text);
    return `<div class="border-l-4 pl-4" style="border-color:${BLUE}">${summaryItems?.length ? buildBerlinBulletList(summaryItems) : `<div class="text-sm leading-relaxed text-zinc-600">${md((c as SummaryContent).text)}</div>`}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${YELLOW}">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.position)}</h3><span class="shrink-0 text-xs font-bold" style="color:${BLUE}">${esc(it.startDate)} &ndash; ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.company ? `<p class="text-sm font-semibold" style="color:${BLUE}">${esc(it.company)}${it.location ? `, ${esc(it.location)}` : ''}</p>` : ''}
      ${(() => { const responsibilityItems = extractMarkdownBulletItems(it.description); if (responsibilityItems?.length) { return `<div class="mt-1.5"><p class="text-xs font-medium text-zinc-500">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildBerlinBulletList(responsibilityItems, 'mt-0.5 space-y-0.5')}</div>`; } return it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''; })()}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="px-2 py-0.5 text-[10px] font-bold text-white" style="background-color:${BLUE}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium text-zinc-500">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildBerlinBulletList(it.highlights, 'mt-0.5 space-y-0.5')}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${BLUE}">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${TEXT}">${esc(degreeField(it.degree, it.field))}</h3><span class="shrink-0 text-xs" style="color:${BLUE}">${esc(it.startDate)} &ndash; ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.institution ? `<p class="text-sm font-semibold" style="color:${YELLOW}">${esc(it.institution)}${it.location ? `, ${esc(it.location)}` : ''}</p>` : ''}
      ${it.gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? buildBerlinBulletList(it.highlights, 'mt-1 space-y-0.5') : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-3">${((c as SkillsContent).categories || []).map((cat: any) => `<div>
      <p class="mb-1 text-xs font-bold uppercase tracking-wider" style="color:${BLUE}">${esc(cat.name)}</p>
      <div class="flex flex-wrap gap-1.5">${(cat.skills || []).map((skill: string) =>
        `<span class="border px-2.5 py-0.5 text-xs font-medium" style="border-color:${BLUE};color:${TEXT}">${esc(skill)}</span>`
      ).join('')}</div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${YELLOW}">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${BLUE}">${esc(it.name)}</h3>${it.startDate ? `<span class="shrink-0 text-xs" style="color:${BLUE}">${esc(it.startDate)} \u2013 ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="px-2 py-0.5 text-[10px] font-bold text-white" style="background-color:${BLUE}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? buildBerlinBulletList(it.highlights, 'mt-1.5 space-y-0.5') : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${TEXT}">${esc(it.name)}</span>${it.issuer ? `<span class="text-sm text-zinc-500"> &mdash; ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs font-bold" style="color:${BLUE}">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-2">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-center gap-2 border px-3 py-1" style="border-color:${BLUE}"><span class="h-2 w-2 rounded-full" style="background-color:${YELLOW}"></span><span class="text-sm font-medium" style="color:${TEXT}">${esc(it.language)}</span><span class="text-xs text-zinc-400">${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${YELLOW}">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${BLUE}">${esc(it.name)}</h3><span class="shrink-0 text-xs font-bold" style="color:${BLUE}">&#11088; ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs font-medium" style="color:${TEXT}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${BLUE}">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${TEXT}">${esc(it.title)}</h3>${it.date ? `<span class="shrink-0 text-xs" style="color:${BLUE}">${esc(it.date)}</span>` : ''}</div>
      ${it.subtitle ? `<p class="text-sm font-semibold" style="color:${YELLOW}">${esc(it.subtitle)}</p>` : ''}
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="border-l-4 pl-4" style="border-color:${BLUE}"><span class="text-sm font-bold" style="color:${TEXT}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildBerlinHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="relative px-10 py-8 text-white" style="background-color:#000000">
      <div class="absolute right-8 top-4 h-20 w-20 rounded-full border-4" style="border-color:${YELLOW};opacity:0.6"></div>
      <div class="absolute right-24 bottom-3 h-8 w-8" style="background-color:${RED_B};opacity:0.7"></div>
      <div class="absolute right-6 bottom-6 h-12 w-3" style="background-color:${BLUE};opacity:0.7"></div>
      <div class="relative flex items-center gap-6">
        ${pi.avatar ? `<div class="shrink-0 border-4 p-0.5" style="border-color:${YELLOW}"><img src="${esc(pi.avatar)}" alt="" class="h-20 w-20 object-cover"/></div>` : ''}
        <div>
          <h1 class="text-3xl font-extrabold uppercase tracking-tight">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-light tracking-wider" style="color:${YELLOW}">${esc(pi.jobTitle)}</p>` : ''}
          ${contacts.length ? `<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">${contacts.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="p-8 pt-6">
      ${sections.map(s => `<div class="mb-6" data-section>
        <div class="mb-3 flex items-center gap-2">
          <div class="h-5 w-5 rounded-full" style="background-color:${BLUE}"></div>
          <h2 class="text-sm font-extrabold uppercase tracking-wider" style="color:${TEXT}">${esc(s.title)}</h2>
          <div class="ml-auto h-1 w-12" style="background-color:${YELLOW}"></div>
        </div>
        ${buildBerlinSectionContent(s, resume.language || 'en')}
      </div>`).join('')}
    </div>
  </div>`;
}
