import { createRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsContent } from "../components/editor/settings-dialog";
import { rootRoute } from "./root";

function SettingsRoute() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
          {t("settingsLabel")}
        </p>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-zinc-100">
          {t("settings.title")}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-zinc-400">
          {t("settings.pageBody")}
        </p>
      </div>

      <SettingsContent variant="page" mode="settings" />
    </div>
  );
}

function SyncRoute() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
          {t("workspaceNavSystemSection")}
        </p>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-zinc-100">
          {t("workspaceNavSync")}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-zinc-400">
          {t("settings.syncPageBody")}
        </p>
      </div>

      <SettingsContent variant="page" mode="sync-only" />
    </div>
  );
}

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsRoute,
});

export const syncRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sync",
  component: SyncRoute,
});
