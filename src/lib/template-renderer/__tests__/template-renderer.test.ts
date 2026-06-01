import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Resume } from '@/types/resume';
import { getUnifiedTemplate, getUnifiedTemplateIds, toCanonicalResume } from '@/lib/template-renderer';
import { buildContactEntries } from '@/lib/template-renderer/contact-info';

function createSampleResume(template: string): Resume {
  const now = new Date('2026-03-31T00:00:00.000Z');

  return {
    id: 'resume-1',
    userId: 'user-1',
    title: 'Senior Frontend Engineer',
    template,
    themeConfig: {
      primaryColor: '#111827',
      accentColor: '#e94560',
      fontFamily: 'Inter',
      fontSize: 'medium',
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
      avatarStyle: 'circle',
    },
    isDefault: false,
    language: 'en',
    targetJobTitle: null,
    targetCompany: null,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'summary',
        resumeId: 'resume-1',
        type: 'summary',
        title: 'Summary',
        sortOrder: 2,
        visible: true,
        content: {
          text: 'Built **shipping** systems for global teams.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'work',
        resumeId: 'resume-1',
        type: 'work_experience',
        title: 'Experience',
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: 'work-1',
              company: 'JobPilot',
              position: 'Frontend Engineer',
              startDate: '2023-01',
              endDate: null,
              current: true,
              description: 'Delivered cross-platform resume rendering.',
              technologies: ['React', 'TypeScript'],
              highlights: ['Cut export regressions by 80%'],
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'skills',
        resumeId: 'resume-1',
        type: 'skills',
        title: 'Skills',
        sortOrder: 4,
        visible: true,
        content: {
          categories: [
            {
              id: 'skills-1',
              name: 'Core',
              skills: ['Accessibility', 'Design Systems', 'Tauri'],
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'certifications',
        resumeId: 'resume-1',
        type: 'certifications',
        title: 'Awards',
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: 'award-1',
              name: 'Outstanding Project Award',
              issuer: 'Template Guild',
              date: '2025-03',
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'personal',
        resumeId: 'resume-1',
        type: 'personal_info',
        title: 'Personal Info',
        sortOrder: 1,
        visible: true,
        content: {
          fullName: 'Alex Template',
          jobTitle: 'Senior Frontend Engineer',
          email: 'alex@example.com',
          phone: '123-456-7890',
          location: 'Hong Kong',
          website: 'https://example.com',
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

function countSections(markup: string): number {
  return (markup.match(/data-section/g) || []).length;
}

function assertAppearsInOrder(markup: string, values: string[]): void {
  let cursor = 0;

  for (const value of values) {
    const index = markup.indexOf(value, cursor);
    assert.notEqual(index, -1, `"${value}" should appear in markup`);
    cursor = index + value.length;
  }
}

function testCanonicalResumeMetadata(): void {
  const canonical = toCanonicalResume(createSampleResume('classic'));

  assert.equal(canonical.personalInfo.fullName, 'Alex Template');
  assert.deepEqual(
    canonical.sections.map((section) => ({
      id: section.id,
      visible: section.visible,
      sortOrder: section.sortOrder,
    })),
    [
      { id: 'personal', visible: true, sortOrder: 1 },
      { id: 'summary', visible: true, sortOrder: 2 },
      { id: 'work', visible: true, sortOrder: 3 },
      { id: 'skills', visible: true, sortOrder: 4 },
      { id: 'certifications', visible: true, sortOrder: 5 },
    ],
  );
}

function testTemplateParity(
  templateId: string,
  expectedSectionTitles = ['Summary', 'Experience', 'Skills'],
): void {
  const unifiedTemplate = getUnifiedTemplate(templateId);
  assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

  const canonical = toCanonicalResume(createSampleResume(templateId));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assert.equal(countSections(previewMarkup), countSections(exportMarkup));
  assertAppearsInOrder(previewMarkup, expectedSectionTitles);
  assertAppearsInOrder(exportMarkup, expectedSectionTitles);
  assert.match(previewMarkup, /Alex Template/);
  assert.match(exportMarkup, /Alex Template/);
  assert.match(previewMarkup, /<strong>shipping<\/strong>/);
  assert.match(exportMarkup, /<strong>shipping<\/strong>/);
}

function testProfessionalSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('professional');
  assert.ok(unifiedTemplate, 'Expected "professional" to be registered');

  const canonical = toCanonicalResume(createSampleResume('professional'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testProfessionalProfileContactInfoOrder(): void {
  const unifiedTemplate = getUnifiedTemplate('professional');
  assert.ok(unifiedTemplate, 'Expected "professional" to be registered');

  const resume = createSampleResume('professional');
  const personalSection = resume.sections.find((section) => section.type === 'personal_info');
  assert.ok(personalSection, 'Expected personal info section to exist');

  personalSection.content = {
    fullName: 'Alex Template',
    jobTitle: 'AI Product Manager',
    gender: 'Female',
    age: '29',
    hometown: 'Hangzhou',
    politicalStatus: 'CPC Member',
    phone: '123-456-7890',
    wechat: 'alex-wechat',
    email: 'alex@example.com',
    yearsOfExperience: '5 years',
    location: 'Hong Kong',
    website: 'https://example.com',
  };

  const canonical = toCanonicalResume(resume);
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);
  const expectedOrder = [
    'Alex Template',
    'AI Product Manager',
    '5 years',
    'Hong Kong',
    '123-456-7890',
    'alex@example.com',
    'alex-wechat',
    'https://example.com',
    'Female',
    '29',
    'Hangzhou',
    'CPC Member',
  ];

  assertAppearsInOrder(previewMarkup, expectedOrder);
  assertAppearsInOrder(exportMarkup, expectedOrder);
}

function testConsultantSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('consultant');
  assert.ok(unifiedTemplate, 'Expected "consultant" to be registered');

  const canonical = toCanonicalResume(createSampleResume('consultant'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testClassicSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('classic');
  assert.ok(unifiedTemplate, 'Expected "classic" to be registered');

  const canonical = toCanonicalResume(createSampleResume('classic'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testMinimalSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('minimal');
  assert.ok(unifiedTemplate, 'Expected "minimal" to be registered');

  const canonical = toCanonicalResume(createSampleResume('minimal'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility\s*\/\s*Design Systems\s*\/\s*Tauri/);
}

function testInlineSkillsTemplatesRenderCommaSeparatedText(): void {
  for (const templateId of ['formal', 'euro', 'nordic', 'timeline', 'elegant', 'legal', 'finance', 'medical', 'corporate']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSampleResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    assert.match(previewMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
    assert.match(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
    assert.doesNotMatch(previewMarkup, /<li[^>]*>Accessibility<\/li>/);
    assert.doesNotMatch(exportMarkup, /<li[^>]*>Accessibility<\/li>/);
  }
}

function createWorkBulletResume(template: string): Resume {
  const resume = createSampleResume(template);
  const workSection = resume.sections.find((section) => section.type === 'work_experience');
  assert.ok(workSection, 'Expected work experience section to exist');

  workSection.content = {
    items: [
      {
        id: 'work-1',
        company: 'JobPilot',
        position: 'Frontend Engineer',
        startDate: '2023-01',
        endDate: null,
        current: true,
        description: '- Led renderer migration\n- Unified preview and export output\n- Removed list alignment drift',
        technologies: ['React', 'TypeScript'],
        highlights: [
          'Led renderer migration',
          'Unified preview and export output',
          'Removed list alignment drift',
        ],
      },
    ],
  };

  return resume;
}

function createSummaryBulletResume(template: string): Resume {
  const resume = createSampleResume(template);
  const summarySection = resume.sections.find((section) => section.type === 'summary');
  assert.ok(summarySection, 'Expected summary section to exist');

  summarySection.content = {
    text: '- Led renderer migration\n- Unified preview and export output\n- Removed list alignment drift',
  };

  for (const section of resume.sections) {
    if (section.type !== 'summary' && section.type !== 'personal_info') {
      section.visible = false;
    }
  }

  return resume;
}

function firstUlTagAfter(markup: string, label: string): string {
  const index = markup.indexOf(label);
  assert.notEqual(index, -1, `Expected "${label}" to appear in markup`);
  const match = markup.slice(index).match(/<ul\b[^>]*>/);
  assert.ok(match, `Expected a list after "${label}"`);
  return match[0];
}

function firstUlTag(markup: string): string {
  const match = markup.match(/<ul\b[^>]*>/);
  assert.ok(match, 'Expected markup to contain a list');
  return match[0];
}

function testScientistSkillsRenderAsSemicolonSeparatedText(): void {
  const unifiedTemplate = getUnifiedTemplate('scientist');
  assert.ok(unifiedTemplate, 'Expected "scientist" to be registered');

  const canonical = toCanonicalResume(createSampleResume('scientist'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assert.match(previewMarkup, /Accessibility;\s*Design Systems;\s*Tauri/);
  assert.match(exportMarkup, /Accessibility;\s*Design Systems;\s*Tauri/);
  assert.doesNotMatch(previewMarkup, /<li[^>]*>Accessibility<\/li>/);
  assert.doesNotMatch(exportMarkup, /<li[^>]*>Accessibility<\/li>/);
}

function testAcademicSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('academic');
  assert.ok(unifiedTemplate, 'Expected "academic" to be registered');

  const canonical = toCanonicalResume(createSampleResume('academic'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testAtsSkillsRenderAsListItems(): void {
  const unifiedTemplate = getUnifiedTemplate('ats');
  assert.ok(unifiedTemplate, 'Expected "ats" to be registered');

  const canonical = toCanonicalResume(createSampleResume('ats'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${skill}</li>`));
  }

  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testDeveloperSkillsRenderAsPipeSeparatedText(): void {
  const unifiedTemplate = getUnifiedTemplate('developer');
  assert.ok(unifiedTemplate, 'Expected "developer" to be registered');

  const canonical = toCanonicalResume(createSampleResume('developer'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assert.match(previewMarkup, /Accessibility\s*\|\s*Design Systems\s*\|\s*Tauri/);
  assert.match(exportMarkup, /Accessibility\s*\|\s*Design Systems\s*\|\s*Tauri/);
  assert.doesNotMatch(previewMarkup, /<li[^>]*>Accessibility<\/li>/);
  assert.doesNotMatch(exportMarkup, /<li[^>]*>Accessibility<\/li>/);
}

function testPillSkillTemplatesRenderTagText(): void {
  for (const templateId of ['executive', 'designer', 'teacher', 'clean', 'creative']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSampleResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
      assert.match(previewMarkup, new RegExp(`rounded[^"]*[^>]*>${skill}</span>`));
      assert.match(exportMarkup, new RegExp(`rounded[^"]*[^>]*>${skill}</span>`));
    }

    if (templateId === 'teacher') {
      assert.match(previewMarkup, /Core[\s\S]*Accessibility[\s\S]*Design Systems[\s\S]*Tauri/);
      assert.match(exportMarkup, /Core[\s\S]*Accessibility[\s\S]*Design Systems[\s\S]*Tauri/);
    }
    assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
    assert.doesNotMatch(exportMarkup, /<li[^>]*>Accessibility<\/li>/);
  }
}

function testListCertificationTemplatesRenderAwardsAsBulletsWithRightAlignedDate(): void {
  const templateIds = [
    'academic',
    'ats',
    'classic',
    'clean',
    'consultant',
    'corporate',
    'developer',
    'elegant',
    'euro',
    'executive',
    'finance',
    'formal',
    'legal',
    'medical',
    'minimal',
    'modern-minimal',
    'nordic',
    'professional',
    'timeline',
  ];

  for (const templateId of templateIds) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSampleResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(markup, /<ul[^>]*list-disc[^>]*>(?:(?!<\/ul>)[\s\S])*<li[^>]*>(?:(?!<\/ul>)[\s\S])*Outstanding Project Award/);
      assert.match(markup, /Outstanding Project Award[\s\S]*Template Guild[\s\S]*class="[^"]*shrink-0[^"]*"[^>]*>2025-03/);
    }
  }
}

function testNonListCertificationTemplatesKeepSpecialAwardLayouts(): void {
  for (const templateId of ['compact', 'creative', 'designer', 'modern', 'scientist', 'sidebar', 'swiss', 'two-column']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSampleResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    assert.match(previewMarkup, /Outstanding Project Award/);
    assert.match(exportMarkup, /Outstanding Project Award/);
    assert.doesNotMatch(previewMarkup, /<ul[^>]*list-disc[^>]*>(?:(?!<\/ul>)[\s\S])*Outstanding Project Award/);
    assert.doesNotMatch(exportMarkup, /<ul[^>]*list-disc[^>]*>(?:(?!<\/ul>)[\s\S])*Outstanding Project Award/);
  }
}

function testCustomBulletCertificationTemplatesRightAlignAwardDate(): void {
  for (const templateId of ['engineer', 'teacher']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSampleResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(markup, /<ul[^>]*list-none[^>]*>(?:(?!<\/ul>)[\s\S])*<li[^>]*>(?:(?!<\/ul>)[\s\S])*Outstanding Project Award/);
      assert.match(markup, /Outstanding Project Award[\s\S]*Template Guild[\s\S]*class="[^"]*shrink-0[^"]*"[^>]*>2025-03/);
      assert.doesNotMatch(markup, /Template Guild[\s\S]*\(2025-03\)/);
    }
  }
}

function testIndentedResponsibilityListsUseTemplateSpecificOffsets(): void {
  const cases = [
    { templateId: 'academic', expectedPadding: '1.25rem' },
    { templateId: 'ats', expectedPadding: '1.25rem' },
    { templateId: 'compact', expectedPadding: '0.875rem' },
    { templateId: 'consultant', expectedPadding: '1.25rem' },
    { templateId: 'corporate', expectedPadding: '1.25rem' },
    { templateId: 'elegant', expectedPadding: '1.25rem' },
    { templateId: 'executive', expectedPadding: '1.25rem' },
    { templateId: 'formal', expectedPadding: '1.25rem' },
    { templateId: 'legal', expectedPadding: '1.25rem' },
    { templateId: 'professional', expectedPadding: '1.25rem' },
  ];

  for (const { templateId, expectedPadding } of cases) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createWorkBulletResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(firstUlTagAfter(markup, 'Responsibilities'), new RegExp(`padding-left:${expectedPadding}`));
    }
  }
}

function testCustomWorkListsReuseTemplateSpecificBulletLayouts(): void {
  const cases = [
    { templateId: 'creative', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'developer', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'engineer', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'scientist', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'swiss', expectedListTag: 'class="mt-1 list-none space-y-0.5"' },
    { templateId: 'teacher', expectedListTag: 'class="space-y-0.5"' },
  ];

  for (const { templateId, expectedListTag } of cases) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createWorkBulletResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(firstUlTagAfter(markup, 'Responsibilities'), new RegExp(expectedListTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(firstUlTagAfter(markup, 'Key Achievements'), new RegExp(expectedListTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
}

function testCustomSummaryListsReuseTemplateSpecificBulletLayouts(): void {
  const cases = [
    { templateId: 'creative', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'developer', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'engineer', expectedListTag: 'class="space-y-0.5"' },
    { templateId: 'scientist', expectedListTag: 'class="space-y-0.5 pl-6"' },
    { templateId: 'swiss', expectedListTag: 'class="list-none space-y-0.5"' },
    { templateId: 'teacher', expectedListTag: 'class="space-y-0.5"' },
  ];

  for (const { templateId, expectedListTag } of cases) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const canonical = toCanonicalResume(createSummaryBulletResume(templateId));
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(firstUlTag(markup), new RegExp(expectedListTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
}

function testCompactKeepsSidebarSectionsBeforeMainSections(): void {
  const unifiedTemplate = getUnifiedTemplate('compact');
  assert.ok(unifiedTemplate, 'Expected "compact" to be registered');

  const canonical = toCanonicalResume(createSampleResume('compact'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assertAppearsInOrder(previewMarkup, ['Skills', 'Summary', 'Experience']);
  assertAppearsInOrder(exportMarkup, ['Skills', 'Summary', 'Experience']);
  assert.match(previewMarkup, /Core[\s\S]*Accessibility,\s*Design Systems,\s*Tauri/);
  assert.match(exportMarkup, /Core[\s\S]*Accessibility,\s*Design Systems,\s*Tauri/);
}

function testEngineerSkillsRenderAsTechnicalTags(): void {
  const unifiedTemplate = getUnifiedTemplate('engineer');
  assert.ok(unifiedTemplate, 'Expected "engineer" to be registered');

  const canonical = toCanonicalResume(createSampleResume('engineer'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`border[^"]*px-2[^"]*[^>]*>${skill}</span>`));
    assert.match(exportMarkup, new RegExp(`border[^"]*px-2[^"]*[^>]*>${skill}</span>`));
  }
  assert.doesNotMatch(exportMarkup, /Accessibility,\s*Design Systems,\s*Tauri/);
}

function testTwoColumnKeepsSidebarSectionsBeforeMainSections(): void {
  const unifiedTemplate = getUnifiedTemplate('two-column');
  assert.ok(unifiedTemplate, 'Expected "two-column" to be registered');

  const canonical = toCanonicalResume(createSampleResume('two-column'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assertAppearsInOrder(previewMarkup, ['Skills', 'Summary', 'Experience']);
  assertAppearsInOrder(exportMarkup, ['Skills', 'Summary', 'Experience']);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`bg-white/10[^"]*[^>]*>${skill}</span>`));
    assert.match(exportMarkup, new RegExp(`bg-white/10[^"]*[^>]*>${skill}</span>`));
  }
}

function testSidebarKeepsSidebarSectionsBeforeMainSections(): void {
  const unifiedTemplate = getUnifiedTemplate('sidebar');
  assert.ok(unifiedTemplate, 'Expected "sidebar" to be registered');

  const canonical = toCanonicalResume(createSampleResume('sidebar'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assertAppearsInOrder(previewMarkup, ['Skills', 'Summary', 'Experience']);
  assertAppearsInOrder(exportMarkup, ['Skills', 'Summary', 'Experience']);

  for (const skill of ['Accessibility', 'Design Systems', 'Tauri']) {
    assert.match(previewMarkup, new RegExp(`background-color:rgba\\(59,130,246,0\\.3\\)[^>]*>${skill}</span>`));
    assert.match(exportMarkup, new RegExp(`background-color:rgba\\(59,130,246,0\\.3\\)[^>]*>${skill}</span>`));
  }
}

function testSwissHighlightsRenderAsRedBulletRows(): void {
  const unifiedTemplate = getUnifiedTemplate('swiss');
  assert.ok(unifiedTemplate, 'Expected "swiss" to be registered');

  const resume = createSampleResume('swiss');
  const now = new Date('2026-03-31T00:00:00.000Z');
  resume.sections.push({
    id: 'project',
    resumeId: 'resume-1',
    type: 'projects',
    title: 'Projects',
    sortOrder: 5,
    visible: true,
    content: {
      items: [
        {
          id: 'project-1',
          name: 'Swiss Grid Export',
          startDate: '2024-01',
          endDate: '2024-12',
          description: 'Kept strict grid alignment.',
          technologies: ['Grid', 'PDF'],
          highlights: ['Rendered red bullet rows'],
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  const canonical = toCanonicalResume(resume);
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assert.match(previewMarkup, /background-color:#dc2626[\s\S]*Rendered red bullet rows/);
  assert.match(exportMarkup, /background-color:#dc2626[\s\S]*Rendered red bullet rows/);
  assert.match(previewMarkup, /grid-cols-\[140px_1fr\][\s\S]*Swiss Grid Export/);
  assert.match(exportMarkup, /grid-cols-\[140px_1fr\][\s\S]*Swiss Grid Export/);
}

function testLongProjectContentSurvivesKeyTemplates(): void {
  const longName = 'International Multi-Region Resume Rendering Platform With Extremely Long Project Title';
  const technologies = ['React Server Components', 'PDF Export Pipeline', 'Cross Platform Desktop Runtime', 'Drag And Drop Ordering'];
  const highlights = ['Kept a long achievement bullet readable after wrapping', 'Preserved project metadata and technology order'];

  for (const templateId of ['modern-minimal', 'developer', 'clean']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const resume = createSampleResume(templateId);
    const now = new Date('2026-03-31T00:00:00.000Z');
    resume.sections.push({
      id: `long-project-${templateId}`,
      resumeId: 'resume-1',
      type: 'projects',
      title: 'Projects',
      sortOrder: 5,
      visible: true,
      content: {
        items: [
          {
            id: `project-${templateId}`,
            name: longName,
            startDate: '2024-01',
            endDate: '2025-06',
            description: 'A long project description that should keep the renderer stable across preview and export.',
            technologies,
            highlights,
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    });

    const canonical = toCanonicalResume(resume);
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assertAppearsInOrder(markup, [longName, '2024-01', '2025-06']);
      for (const technology of technologies) {
        assert.match(markup, new RegExp(technology));
      }
      for (const highlight of highlights) {
        assert.match(markup, new RegExp(`<li[^>]*>[\\s\\S]*${highlight}`));
      }
    }
  }
}

function testSharedProfileContactInfoOrder(): void {
  const expectedOrder = [
    'Alex Template',
    'AI Product Manager',
    '5 years',
    'Hong Kong',
    '123-456-7890',
    'alex@example.com',
    'alex-wechat',
    'https://example.com',
    'Female',
    '29',
    'Hangzhou',
    'CPC Member',
  ];

  for (const templateId of ['classic', 'modern', 'consultant', 'minimal']) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const resume = createSampleResume(templateId);
    const personalSection = resume.sections.find((section) => section.type === 'personal_info');
    assert.ok(personalSection, 'Expected personal info section to exist');

    personalSection.content = {
      fullName: 'Alex Template',
      jobTitle: 'AI Product Manager',
      gender: 'Female',
      age: '29',
      hometown: 'Hangzhou',
      politicalStatus: 'CPC Member',
      phone: '123-456-7890',
      wechat: 'alex-wechat',
      email: 'alex@example.com',
      yearsOfExperience: '5 years',
      location: 'Hong Kong',
      website: 'https://example.com',
    };

    const canonical = toCanonicalResume(resume);
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    assertAppearsInOrder(previewMarkup, expectedOrder);
    assertAppearsInOrder(exportMarkup, expectedOrder);
  }
}

function testModernMinimalProjectAndEducationHighlightsRenderAsBullets(): void {
  const unifiedTemplate = getUnifiedTemplate('modern-minimal');
  assert.ok(unifiedTemplate, 'Expected "modern-minimal" to be registered');

  const resume = createSampleResume('modern-minimal');
  const now = new Date('2026-03-31T00:00:00.000Z');

  resume.sections.push(
    {
      id: 'project',
      resumeId: 'resume-1',
      type: 'projects',
      title: 'Projects',
      sortOrder: 5,
      visible: true,
      content: {
        items: [
          {
            id: 'project-1',
            name: 'Export Parity',
            startDate: '2024-01',
            endDate: '2024-12',
            description: 'Aligned preview and export rendering.',
            technologies: ['HTML', 'PDF'],
            highlights: ['Restored project bullets'],
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'education',
      resumeId: 'resume-1',
      type: 'education',
      title: 'Education',
      sortOrder: 6,
      visible: true,
      content: {
        items: [
          {
            id: 'education-1',
            institution: 'Template University',
            degree: 'MSc',
            field: 'Computer Science',
            startDate: '2020-09',
            endDate: '2022-06',
            highlights: ['Restored education bullets'],
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    },
  );

  const canonical = toCanonicalResume(resume);
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  for (const highlight of ['Restored project bullets', 'Restored education bullets']) {
    assert.match(previewMarkup, new RegExp(`<li[^>]*>${highlight}</li>`));
    assert.match(exportMarkup, new RegExp(`<li[^>]*>${highlight}</li>`));
  }

  assert.match(exportMarkup, /<ul[^>]*(?:list-disc|list-style-type:disc)[^>]*>[\s\S]*Restored project bullets/);
  assert.match(exportMarkup, /<ul[^>]*(?:list-disc|list-style-type:disc)[^>]*>[\s\S]*Restored education bullets/);
  assert.match(previewMarkup, /class="flex w-full items-baseline justify-between gap-3"[\s\S]*Export Parity[\s\S]*class="shrink-0 text-right text-xs"[\s\S]*2024-01[\s\S]*2024-12/);
  assert.match(exportMarkup, /display:flex;width:100%;justify-content:space-between;align-items:baseline;gap:12px[\s\S]*Export Parity[\s\S]*text-align:right[\s\S]*2024-01[\s\S]*2024-12/);
}

function testModernMinimalHeaderAlignsLeftWhenAvatarMissing(): void {
  const unifiedTemplate = getUnifiedTemplate('modern-minimal');
  assert.ok(unifiedTemplate, 'Expected "modern-minimal" to be registered');

  const canonical = toCanonicalResume(createSampleResume('modern-minimal'));
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);

  assert.doesNotMatch(previewMarkup, /class="text-center"[\s\S]*Alex Template/);
  assert.match(previewMarkup, /text-align:left/);
  assert.match(exportMarkup, /<div style="text-align:left">[\s\S]*Alex Template/);
  assert.match(exportMarkup, /font-size:13px;color:#6B7280;[^"]*text-align:left/);
}

function testModernMinimalProfileContactInfoOrder(): void {
  const unifiedTemplate = getUnifiedTemplate('modern-minimal');
  assert.ok(unifiedTemplate, 'Expected "modern-minimal" to be registered');

  const resume = createSampleResume('modern-minimal');
  const personalSection = resume.sections.find((section) => section.type === 'personal_info');
  assert.ok(personalSection, 'Expected personal info section to exist');

  const profileContent = {
    fullName: 'Alex Template',
    jobTitle: 'AI Product Manager',
    gender: 'Female',
    age: '29',
    hometown: 'Hangzhou',
    politicalStatus: 'CPC Member',
    phone: '123-456-7890',
    wechat: 'alex-wechat',
    email: 'alex@example.com',
    yearsOfExperience: '5 years',
    location: 'Hong Kong',
    website: 'https://example.com',
  };
  personalSection.content = profileContent;

  const { row1, row2 } = buildContactEntries(profileContent, { variant: 'profile' });
  assert.deepEqual(row1.map((entry) => entry.value), [
    'AI Product Manager',
    '5 years',
    'Hong Kong',
    '123-456-7890',
    'alex@example.com',
  ]);
  assert.deepEqual(row2.map((entry) => entry.value), [
    'alex-wechat',
    'https://example.com',
    'Female',
    '29',
    'Hangzhou',
    'CPC Member',
  ]);

  const canonical = toCanonicalResume(resume);
  const previewMarkup = renderToStaticMarkup(
    React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
  );
  const exportMarkup = unifiedTemplate.buildHtml(canonical);
  const expectedOrder = [
    'Alex Template',
    'AI Product Manager',
    '5 years',
    'Hong Kong',
    '123-456-7890',
    'alex@example.com',
    'alex-wechat',
    'https://example.com',
    'Female',
    '29',
    'Hangzhou',
    'CPC Member',
  ];

  assertAppearsInOrder(previewMarkup, expectedOrder);
  assertAppearsInOrder(exportMarkup, expectedOrder);
}

function testAllUnifiedTemplatesSupportBasicMarkdownSyntax(): void {
  const summaryMarkdown = [
    'Built **shipping** renderer with `tsx` pipeline.',
    '- Stabilized preview output',
    '- Stabilized export output',
  ].join('\n');

  for (const templateId of getUnifiedTemplateIds()) {
    const unifiedTemplate = getUnifiedTemplate(templateId);
    assert.ok(unifiedTemplate, `Expected "${templateId}" to be registered`);

    const resume = createSampleResume(templateId);
    const summarySection = resume.sections.find((section) => section.type === 'summary');
    assert.ok(summarySection, 'Expected summary section to exist');

    summarySection.content = { text: summaryMarkdown };

    for (const section of resume.sections) {
      if (section.type !== 'summary' && section.type !== 'personal_info') {
        section.visible = false;
      }
    }

    const canonical = toCanonicalResume(resume);
    const previewMarkup = renderToStaticMarkup(
      React.createElement(unifiedTemplate.PreviewComponent, { resume: canonical }),
    );
    const exportMarkup = unifiedTemplate.buildHtml(canonical);

    for (const markup of [previewMarkup, exportMarkup]) {
      assert.match(markup, /<strong>shipping<\/strong>/);
      assert.match(markup, /<code>tsx<\/code>/);
      assert.match(markup, /<li[^>]*>[\s\S]*Stabilized preview output[\s\S]*<\/li>/);
      assert.match(markup, /<li[^>]*>[\s\S]*Stabilized export output[\s\S]*<\/li>/);
    }
  }
}

testCanonicalResumeMetadata();
testTemplateParity('classic');
testTemplateParity('modern');
testTemplateParity('consultant');
testTemplateParity('professional');
testTemplateParity('ats');
testTemplateParity('minimal');
testTemplateParity('formal');
testTemplateParity('developer', ['SUMMARY', 'EXPERIENCE', 'SKILLS']);
testTemplateParity('engineer');
testTemplateParity('euro');
testTemplateParity('nordic');
testTemplateParity('timeline');
testTemplateParity('elegant');
testTemplateParity('executive');
testTemplateParity('designer');
testTemplateParity('creative');
testTemplateParity('compact', ['Skills', 'Summary', 'Experience']);
testTemplateParity('two-column', ['Skills', 'Summary', 'Experience']);
testTemplateParity('sidebar', ['Skills', 'Summary', 'Experience']);
testTemplateParity('swiss');
testTemplateParity('clean');
testTemplateParity('corporate');
testTemplateParity('finance');
testTemplateParity('medical');
testTemplateParity('teacher');
testTemplateParity('legal');
testTemplateParity('scientist');
testTemplateParity('academic');
testProfessionalSkillsRenderAsListItems();
testProfessionalProfileContactInfoOrder();
testConsultantSkillsRenderAsListItems();
testClassicSkillsRenderAsListItems();
testMinimalSkillsRenderAsListItems();
testInlineSkillsTemplatesRenderCommaSeparatedText();
testScientistSkillsRenderAsSemicolonSeparatedText();
testAcademicSkillsRenderAsListItems();
testAtsSkillsRenderAsListItems();
testDeveloperSkillsRenderAsPipeSeparatedText();
testPillSkillTemplatesRenderTagText();
testListCertificationTemplatesRenderAwardsAsBulletsWithRightAlignedDate();
testNonListCertificationTemplatesKeepSpecialAwardLayouts();
testCustomBulletCertificationTemplatesRightAlignAwardDate();
testIndentedResponsibilityListsUseTemplateSpecificOffsets();
testCustomWorkListsReuseTemplateSpecificBulletLayouts();
testCustomSummaryListsReuseTemplateSpecificBulletLayouts();
testEngineerSkillsRenderAsTechnicalTags();
testCompactKeepsSidebarSectionsBeforeMainSections();
testTwoColumnKeepsSidebarSectionsBeforeMainSections();
testSidebarKeepsSidebarSectionsBeforeMainSections();
testSwissHighlightsRenderAsRedBulletRows();
testLongProjectContentSurvivesKeyTemplates();
testSharedProfileContactInfoOrder();
testModernMinimalProjectAndEducationHighlightsRenderAsBullets();
testModernMinimalHeaderAlignsLeftWhenAvatarMissing();
testModernMinimalProfileContactInfoOrder();
testAllUnifiedTemplatesSupportBasicMarkdownSyntax();
