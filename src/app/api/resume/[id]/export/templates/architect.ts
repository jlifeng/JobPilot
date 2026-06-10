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
import { buildClassicSectionContent } from './classic';

const PRIMARY = '#1e3a5f';
const ACCENT = '#1d4ed8';
const GRID = '#dbeafe';
const BODY_TEXT = '#374151';
const MUTED = '#6b7280';

function buildArchitectBulletList(items: string[] | undefined, className = 'space-y-0.5'): string {
  if (!items?.length) return '';
  return `<ul class="${className}">${items.filter(Boolean).map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45" style="background-color:${ACCENT}"></span>${md(item)}</li>`).join('')}</ul>`;
}

function buildArchitectSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    const summaryText = (c as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);
    return summaryItems ? `<div class="border-l-2 pl-4" style="border-color:${GRID}">${buildArchitectBulletList(summaryItems)}</div>` : `<div class="border-l-2 pl-4 text-sm leading-relaxed" style="color:${BODY_TEXT};border-color:${GRID}">${md(summaryText)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.position)}</span>${it.company ? `<span class="text-sm" style="color:${ACCENT}"> | ${esc(it.company)}</span>` : ''}${it.location ? `<span class="text-sm" style="color:${MUTED}">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider" style="font-family:JetBrains Mono,Consolas,monospace;color:${MUTED};background-color:${GRID}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${(() => { const responsibilityItems = extractMarkdownBulletItems(it.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="text-xs font-medium" style="color:${MUTED}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildArchitectBulletList(responsibilityItems, 'mt-0.5 space-y-0.5')}</div>`; } return it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''; })()}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="px-1.5 py-0.5 text-[10px] font-medium" style="background-color:${GRID};color:${ACCENT};font-family:JetBrains Mono,Consolas,monospace">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildArchitectBulletList(it.highlights, 'mt-0.5 space-y-0.5')}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm" style="color:${MUTED}"> — ${esc(it.institution)}</span>` : ''}${it.location ? `<span class="text-sm" style="color:${MUTED}">, ${esc(it.location)}</span>` : ''}</div><span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${MUTED}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-xs" style="color:${MUTED}">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? buildArchitectBulletList(it.highlights, 'mt-1 space-y-0.5') : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-2">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-32 shrink-0 font-bold uppercase tracking-wider" style="font-family:JetBrains Mono,Consolas,monospace;color:${PRIMARY};font-size:11px">${esc(cat.name)}:</span><span style="color:${BODY_TEXT}">${esc((cat.skills || []).join(' / '))}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span>${it.startDate ? `<span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${MUTED}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="px-1.5 py-0.5 text-[10px] font-medium" style="background-color:${GRID};color:${ACCENT};font-family:JetBrains Mono,Consolas,monospace">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? buildArchitectBulletList(it.highlights, 'mt-1.5 space-y-0.5') : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline gap-2"><span class="h-1.5 w-1.5 shrink-0 rotate-45" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="text-sm" style="color:${MUTED}">${it.issuer ? ` — ${esc(it.issuer)}` : ''}${it.date ? ` (${esc(it.date)})` : ''}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-baseline gap-2"><span class="h-1.5 w-1.5 shrink-0 rotate-45" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.language)}</span><span class="text-sm" style="color:${MUTED}"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT}">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}${it.repoUrl ? ` <a href="${esc(it.repoUrl)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-xs font-normal text-blue-500">${esc(it.repoUrl)}</a>` : ''}</span><span class="shrink-0 px-1.5 py-0.5 text-[10px] font-medium" style="font-family:JetBrains Mono,Consolas,monospace;color:${MUTED};background-color:${GRID}">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="color:${ACCENT}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="border-l-2 pl-4" style="border-color:${ACCENT}">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm" style="color:${MUTED}"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${MUTED}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45" style="background-color:${ACCENT}"></span><div><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<p class="text-sm" style="color:${BODY_TEXT}">${esc(it.description)}</p>` : ''}</div></div>`).join('')}</div>`;
  }

  return buildClassicSectionContent(section);
}

export function buildArchitectHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif;background-image:linear-gradient(${GRID} 1px,transparent 1px),linear-gradient(90deg,${GRID} 1px,transparent 1px);background-size:40px 40px">
    <div class="mb-6 border-b-2 pb-5" style="border-color:${PRIMARY}">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 object-cover" style="border:2px solid ${PRIMARY}"/>` : ''}
          <div>
            <h1 class="text-2xl font-bold uppercase tracking-wider" style="font-family:JetBrains Mono,Consolas,monospace;color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
            ${pi.jobTitle ? `<p class="mt-1 text-sm font-medium uppercase tracking-widest" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
          </div>
        </div>
        <div class="shrink-0 border-l-2 pl-4 text-right" style="border-color:${ACCENT}">
          <div class="space-y-0.5 text-xs" style="color:${MUTED}">
            ${contacts.map(ct => `<p>${esc(ct)}</p>`).join('')}
            ${pi.linkedin ? `<p>${esc(pi.linkedin)}</p>` : ''}
            ${pi.github ? `<p>${esc(pi.github)}</p>` : ''}
          </div>
        </div>
      </div>
    </div>
    ${sections.map(s => `<div class="mb-6" data-section>
      <div class="mb-3 flex items-center gap-3">
        <div class="h-2.5 w-2.5 rotate-45" style="background-color:${ACCENT}"></div>
        <h2 class="text-sm font-bold uppercase tracking-[0.15em]" style="font-family:JetBrains Mono,Consolas,monospace;color:${PRIMARY}">${esc(s.title)}</h2>
        <div class="h-px flex-1" style="background-color:${PRIMARY};opacity:0.3"></div>
      </div>
      ${buildArchitectSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
