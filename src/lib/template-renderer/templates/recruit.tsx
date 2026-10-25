/**
 * Recruit Template - Unified Implementation
 *
 * A single-column resume layout common on Chinese recruitment platforms:
 * large left-aligned name, portrait at top right, compact two-row personal
 * details, bold underlined section headings and right-aligned dates.
 */

import React from 'react';
import type {
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
  QrCodeItem,
} from '@/types/resume';
import { AvatarImage } from '@/components/preview/avatar-image';
import type { CanonicalResume, TemplateProps, UnifiedTemplate } from '../types';
import {
  md,
  esc,
  getPersonalInfo,
  visibleSections,
} from '../template-contract';

const TEXT = '#202124';
const BODY = '#3c4043';
const MUTED = '#666b70';
const RULE = '#d8dadd';
const FONT = 'Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif';

interface GenericItem {
  id: string;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
}

interface PersonalDetail {
  label?: string;
  value: string;
  icon?: 'phone' | 'mail';
}

function localizedEndDate(
  endDate: string | null | undefined,
  current: boolean | undefined,
  lang: string,
): string {
  return endDate || (current ? (lang === 'zh' ? '至今' : 'Present') : '');
}

function isChinese(lang: string): boolean {
  return lang.toLowerCase().startsWith('zh');
}

function labels(lang: string): {
  tech: string;
  gpa: string;
} {
  return isChinese(lang)
    ? { tech: '技术栈', gpa: 'GPA' }
    : { tech: 'Tech', gpa: 'GPA' };
}

function dateRange(
  startDate: string | undefined,
  endDate: string | null | undefined,
  current: boolean | undefined,
  lang: string,
): string {
  if (!startDate) return localizedEndDate(endDate, current, lang);
  const end = localizedEndDate(endDate, current, lang);
  return end ? `${startDate}-${end}` : startDate;
}

function detail(
  label: string,
  value: string | undefined,
): PersonalDetail | null {
  return value?.trim() ? { label, value: value.trim() } : null;
}

function personalDetails(pi: PersonalInfoContent, lang: string): PersonalDetail[] {
  const zh = lang.toLowerCase().startsWith('zh');
  const salary = pi.expectedSalary?.trim();
  const availability = pi.availability?.trim();
  const workExperience = pi.yearsOfExperience?.trim();

  return [
    detail('', pi.gender),
    detail(zh ? '生日' : '', pi.age),
    detail('', pi.location),
    pi.phone?.trim() ? { value: pi.phone.trim(), icon: 'phone' as const } : null,
    pi.email?.trim() ? { value: pi.email.trim(), icon: 'mail' as const } : null,
    availability
      ? {
          value: availability,
        }
      : null,
    workExperience
      ? {
          value: workExperience,
        }
      : null,
    detail(zh ? '求职意向' : 'Target Role', pi.jobTitle),
    salary
      ? {
          label: zh ? '期望薪资' : 'Expected Salary',
          value: salary,
        }
      : null,
    detail(zh ? '微信' : 'WeChat', pi.wechat),
    detail(zh ? '籍贯' : 'Hometown', pi.hometown),
    detail(zh ? '政治面貌' : 'Political Status', pi.politicalStatus),
    detail(zh ? '最高学历' : 'Education', pi.educationLevel),
  ].filter((entry): entry is PersonalDetail => entry !== null);
}

function PersonalDetails({
  details,
  lang,
}: {
  details: PersonalDetail[];
  lang: string;
}): React.ReactNode {
  if (details.length === 0) return null;
  const zh = lang.toLowerCase().startsWith('zh');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '5px 0',
        marginTop: 12,
        fontSize: 14,
        lineHeight: 1.45,
        color: BODY,
      }}
    >
      {details.map((entry, index) => (
        <React.Fragment key={`${entry.label || 'detail'}-${index}`}>
          {index === 5 && <div style={{ flexBasis: '100%', height: 0 }} />}
          {index > 0 && index !== 5 && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 1,
                height: 13,
                margin: '0 10px',
                background: '#c7cacd',
                verticalAlign: 'middle',
              }}
            />
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            {entry.label && (
              <span style={{ color: MUTED }}>
                {entry.label}
                {zh ? '：' : ': '}
              </span>
            )}
            {entry.icon === 'phone' && <PhoneIcon />}
            {entry.icon === 'mail' && <MailIcon />}
            <span>{entry.value}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function PhoneIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b6f73"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

function MailIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b6f73"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect width="20" height="16" x="2" y="4" rx="2" />
    </svg>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h2
      style={{
        margin: '0 0 10px',
        paddingBottom: 5,
        borderBottom: `1.5px solid ${RULE}`,
        color: TEXT,
        fontSize: 20,
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      {children}
    </h2>
  );
}

function NumberedLines({ items }: { items: string[] }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            color: BODY,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <span style={{ flexShrink: 0 }}>{index + 1}.</span>
          <span
            style={{ flex: 1 }}
            dangerouslySetInnerHTML={{ __html: md(item) }}
          />
        </div>
      ))}
    </div>
  );
}

function BulletedLines({ items }: { items: string[] }): React.ReactElement {
  return (
    <ul
      style={{
        margin: '2px 0 0',
        paddingLeft: 20,
        listStyleType: 'disc',
        color: BODY,
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {items.filter(Boolean).map((item, index) => (
        <li
          key={index}
          style={{ margin: '0 0 2px', paddingLeft: 1 }}
          dangerouslySetInnerHTML={{ __html: md(item) }}
        />
      ))}
    </ul>
  );
}

function RichText({ value }: { value: string }): React.ReactElement {
  return (
    <div
      style={{ color: BODY, fontSize: 14, lineHeight: 1.55 }}
      dangerouslySetInnerHTML={{ __html: md(value) }}
    />
  );
}

function DateText({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span
      style={{
        flexShrink: 0,
        marginLeft: 16,
        color: MUTED,
        fontSize: 14,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function EducationLine({
  institution,
  degree,
  field,
}: {
  institution?: string;
  degree?: string;
  field?: string;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24 }}>
      <strong style={{ color: TEXT, fontSize: 15 }}>{institution}</strong>
      {degree && (
        <strong style={{ color: TEXT, fontSize: 15 }}>{degree}</strong>
      )}
      {field && (
        <strong style={{ color: TEXT, fontSize: 15 }}>{field}</strong>
      )}
    </div>
  );
}

function CustomItemTitle({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}): React.ReactElement {
  const isUrl = Boolean(
    title && /^(?:www\.|https?:\/\/|[\w-]+(?:\.[\w-]+)+)/i.test(title),
  );

  return (
    <span>
      {isUrl ? (
        <span style={{ color: BODY, fontSize: 14 }}>{title}</span>
      ) : (
        <strong style={{ color: TEXT, fontSize: 15 }}>{title}</strong>
      )}
      {subtitle && (
        <span style={{ color: MUTED, fontSize: 14 }}> · {subtitle}</span>
      )}
    </span>
  );
}

function RecruitSectionContent({
  section,
  lang,
}: {
  section: CanonicalResume['sections'][number];
  lang: string;
}): React.ReactElement | null {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return <RichText value={(content as unknown as SummaryContent).text} />;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    const copy = labels(lang);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24 }}>
                {item.company && (
                  <strong style={{ color: TEXT, fontSize: 15 }}>
                    {item.company}
                  </strong>
                )}
                <strong style={{ color: TEXT, fontSize: 15 }}>
                  {item.position}
                </strong>
              </div>
              <DateText>
                {dateRange(item.startDate, item.endDate, item.current, lang)}
              </DateText>
            </div>
            {item.description && (
              <div style={{ marginTop: 4 }}>
                <RichText value={item.description} />
              </div>
            )}
            {item.technologies?.length > 0 && (
              <div style={{ marginTop: 3, color: MUTED, fontSize: 13 }}>
                {copy.tech}: {item.technologies.join(' / ')}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <div style={{ marginTop: 3 }}>
                <RichText value={item.highlights.join('\n')} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    const copy = labels(lang);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <EducationLine
                institution={item.institution}
                degree={item.degree}
                field={item.field}
              />
              <DateText>
                {dateRange(item.startDate, item.endDate, true, lang)}
              </DateText>
            </div>
            {item.gpa && (
              <div style={{ marginTop: 2, color: MUTED, fontSize: 13 }}>
                {copy.gpa}: {item.gpa}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <div style={{ marginTop: 3 }}>
                <RichText value={item.highlights.join('\n')} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {categories.map((category) => (
          <div key={category.id}>
            {category.name && (
              <strong style={{ color: TEXT, fontSize: 14 }}>
                {category.name}：
              </strong>
            )}
            {category.skills.length > 0 && (
              category.name ? (
                <span style={{ color: BODY, fontSize: 14 }}>
                  {category.skills.join(' / ')}
                </span>
              ) : (
                <NumberedLines items={category.skills} />
              )
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    const copy = labels(lang);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <strong style={{ color: TEXT, fontSize: 15 }}>
                {item.name}
              </strong>
              {item.startDate && (
                <DateText>
                  {dateRange(item.startDate, item.endDate, true, lang)}
                </DateText>
              )}
            </div>
            {item.description && (
              <div style={{ marginTop: 4 }}>
                <RichText value={item.description} />
              </div>
            )}
            {item.technologies?.length > 0 && (
              <div style={{ marginTop: 3, color: MUTED, fontSize: 13 }}>
                {copy.tech}: {item.technologies.join(' / ')}
              </div>
            )}
            {item.highlights?.length > 0 && (
              <BulletedLines items={item.highlights} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    const copy = labels(lang);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <strong style={{ color: TEXT, fontSize: 15 }}>
                {item.name}
                {item.repoUrl && (
                  <a
                    href={item.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginLeft: 8,
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: 400,
                      textDecoration: 'none',
                    }}
                  >
                    {item.repoUrl}
                  </a>
                )}
              </strong>
              {item.stars > 0 && <DateText>★ {item.stars.toLocaleString()}</DateText>}
            </div>
            {item.description && (
              <div style={{ marginTop: 4 }}>
                <RichText value={item.description} />
              </div>
            )}
            {item.technologies && item.technologies.length > 0 && (
              <div style={{ marginTop: 3, color: MUTED, fontSize: 13 }}>
                {copy.tech}: {item.technologies.join(' / ')}
              </div>
            )}
            {item.highlights && item.highlights.length > 0 && (
              <div style={{ marginTop: 3 }}>
                <RichText value={item.highlights.join('\n')} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '6px 32px',
        }}
      >
        {items.map((item) => (
          <span key={item.id} style={{ color: BODY, fontSize: 14 }}>
            <strong style={{ color: TEXT }}>{item.name}</strong>
            {item.issuer && <span> · {item.issuer}</span>}
            {item.date && <span style={{ color: MUTED }}> · {item.date}</span>}
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 32px' }}>
        {items.map((item) => (
          <span key={item.id} style={{ color: BODY, fontSize: 14 }}>
            <strong style={{ color: TEXT }}>{item.language}</strong>
            {item.proficiency && <span> · {item.proficiency}</span>}
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((item) => (
          <div key={item.id} style={{ breakInside: 'avoid' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <CustomItemTitle title={item.title} subtitle={item.subtitle} />
              {item.date && <DateText>{item.date}</DateText>}
            </div>
            {item.description && (
              <div style={{ marginTop: 4 }}>
                <RichText value={item.description} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    return <QrCodeGrid content={content} />;
  }

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <div key={item.id}>
            <strong style={{ color: TEXT, fontSize: 14 }}>
              {item.name || item.title || item.language || ''}
            </strong>
            {item.description && <RichText value={item.description} />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function QrCodeGrid({
  content,
}: {
  content: Record<string, unknown>;
}): React.ReactElement | null {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs;
  if (!svgs) return null;

  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px 24px',
      }}
    >
      {validItems.map((qr) => (
        <div
          key={qr.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            width: 96,
          }}
        >
          <div
            style={{ width: 80, height: 80 }}
            dangerouslySetInnerHTML={{ __html: svgs[qr.id] }}
          />
          {qr.label && (
            <span
              style={{
                color: MUTED,
                fontSize: 10,
                lineHeight: 1.25,
                textAlign: 'center',
                wordBreak: 'break-all',
                maxWidth: 96,
              }}
            >
              {qr.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Header({
  pi,
  lang,
  avatarStyle,
}: {
  pi: PersonalInfoContent;
  lang: string;
  avatarStyle?: 'circle' | 'oneInch';
}): React.ReactElement {
  return (
    <header style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              margin: 0,
              color: '#111111',
              fontSize: 34,
              lineHeight: 1.18,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {pi.fullName || (lang === 'zh' ? '你的姓名' : 'Your Name')}
          </h1>
          <PersonalDetails details={personalDetails(pi, lang)} lang={lang} />
        </div>
        {pi.avatar && (
          <AvatarImage
            src={pi.avatar}
            avatarStyle={avatarStyle === 'circle' ? 'circle' : 'oneInch'}
            size={80}
            className="shrink-0"
            wrapperClassName="shrink-0 overflow-hidden"
          />
        )}
      </div>
    </header>
  );
}

export function RecruitPreview({ resume }: TemplateProps): React.ReactElement {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';

  return (
    <div
      className="mx-auto max-w-[210mm] bg-white shadow-lg"
      style={{ fontFamily: FONT, color: BODY }}
    >
      <Header
        pi={pi}
        lang={lang}
        avatarStyle={resume.themeConfig.avatarStyle}
      />
      {sections.map((section) => (
        <div key={section.id} className="mb-5" data-section>
          <SectionHeading>{section.title}</SectionHeading>
          <RecruitSectionContent section={section} lang={lang} />
        </div>
      ))}
    </div>
  );
}

function renderPersonalDetailsHtml(
  details: PersonalDetail[],
  lang: string,
): string {
  if (details.length === 0) return '';
  const zh = lang.toLowerCase().startsWith('zh');

  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px 0;margin-top:12px;font-size:14px;line-height:1.45;color:${BODY}">${details
    .map((entry, index) => {
      const separator = index > 0 && index !== 5
        ? '<span aria-hidden="true" style="display:inline-block;width:1px;height:13px;margin:0 10px;background:#c7cacd;vertical-align:middle"></span>'
        : '';
      const label = entry.label
        ? `<span style="color:${MUTED}">${esc(entry.label)}${zh ? '：' : ': '}</span>`
        : '';
      const icon = entry.icon === 'phone'
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6f73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>`
        : entry.icon === 'mail'
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6f73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>`
          : '';
      return `${index === 5 ? '<div style="flex-basis:100%;height:0"></div>' : ''}${separator}<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap">${label}${icon}<span>${esc(entry.value)}</span></span>`;
    })
    .join('')}</div>`;
}

function buildQrCodesHtml(content: Record<string, unknown>): string {
  const items = (content as unknown as { items: QrCodeItem[] }).items || [];
  const svgs = (content as unknown as { _qrSvgs?: Record<string, string> })._qrSvgs || {};
  const validItems = items.filter((qr) => svgs[qr.id]);
  if (validItems.length === 0) return '';

  return `<div style="display:flex;flex-wrap:wrap;gap:12px 24px">${validItems
    .map(
      (qr) =>
        `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:96px">${svgs[qr.id]}${qr.label ? `<span style="color:${MUTED};font-size:10px;line-height:1.25;text-align:center;word-break:break-all;max-width:96px">${esc(qr.label)}</span>` : ''}</div>`,
    )
    .join('')}</div>`;
}

function buildRecruitSectionHtml(
  section: CanonicalResume['sections'][number],
  lang: string,
): string {
  const content = section.content as unknown as Record<string, unknown>;

  if (section.type === 'summary') {
    return `<div style="color:${BODY};font-size:14px;line-height:1.55">${md(
      (content as unknown as SummaryContent).text,
    )}</div>`;
  }

  if (section.type === 'work_experience') {
    const items = (content as unknown as WorkExperienceContent).items || [];
    const copy = labels(lang);
    return `<div style="display:flex;flex-direction:column;gap:13px">${items
      .map(
        (item) => `<div style="break-inside:avoid">
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <div style="display:flex;flex-wrap:wrap;column-gap:24px">${item.company ? `<strong style="color:${TEXT};font-size:15px">${esc(item.company)}</strong>` : ''}<strong style="color:${TEXT};font-size:15px">${esc(item.position)}</strong></div>
            <span style="flex-shrink:0;margin-left:16px;color:${MUTED};font-size:14px;line-height:1.5;white-space:nowrap">${esc(dateRange(item.startDate, item.endDate, item.current, lang))}</span>
          </div>
          ${item.description ? `<div style="margin-top:4px;color:${BODY};font-size:14px;line-height:1.55">${md(item.description)}</div>` : ''}
          ${item.technologies?.length ? `<div style="margin-top:3px;color:${MUTED};font-size:13px">${copy.tech}: ${esc(item.technologies.join(' / '))}</div>` : ''}
          ${item.highlights?.length ? `<div style="margin-top:3px;color:${BODY};font-size:14px;line-height:1.55">${md(item.highlights.join('\n'))}</div>` : ''}
        </div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'education') {
    const items = (content as unknown as EducationContent).items || [];
    const copy = labels(lang);
    return `<div style="display:flex;flex-direction:column;gap:9px">${items
      .map(
        (item) => `<div style="break-inside:avoid">
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <div style="display:flex;flex-wrap:wrap;column-gap:24px"><strong style="color:${TEXT};font-size:15px">${esc(item.institution)}</strong>${item.degree ? `<strong style="color:${TEXT};font-size:15px">${esc(item.degree)}</strong>` : ''}${item.field ? `<strong style="color:${TEXT};font-size:15px">${esc(item.field)}</strong>` : ''}</div>
            <span style="flex-shrink:0;margin-left:16px;color:${MUTED};font-size:14px;line-height:1.5;white-space:nowrap">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>
          </div>
          ${item.gpa ? `<div style="margin-top:2px;color:${MUTED};font-size:13px">${copy.gpa}: ${esc(item.gpa)}</div>` : ''}
          ${item.highlights?.length ? `<div style="margin-top:3px;color:${BODY};font-size:14px;line-height:1.55">${md(item.highlights.join('\n'))}</div>` : ''}
        </div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'skills') {
    const categories = (content as unknown as SkillsContent).categories || [];
    return `<div style="display:flex;flex-direction:column;gap:3px">${categories
      .map(
        (category) =>
          `<div>${category.name ? `<strong style="color:${TEXT};font-size:14px">${esc(category.name)}：</strong>` : ''}${
            category.skills.length > 0
              ? category.name
                ? `<span style="color:${BODY};font-size:14px">${esc(category.skills.join(' / '))}</span>`
                : `<div style="display:flex;flex-direction:column;gap:2px">${category.skills
                    .map(
                      (skill, index) =>
                        `<div style="display:flex;align-items:baseline;gap:4px;color:${BODY};font-size:14px;line-height:1.55"><span style="flex-shrink:0">${index + 1}.</span><span style="flex:1">${md(skill)}</span></div>`,
                    )
                    .join('')}</div>`
              : ''
          }</div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'projects') {
    const items = (content as unknown as ProjectsContent).items || [];
    const copy = labels(lang);
    return `<div style="display:flex;flex-direction:column;gap:12px">${items
      .map(
        (item) => `<div style="break-inside:avoid">
          <div style="display:flex;align-items:baseline;justify-content:space-between"><strong style="color:${TEXT};font-size:15px">${esc(item.name)}</strong>${item.startDate ? `<span style="flex-shrink:0;margin-left:16px;color:${MUTED};font-size:14px;line-height:1.5;white-space:nowrap">${esc(dateRange(item.startDate, item.endDate, true, lang))}</span>` : ''}</div>
          ${item.description ? `<div style="margin-top:4px;color:${BODY};font-size:14px;line-height:1.55">${md(item.description)}</div>` : ''}
          ${item.technologies?.length ? `<div style="margin-top:3px;color:${MUTED};font-size:13px">${copy.tech}: ${esc(item.technologies.join(' / '))}</div>` : ''}
          ${item.highlights?.length ? `<ul style="margin:2px 0 0;padding-left:20px;list-style-type:disc;color:${BODY};font-size:14px;line-height:1.55">${item.highlights.filter(Boolean).map((highlight) => `<li style="margin:0 0 2px;padding-left:1px">${md(highlight)}</li>`).join('')}</ul>` : ''}
        </div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'github') {
    const items = (content as unknown as GitHubContent).items || [];
    const copy = labels(lang);
    return `<div style="display:flex;flex-direction:column;gap:12px">${items
      .map(
        (item) => `<div style="break-inside:avoid">
          <div style="display:flex;align-items:baseline;justify-content:space-between"><strong style="color:${TEXT};font-size:15px">${esc(item.name)}${item.repoUrl ? ` <a href="${esc(item.repoUrl)}" target="_blank" rel="noopener noreferrer" style="margin-left:8px;color:${MUTED};font-size:12px;font-weight:400;text-decoration:none">${esc(item.repoUrl)}</a>` : ''}</strong>${item.stars > 0 ? `<span style="flex-shrink:0;margin-left:16px;color:${MUTED};font-size:14px;line-height:1.5;white-space:nowrap">★ ${item.stars.toLocaleString()}</span>` : ''}</div>
          ${item.description ? `<div style="margin-top:4px;color:${BODY};font-size:14px;line-height:1.55">${md(item.description)}</div>` : ''}
          ${item.technologies?.length ? `<div style="margin-top:3px;color:${MUTED};font-size:13px">${copy.tech}: ${esc(item.technologies.join(' / '))}</div>` : ''}
          ${item.highlights?.length ? `<div style="margin-top:3px;color:${BODY};font-size:14px;line-height:1.55">${md(item.highlights.join('\n'))}</div>` : ''}
        </div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'certifications') {
    const items = (content as unknown as CertificationsContent).items || [];
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 32px">${items
      .map(
        (item) =>
          `<span style="color:${BODY};font-size:14px"><strong style="color:${TEXT}">${esc(item.name)}</strong>${item.issuer ? `<span> · ${esc(item.issuer)}</span>` : ''}${item.date ? `<span style="color:${MUTED}"> · ${esc(item.date)}</span>` : ''}</span>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'languages') {
    const items = (content as unknown as LanguagesContent).items || [];
    return `<div style="display:flex;flex-wrap:wrap;gap:5px 32px">${items
      .map(
        (item) =>
          `<span style="color:${BODY};font-size:14px"><strong style="color:${TEXT}">${esc(item.language)}</strong>${item.proficiency ? `<span> · ${esc(item.proficiency)}</span>` : ''}</span>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'custom') {
    const items = (content as unknown as CustomContent).items || [];
    return `<div style="display:flex;flex-direction:column;gap:9px">${items
      .map(
        (item) => `<div style="break-inside:avoid">
          <div style="display:flex;align-items:baseline;justify-content:space-between"><div>${/^(?:www\.|https?:\/\/|[\w-]+(?:\.[\w-]+)+)/i.test(item.title) ? `<span style="color:${BODY};font-size:14px">${esc(item.title)}</span>` : `<strong style="color:${TEXT};font-size:15px">${esc(item.title)}</strong>`}${item.subtitle ? `<span style="color:${MUTED};font-size:14px"> · ${esc(item.subtitle)}</span>` : ''}</div>${item.date ? `<span style="flex-shrink:0;margin-left:16px;color:${MUTED};font-size:14px;line-height:1.5;white-space:nowrap">${esc(item.date)}</span>` : ''}</div>
          ${item.description ? `<div style="margin-top:4px;color:${BODY};font-size:14px;line-height:1.55">${md(item.description)}</div>` : ''}
        </div>`,
      )
      .join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(content);

  if ('items' in content && Array.isArray(content.items)) {
    const items = content.items as GenericItem[];
    return `<div style="display:flex;flex-direction:column;gap:6px">${items
      .map(
        (item) =>
          `<div><strong style="color:${TEXT};font-size:14px">${esc(item.name || item.title || item.language || '')}</strong>${item.description ? `<div style="color:${BODY};font-size:14px;line-height:1.55">${md(item.description)}</div>` : ''}</div>`,
      )
      .join('')}</div>`;
  }

  return '';
}

export function buildRecruitHtml(resume: CanonicalResume): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume.sections);
  const lang = resume.language || 'en';
  const details = personalDetails(pi, lang);

  return `<div class="mx-auto max-w-[210mm] bg-white shadow-lg" style="font-family:${FONT};color:${BODY}">
    <header style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px">
        <div style="min-width:0;flex:1">
          <h1 style="margin:0;color:#111111;font-size:34px;line-height:1.18;font-weight:700;letter-spacing:1px">${esc(pi.fullName || (lang === 'zh' ? '你的姓名' : 'Your Name'))}</h1>
          ${renderPersonalDetailsHtml(details, lang)}
        </div>
        ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="object-cover" style="width:80px;height:${resume.themeConfig.avatarStyle === 'circle' ? '80px' : '112px'};border-radius:${resume.themeConfig.avatarStyle === 'circle' ? '9999px' : '4px'};object-fit:cover;flex-shrink:0"/>` : ''}
      </div>
    </header>
    ${sections
      .map(
        (section) => `<div class="mb-5" data-section>
          <h2 style="margin:0 0 10px;padding-bottom:5px;border-bottom:1.5px solid ${RULE};color:${TEXT};font-family:${FONT};font-size:20px;line-height:1.25;font-weight:700;letter-spacing:0.5px">${esc(section.title)}</h2>
          ${buildRecruitSectionHtml(section, lang)}
        </div>`,
      )
      .join('')}
  </div>`;
}

export const recruitTemplate: UnifiedTemplate = {
  id: 'recruit',
  name: 'Plain',
  PreviewComponent: RecruitPreview,
  buildHtml: buildRecruitHtml,
};
