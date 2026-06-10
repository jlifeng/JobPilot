'use client';

import type { Resume, PersonalInfoContent, SummaryContent, WorkExperienceContent, EducationContent, SkillsContent, ProjectsContent, CertificationsContent, LanguagesContent, CustomContent, GitHubContent } from '@/types/resume';
import { AvatarImage } from '../avatar-image';
import { degreeField, isSectionEmpty, md } from '../utils';
import { QrCodesPreview } from '../qr-codes-preview';

const BLUE = '#1e40af';

export function EuroTemplate({ resume }: { resume: Resume }) {
  const personalInfo = resume.sections.find((s) => s.type === 'personal_info');
  const pi = (personalInfo?.content || {}) as PersonalInfoContent;

  return (
    <div className="mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header - EU CV style with photo on right */}
      <div className="mb-6 flex items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ color: BLUE }}>{pi.fullName || 'Your Name'}</h1>
          {pi.jobTitle && <p className="mt-1 text-base text-zinc-500">{pi.jobTitle}</p>}
          <div className="mt-3 space-y-0.5 text-sm text-zinc-600">
            {pi.age && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Age</span><span className="min-w-0">{pi.age}</span></div>}
            {pi.politicalStatus && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Political</span><span className="min-w-0">{pi.politicalStatus}</span></div>}
            {pi.gender && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Gender</span><span className="min-w-0">{pi.gender}</span></div>}
            {pi.ethnicity && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Ethnicity</span><span className="min-w-0">{pi.ethnicity}</span></div>}
            {pi.hometown && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Hometown</span><span className="min-w-0">{pi.hometown}</span></div>}
            {pi.maritalStatus && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Marital</span><span className="min-w-0">{pi.maritalStatus}</span></div>}
            {pi.yearsOfExperience && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Experience</span><span className="min-w-0">{pi.yearsOfExperience}</span></div>}
            {pi.educationLevel && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Education</span><span className="min-w-0">{pi.educationLevel}</span></div>}
            {pi.email && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Email</span><span className="min-w-0">{pi.email}</span></div>}
            {pi.phone && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Phone</span><span className="min-w-0">{pi.phone}</span></div>}
            {pi.wechat && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>WeChat</span><span className="min-w-0">{pi.wechat}</span></div>}
            {pi.location && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Address</span><span className="min-w-0">{pi.location}</span></div>}
            {pi.website && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>Website</span><span className="min-w-0">{pi.website}</span></div>}
            {pi.linkedin && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>LinkedIn</span><span className="min-w-0">{pi.linkedin}</span></div>}
            {pi.github && <div className="flex gap-2"><span className="w-28 shrink-0 font-semibold uppercase text-zinc-400" style={{ fontSize: '11px' }}>GitHub</span><span className="min-w-0">{pi.github}</span></div>}
          </div>
        </div>
        {pi.avatar && (
          <AvatarImage src={pi.avatar} avatarStyle={resume.themeConfig?.avatarStyle} size={88} className="shrink-0 border-2" style={{ borderColor: BLUE }} />
        )}
      </div>

      <div className="h-1 w-full rounded" style={{ background: BLUE }} />

      {/* Sections */}
      <div className="mt-6">
        {resume.sections
          .filter((s) => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s))
          .map((section) => (
            <div key={section.id} className="mb-5 flex gap-4" data-section>
              <div className="w-28 shrink-0 pt-0.5 text-right">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: BLUE }}>{section.title}</h2>
              </div>
              <div className="flex-1 border-l-2 pl-4" style={{ borderColor: '#dbeafe' }}>
                <EuroSectionContent section={section} resume={resume} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function EuroSectionContent({ section, resume }: { section: any; resume: Resume }) {
  const content = section.content;

  if (section.type === 'summary') {
    return <p className="text-sm leading-relaxed text-zinc-600" dangerouslySetInnerHTML={{ __html: md((content as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    return (
      <div className="space-y-3">
        {(content.items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-800">{item.position}</span>
                {item.company && <span className="text-sm text-zinc-500"> — {item.company}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (item.current ? (resume.language === 'zh' ? '至今' : 'Present') : '')}</span>
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600"><span className="font-medium text-zinc-700">{resume.language === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{resume.language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-zinc-500 mb-0.5">{resume.language === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="list-disc pl-4">
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
                <span className="text-sm font-bold text-zinc-800">{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-zinc-500"> — {item.institution}</span>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
            </div>
            {item.gpa && <p className="text-sm text-zinc-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
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
      <div className="space-y-1">
        {(content.categories || []).map((cat: any) => (
          <div key={cat.id} className="flex text-sm">
            <span className="w-28 shrink-0 font-medium" style={{ color: BLUE }}>{cat.name}:</span>
            <span className="text-zinc-600">{(cat.skills || []).join(', ')}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as ProjectsContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-zinc-800">{item.name}</span>
              {item.startDate && <span className="shrink-0 text-xs text-zinc-400">{item.startDate} – {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>}
            </div>
            {item.description && <p className="mt-1 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && <p className="mt-0.5 text-xs text-zinc-400">{resume.language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {item.highlights.map((h: string, i: number) => <li key={i} className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(h) }} />)}
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
      <div className="space-y-1.5">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-baseline justify-between text-sm">
            <div>
              <span className="font-semibold text-zinc-800">{item.name}</span>
              {item.issuer && <span className="text-zinc-500"> — {item.issuer}</span>}
            </div>
            {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as LanguagesContent).items || [];
    return (
      <div className="space-y-1">
        {items.map((item: any) => (
          <div key={item.id} className="flex text-sm">
            <span className="w-28 shrink-0 font-medium" style={{ color: BLUE }}>{item.language}:</span>
            <span className="text-zinc-600">{item.proficiency}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as GitHubContent).items || [];
    return (
      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-zinc-800">{item.name}{item.repoUrl && (<a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-blue-500 hover:underline">{item.repoUrl}</a>)}</span>
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
                <span className="text-sm font-semibold text-zinc-800">{item.title}</span>
                {item.subtitle && <span className="text-sm text-zinc-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs text-zinc-400">{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    return <QrCodesPreview items={(content as any).items || []} />;
  }

  if (content.items) {
    return (
      <div className="space-y-2">
        {content.items.map((item: any) => (
          <div key={item.id}>
            <span className="text-sm font-medium text-zinc-700">{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
