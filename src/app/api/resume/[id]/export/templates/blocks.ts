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

const PRIMARY = '#37352f';
const ACCENT = '#2383e2';
const SUBTLE_BG = '#f7f6f3';

function buildBlocksSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') return `<div class="rounded-md p-3" style="background-color:${SUBTLE_BG}"><div class="text-sm leading-relaxed" style="color:${PRIMARY}">${md((c as SummaryContent).text)}</div></div>`;

  if (section.type === 'work_experience') {
    return `<div class="space-y-3">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-md border p-3" style="border-color:#e3e2de">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.position)}</h3><span class="shrink-0 text-xs" style="color:#9b9a97">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.company ? `<p class="text-sm" style="color:${ACCENT}">${esc(it.company)}${it.location ? ` , ${esc(it.location)}` : ''}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:#787774"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-sm px-1.5 py-0.5 text-[10px]" style="background-color:${SUBTLE_BG};color:#787774">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium mb-0.5" style="color:#9b9a97">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm" style="color:#787774')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-md border p-3" style="border-color:#e3e2de">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.institution)}</h3><span class="text-xs" style="color:#9b9a97">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      <p class="text-sm" style="color:#787774">${esc(degreeField(it.degree, it.field))}${it.location ? ` , ${esc(it.location)}` : ''}</p>
      ${it.gpa ? `<p class="text-xs" style="color:#9b9a97">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm" style="color:#787774')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="overflow-hidden rounded-md border" style="border-color:#e3e2de"><table class="w-full text-sm"><tbody>${((c as SkillsContent).categories || []).map((cat: any) =>
      `<tr style="border-bottom:1px solid #e3e2de"><td class="w-28 shrink-0 px-3 py-2 font-medium" style="color:${PRIMARY};background-color:${SUBTLE_BG}">${esc(cat.name)}</td><td class="px-3 py-2"><div class="flex flex-wrap gap-1">${(cat.skills || []).map((skill: string) =>
        `<span class="rounded-sm px-2 py-0.5 text-xs" style="background-color:${ACCENT}12;color:${ACCENT}">${esc(skill)}</span>`
      ).join('')}</div></td></tr>`
    ).join('')}</tbody></table></div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-md border p-3" style="border-color:#e3e2de">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold" style="color:${ACCENT}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</h3>${it.startDate ? `<span class="text-xs" style="color:#9b9a97">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:#787774">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1.5 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-sm px-1.5 py-0.5 text-[10px]" style="background-color:${SUBTLE_BG};color:#787774">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm" style="color:#787774')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-md border p-3" style="border-color:#e3e2de">
      <div class="flex items-baseline justify-between"><span class="text-sm font-semibold" style="color:${ACCENT}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-xs" style="color:#9b9a97">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="color:#9b9a97">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:#787774">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (c as CertificationsContent).items || [];
    return `<div class="overflow-hidden rounded-md border" style="border-color:#e3e2de">${items.map((it: any, idx: number) =>
      `<div class="flex items-baseline justify-between px-3 py-2" style="${idx < items.length - 1 ? 'border-bottom:1px solid #e3e2de' : ''}"><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.issuer || it.date ? `<span class="text-xs" style="color:#9b9a97">${it.issuer ? esc(it.issuer) : ''}${it.issuer && it.date ? ' | ' : ''}${it.date ? esc(it.date) : ''}</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="overflow-hidden rounded-md border" style="border-color:#e3e2de"><table class="w-full text-sm"><tbody>${((c as LanguagesContent).items || []).map((it: any) =>
      `<tr style="border-bottom:1px solid #e3e2de"><td class="px-3 py-2 font-medium" style="color:${PRIMARY}">${esc(it.language)}</td><td class="px-3 py-2 text-right" style="color:#9b9a97">${esc(it.proficiency)}</td></tr>`
    ).join('')}</tbody></table></div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="rounded-md border p-3" style="border-color:#e3e2de">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.title)}</h3>${it.date ? `<span class="text-xs" style="color:#9b9a97">${esc(it.date)}</span>` : ''}</div>
      ${it.subtitle ? `<p class="text-sm" style="color:#9b9a97">${esc(it.subtitle)}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:#787774">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="rounded-md border px-3 py-2" style="border-color:#e3e2de"><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<p class="text-sm" style="color:#787774">${esc(it.description)}</p>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildBlocksHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website, pi.linkedin && `LinkedIn: ${pi.linkedin}`, pi.github && `GitHub: ${pi.github}`].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6">
      <div class="flex items-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-14 w-14 shrink-0 rounded-md object-cover"/>` : ''}
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-0.5 text-sm" style="color:#787774">${esc(pi.jobTitle)}</p>` : ''}
        </div>
      </div>
      ${contacts.length ? `<div class="mt-3 flex flex-wrap gap-2 text-xs" style="color:#787774">${contacts.map(c => `<span class="rounded-sm px-2 py-0.5" style="background-color:${SUBTLE_BG}">${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="mt-4 h-px w-full" style="background-color:#e3e2de"></div>
    </div>
    ${sections.map(s => `<div class="mb-5" data-section>
      <div class="mb-2 flex items-center gap-2">
        <span class="text-sm" style="color:#9b9a97">&#9654;</span>
        <h2 class="text-sm font-semibold" style="color:${PRIMARY}">${esc(s.title)}</h2>
      </div>
      <div class="ml-5">
        ${buildBlocksSectionContent(s, resume.language || 'en')}
      </div>
    </div>`).join('')}
  </div>`;
}
