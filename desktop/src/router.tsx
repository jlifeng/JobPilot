import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root";
import { homeRoute } from "./routes/home";
import { settingsRoute, syncRoute } from "./routes/settings";
import { dashboardRoute } from "./routes/dashboard";
import { editorRoute } from "./routes/editor";
import { interviewNewRoute } from "./routes/interview-new";
import { interviewReportRoute } from "./routes/interview-report";
import { interviewSessionRoute } from "./routes/interview-session";
import { interviewRoute } from "./routes/interview";
import { templatesRoute } from "./routes/templates";

const routeTree = rootRoute.addChildren([
  homeRoute,
  settingsRoute,
  syncRoute,
  dashboardRoute,
  interviewRoute,
  interviewNewRoute,
  interviewSessionRoute,
  interviewReportRoute,
  editorRoute,
  templatesRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
