'use client';

import type { Resume, PersonalInfoContent, SummaryContent, WorkExperienceContent, EducationContent, SkillsContent, ProjectsContent, CertificationsContent, LanguagesContent, CustomContent, GitHubContent } from '@/types/resume';
import { AvatarImage } from '../avatar-image';
import { degreeField, isSectionEmpty, md } from '../utils';
import { QrCodesPreview } from '../qr-codes-preview';
import { ContactInfo } from '../contact-info';

const GRAY_700 = '#374151';
const BLUE_600 = '#2563eb';

export function ConsultantTemplate({ resume }: { resume: Resume }) {
  const personalInfo = resume.sections.find((s) => s.type === 'personal_info');
  const pi = (personalInfo?.content || {}) as PersonalInfoContent;

  return (
    <div className="consultant-tpl mx-auto max-w-[210mm] bg-white shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Blue bullet markers for markdown-rendered lists */}
      <style>{`.consultant-tpl li::marker { color: ${BLUE_600} !important; }`}</style>
      {/* Top accent bar */}
      <div className="mb-6 h-1 w-full rounded" style={{ backgroundColor: BLUE_600 }} />

      {/* Header */}
      <div className="mb-6">
        <div className={`flex items-center gap-4 ${!pi.avatar ? 'justify-center' : ''}`}>
          {pi.avatar && (
            <AvatarImage
              src={pi.avatar}
              size={64}
              avatarStyle={resume.themeConfig?.avatarStyle}
              className="shrink-0"
              style={{ border: `2px solid ${BLUE_600}` }}
            />
          )}
          <div className={!pi.avatar ? 'text-center' : ''}>
            <h1 className="text-2xl font-bold" style={{ color: GRAY_700 }}>{pi.fullName || 'Your Name'}</h1>
            {pi.jobTitle && <p className="mt-0.5 text-sm font-medium" style={{ color: BLUE_600 }}>{pi.jobTitle}</p>}
          </div>
        </div>
        <ContactInfo pi={pi} iconColor="#6b7280" style={{ color: '#6b7280' }} align={pi.avatar ? 'left' : 'center'} />
      </div>

      {/* Sections */}
      {resume.sections
        .filter((s) => s.visible && s.type !== 'personal_info' && !isSectionEmpty(s))
        .map((section) => (
          <div key={section.id} className="mb-6" data-section>
            <h2 className="mb-3 border-l-[3px] pl-3 text-sm font-bold uppercase tracking-wider" style={{ color: GRAY_700, borderColor: BLUE_600 }}>
              {section.title}
            </h2>
            <ConsultantSectionContent section={section} resume={resume} />
          </div>
        ))}
    </div>
  );
}

function ConsultantSectionContent({ section, resume }: { section: any; resume: Resume }) {
  const content = section.content;

  if (section.type === 'summary') {
    return <p className="text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: md((content as SummaryContent).text) }} />;
  }

  if (section.type === 'work_experience') {
    return (
      <div className="space-y-4">
        {((content as WorkExperienceContent).items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.position}</span>
                {item.company && <span className="text-sm text-gray-500"> | {item.company}</span>}
                {item.location && <span className="text-sm text-gray-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.startDate} - {item.endDate || (item.current ? (resume.language === 'zh' ? '至今' : 'Present') : '')}</span>
            </div>
            {item.description && <p className="mt-1 text-sm text-gray-600"><span className="font-semibold" style={{ color: GRAY_700 }}>{resume.language === 'zh' ? '职责' : 'Responsibilities'}:</span> <span dangerouslySetInnerHTML={{ __html: md(item.description) }} /></p>}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{resume.language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <div className="mt-1.5">
                <p className="text-xs font-semibold" style={{ color: GRAY_700 }}>{resume.language === 'zh' ? '主要成就' : 'Key Achievements'}:</p>
                <ul className="mt-0.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                  {item.highlights.map((h: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
                  ))}
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
        {((content as EducationContent).items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{degreeField(item.degree, item.field)}</span>
                {item.institution && <span className="text-sm text-gray-500"> - {item.institution}</span>}
                {item.location && <span className="text-sm text-gray-400">, {item.location}</span>}
              </div>
              <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.startDate} - {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
            </div>
            {item.gpa && <p className="text-sm text-gray-500">GPA: {item.gpa}</p>}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {item.highlights.map((h: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    return (
      <div className="space-y-1.5">
        {((content as SkillsContent).categories || []).map((cat: any) => (
          <div key={cat.id}>
            <p className="text-sm font-semibold" style={{ color: GRAY_700 }}>{cat.name}</p>
            {cat.skills?.length > 0 && (
              <ul className="mt-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {cat.skills.map((skill: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">{skill}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    return (
      <div className="space-y-3">
        {((content as ProjectsContent).items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.name}</span>
              {item.startDate && (
                <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.startDate} - {item.endDate || (resume.language === 'zh' ? '至今' : 'Present')}</span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">{resume.language === 'zh' ? '技术栈' : 'Tech'}: {item.technologies.join(', ')}</p>
            )}
            {item.highlights?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                {item.highlights.map((h: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(h) }} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    return (
      <div className="space-y-1.5">
        {((content as CertificationsContent).items || []).map((item: any) => (
          <div key={item.id}>
            <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.name}</span>
            {(item.issuer || item.date) && <span className="text-sm text-gray-500">{item.issuer && <> — {item.issuer}</>}{item.date && <> ({item.date})</>}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    return (
      <div className="space-y-1.5">
        {((content as LanguagesContent).items || []).map((item: any) => (
          <div key={item.id}>
            <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.language}</span>
            <span className="text-sm text-gray-500"> — {item.proficiency}</span>
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = ((content as GitHubContent).items || []);
    return (
      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.name}{item.repoUrl && (<a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-blue-500 hover:underline">{item.repoUrl}</a>)}</span>
              <span className="text-xs text-gray-400">⭐ {item.stars?.toLocaleString()}</span>
            </div>
{item.language && <span className="text-xs text-gray-400">{item.language}</span>}
            {item.description && <p className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    return (
      <div className="space-y-3">
        {((content as CustomContent).items || []).map((item: any) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: GRAY_700 }}>{item.title}</span>
                {item.subtitle && <span className="text-sm text-gray-500"> — {item.subtitle}</span>}
              </div>
              {item.date && <span className="shrink-0 text-xs font-medium" style={{ color: BLUE_600 }}>{item.date}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
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
            <span className="text-sm font-medium" style={{ color: GRAY_700 }}>{item.name || item.title || item.language}</span>
            {item.description && <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: md(item.description) }} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
