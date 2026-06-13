import { Link, Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Cloud,
  Download,
  Languages,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Moon,
  Settings,
  Sun,
  Upload,
} from "lucide-react";
import { i18n } from "../i18n";
import { UpdateDialog } from "../components/app-update/update-dialog";
import { AboutDialog } from "../components/about-dialog";
import { Button } from "@/components/ui/button";
import {
  getBootstrapContext,
  getWebdavSyncStatus,
  getWorkspaceSettingsSnapshot,
  isBrowserFallbackRuntime,
  updateWorkspaceAppearanceSettings,
  uploadWebdavSnapshot,
  restoreWebdavSnapshot,
  type WorkspaceSettingsDocument,
  type WebdavSyncStatus,
} from "../lib/desktop-api";
import { useAppUpdateStore } from "../stores/app-update-store";

function JobPilotLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/icon.png"
        alt="JobPilot"
        className="h-8 w-8"
      />
      {!compact && (
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Job<span className="text-blue-600">Pilot</span>
        </span>
      )}
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
            ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
            : "text-zinc-500 hover:text-blue-700 dark:text-zinc-400 dark:hover:text-blue-200"
        }`}
        onClick={() => void i18n.changeLanguage("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          activeLanguage === "en"
            ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
            : "text-zinc-500 hover:text-blue-700 dark:text-zinc-400 dark:hover:text-blue-200"
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

type ThemeMode = "light" | "dark" | "system";

function resolveTheme(theme: string): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

function applyDesktopTheme(theme: string) {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

function WorkspaceSidebar({
  onOpenAbout,
  webdavStatus,
  theme,
  onToggleTheme,
  onToggleLanguage,
}: {
  onOpenAbout: () => void;
  webdavStatus: WebdavSyncStatus | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}) {
  const { t } = useTranslation();
  const webdavConfigured = webdavStatus?.configured ?? false;
  const [webdavUploading, setWebdavUploading] = useState(false);
  const [webdavDownloading, setWebdavDownloading] = useState(false);
  const resolvedTheme =
    typeof window === "undefined"
      ? theme
      : resolveTheme(theme);
  const nextLanguage = i18n.language === "zh" ? "English" : "中文";
  const themeLabel =
    resolvedTheme === "dark" ? t("themeDark") : t("themeLight");
  const nextThemeLabel =
    resolvedTheme === "dark" ? t("themeLight") : t("themeDark");

  return (
    <aside className="hidden w-20 shrink-0 border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:flex-col">
      <div className="flex h-20 shrink-0 items-center justify-center">
        <Link
          to="/dashboard"
          className="flex h-11 w-11 items-center justify-center rounded-2xl transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40"
          aria-label="JobPilot"
          title="JobPilot"
        >
          <JobPilotLogo compact />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-3 px-3">
        <Link
          to="/dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-[#F0F5FF] hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          activeProps={{
            className:
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F5FF] text-blue-600 dark:bg-blue-950/40 dark:text-blue-200",
          }}
          activeOptions={{ exact: true }}
          aria-label={t("workspaceNavHome")}
          title={t("workspaceNavHome")}
        >
          <Home className="h-5 w-5" />
        </Link>

        <Link
          to="/settings"
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-[#F0F5FF] hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          activeProps={{
            className:
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F5FF] text-blue-600 dark:bg-blue-950/40 dark:text-blue-200",
          }}
          aria-label={t("navSettings")}
          title={t("navSettings")}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-3 px-3 pb-5">
        <Link
          to="/sync"
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50 hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={t("workspaceWebdavTitle")}
          title={`${t("workspaceWebdavTitle")} · ${
            webdavConfigured ? t("webdavStatusConnected") : t("webdavNotConfigured")
          }`}
        >
          <Cloud className="h-5 w-5" />
          <span
            className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-white ${
              webdavConfigured ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-2xl ${
            webdavConfigured
              ? "text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-200"
              : "text-slate-300 dark:text-zinc-700"
          }`}
          disabled={!webdavConfigured || webdavUploading}
          aria-label={t("webdavSyncNow")}
          title={t("webdavSyncNow")}
          onClick={async () => {
            setWebdavUploading(true);
            try {
              await uploadWebdavSnapshot();
            } catch (error) {
              console.error("WebDAV upload failed:", error);
            } finally {
              setWebdavUploading(false);
            }
          }}
        >
          {webdavUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-2xl ${
            webdavConfigured
              ? "text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-200"
              : "text-slate-300 dark:text-zinc-700"
          }`}
          disabled={!webdavConfigured || webdavDownloading}
          aria-label={t("webdavRestoreNow")}
          title={t("webdavRestoreNow")}
          onClick={async () => {
            setWebdavDownloading(true);
            try {
              await restoreWebdavSnapshot();
            } catch (error) {
              console.error("WebDAV restore failed:", error);
            } finally {
              setWebdavDownloading(false);
            }
          }}
        >
          {webdavDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-200"
          onClick={onToggleTheme}
          aria-label={t("workspaceToggleTheme", {
            current: themeLabel,
            next: nextThemeLabel,
          })}
          title={t("workspaceToggleTheme", {
            current: themeLabel,
            next: nextThemeLabel,
          })}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-200"
          onClick={onToggleLanguage}
          aria-label={t("workspaceToggleLanguage", { next: nextLanguage })}
          title={t("workspaceToggleLanguage", { next: nextLanguage })}
        >
          <Languages className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={onOpenAbout}
          aria-label={t("navAbout")}
          title={t("navAbout")}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        </div>
    </aside>
  );
}

function CompactNav() {
  const { t } = useTranslation();

  return (
    <nav className="hidden items-center gap-1 md:flex lg:hidden">
      <Link
        to="/dashboard"
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        activeProps={{
          className:
            "rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
        }}
        activeOptions={{ exact: true }}
      >
        {t("libraryLabel")}
      </Link>
      <Link
        to="/interview"
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        activeProps={{
          className:
            "rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
        }}
      >
        {t("interview.navLabel")}
      </Link>
      <Link
        to="/templates"
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        activeProps={{
          className:
            "rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
        }}
        activeOptions={{ exact: true }}
      >
        {t("templatesTitle")}
      </Link>
    </nav>
  );
}

function RootLayout() {
  const { t } = useTranslation();
  const context = rootRoute.useLoaderData();
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [webdavStatus, setWebdavStatus] = useState<WebdavSyncStatus | null>(null);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<WorkspaceSettingsDocument | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const location = useRouterState({ select: (s) => s.location });
  const isEditorSurface = location.pathname.startsWith("/editor/");
  const activeWorkspaceLabel = location.pathname.startsWith("/interview")
    ? t("interview.navLabel")
    : location.pathname.startsWith("/templates")
      ? t("templatesTitle")
      : location.pathname.startsWith("/settings")
        ? t("navSettings")
        : location.pathname.startsWith("/sync")
          ? t("workspaceNavSync")
          : t("libraryLabel");
  const runtimeIsFallback = isBrowserFallbackRuntime(context);
  const performInitialCheck = useAppUpdateStore((state) => state.performInitialCheck);

  useEffect(() => {
    const applyWorkspaceSettings = async () => {
      try {
        const settings = await getWorkspaceSettingsSnapshot();
        setWorkspaceSettings(settings);
        setTheme((settings.theme as ThemeMode) ?? "system");
        applyDesktopTheme(settings.theme);
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

  const saveAppearanceSettings = async (updates: {
    locale?: string;
    theme?: ThemeMode;
  }) => {
    try {
      const currentSettings =
        workspaceSettings ?? (await getWorkspaceSettingsSnapshot());
      const nextSettings = await updateWorkspaceAppearanceSettings({
        locale: updates.locale ?? currentSettings.locale ?? "zh",
        theme: updates.theme ?? theme ?? currentSettings.theme ?? "system",
        autoSave: currentSettings.editor?.autoSave ?? true,
        autoSaveIntervalMs: currentSettings.editor?.autoSaveIntervalMs ?? 500,
        rememberWindowState: currentSettings.window?.rememberWindowState ?? true,
      });
      setWorkspaceSettings(nextSettings);
    } catch (error) {
      console.error("Failed to save workspace appearance settings:", error);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = resolveTheme(theme) === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyDesktopTheme(nextTheme);
    void saveAppearanceSettings({ theme: nextTheme });
  };

  const handleToggleLanguage = () => {
    const nextLocale = i18n.language === "zh" ? "en" : "zh";
    document.documentElement.lang = nextLocale;
    void i18n.changeLanguage(nextLocale);
    void saveAppearanceSettings({ locale: nextLocale });
  };

  useEffect(() => {
    if (runtimeIsFallback) {
      return;
    }

    void performInitialCheck();
  }, [performInitialCheck, runtimeIsFallback]);

  useEffect(() => {
    if (runtimeIsFallback) {
      return;
    }

    const loadWebdavStatus = async () => {
      try {
        setWebdavStatus(await getWebdavSyncStatus());
      } catch (error) {
        console.error("Failed to load WebDAV status:", error);
      }
    };

    void loadWebdavStatus();

    const handleWebdavSettingsChanged = () => {
      void loadWebdavStatus();
    };

    window.addEventListener("webdav-settings-changed", handleWebdavSettingsChanged);
    return () => {
      window.removeEventListener("webdav-settings-changed", handleWebdavSettingsChanged);
    };
  }, [runtimeIsFallback, location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-white font-sans dark:bg-background">
      {isEditorSurface ? (
        <main className="h-screen overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <div className="flex h-screen overflow-hidden">
          <WorkspaceSidebar
            onOpenAbout={() => setAboutDialogOpen(true)}
            webdavStatus={webdavStatus}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onToggleLanguage={handleToggleLanguage}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between bg-white px-4 dark:bg-zinc-950 sm:px-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <Link to="/dashboard" className="flex items-center lg:hidden" aria-label="JobPilot">
                  <JobPilotLogo />
                </Link>
                <CompactNav />
                <div className="hidden min-w-0 lg:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    JobPilot
                  </p>
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeWorkspaceLabel}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <AppUpdateBadge />
                <div className="hidden sm:block lg:hidden">
                  <LanguagePicker />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  onClick={() => setAboutDialogOpen(true)}
                  aria-label={t("navAbout")}
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  asChild
                  aria-label={t("navSettings")}
                >
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 sm:px-6 lg:px-8 xl:px-10">
              <Outlet />
            </main>
          </div>
        </div>
      )}

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
