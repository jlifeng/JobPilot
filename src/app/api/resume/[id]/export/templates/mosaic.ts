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

const PRIMARY = '#1e293b';
const TILE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const TILE_BGS = ['#eff6ff', '#ecfdf5', '#fffbeb', '#f5f3ff'];

function getTileColor(idx: number): string {
  return TILE_COLORS[idx % TILE_COLORS.length];
}

function getTileBg(idx: number): string {
  return TILE_BGS[idx % TILE_BGS.length];
}

function buildMosaicSectionContent(section: Section, color: string, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-sm leading-relaxed text-zinc-600">${md((c as SummaryContent).text)}</div>`;
  }
  if (section.type === 'work_experience') {
    return `<div class="space-y-3">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm">
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.position)}</span>${it.company ? `<span class="text-sm" style="color:${color}"> | ${esc(it.company)}</span>` : ''}</div><span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm">
      <div class="flex items-baseline justify-between"><span class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.institution)}</span><span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      <p class="text-sm text-zinc-600">${esc(degreeField(it.degree, it.field))}</p>
      ${it.gpa ? `<p class="text-xs text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'skills') {
    return `<div class="space-y-2">${((c as SkillsContent).categories || []).map((cat: any) => `<div>
      <p class="mb-1 text-xs font-semibold text-zinc-500">${esc(cat.name)}</p>
      <div class="flex flex-wrap gap-1.5">${(cat.skills || []).map((s: string) => `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style="background-color:${color}">${esc(s)}</span>`).join('')}</div>
    </div>`).join('')}</div>`;
  }
  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm">
      <div class="flex items-baseline justify-between"><span class="text-sm font-semibold" style="color:${color}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm">
      <div class="flex items-baseline justify-between"><span class="text-sm font-semibold" style="color:${color}">${esc(it.name)}</span><span class="shrink-0 text-xs text-zinc-400">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs text-zinc-400">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.name)}</span>${it.issuer ? `<span class="text-sm text-zinc-600"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }
  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-2">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm"><span class="h-2 w-2 rounded-full" style="background-color:${color}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.language)}</span><span class="text-xs text-zinc-400">${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }
  if (section.type === 'custom') {
    return `<div class="space-y-2">${((c as CustomContent).items || []).map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm">
      <div class="flex items-baseline justify-between"><span class="text-sm font-semibold" style="color:${PRIMARY}">${esc(it.title)}</span>${it.date ? `<span class="text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.subtitle ? `<p class="text-sm text-zinc-500">${esc(it.subtitle)}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }
  if (section.type === 'qr_codes') return buildQrCodesHtml(section);
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="rounded-md bg-white p-3 shadow-sm"><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }
  return '';
}

export function buildMosaicHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const lang = resume.language || 'en';
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website, pi.linkedin && `LinkedIn: ${pi.linkedin}`, pi.github && `GitHub: ${pi.github}`].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 rounded-lg p-5" style="background:linear-gradient(135deg,${TILE_COLORS[0]}15,${TILE_COLORS[3]}15)">
      <div class="flex items-center gap-4">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-18 w-18 shrink-0 rounded-lg object-cover" style="border:3px solid ${TILE_COLORS[0]}"/>` : ''}
        <div>
          <h1 class="text-2xl font-bold" style="color:${PRIMARY}">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-medium" style="color:${TILE_COLORS[3]}">${esc(pi.jobTitle)}</p>` : ''}
          ${contacts.length ? `<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">${contacts.map((ct, i) => `<span class="rounded-full px-2 py-0.5" style="background-color:${getTileBg(i)};color:${getTileColor(i)}">${esc(ct)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    </div>
    ${sections.map((s, idx) => {
      const color = getTileColor(idx);
      const bg = getTileBg(idx);
      return `<div class="mb-4" data-section>
        <div class="rounded-lg p-4" style="background-color:${bg}">
          <div class="mb-2 flex items-center gap-2"><div class="h-5 w-5 rounded" style="background-color:${color};opacity:0.2"></div><h2 class="text-sm font-bold uppercase tracking-wider" style="color:${color}">${esc(s.title)}</h2></div>
          ${buildMosaicSectionContent(s, color, lang)}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
