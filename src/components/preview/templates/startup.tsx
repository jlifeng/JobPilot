'use client';

import type { Resume, PersonalInfoContent, SummaryContent, WorkExperienceContent, EducationContent, SkillsContent, ProjectsContent, CertificationsContent, LanguagesContent, CustomContent, GitHubContent } from '@/types/resume';
import { AvatarImage } from '../avatar-image';
import { degreeField, extractMarkdownBulletItems, isSectionEmpty, md } from '../utils';
import { QrCodesPreview } from '../qr-codes-preview';
import { ContactInfo } from '../contact-info';

const PURPLE = '#6366f1';
const CYAN = '#06b6d4';

function StartupBulletList({ items, className = 'list-disc pl-4' }: { items: string[]; className?: string }) {
  return <ul className={className}>{items.map((item, index) => <li key={index} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item) }} />)}</ul>;
}

export function StartupTemplate({ resume }: { resume: Resume }) {
  const personalInfo = resume.sections.find((s) => s.type === 'personal_info');
  const pi = (personalInfo?.content || {}) as PersonalInfoContent;

  return (
    <div className="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header with diagonal accent */}
      <div className="relative px-8 py-8 text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${CYAN})` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
        <div className="relative flex items-center gap-5">
          {pi.avatar && (
            <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig?.avatarStyle} size={72} className="shrink-0" style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
          )}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-base font-light text-white/80">{pi.jobTitle}</p>}
            <ContactInfo pi={pi} iconColor="rgba(255,255,255,0.6)" style={{ color: 'rgba(255,255,255,0.8)' }} align="left" />
          </div>
        </div>
      </div>

      <div className="p-8">
        {resume.sections
          .filter((s) => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s))
          .map((section) => (
            <div key={section.id} className="mb-6" data-section>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider" style={{ color: PURPLE }}>
                {section.title}
              </h2>
              <StartupSectionContent section={section} resume={resume} />
            </div>
          ))}
      </div>
    </div>
  );
}

function StartupSectionContent({ section, resume }: { section: any; resume: Resume }) {
  const content = section.content;

  if (section.type === 'summary') {
    const summaryItems = extractMarkdownBulletItems((content as SummaryContent).text);
    if (summaryItems) {
      return <StartupBulletList items={summaryItems} className="list-disc pl-4" />;
    }
    return <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    return (
      <div className="space-y-4">
        {(content.items || []).map((item: any) => {
          const responsibilityItems = extractMarkdownBulletItems(item.description);

          return (
          <div key={item.id} className="border-l-3 pl-4" style={{ borderColor: CYAN }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-zinc-800">{item.position}</h3>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: PURPLE }}>
                {item.startDate} – {item.endDate || (item.current ? (resume.language === 'zh' ? '至今' : 'Present') : '')}
              </span>
            </div>
            {item.company && <p className="text-sm" style={{ color: CYAN }}>{item.company}</p>}
            {item.description && responsibilityItems && <div className="mt-1"><p className="mb-0.5 text-xs font-medium text-zinc-500">{resume.language === 'zh' ? '职责' : 'Responsibilities'}:</p><StartupBulletList items={responsibilityItems} /></div>}
            {item.description && !responsibilityItems && <p className="mt-1 text-sm text-zinc-600"><span className="font-medium text-zinc-700">{resume.language === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.technologies.map((t: string, i: number) => (
                  <span key={i} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: PURPLE, color: PURPLE }}>{t}</span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-zinc-500 mb-0.5">{resume.language === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <StartupBulletList items={item.highlights} />
              </div>
            )}
          </div>
        )})}
      </div>
    );
  }

  if (section.type === 'education') {
    return (
      <div className="space-y-3">
        {(content.items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-800">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <StartupBulletList items={item.highlights} className="mt-1 list-disc pl-4" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(content.categories || []).flatMap((cat: any) =>
          (cat.skills || []).map((skill: string, i: number) => (
            <span key={`${cat.id}-${i}`} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: PURPLE, color: PURPLE }}>
              {skill}
            </span>
          ))
        )}
      </div>
    );
  }

  if (section.type === 'projects') {
    return (
      <div className="space-y-4">
        {((content as ProjectsContent).items || []).map((item: any) => (
          <div key={item.id} className="border-l-3 pl-4" style={{ borderColor: CYAN }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-zinc-800">{item.name}</h3>
              {item.startDate && (
                <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.technologies.map((t: string, i: number) => (
                  <span key={i} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: PURPLE, color: PURPLE }}>{t}</span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <StartupBulletList items={item.highlights} className="mt-1 list-disc pl-4" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    return (
      <div className="space-y-2">
        {((content as CertificationsContent).items || []).map((item: any) => (
          <div key={item.id} className="flex items-baseline justify-between">
            <div>
              <span className="text-sm font-semibold text-zinc-800">{item.name}</span>
              {item.issuer && <span className="text-sm text-zinc-500"> — {item.issuer}</span>}
            </div>
            {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {((content as LanguagesContent).items || []).map((item: any) => (
          <span key={item.id} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: CYAN, color: CYAN }}>
            {item.language} — {item.proficiency}
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as GitHubContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="border-l-3 pl-4" style={{ borderColor: CYAN }}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-zinc-800">{item.name}
                {item.repoUrl && (
                  <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-1 text-xs font-normal text-blue-500 hover:underline">
                    {item.repoUrl}
                  </a>
                )}
              </h3>
              <span className="shrink-0 text-xs text-zinc-400">{'\u2B50'} {item.stars?.toLocaleString()}</span>
            </div>
{item.language && <span className="text-xs" style={{ color: CYAN }}>{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    return (
      <div className="space-y-4">
        {((content as CustomContent).items || []).map((item: any) => (
          <div key={item.id} className="border-l-3 pl-4" style={{ borderColor: CYAN }}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-800">{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    return <QrCodesPreview items={(content as any).items || []} />;
  }

  // Generic items fallback
  if (content.items) {
    return (
      <div className="space-y-2">
        {content.items.map((item: any) => (
          <div key={item.id}>
            <span className="text-sm font-medium text-zinc-800">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
