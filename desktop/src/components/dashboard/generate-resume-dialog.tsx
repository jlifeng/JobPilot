import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResumeStore } from "../../stores/resume-store";
import {
  getSecretInventorySnapshot,
  getWorkspaceSettingsSnapshot,
  importDocument,
  type ImportDocumentInput,
} from "../../lib/desktop-api";
import { toResumeDocument } from "../../lib/desktop-document-mappers";
import {
  extractJsonObject,
  generateRequestId,
  runPromptStream,
} from "../editor/ai-dialog-helpers";
import { AlertCircle, Sparkles, X, Loader2 } from "lucide-react";

interface GenerateResumeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface ConfiguredAiRuntime {
  provider: string;
  model: string;
  baseUrl?: string;
}

interface AiGeneratedResumePayload {
  title?: string;
  template?: string;
  language?: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  themeJson?: string;
  sections?: Array<{
    sectionType?: string;
    title?: string;
    sortOrder?: number;
    visible?: boolean;
    content?: Record<string, unknown>;
  }>;
  personalInfo?: {
    fullName?: string;
    jobTitle?: string;
    email?: string;
    phone?: string;
    location?: string;
    yearsOfExperience?: string;
  };
  summary?: string;
  skills?: Array<{
    name?: string;
    skills?: string[];
  }>;
  workExperience?: Array<{
    company?: string;
    position?: string;
    location?: string;
    startDate?: string;
    endDate?: string | null;
    current?: boolean;
    description?: string;
    technologies?: string[];
    highlights?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    highlights?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    highlights?: string[];
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    url?: string;
  }>;
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function buildDefaultThemeJson(): string {
  return JSON.stringify({
    primaryColor: "#2563EB",
    accentColor: "#7C3AED",
    fontFamily: "Inter",
    fontSize: "medium",
    lineSpacing: 1.6,
    margin: { top: 24, right: 24, bottom: 24, left: 24 },
    sectionSpacing: 16,
    avatarStyle: "circle",
  });
}

function buildAiGenerateSystemPrompt(language: string): string {
  const languageLabel = language === "zh" ? "Simplified Chinese" : "English";

  return [
    "You are JobPilot's resume generation assistant.",
    `Generate a professional starter resume in ${languageLabel}.`,
    "Return one valid JSON object only. Do not use markdown or code fences.",
    "All user-facing text, section content, summaries, bullets, placeholders, and skill category names must use the requested language.",
    "Do not invent real company names, school names, emails, phone numbers, or personal identities. Use clear placeholders when information is missing.",
    "You must fill the provided JobPilot ImportDocumentInput JSON template.",
    "Keep sectionType values exactly as provided. Keep arrays as arrays. Keep themeJson as a JSON string.",
    "Return the filled template object itself, starting with { and ending with }.",
  ].join("\n");
}

function buildResumeTemplateJson(input: {
  jobTitle: string;
  yearsOfExperience: string;
  skills: string[];
  industry: string;
  language: string;
}): ImportDocumentInput {
  const isZh = input.language === "zh";

  return {
    title: isZh ? `${input.jobTitle} 简历` : `${input.jobTitle} Resume`,
    template: "modern",
    language: input.language,
    targetJobTitle: input.jobTitle,
    targetCompany: null,
    themeJson: buildDefaultThemeJson(),
    sections: [
      {
        sectionType: "personal_info",
        title: isZh ? "个人信息" : "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: isZh ? "你的姓名" : "Your Name",
          jobTitle: input.jobTitle,
          email: "email@example.com",
          phone: isZh ? "手机号" : "+1 (000) 000-0000",
          location: isZh ? "城市，国家" : "City, Country",
          yearsOfExperience: input.yearsOfExperience || (isZh ? "待补充" : "To be added"),
        },
      },
      {
        sectionType: "summary",
        title: isZh ? "个人简介" : "Summary",
        sortOrder: 1,
        visible: true,
        content: {
          text: isZh
            ? `围绕${input.industry || "目标行业"}和${input.jobTitle}生成一段专业简介。`
            : `Write a professional summary for ${input.jobTitle} in ${input.industry || "the target industry"}.`,
        },
      },
      {
        sectionType: "skills",
        title: isZh ? "技能特长" : "Skills",
        sortOrder: 2,
        visible: true,
        content: {
          categories: [
            {
              id: "replace-with-generated-id",
              name: isZh ? "核心技能" : "Core Skills",
              skills: input.skills.length > 0
                ? input.skills
                : isZh
                  ? ["待补充技能"]
                  : ["Skills to be added"],
            },
          ],
        },
      },
      {
        sectionType: "education",
        title: isZh ? "教育背景" : "Education",
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: "replace-with-generated-id",
              institution: isZh ? "学校名称待补充" : "Institution to be added",
              degree: "",
              field: "",
              location: "",
              startDate: "",
              endDate: "",
              gpa: "",
              highlights: [],
            },
          ],
        },
      },
      {
        sectionType: "certifications",
        title: isZh ? "资格证书" : "Certifications",
        sortOrder: 4,
        visible: true,
        content: {
          items: [
            {
              id: "replace-with-generated-id",
              name: isZh ? "证书名称待补充" : "Certification to be added",
              issuer: "",
              date: "",
              url: "",
            },
          ],
        },
      },
      {
        sectionType: "work_experience",
        title: isZh ? "工作经历" : "Work Experience",
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: "replace-with-generated-id",
              company: isZh ? "公司名称待补充" : "Company to be added",
              position: input.jobTitle,
              location: "",
              startDate: "",
              endDate: null,
              current: false,
              description: "",
              technologies: input.skills,
              highlights: [
                isZh
                  ? "用量化结果描述一项核心贡献。"
                  : "Describe one core contribution with measurable impact.",
              ],
            },
          ],
        },
      },
      {
        sectionType: "projects",
        title: isZh ? "项目经历" : "Projects",
        sortOrder: 6,
        visible: true,
        content: {
          items: [
            {
              id: "replace-with-generated-id",
              name: isZh ? "项目名称待补充" : "Project to be added",
              description: "",
              technologies: input.skills,
              highlights: [
                isZh
                  ? "说明项目目标、你的职责和最终结果。"
                  : "Explain the project goal, your role, and the result.",
              ],
              startDate: "",
              endDate: "",
            },
          ],
        },
      },
    ],
  };
}

function buildAiGeneratePrompt(input: {
  jobTitle: string;
  yearsOfExperience: string;
  skills: string[];
  industry: string;
  language: string;
}): string {
  return JSON.stringify(
    {
      task: "Fill the JobPilot resume template JSON with professional resume content.",
      requirements: {
        targetJobTitle: input.jobTitle,
        yearsOfExperience: input.yearsOfExperience,
        skills: input.skills,
        industry: input.industry,
        outputLanguage: input.language === "zh" ? "zh-CN" : "en-US",
      },
      templateJsonStructure: buildResumeTemplateJson(input),
      outputRules: [
        "Return only the completed templateJsonStructure JSON object.",
        "Do not include markdown fences, comments, explanations, or trailing text.",
        "Do not remove required sections: personal_info, summary, education, certifications, skills.",
        "Only include work_experience and projects if you can fill useful starter content.",
      ],
    },
    null,
    2,
  );
}

async function getConfiguredAiRuntime(messages: {
  apiKeyMissing: string;
  modelMissing: string;
}): Promise<ConfiguredAiRuntime> {
  const [settings, inventory] = await Promise.all([
    getWorkspaceSettingsSnapshot(),
    getSecretInventorySnapshot(),
  ]);

  const provider = settings.ai.defaultProvider || "openai";
  const providerConfig = settings.ai.providerConfigs[provider];
  const model = providerConfig?.model?.trim() || "";
  const hasApiKey = inventory.entries.some(
    (entry) =>
      entry.key === `provider.${provider}.api_key` && entry.isConfigured,
  );

  if (!model) {
    throw new Error(messages.modelMissing);
  }

  if (!hasApiKey) {
    throw new Error(messages.apiKeyMissing);
  }

  return {
    provider,
    model,
    baseUrl: providerConfig?.baseUrl?.trim() || undefined,
  };
}

function normalizeGenerateError(error: unknown, fallback: string): string {
  const rawMessage = error instanceof Error ? error.message : String(error || "");

  if (!rawMessage) {
    return fallback;
  }

  if (rawMessage.includes("__TAURI_INTERNALS__")) {
    return "当前不是 Tauri 桌面运行时，不能调用本地 AI 生成。请在桌面应用窗口中操作。";
  }

  const normalized = rawMessage.toLowerCase();
  if (normalized.includes("failed to parse ai response")) {
    return "AI 返回的简历结构无法解析，请重试一次或换一个模型。";
  }

  if (
    normalized.includes("api key") ||
    normalized.includes("credential") ||
    normalized.includes("secret")
  ) {
    return "AI API Key 未配置或不可用，请先在 AI 配置中保存密钥。";
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "AI 生成超时，请检查网络或模型服务后重试。";
  }

  if (normalized.includes("network") || normalized.includes("connect")) {
    return "无法连接到当前 AI 服务，请检查 Base URL、网络和模型配置。";
  }

  return rawMessage;
}

function parseAiGenerateOutput(rawOutput: string): AiGeneratedResumePayload {
  try {
    return extractJsonObject<AiGeneratedResumePayload>(rawOutput);
  } catch {
    const repaired = repairGeneratedJson(rawOutput);

    if (repaired) {
      return JSON.parse(repaired) as AiGeneratedResumePayload;
    }

    throw new Error("Failed to parse AI response.");
  }
}

function repairGeneratedJson(text: string): string | null {
  let value = text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start !== -1) {
    value = end > start ? value.slice(start, end + 1) : value.slice(start);
  }

  if (!value.startsWith("{")) {
    return null;
  }

  value = value.replace(/,\s*$/, "");
  if (value.match(/:\s*"[^"]*$/)) {
    value += '"';
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      stack.push("}");
      continue;
    }

    if (character === "[") {
      stack.push("]");
      continue;
    }

    if ((character === "}" || character === "]") && stack.length > 0) {
      stack.pop();
    }
  }

  if (inString) {
    value += '"';
  }

  while (stack.length > 0) {
    value += stack.pop();
  }

  return value;
}

function getGeneratedSection(
  payload: AiGeneratedResumePayload,
  sectionType: string,
): Record<string, unknown> {
  const section = payload.sections?.find((item) => item.sectionType === sectionType);

  return toRecord(section?.content);
}

function buildDocumentInput(
  payload: AiGeneratedResumePayload,
  options: {
    jobTitle: string;
    yearsOfExperience: string;
    skillItems: string[];
    industry: string;
    language: string;
  },
): ImportDocumentInput {
  const isZh = options.language === "zh";
  const generatedPersonalInfo = getGeneratedSection(payload, "personal_info");
  const personalInfo = {
    ...payload.personalInfo,
    ...generatedPersonalInfo,
  };
  const generatedSummary = getGeneratedSection(payload, "summary");
  const generatedSkills = getGeneratedSection(payload, "skills");
  const generatedEducation = getGeneratedSection(payload, "education");
  const generatedCertifications = getGeneratedSection(payload, "certifications");
  const generatedWork = getGeneratedSection(payload, "work_experience");
  const generatedProjects = getGeneratedSection(payload, "projects");
  const fallbackExperience = options.yearsOfExperience || (isZh ? "待补充" : "To be added");
  const fallbackIndustry = options.industry || (isZh ? "目标行业" : "target industry");
  const fallbackSkills =
    options.skillItems.length > 0
      ? options.skillItems
      : isZh
        ? ["待补充技能"]
        : ["Skills to be added"];
  const title = toText(
    payload.title,
    isZh ? `${options.jobTitle} 简历` : `${options.jobTitle} Resume`,
  );
  const summary = toText(
    payload.summary || generatedSummary.text,
    isZh
      ? `面向${fallbackIndustry}的${options.jobTitle}候选人，具备${fallbackExperience}相关经验，正在持续完善核心项目与成果。`
      : `${options.jobTitle} candidate for ${fallbackIndustry} with ${fallbackExperience} of relevant experience, ready to refine key projects and measurable achievements.`,
  );
  const generatedSkillCategories = Array.isArray(generatedSkills.categories)
    ? generatedSkills.categories as Array<{ name?: string; skills?: string[] }>
    : [];
  const generatedEducationItems = Array.isArray(generatedEducation.items)
    ? generatedEducation.items as AiGeneratedResumePayload["education"]
    : [];
  const education = payload.education ?? generatedEducationItems ?? [];
  const generatedCertificationItems = Array.isArray(generatedCertifications.items)
    ? generatedCertifications.items as AiGeneratedResumePayload["certifications"]
    : [];
  const certifications = payload.certifications ?? generatedCertificationItems ?? [];

  const sections: ImportDocumentInput["sections"] = [
    {
      sectionType: "personal_info",
      title: isZh ? "个人信息" : "Personal Info",
      sortOrder: 0,
      visible: true,
      content: {
        fullName: toText(personalInfo.fullName, isZh ? "你的姓名" : "Your Name"),
        jobTitle: toText(personalInfo.jobTitle, options.jobTitle),
        email: toText(personalInfo.email, "email@example.com"),
        phone: toText(personalInfo.phone, isZh ? "手机号" : "+1 (000) 000-0000"),
        location: toText(personalInfo.location, isZh ? "城市，国家" : "City, Country"),
        yearsOfExperience: toText(personalInfo.yearsOfExperience, fallbackExperience),
      },
    },
    {
      sectionType: "summary",
      title: isZh ? "个人简介" : "Summary",
      sortOrder: 1,
      visible: true,
      content: { text: summary },
    },
    {
      sectionType: "skills",
      title: isZh ? "技能特长" : "Skills",
      sortOrder: 2,
      visible: true,
      content: {
        categories: (
          payload.skills?.length
            ? payload.skills
            : generatedSkillCategories.length
              ? generatedSkillCategories
              : [{ skills: fallbackSkills }]
        )
          .map((category, index) => ({
            id: crypto.randomUUID(),
            name: toText(
              category.name,
              index === 0
                ? isZh ? "核心技能" : "Core Skills"
                : isZh ? "其他技能" : "Additional Skills",
            ),
            skills: toTextArray(category.skills).length
              ? toTextArray(category.skills)
              : fallbackSkills,
          }))
          .filter((category) => category.skills.length > 0),
      },
    },
  ];

  sections.push({
    sectionType: "education",
    title: isZh ? "教育背景" : "Education",
    sortOrder: sections.length,
    visible: true,
    content: {
      items: education.map((item) => ({
        id: crypto.randomUUID(),
        institution: toText(item.institution, isZh ? "学校名称待补充" : "Institution to be added"),
        degree: toText(item.degree),
        field: toText(item.field),
        location: toText(item.location),
        startDate: toText(item.startDate),
        endDate: toText(item.endDate),
        gpa: toText(item.gpa),
        highlights: toTextArray(item.highlights),
      })),
    },
  });

  sections.push({
    sectionType: "certifications",
    title: isZh ? "资格证书" : "Certifications",
    sortOrder: sections.length,
    visible: true,
    content: {
      items: certifications.map((item) => ({
        id: crypto.randomUUID(),
        name: toText(item.name, isZh ? "证书名称待补充" : "Certification to be added"),
        issuer: toText(item.issuer),
        date: toText(item.date),
        url: toText(item.url),
      })),
    },
  });

  const generatedWorkItems = Array.isArray(generatedWork.items)
    ? generatedWork.items as AiGeneratedResumePayload["workExperience"]
    : [];
  const workExperience = payload.workExperience ?? generatedWorkItems ?? [];
  if (workExperience.length > 0) {
    sections.push({
      sectionType: "work_experience",
      title: isZh ? "工作经历" : "Work Experience",
      sortOrder: sections.length,
      visible: true,
      content: {
        items: workExperience.map((item) => ({
          id: crypto.randomUUID(),
          company: toText(item.company, isZh ? "公司名称待补充" : "Company to be added"),
          position: toText(item.position, options.jobTitle),
          location: toText(item.location),
          startDate: toText(item.startDate),
          endDate: item.current ? null : toText(item.endDate),
          current: Boolean(item.current),
          description: toText(item.description),
          technologies: toTextArray(item.technologies),
          highlights: toTextArray(item.highlights),
        })),
      },
    });
  }

  const generatedProjectItems = Array.isArray(generatedProjects.items)
    ? generatedProjects.items as AiGeneratedResumePayload["projects"]
    : [];
  const projects = payload.projects ?? generatedProjectItems ?? [];
  if (projects.length > 0) {
    sections.push({
      sectionType: "projects",
      title: isZh ? "项目经历" : "Projects",
      sortOrder: sections.length,
      visible: true,
      content: {
        items: projects.map((item) => ({
          id: crypto.randomUUID(),
          name: toText(item.name, isZh ? "项目名称待补充" : "Project to be added"),
          description: toText(item.description),
          technologies: toTextArray(item.technologies),
          highlights: toTextArray(item.highlights),
          startDate: toText(item.startDate),
          endDate: toText(item.endDate),
        })),
      },
    });
  }

  return {
    title,
    template: toText(payload.template, "modern"),
    language: options.language,
    targetJobTitle: options.jobTitle,
    targetCompany: null,
    themeJson: toText(payload.themeJson, buildDefaultThemeJson()),
    sections,
  };
}

export function GenerateResumeDialog({ open, onClose, onCreated }: GenerateResumeDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setResume } = useResumeStore();
  const defaultLanguage = i18n.language.startsWith("zh") ? "zh" : "en";

  const [jobTitle, setJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [industry, setIndustry] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetAndClose = () => {
    setJobTitle("");
    setYearsOfExperience("");
    setSkills("");
    setIndustry("");
    setLanguage(defaultLanguage);
    setIsGenerating(false);
    setErrorMessage("");
    onClose();
  };

  const handleGenerate = async () => {
    if (!jobTitle.trim()) return;

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const skillItems = skills
        .split(/[,，]/)
        .map((skill) => skill.trim())
        .filter(Boolean);
      const runtime = await getConfiguredAiRuntime({
        apiKeyMissing: t("aiApiKeyMissingHint"),
        modelMissing: t("generateResumeAiConfigMissing"),
      });
      const rawOutput = await runPromptStream({
        provider: runtime.provider,
        model: runtime.model,
        baseUrl: runtime.baseUrl,
        requestId: generateRequestId("generate-resume"),
        systemPrompt: buildAiGenerateSystemPrompt(language),
        prompt: buildAiGeneratePrompt({
          jobTitle: jobTitle.trim(),
          yearsOfExperience: yearsOfExperience.trim(),
          skills: skillItems,
          industry: industry.trim(),
          language,
        }),
      });
      const parsed = parseAiGenerateOutput(rawOutput);
      const document = await importDocument(
        buildDocumentInput(parsed, {
          jobTitle: jobTitle.trim(),
          yearsOfExperience: yearsOfExperience.trim(),
          skillItems,
          industry: industry.trim(),
          language,
        }),
      );

      setResume(toResumeDocument(document));
      onCreated?.();
      resetAndClose();
      navigate({ to: "/editor/$id", params: { id: document.id } });
    } catch (error) {
      console.error("Failed to generate resume:", error);
      setErrorMessage(normalizeGenerateError(error, t("aiErrorMessage")));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={!isGenerating ? resetAndClose : undefined}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <h2 className="dialog-title">{t("generateResumeTitle")}</h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={resetAndClose}
            disabled={isGenerating}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body">
          <p className="text-sm text-zinc-500 mb-4">{t("generateResumeDescription")}</p>

          <div className="space-y-4">
            <div className="form-field">
              <label className="form-label">{t("generateResumeJobTitle")}</label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("generateResumeJobTitlePlaceholder")}
              />
            </div>

            <div className="form-field">
              <label className="form-label">{t("generateResumeYearsOfExperience")}</label>
              <Input
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder={t("generateResumeYearsPlaceholder")}
              />
            </div>

            <div className="form-field">
              <label className="form-label">{t("generateResumeSkills")}</label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder={t("generateResumeSkillsPlaceholder")}
              />
            </div>

            <div className="form-field">
              <label className="form-label">{t("generateResumeIndustry")}</label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t("generateResumeIndustryPlaceholder")}
              />
            </div>

            <div className="form-field">
              <label className="form-label">{t("generateResumeLanguage")}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select-input"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>

            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={resetAndClose} disabled={isGenerating}>
            {t("commonCancel")}
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={!jobTitle.trim() || isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? t("generateResumeGenerating") : t("generateResumeGenerate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
