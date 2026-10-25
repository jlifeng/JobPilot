import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import type { Resume, ResumeSection } from "../../types/resume";
import type { Resume as SharedResume } from "@/types/resume";
import { ResumePreview } from "@/components/preview/resume-preview";
import {
  getUnifiedTemplate,
  toCanonicalResume,
} from "@/lib/template-renderer";
import { TEMPLATES } from "@/lib/constants";
import { TEMPLATE_MATRIX_GROUPS } from "@/lib/template-matrix";
import { templateLabelsMap } from "@/lib/template-labels";

const CREATED_AT = "2026-10-25T00:00:00.000Z";

function section<T extends ResumeSection["content"]>(
  type: string,
  title: string,
  content: T,
  sortOrder: number,
): ResumeSection {
  return {
    id: type,
    resumeId: "resume-recruit",
    type,
    title,
    sortOrder,
    visible: true,
    content,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function createRecruitResume(): Resume {
  return {
    id: "resume-recruit",
    userId: "desktop-workspace",
    title: "Product Manager Resume",
    template: "recruit",
    themeConfig: {
      primaryColor: "#202124",
      accentColor: "#d8dadd",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 36, right: 40, bottom: 36, left: 40 },
      sectionSpacing: 16,
      avatarStyle: "oneInch",
    },
    isDefault: false,
    language: "zh",
    targetJobTitle: null,
    targetCompany: null,
    sections: [
      section(
        "personal_info",
        "个人信息",
        {
          fullName: "直小聘",
          jobTitle: "产品经理",
          age: "1994/8",
          gender: "男",
          email: "liushiwen@kanzhun.com",
          phone: "16666666666",
          location: "北京",
          availability: "离职-随时到岗",
          yearsOfExperience: "3年工作经验",
          expectedSalary: "20-30k",
        },
        0,
      ),
      section(
        "work_experience",
        "工作经历",
        {
          items: [
            {
              id: "work-1",
              company: "BOSS直聘",
              position: "搜索策略产品经理实习生",
              startDate: "2012/10",
              endDate: "2016/7",
              current: false,
              description:
                "内容：1. 通过需求分析，数据分析，竞品分析协助产品经理对DAU超千万的酷我音乐搜索策略进行优化。\n2. 独立完成每日搜索运营数据分析以及收集用户反馈\n3. 根据分析线上用户行为数据，独立提出Q3,Q4两个季度的搜索提示词改进策略，上线后半月内击率平均上升3%，播放转化率平均上升2%\n4. 负责语音搜索与热门搜索排行榜的需求分析与原型设计，与设计人员及开发、测试人员沟通。",
              technologies: [],
              highlights: [
                "成绩：整理107个赛中策略点，输出赛中情感化表现规则与落地方案，并通过了需求评审，与软件测、美术侧对接实现了30个赛中场景情感化（语音、表情、动作）的落地；针对机器人游戏功能提出两个策略点并输出相demo视频。",
              ],
            },
          ],
        },
        1,
      ),
      section(
        "education",
        "教育经历",
        {
          items: [
            {
              id: "edu-1",
              institution: "中国矿业大学",
              degree: "硕士",
              field: "交通运输工程",
              startDate: "2016/9",
              endDate: "2019/7",
              highlights: [
                "研究生学生会副主席研究生学生会副主席研究生学生会副主席研究生学生会副主席",
              ],
            },
            {
              id: "edu-2",
              institution: "大连海事大学",
              degree: "本科",
              field: "",
              startDate: "2012/9",
              endDate: "2016/7",
              highlights: ["艺术团团长；相声社副团长"],
            },
          ],
        },
        2,
      ),
      section(
        "skills",
        "个人优势",
        {
          categories: [
            {
              id: "skills-1",
              name: "",
              skills: [
                "丰富的运营经验，活动推广、文案撰写能力强，具有一定的执行能力、审美能力",
                "熟练使用office办公软件、Pr、Ps等软件，擅长摄影摄像，有一定的创作能力",
                "三年的校内外志愿服务经历，沟通交流能力、团队协作能力、抗压释放能力较强",
              ],
            },
          ],
        },
        3,
      ),
      section(
        "certifications",
        "资格证书",
        {
          items: [
            { id: "cert-1", name: "大学英语四级", issuer: "", date: "" },
            { id: "cert-2", name: "大学英语四级", issuer: "", date: "" },
            { id: "cert-3", name: "大学英语四级", issuer: "", date: "" },
          ],
        },
        4,
      ),
      section(
        "custom",
        "社交主页",
        {
          items: [
            {
              id: "custom-1",
              title: "www.baidu.com",
              description: "",
            },
            {
              id: "custom-2",
              title: "www.baidu.com",
              description: "",
            },
          ],
        },
        5,
      ),
      section(
        "custom",
        "志愿者服务经历",
        {
          items: [
            {
              id: "custom-3",
              title: "中国红十字会",
              subtitle: "14小时",
              date: "2012/10-2016/7",
              description:
                "帮老助残,帮助社区内的孤儿、孤寡老人、残疾人。对孤老残弱家庭进行“一对一”结对帮扶。",
            },
          ],
        },
        6,
      ),
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function toSharedResume(resume: Resume): SharedResume {
  return resume as unknown as SharedResume;
}

function renderPreview(resume: Resume): string {
  const template = getUnifiedTemplate("recruit");
  assert.ok(template, 'Expected "recruit" to be registered');
  return renderToStaticMarkup(
    React.createElement(template.PreviewComponent, {
      resume: toCanonicalResume(toSharedResume(resume)),
    }),
  );
}

describe("recruit template", () => {
  it("is available in every template selection surface", () => {
    assert.ok(TEMPLATES.includes("recruit"));
    assert.ok(
      TEMPLATE_MATRIX_GROUPS.some((group) => group.templates.includes("recruit")),
    );
    assert.equal(templateLabelsMap.recruit, "dashboard.templateRecruit");
  });

  it("is registered and renders the reference layout in preview", () => {
    const resume = createRecruitResume();
    const markup = renderPreview(resume);

    assert.match(markup, /直小聘/);
    assert.match(markup, /离职-随时到岗/);
    assert.match(markup, /20-30k/);
    assert.match(markup, /产品经理/);
    assert.equal((markup.match(/data-section/g) || []).length, 6);
  });

  it("normalizes the shared preview to the one-inch portrait layout", () => {
    const resume = createRecruitResume();
    resume.themeConfig.avatarStyle = "circle";
    resume.sections[0].content = {
      ...(resume.sections[0].content as unknown as Record<string, unknown>),
      avatar: "data:image/png;base64,AA==",
    } as ResumeSection["content"];

    const markup = renderToStaticMarkup(
      React.createElement(ResumePreview, {
        resume: toSharedResume(resume),
      }),
    );

    assert.match(markup, /height:112px/);
  });

  it("renders the same normalized content in preview and HTML export", () => {
    const resume = createRecruitResume();
    const canonical = toCanonicalResume(toSharedResume(resume));
    const template = getUnifiedTemplate("recruit");
    assert.ok(template, 'Expected "recruit" to be registered');

    const preview = renderToStaticMarkup(
      React.createElement(template.PreviewComponent, { resume: canonical }),
    );
    const exported = template.buildHtml(canonical);

    assert.equal(
      (preview.match(/data-section/g) || []).length,
      (exported.match(/data-section/g) || []).length,
    );
    for (const value of [
      "直小聘",
      "BOSS直聘",
      "中国矿业大学",
      "大学英语四级",
      "中国红十字会",
    ]) {
      assert.match(preview, new RegExp(value));
      assert.match(exported, new RegExp(value));
    }
  });

  it("escapes personal information in HTML export", () => {
    const resume = createRecruitResume();
    const personal = resume.sections[0];
    personal.content = {
      ...(personal.content as unknown as Record<string, unknown>),
      fullName: '<script>alert("x")</script>',
    } as ResumeSection["content"];

    const template = getUnifiedTemplate("recruit");
    assert.ok(template, 'Expected "recruit" to be registered');
    const exported = template.buildHtml(toCanonicalResume(toSharedResume(resume)));

    assert.doesNotMatch(exported, /<script>alert/);
    assert.match(exported, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  });

  it("keeps every award in a fixed two-column grid", () => {
    const resume = createRecruitResume();
    resume.sections.push(
      section(
        "certifications",
        "荣誉奖项",
        {
          items: [
            { id: "award-1", name: "一等奖", issuer: "", date: "" },
            { id: "award-2", name: "二等奖", issuer: "", date: "" },
            { id: "award-3", name: "三等奖", issuer: "", date: "" },
            { id: "award-4", name: "优秀奖", issuer: "", date: "" },
          ],
        },
        7,
      ),
    );

    const canonical = toCanonicalResume(toSharedResume(resume));
    const template = getUnifiedTemplate("recruit");
    assert.ok(template, 'Expected "recruit" to be registered');

    const preview = renderToStaticMarkup(
      React.createElement(template.PreviewComponent, { resume: canonical }),
    );
    const exported = template.buildHtml(canonical);
    const previewGrid = /grid-template-columns:repeat\(2, ?minmax\(0, ?1fr\)\)/;
    const exportGrid = /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/;

    assert.match(preview, previewGrid);
    assert.match(exported, exportGrid);
    for (const award of ["一等奖", "二等奖", "三等奖", "优秀奖"]) {
      assert.match(preview, new RegExp(award));
      assert.match(exported, new RegExp(award));
    }
  });

  it("renders project highlights as bulleted list items", () => {
    const resume = createRecruitResume();
    resume.sections.push(
      section(
        "projects",
        "项目经历",
        {
          items: [
            {
              id: "project-1",
              name: "智能招聘平台",
              description: "负责核心搜索体验优化。",
              technologies: ["TypeScript", "React"],
              highlights: ["搜索点击率提升 18%", "完成跨端交付"],
            },
          ],
        },
        7,
      ),
    );

    const canonical = toCanonicalResume(toSharedResume(resume));
    const template = getUnifiedTemplate("recruit");
    assert.ok(template, 'Expected "recruit" to be registered');

    const preview = renderToStaticMarkup(
      React.createElement(template.PreviewComponent, { resume: canonical }),
    );
    const exported = template.buildHtml(canonical);

    for (const markup of [preview, exported]) {
      assert.match(markup, /<ul[^>]*list-style-type:disc[^>]*>/);
      assert.match(markup, /<li[^>]*>搜索点击率提升 18%<\/li>/);
      assert.match(markup, /<li[^>]*>完成跨端交付<\/li>/);
    }
  });
});
