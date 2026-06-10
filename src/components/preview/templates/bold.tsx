'use client';

import type {
  Resume,
  PersonalInfoContent,
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
import { AvatarImage } from '../avatar-image';
import { degreeField, isSectionEmpty, md } from '../utils';
import { QrCodesPreview } from '../qr-codes-preview';
import { ContactInfo } from '../contact-info';

export function BoldTemplate({ resume }: { resume: Resume }) {
  const personalInfo = resume.sections.find((s) => s.type === 'personal_info');
  const pi = (personalInfo?.content || {}) as PersonalInfoContent;

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header - high contrast */}
      <div className="bg-black px-8 py-8 text-white">
        <div className="flex items-center gap-5">
          {pi.avatar && (
            <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig?.avatarStyle} size={80} className="shrink-0" style={{ border: '3px solid white' }} />
          )}
          <div>
            <h1 className="text-4xl font-black tracking-tight">{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-1 text-lg font-light text-zinc-400">{pi.jobTitle}</p>}
          </div>
        </div>
        <ContactInfo pi={pi} iconColor="#a1a1aa" style={{ color: '#a1a1aa' }} align="left" />
      </div>

      <div className="p-8">
        {resume.sections
          .filter((s) => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s))
          .map((section) => (
            <div key={section.id} className="mb-6" data-section>
              <h2 className="mb-3 border-b-4 border-black pb-1 text-lg font-black uppercase tracking-wider text-black">
                {section.title}
              </h2>
              <BoldSectionContent section={section} resume={resume} />
            </div>
          ))}
      </div>
    </div>
  );
}

function BoldSectionContent({ section, resume }: { section: any; resume: Resume }) {
  const content = section.content;

  if (section.type === 'summary') {
    return <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    return (
      <div className="space-y-4">
        {(content.items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-base font-bold text-black">{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> | {item.company}</span>}
                {item.location && <span className="text-sm text-zinc-400"> , {item.location}</span>}
              </div>
              <span className="shrink-0 bg-black px-2 py-0.5 text-xs font-medium text-white">
                {item.startDate} – {item.endDate || (item.current ? (resume.language === 'zh' ? '至今' : 'Present') : '')}
              </span>
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600"><span className="font-medium text-zinc-700">{resume.language === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.technologies.map((t: string, i: number) => (
                  <span key={i} className="border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-zinc-500 mb-0.5">{resume.language === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-5">
                  {item.highlights.map((h: string, i: number) => <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />)}
                </ul>
              </div>
            )}
          </div>
        ))}
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
                <span className="text-base font-bold text-black">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
                {item.location && <span className="text-sm text-zinc-400"> , {item.location}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {item.highlights.map((h: string, i: number) => <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />)}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    return (
      <div className="flex flex-wrap gap-2">
        {(content.categories || []).flatMap((cat: any) =>
          (cat.skills || []).map((skill: string, i: number) => (
            <span key={`${cat.id}-${i}`} className="border-2 border-black px-3 py-1 text-xs font-bold text-black">
              {skill}
            </span>
          ))
        )}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as ProjectsContent).items || [];
    return (
      <div className="space-y-4">
        {items.map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-black">{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 text-xs text-zinc-400">
                  {item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}
                </span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.technologies.map((t: string, i: number) => (
                  <span key={i} className="border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {item.highlights.map((h: string, i: number) => (
                  <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as CertificationsContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-baseline justify-between">
            <div>
              <span className="text-sm font-bold text-black">{item.name}</span>
              {item.issuer && <span className="text-sm text-zinc-500"> — {item.issuer}</span>}
            </div>
            {item.date && <span className="shrink-0 bg-black px-2 py-0.5 text-xs font-medium text-white">{item.date}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item: any) => (
          <span key={item.id} className="border-2 border-black px-3 py-1 text-xs font-bold text-black">
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
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-black">{item.name}{item.repoUrl && (<a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-blue-500 hover:underline">{item.repoUrl}</a>)}</span>
              <span className="text-xs text-zinc-400">{'\u2B50'} {item.stars?.toLocaleString()}</span>
            </div>
{item.language && <span className="text-xs text-zinc-500">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as CustomContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-base font-bold text-black">{item.title}</span>
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

  // Generic fallback
  if (content.items) {
    return (
      <div className="space-y-2">
        {content.items.map((item: any) => (
          <div key={item.id}>
            <span className="text-sm font-bold text-black">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
