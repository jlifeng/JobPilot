import { createRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SkillManagementPage } from "../components/skill/skill-management-page";
import { rootRoute } from "./root";

function SkillsRoute() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
          {t("skill.management.title")}
        </p>
      </div>
      <SkillManagementPage />
    </div>
  );
}

export const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: SkillsRoute,
});
