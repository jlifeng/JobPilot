import { createRoute } from "@tanstack/react-router";
import { SkillManagementPage } from "../components/skill/skill-management-page";
import { rootRoute } from "./root";

function SkillsRoute() {
  // 页面标题统一由 SkillManagementPage 内部的大标题承担，
  // 此处不再渲染额外的紫色小标题，避免标题文字重复出现。
  return <SkillManagementPage />;
}

export const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: SkillsRoute,
});
