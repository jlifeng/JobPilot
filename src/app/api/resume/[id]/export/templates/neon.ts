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

const BG = '#111827';
const CYAN = '#22d3ee';
const VIOLET = '#a78bfa';
const TEXT = '#d1d5db';
const TEXT_DIM = '#9ca3af';

function buildNeonBulletList(items: string[] | undefined, className = 'space-y-0.5', bulletColor = CYAN): string {
  if (!items?.length) return '';
  return `<ul class="${className}">${items.filter(Boolean).map((item) => `<li class="flex items-start gap-2 text-sm" style="color:${TEXT}"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background-color:${bulletColor};box-shadow:0 0 6px ${bulletColor}"></span>${md(item)}</li>`).join('')}</ul>`;
}

function buildNeonSectionContent(section: Section, lang: string): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    const summaryText = (c as SummaryContent).text;
    const summaryItems = extractMarkdownBulletItems(summaryText);
    return `<div class="rounded-lg p-4" style="border:1px solid ${CYAN}20;background-color:${CYAN}08">${summaryItems ? buildNeonBulletList(summaryItems) : `<div class="text-sm leading-relaxed" style="color:${TEXT}">${md(summaryText)}</div>`}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-4">${((c as WorkExperienceContent).items || []).map((it: any) => `<div class="rounded-lg p-4" style="border:1px solid ${CYAN}20;background-color:${CYAN}05">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${CYAN}">${esc(it.position)}</h3><span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style="color:${BG};background-color:${VIOLET};box-shadow:0 0 8px ${VIOLET}40">${esc(it.startDate)} - ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span></div>
      ${it.company ? `<p class="text-sm font-medium" style="color:${VIOLET}">${esc(it.company)}</p>` : ''}
      ${(() => { const responsibilityItems = extractMarkdownBulletItems(it.description); if (responsibilityItems?.length) { return `<div class="mt-1"><p class="mb-0.5 text-xs font-medium" style="color:${CYAN}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</p>${buildNeonBulletList(responsibilityItems)}</div>`; } return it.description ? `<div class="mt-1 text-sm" style="color:${TEXT}"><span class="font-medium" style="color:${VIOLET}">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''; })()}
      ${it.technologies?.length ? `<div class="mt-2 flex flex-wrap gap-1">${it.technologies.map((t: string, i: number) => { const clr = i % 2 === 0 ? CYAN : VIOLET; return `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="color:${BG};background-color:${clr};box-shadow:0 0 6px ${clr}40">${esc(t)}</span>`; }).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1.5"><p class="text-xs font-medium mb-0.5" style="color:${VIOLET}">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p>${buildNeonBulletList(it.highlights)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<div class="rounded-lg p-4" style="border:1px solid ${VIOLET}20;background-color:${VIOLET}05">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${CYAN}">${esc(it.institution)}</h3><span class="text-xs" style="color:${TEXT_DIM}">${esc(it.startDate)} - ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span></div>
      <p class="text-sm" style="color:${TEXT}">${esc(degreeField(it.degree, it.field))}</p>
      ${it.gpa ? `<p class="text-xs" style="color:${VIOLET}">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? buildNeonBulletList(it.highlights, 'mt-1 space-y-0.5', VIOLET) : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-3">${((c as SkillsContent).categories || []).map((cat: any) => `<div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wider" style="color:${VIOLET}">${esc(cat.name)}</p>
      <div class="flex flex-wrap gap-1.5">${(cat.skills || []).map((skill: string, i: number) => {
        const clr = i % 2 === 0 ? CYAN : VIOLET;
        return `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" style="color:${clr};border:1px solid ${clr}40;background-color:${clr}10">${esc(skill)}</span>`;
      }).join('')}</div>
    </div>`).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<div class="rounded-lg p-4" style="border:1px solid ${CYAN}20;background-color:${CYAN}05">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${CYAN}">${esc(it.name)}</h3>${it.startDate ? `<span class="text-xs" style="color:${TEXT_DIM}">${esc(it.startDate)} - ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm" style="color:${TEXT}">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-2 flex flex-wrap gap-1">${it.technologies.map((t: string, i: number) => { const clr = i % 2 === 0 ? CYAN : VIOLET; return `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="color:${BG};background-color:${clr};box-shadow:0 0 6px ${clr}40">${esc(t)}</span>`; }).join('')}</div>` : ''}
      ${it.highlights?.length ? buildNeonBulletList(it.highlights, 'mt-1.5 space-y-0.5') : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="flex flex-wrap gap-2">${((c as CertificationsContent).items || []).map((it: any) =>
      `<div class="rounded-lg px-4 py-2" style="border:1px solid ${VIOLET}30;background-color:${VIOLET}08"><p class="text-sm font-bold" style="color:${CYAN}">${esc(it.name)}</p>${it.issuer || it.date ? `<p class="text-xs" style="color:${TEXT_DIM}">${it.issuer ? esc(it.issuer) : ''}${it.issuer && it.date ? ' | ' : ''}${it.date ? esc(it.date) : ''}</p>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-3">${((c as LanguagesContent).items || []).map((it: any) =>
      `<div class="flex items-center gap-2 rounded-full px-4 py-1.5" style="border:1px solid ${CYAN}30"><span class="h-2 w-2 rounded-full" style="background-color:${CYAN};box-shadow:0 0 6px ${CYAN}"></span><span class="text-sm font-medium" style="color:${CYAN}">${esc(it.language)}</span><span class="text-xs" style="color:${TEXT_DIM}">${esc(it.proficiency)}</span></div>`
    ).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<div class="rounded-lg p-4" style="border:1px solid ${CYAN}20;background-color:${CYAN}05">
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${CYAN}">${esc(it.name)}</span><span class="text-xs" style="color:${TEXT_DIM}">\u2B50 ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="color:${VIOLET}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:${TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<div class="rounded-lg p-4" style="border:1px solid ${CYAN}20;background-color:${CYAN}05">
      <div class="flex items-baseline justify-between"><h3 class="text-sm font-bold" style="color:${CYAN}">${esc(it.title)}</h3>${it.date ? `<span class="text-xs" style="color:${TEXT_DIM}">${esc(it.date)}</span>` : ''}</div>
      ${it.subtitle ? `<p class="text-sm" style="color:${VIOLET}">${esc(it.subtitle)}</p>` : ''}
      ${it.description ? `<div class="mt-1 text-sm" style="color:${TEXT}">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div class="rounded-lg p-3" style="border:1px solid ${CYAN}20"><span class="text-sm font-medium" style="color:${CYAN}">${esc(it.name || it.title || it.language)}</span>${it.description ? `<div class="text-sm" style="color:${TEXT}">${md(it.description)}</div>` : ''}</div>`).join('')}</div>`;
  }

  return '';
}

export function buildNeonHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const contacts = [pi.age, pi.politicalStatus, pi.gender, pi.ethnicity, pi.hometown, pi.maritalStatus, pi.yearsOfExperience, pi.educationLevel, pi.email, pi.phone, pi.wechat, pi.location, pi.website].filter(Boolean);

  return `<div class="mx-auto max-w-[210mm] overflow-hidden shadow-lg" style="font-family:Inter,sans-serif;background-color:${BG}">
    <div class="relative px-10 py-8" style="border-bottom:2px solid ${CYAN};box-shadow:0 2px 20px ${CYAN}40">
      <div class="flex items-center gap-5">
        ${pi.avatar ? `<div class="shrink-0 rounded-lg p-0.5" style="border:2px solid ${CYAN};box-shadow:0 0 12px ${CYAN}60"><img src="${esc(pi.avatar)}" alt="" class="h-20 w-20 rounded-lg object-cover"/></div>` : ''}
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight" style="color:${CYAN};text-shadow:0 0 20px ${CYAN}60">${esc(pi.fullName || 'Your Name')}</h1>
          ${pi.jobTitle ? `<p class="mt-1 text-sm font-medium" style="color:${VIOLET};text-shadow:0 0 10px ${VIOLET}40">${esc(pi.jobTitle)}</p>` : ''}
          ${contacts.length ? `<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style="color:${TEXT_DIM}">${contacts.map((c, i) => `<span class="flex items-center gap-1.5">${esc(c)}${i < contacts.length - 1 ? `<span style="color:${CYAN}40">|</span>` : ''}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="p-8 pt-6">
      ${sections.map(s => `<div class="mb-6" data-section>
        <div class="mb-3 flex items-center gap-3"><h2 class="text-sm font-extrabold uppercase tracking-widest" style="color:${CYAN};text-shadow:0 0 10px ${CYAN}40">${esc(s.title)}</h2><div class="h-px flex-1" style="background:linear-gradient(90deg,${CYAN}40,transparent)"></div></div>
        ${buildNeonSectionContent(s, resume.language || 'en')}
      </div>`).join('')}
    </div>
  </div>`;
}
