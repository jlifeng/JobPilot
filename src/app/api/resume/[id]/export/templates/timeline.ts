import type { GitHubContent } from '@/types/resume';
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';
import { buildContactEntries } from '@/lib/template-renderer/contact-info';

function buildTimelineSectionContent(s: Section, lang: string): string {
  const c = s.content as any;
  const BG = '#475569';
  const AC = '#3b82f6';

  if (s.type === 'summary') return `<div class="text-sm leading-relaxed text-zinc-600">${md(c.text)}</div>`;

  if (s.type === 'work_experience') {
    const items = c.items || [];
    return `<div class="relative border-l-2 pl-6 ml-2" style="border-color:#e2e8f0">${items.map((it: any, idx: number) => `<div class="relative${idx < items.length - 1 ? ' pb-5' : ''}">
      <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style="border-color:${AC}"></div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold" style="color:${BG}">${esc(it.position)}</span>${it.company ? `<span class="text-sm text-zinc-500"> | ${esc(it.company)}</span>` : ''}</div>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${AC}">${esc(it.startDate)} – ${esc(it.endDate) || (it.current ? (lang === 'zh' ? '至今' : 'Present') : '')}</span>
      </div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600"><span class="font-medium text-zinc-700">${lang === 'zh' ? '职责' : 'Responsibilities'}:</span> ${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${AC}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<div class="mt-1"><p class="text-xs font-medium text-zinc-500 mb-0.5">${lang === 'zh' ? '主要成就' : 'Key Achievements'}:</p><ul class="list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul></div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'education') {
    const items = c.items || [];
    return `<div class="relative border-l-2 pl-6 ml-2" style="border-color:#e2e8f0">${items.map((it: any, idx: number) => `<div class="relative${idx < items.length - 1 ? ' pb-4' : ''}">
      <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style="border-color:${AC}"></div>
      <div class="flex items-baseline justify-between">
        <div><span class="text-sm font-bold" style="color:${BG}">${esc(degreeField(it.degree, it.field))}</span>${it.institution ? `<span class="text-sm text-zinc-500"> — ${esc(it.institution)}</span>` : ''}</div>
        <span class="shrink-0 text-xs text-zinc-400">${esc(it.startDate)} – ${esc(it.endDate) || (lang === 'zh' ? '至今' : 'Present')}</span>
      </div>
      ${it.gpa ? `<p class="text-sm text-zinc-500">GPA: ${esc(it.gpa)}</p>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'skills') {
    return `<div class="space-y-1">${(c.categories || []).map((cat: any) =>
      `<div class="flex text-sm"><span class="w-28 shrink-0 font-medium" style="color:${AC}">${esc(cat.name)}:</span><span class="text-zinc-600">${esc((cat.skills || []).join(', '))}</span></div>`
    ).join('')}</div>`;
  }

  if (s.type === 'projects') {
    const items = c.items || [];
    return `<div class="relative border-l-2 pl-6 ml-2" style="border-color:#e2e8f0">${items.map((it: any, idx: number) => `<div class="relative${idx < items.length - 1 ? ' pb-5' : ''}">
      <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style="border-color:${AC}"></div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BG}">${esc(it.name)}</span>${it.startDate ? `<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${AC}">${esc(it.startDate)} – ${it.endDate ? esc(it.endDate) : (lang === 'zh' ? '至今' : 'Present')}</span>` : ''}</div>
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<div class="mt-1 flex flex-wrap gap-1">${it.technologies.map((t: string) => `<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:#eff6ff;color:${AC}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${it.highlights?.length ? `<ul class="mt-1 list-disc pl-4">${buildHighlights(it.highlights, 'text-sm text-zinc-600')}</ul>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'github') {
    return `<div class="relative border-l-2 pl-6 ml-2" style="border-color:#e2e8f0">${((c as GitHubContent).items || []).map((it: any, idx: number, arr: any[]) => `<div class="relative${idx < arr.length - 1 ? ' pb-5' : ''}">
      <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white" style="border-color:${AC}"></div>
      <div class="flex items-baseline justify-between"><span class="text-sm font-bold" style="color:${BG}">${esc(it.name)}</span><span class="shrink-0 text-xs text-zinc-400">⭐ ${it.stars?.toLocaleString() ?? 0}</span></div>
      ${it.language ? `<span class="text-xs" style="color:${AC}">${esc(it.language)}</span>` : ''}
      ${it.description ? `<div class="mt-1 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'certifications') {
    return `<div class="space-y-1.5">${(c.items || []).map((it: any) =>
      `<div class="flex items-baseline justify-between text-sm"><div><span class="font-semibold" style="color:${BG}">${esc(it.name)}</span>${it.issuer ? `<span class="text-zinc-500"> — ${esc(it.issuer)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }

  if (s.type === 'languages') {
    return `<div class="flex flex-wrap gap-x-6 gap-y-1">${(c.items || []).map((it: any) =>
      `<span class="text-sm"><span class="font-medium" style="color:${AC}">${esc(it.language)}</span><span class="text-zinc-500"> — ${esc(it.proficiency)}</span></span>`
    ).join('')}</div>`;
  }

  if (s.type === 'custom') {
    return `<div class="space-y-2">${(c.items || []).map((it: any) => `<div>
      <div class="flex items-baseline justify-between"><div><span class="text-sm font-semibold" style="color:${BG}">${esc(it.title)}</span>${it.subtitle ? `<span class="text-sm text-zinc-500"> — ${esc(it.subtitle)}</span>` : ''}</div>${it.date ? `<span class="shrink-0 text-xs text-zinc-400">${esc(it.date)}</span>` : ''}</div>
      ${it.description ? `<div class="mt-0.5 text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  if (s.type === 'qr_codes') return buildQrCodesHtml(s);
  if (c.items) {
    return `<div class="space-y-2">${c.items.map((it: any) => `<div>
      <span class="text-sm font-medium" style="color:${BG}">${esc(it.name || it.title || it.language)}</span>
      ${it.description ? `<div class="text-sm text-zinc-600">${md(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  return '';
}

export function buildTimelineHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const { row1, row2 } = buildContactEntries(pi);
  const BG = '#475569';
  const AC = '#3b82f6';
  const iconColor = '#71717a';

  const renderRow = (entries: typeof row1) =>
    entries.map((c) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px"><span style="color:${iconColor}">${c.htmlIcon}</span><span style="color:#6b7280">${esc(c.value)}</span></span>`).join('');

  const contactHtml = (row1.length > 0 || row2.length > 0)
    ? `<div style="margin-top:8px;font-size:13px;text-align:center">${renderRow(row1)}${row2.length > 0 ? `</div><div style="margin-top:4px;font-size:13px;text-align:center">${renderRow(row2)}` : ''}</div>`
    : '';

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:Inter,sans-serif">
    <div class="mb-6 text-center">
      ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="mx-auto mb-3 h-18 w-18 rounded-full border-2 object-cover" style="border-color:${AC}"/>` : ''}
      <h1 class="text-2xl font-bold" style="color:${BG}">${esc(pi.fullName || 'Your Name')}</h1>
      ${pi.jobTitle ? `<p class="mt-0.5 text-base" style="color:${AC}">${esc(pi.jobTitle)}</p>` : ''}
      ${contactHtml}
    </div>
    ${sections.map(s => `<div class="mb-6" data-section>
      <h2 class="mb-3 text-sm font-bold uppercase tracking-wider" style="color:${BG}">${esc(s.title)}</h2>
      ${buildTimelineSectionContent(s, resume.language || 'en')}
    </div>`).join('')}
  </div>`;
}
