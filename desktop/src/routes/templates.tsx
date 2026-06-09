import { useState } from "react";
import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumePreview } from "@/components/preview/resume-preview";
import { TEMPLATE_MATRIX_GROUPS } from "@/lib/template-matrix";
import { templateLabelsMap } from "../lib/template-labels";
import { createDocument } from "../lib/desktop-api";
import { rootRoute } from "./root";
import type { Resume } from "@/types/resume";

const MOCK_DATE = new Date("2025-01-01T00:00:00Z");

function buildMockResume(template: string): Resume {
  return {
    id: "mock",
    userId: "mock",
    title: "Sample Resume",
    template,
    themeConfig: {
      primaryColor: "#1a1a1a",
      accentColor: "#3b82f6",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
    },
    isDefault: false,
    language: "en",
    sections: [
      {
        id: "s1",
        resumeId: "mock",
        type: "personal_info",
        title: "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: "Alex Chen",
          jobTitle: "Senior Software Engineer",
          email: "alex@example.com",
          phone: "+1 (555) 123-4567",
          location: "San Francisco, CA",
          website: "https://alexchen.dev",
          linkedin: "linkedin.com/in/alexchen",
          github: "github.com/alexchen",
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s2",
        resumeId: "mock",
        type: "summary",
        title: "Summary",
        sortOrder: 1,
        visible: true,
        content: {
          text: "Full-stack engineer with 8+ years of experience building scalable web applications. Passionate about clean architecture, developer experience, and mentoring teams.",
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s3",
        resumeId: "mock",
        type: "work_experience",
        title: "Work Experience",
        sortOrder: 2,
        visible: true,
        content: {
          items: [
            {
              id: "w1",
              company: "TechCorp Inc.",
              position: "Senior Software Engineer",
              location: "San Francisco, CA",
              startDate: "2021-03",
              endDate: null,
              current: true,
              description:
                "Led a team of 6 engineers building the next-gen analytics platform.",
              highlights: [
                "Reduced page load time by 40% through code splitting and lazy loading",
                "Designed microservices architecture serving 2M+ daily active users",
              ],
            },
            {
              id: "w2",
              company: "StartupXYZ",
              position: "Software Engineer",
              location: "Remote",
              startDate: "2018-06",
              endDate: "2021-02",
              current: false,
              description: "Built core product features from 0 to 1.",
              highlights: [
                "Implemented real-time collaboration features using WebSockets",
                "Improved CI/CD pipeline reducing deployment time by 60%",
              ],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s4",
        resumeId: "mock",
        type: "education",
        title: "Education",
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: "e1",
              institution: "University of California, Berkeley",
              degree: "Bachelor of Science",
              field: "Computer Science",
              location: "Berkeley, CA",
              startDate: "2014-09",
              endDate: "2018-05",
              gpa: "3.8",
              highlights: ["Dean's List", "ACM Programming Contest Finalist"],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s5",
        resumeId: "mock",
        type: "skills",
        title: "Skills",
        sortOrder: 4,
        visible: true,
        content: {
          categories: [
            {
              id: "sk1",
              name: "Frontend",
              skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
            },
            {
              id: "sk2",
              name: "Backend",
              skills: ["Node.js", "Python", "PostgreSQL", "Redis"],
            },
            {
              id: "sk3",
              name: "DevOps",
              skills: ["Docker", "AWS", "CI/CD", "Kubernetes"],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s6",
        resumeId: "mock",
        type: "projects",
        title: "Projects",
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: "p1",
              name: "OpenSource CMS",
              url: "https://github.com/alexchen/cms",
              description:
                "A headless CMS built with Next.js and GraphQL.",
              technologies: ["Next.js", "GraphQL", "PostgreSQL"],
              highlights: ["1.2k+ GitHub stars", "Used by 50+ companies"],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s7",
        resumeId: "mock",
        type: "certifications",
        title: "Certifications",
        sortOrder: 6,
        visible: true,
        content: {
          items: [
            {
              id: "c1",
              name: "AWS Solutions Architect",
              issuer: "Amazon Web Services",
              date: "2023-05",
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: "s8",
        resumeId: "mock",
        type: "languages",
        title: "Languages",
        sortOrder: 7,
        visible: true,
        content: {
          items: [
            { id: "l1", language: "English", proficiency: "Native" },
            { id: "l2", language: "Mandarin", proficiency: "Native" },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ],
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
  } as Resume;
}

function TemplatesRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const firstTemplate = TEMPLATE_MATRIX_GROUPS[0]?.templates[0];

  const handleUseTemplate = async (template: string) => {
    setCreatingTemplate(template);
    try {
      const doc = await createDocument({ template, title: "New Resume" });
      if (doc) {
        void navigate({ to: "/editor/$id", params: { id: doc.id } });
      }
    } catch (err) {
      console.error("Failed to create document:", err);
    } finally {
      setCreatingTemplate(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-foreground">
          {t("templates.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("templates.subtitle")}
        </p>
      </div>

      <div className="space-y-10">
        {TEMPLATE_MATRIX_GROUPS.map((group) => (
          <section key={group.id}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t(group.titleKey)}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t(group.descriptionKey)}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.templates.map((template) => {
                const mockResume = buildMockResume(template);
                const labelKey = templateLabelsMap[template];
                const label = labelKey ? t(labelKey) : template;
                const isCreating = creatingTemplate === template;
                const isFirst = template === firstTemplate;

                return (
                  <div
                    key={template}
                    className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="border-b border-zinc-100 px-4 py-3 text-center dark:border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {label}
                      </h3>
                    </div>

                    <div className="relative h-[320px] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                      <div
                        className="absolute left-1/2 top-0 origin-top"
                        style={{
                          width: "794px",
                          transform: "translateX(-50%) scale(0.28)",
                        }}
                      >
                        <ResumePreview resume={mockResume} />
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                      <Button
                        {...(isFirst ? { "data-tour": "tpl-preview" } : {})}
                        variant="outline"
                        size="sm"
                        className="flex-1 cursor-pointer gap-1.5"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("templates.preview")}
                      </Button>
                      <Button
                        {...(isFirst ? { "data-tour": "tpl-use" } : {})}
                        size="sm"
                        className="flex-1 cursor-pointer gap-1.5 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
                        onClick={() => void handleUseTemplate(template)}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t("templates.creating")}
                          </>
                        ) : (
                          t("templates.useTemplate")
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Full-size preview dialog */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="relative flex h-[90vh] w-[90vw] max-w-[900px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">
                {t(templateLabelsMap[previewTemplate] || previewTemplate)}
              </h2>
              <button
                type="button"
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                onClick={() => setPreviewTemplate(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[794px] p-6">
                <ResumePreview resume={buildMockResume(previewTemplate)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesRoute,
});
