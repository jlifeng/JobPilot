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
import { buildClassicSectionContent } from './classic';

const PRIMARY = '#1a472a';
const ACCENT = '#15803d';
const BORDER = '#166534';
const BODY_TEXT = '#374151';
const MUTED = '#6b7280';

function buildLegalSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-sm italic leading-relaxed" style="color:${BODY_TEXT}">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.position)}</span>${it.company ? `<span class="text-sm" style="color:${ACCENT}">, ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm" style="color:${MUTED}"> (${esc(it.location)})</span>` : ''}</div><span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium mb-0.5" style="color:${MUTED}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-5 space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="text-sm" style="color:${BODY_TEXT}">${md(h)}</li>`).join('')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm" style="color:${MUTED}">, ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-sm" style="color:${MUTED}"> (${esc(it.location)})</span>` : ''}</div><span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-xs" style="color:${MUTED}">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5 space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="text-sm" style="color:${BODY_TEXT}">${esc(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1.5">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="text-sm"><span class="font-bold" style="color:${PRIMARY}">${esc(cat.name)}: </span><span style="color:${BODY_TEXT}">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.startDate ? `<span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-0.5 text-xs italic" style="color:${MUTED}">${lang === 'zh' ? '技术栈' : 'Technologies'}: ${esc(it.technologies.join(', '))}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-5 space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="text-sm" style="color:${BODY_TEXT}">${md(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="text-sm"><span class="font-bold" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span style="color:${MUTED}">${it.issuer ? ` — ${esc(it.issuer)}` : ''}${it.date ? `, ${esc(it.date)}` : ''}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="text-sm"><span class="font-bold" style="color:${PRIMARY}">${esc(it.language)}</span><span style="color:${MUTED}"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="shrink-0 text-xs italic" style="color:${MUTED}">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="color:${ACCENT}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm" style="color:${MUTED}">, ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs italic" style="color:${MUTED}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<p class="text-sm" style="color:${BODY_TEXT}">${esc(it.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return buildClassicSectionContent(section);
}

export function buildLegalHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Georgia,Times New Roman,serif">
    <div class="mb-6 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-16 w-16 rounded-full object-cover" style="border:2px solid ${PRIMARY}"/>` : ''}
      <h1 class="text-2xl font-bold tracking-wide" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-1 text-sm italic" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
      ${contacts.length || pi.linkedin || pi.github ? `<div class="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs" style="color:${MUTED}">${contacts.map(ct => `<span>${esc(ct)}</span>`).join('')}${pi.linkedin ? `<span>LinkedIn: ${esc(pi.linkedin)}</span>` : ''}${pi.github ? `<span>GitHub: ${esc(pi.github)}</span>` : ''}</div>` : ''}
    </div>
    <div class="mb-6"><div class="h-px w-full" style="background-color:${BORDER}"></div><div class="mt-0.5 h-px w-full" style="background-color:${BORDER}"></div></div>
    ${sections.map(s => `<div class="mb-6" data-section>
      <h2 class="mb-1 text-sm font-bold uppercase tracking-wider" style="color:${PRIMARY}">${esc(s.title)}</h2>
      <div class="mb-3"><div class="h-px w-full" style="background-color:${BORDER};opacity:0.5"></div><div class="mt-0.5 h-px w-full" style="background-color:${BORDER};opacity:0.5"></div></div>
      ${buildLegalSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
