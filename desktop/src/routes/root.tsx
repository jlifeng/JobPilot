import { Link, Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Info, Loader2, Settings } from "lucide-react";
import { i18n } from "../i18n";
import { SettingsDialog } from "../components/editor/settings-dialog";
import { UpdateDialog } from "../components/app-update/update-dialog";
import { AboutDialog } from "../components/about-dialog";
import { Button } from "@/components/ui/button";
import {
  getBootstrapContext,
  getWorkspaceSettingsSnapshot,
  isBrowserFallbackRuntime,
} from "../lib/desktop-api";
import { useAppUpdateStore } from "../stores/app-update-store";

function JobPilotLogo() {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/icon.png"
        alt="JobPilot"
        className="h-8 w-8"
      />
      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
        Job<span style={{ color: 'rgb(0, 127, 251)' }}>Pilot</span>
      </span>
    </div>
  );
}

function LanguagePicker() {
  const activeLanguage = i18n.language;

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 p-0.5 dark:border-zinc-700">
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          activeLanguage === "zh"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        onClick={() => void i18n.changeLanguage("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          activeLanguage === "en"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        onClick={() => void i18n.changeLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}

function AppUpdateBadge() {
  const { t } = useTranslation();
  const {
    pendingUpdate,
    latestVersion,
    isDownloading,
    isInstalling,
    contentLength,
    downloadedBytes,
    openDialog,
  } = useAppUpdateStore();

  if (!pendingUpdate && !isDownloading && !isInstalling) {
    return null;
  }

  const progressPercent =
    contentLength && contentLength > 0
      ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
      : null;
  const badgeLabel = isInstalling
    ? t("updaterBadgeInstalling")
    : isDownloading
      ? t("updaterBadgeDownloading", {
          progress: progressPercent ?? "--",
        })
      : t("updaterBadgeAvailable", {
          version: latestVersion ?? "",
        });
  const toneClassName = isDownloading || isInstalling
    ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60";

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${toneClassName}`}
      onClick={openDialog}
    >
      {isDownloading || isInstalling ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      <span>{badgeLabel}</span>
    </button>
  );
}

function RootLayout() {
  const { t } = useTranslation();
  const context = rootRoute.useLoaderData();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const isEditorSurface = location.pathname.startsWith("/editor/");
  const runtimeIsFallback = isBrowserFallbackRuntime(context);
  const performInitialCheck = useAppUpdateStore((state) => state.performInitialCheck);

  useEffect(() => {
    const applyWorkspaceSettings = async () => {
      try {
        const settings = await getWorkspaceSettingsSnapshot();
        const theme = settings.theme;
        const resolvedTheme =
          theme === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : theme;
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
        document.documentElement.lang = settings.locale;
        if (i18n.language !== settings.locale) {
          await i18n.changeLanguage(settings.locale);
        }
      } catch (error) {
        console.error("Failed to apply workspace settings:", error);
      }
    };

    void applyWorkspaceSettings();
  }, []);

  useEffect(() => {
    if (runtimeIsFallback) {
      return;
    }

    void performInitialCheck();
  }, [performInitialCheck, runtimeIsFallback]);

  return (
    <div
      className={
        isEditorSurface
          ? "h-screen overflow-hidden bg-zinc-50 dark:bg-background"
          : "min-h-screen bg-zinc-50 dark:bg-background"
      }
    >
      {!isEditorSurface && (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center" aria-label="JobPilot">
                <JobPilotLogo />
              </Link>

              <nav className="flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  activeProps={{
                    className:
                      "rounded-md px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                  }}
                  activeOptions={{ exact: true }}
                >
                  {t("libraryLabel")}
                </Link>
                <Link
                  to="/interview"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  activeProps={{
                    className:
                      "rounded-md px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                  }}
                >
                  {t("interview.navLabel")}
                </Link>
                <Link
                  to="/templates"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  activeProps={{
                    className:
                      "rounded-md px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                  }}
                  activeOptions={{ exact: true }}
                >
                  {t("templatesTitle")}
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <AppUpdateBadge />
              <LanguagePicker />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAboutDialogOpen(true)}
                aria-label={t("navAbout")}
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSettingsDialogOpen(true)}
                aria-label={t("navSettings")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      <main
        className={
          isEditorSurface
            ? "h-screen overflow-hidden"
            : "mx-auto max-w-7xl px-4 py-8 sm:px-6"
        }
      >
        <Outlet />
      </main>

      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
      />
      <AboutDialog
        open={aboutDialogOpen}
        onClose={() => setAboutDialogOpen(false)}
      />
      <UpdateDialog />
    </div>
  );
}

export const rootRoute = createRootRoute({
  loader: async () => getBootstrapContext(),
  component: RootLayout,
});
