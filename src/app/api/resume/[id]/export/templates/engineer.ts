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

const PRIMARY = '#1e293b';
const ACCENT = '#0284c7';
const SECONDARY = '#64748b';
const BODY_TEXT = '#334155';
const RULE_COLOR = '#cbd5e1';
const LIGHT_BG = '#f1f5f9';

function buildEngineerSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="border-l-2 pl-4 text-sm leading-relaxed" style="color:${BODY_TEXT};border-color:${ACCENT}">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.position)}</span>${it.company ? `<span class="text-sm font-medium" style="color:${ACCENT}"> | ${esc(it.company)}</span>` : ''}</div><span class="shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase" style="font-family:JetBrains Mono,Consolas,monospace;color:${SECONDARY};background-color:${LIGHT_BG}">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}"><span class="font-medium" style="color:${PRIMARY}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="border px-2 py-0.5 text-[10px] font-medium" style="font-family:JetBrains Mono,Consolas,monospace;border-color:${ACCENT};color:${ACCENT}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span>${md(h)}</li>`).join('')}</ul></div>` : ''}
      <div class="mt-2 h-px" style="background-color:${RULE_COLOR}"></div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm" style="color:${SECONDARY}"> — ${esc(it.institution)}</span>` : ''}</div><span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${SECONDARY}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      ${it.gpa ? `<p class="text-xs" style="color:${SECONDARY}">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span>${esc(h)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-2">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<div><span class="text-xs font-bold uppercase tracking-wider" style="font-family:JetBrains Mono,Consolas,monospace;color:${PRIMARY}">${esc(cat.name)}:</span><div class="mt-1 flex flex-wrap gap-1.5">${(cat.skills || []).map((skill: string) => `<span class="border px-2 py-0.5 text-[11px]" style="border-color:${RULE_COLOR};color:${BODY_TEXT}">${esc(skill)}</span>`).join('')}</div></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${SECONDARY}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1.5">${it.technologies.map((t: string) => `<span class="border px-2 py-0.5 text-[10px] font-medium" style="font-family:JetBrains Mono,Consolas,monospace;border-color:${ACCENT};color:${ACCENT}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1.5 space-y-0.5">${it.highlights.filter(Boolean).map((h: string) => `<li class="flex items-start gap-2 text-sm" style="color:${BODY_TEXT}"><span class="mt-1.5 h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span>${md(h)}</li>`).join('')}</ul>` : ''}
      <div class="mt-2 h-px" style="background-color:${RULE_COLOR}"></div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-1.5">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="flex items-center gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name)}</span><span class="text-sm" style="color:${SECONDARY}">${it.issuer ? ` — ${esc(it.issuer)}` : ''}${it.date ? ` (${esc(it.date)})` : ''}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="space-y-1.5">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-center gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.language)}</span><span class="text-sm" style="color:${SECONDARY}"> — ${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm" style="color:${SECONDARY}"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${SECONDARY}">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
      <div class="mt-2 h-px" style="background-color:${RULE_COLOR}"></div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${PRIMARY}">${esc(it.name)}</span><span class="shrink-0 text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${SECONDARY}">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="font-family:JetBrains Mono,Consolas,monospace;color:${ACCENT}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:${BODY_TEXT}">${md(it.description)}</div>` : ''}
      <div class="mt-2 h-px" style="background-color:${RULE_COLOR}"></div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  // Generic items fallback
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="flex items-center gap-2"><span class="h-1 w-1 shrink-0" style="background-color:${ACCENT}"></span><span class="text-sm font-medium" style="color:${PRIMARY}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<span class="text-sm" style="color:${BODY_TEXT}"> — ${esc(it.description)}</span>` : ''}</div>`).join('')}</div>`;
  }

  return buildClassicSectionContent(section);
}

export function buildEngineerHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const lang = resume.language || 'en';
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="px-8 py-6" style="background:linear-gradient(135deg,${PRIMARY} 0%,#334155 100%)">
      <div class="flex items-center gap-5">
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-16 w-16 shrink-0 rounded object-cover" style="border:2px solid ${ACCENT}"/>` : ''}
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-white">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-0.5 text-sm font-medium" style="color:${ACCENT}">${esc(pi.jobTitle)}</p>` : ''}
        </div>
        <div class="shrink-0 text-right">
          <div class="space-y-0.5 text-xs" style="color:#94a3b8">
            ${contacts.map(ct => `<p>${esc(ct)}</p>`).join('')}
            ${pi.linkedin ? `<p>LinkedIn: ${esc(pi.linkedin)}</p>` : ''}
            ${pi.github ? `<p>GitHub: ${esc(pi.github)}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-1">
        <div class="h-0.5 flex-1" style="background-color:${ACCENT}"></div>
        <div class="h-2 w-px" style="background-color:${ACCENT}"></div>
        <div class="h-0.5 w-8" style="background-color:${ACCENT}"></div>
        <div class="h-2 w-px" style="background-color:${ACCENT}"></div>
        <div class="h-0.5 flex-1" style="background-color:${ACCENT}"></div>
      </div>
    </div>
    <div class="p-8">
      ${sections.map(s => `<div class="mb-6" data-section>
        <div class="mb-2 flex items-center gap-3"><h2 class="text-sm font-bold uppercase tracking-wider" style="color:${PRIMARY}">${esc(s.title)}</h2><div class="h-px flex-1" style="background-color:${ACCENT}"></div><div class="h-1.5 w-1.5" style="background-color:${ACCENT}"></div></div>
        ${buildEngineerSectionContent(s, lang)}
      </div>`).join('')}
    </div>
  </div>`;
}
