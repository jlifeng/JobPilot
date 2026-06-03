import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";
import {
  Settings,
  Cpu,
  Paintbrush,
  PenTool,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  ChevronsUpDown,
  Check,
  Loader2,
  Plug,
  RefreshCw,
  Cloud,
  Clock,
  Shield,
  Upload,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUIStore } from "../../stores/ui-store";
import {
  getWorkspaceSettingsSnapshot,
  updateWorkspaceAppearanceSettings,
  updateAiProviderSettings,
  writeSecretValue,
  readSecretValue,
  fetchAiModels,
  testAiConnectivity,
  testExaConnectivity,
  getWebdavSyncStatus,
  updateWebdavSyncSettings,
  testWebdavConnection,
  uploadWebdavSnapshot,
  restoreWebdavSnapshot,
  type ProviderConfigUpdateInput,
  type AiProvider,
  type ConnectivityTestResult,
  type WebdavSyncStatus,
  type WebdavSettingsUpdateInput,
  type WebdavConnectivityResult,
  type WebdavSnapshotReceipt,
  type WebdavRestoreReceipt,
} from "../../lib/desktop-api";

const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const LOCALES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
] as const;

type ThemeMode = "light" | "dark" | "system";

function applyDesktopTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { settingsTab, setSettingsTab } = useUIStore();

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [language, setLanguage] = useState("zh");
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(500);

  // AI
  const [aiProvider, setAIProvider] = useState<AiProvider>("openai");
  const [aiApiKey, setAIApiKey] = useState("");
  const [aiBaseURL, setAIBaseURL] = useState("");
  const [aiModel, setAIModel] = useState("");
  const [resumeImportVisionModel, setResumeImportVisionModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Exa
  const [exaPoolBaseURL, setExaPoolBaseURL] = useState("https://api.exa.ai");
  const [exaPoolApiKey, setExaPoolApiKey] = useState("");
  const [showExaPoolApiKey, setShowExaPoolApiKey] = useState(false);

  // WebDAV sync
  const [webdavStatus, setWebdavStatus] = useState<WebdavSyncStatus | null>(null);
  const [webdavServerUrl, setWebdavServerUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavRemotePath, setWebdavRemotePath] = useState("JobPilot");
  const [webdavShowPassword, setWebdavShowPassword] = useState(false);
  const [webdavTesting, setWebdavTesting] = useState(false);
  const [webdavTestResult, setWebdavTestResult] = useState<WebdavConnectivityResult | null>(null);
  const [webdavUploading, setWebdavUploading] = useState(false);
  const [webdavRestoring, setWebdavRestoring] = useState(false);
  const [webdavMessage, setWebdavMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Model combobox state
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [visionModelOpen, setVisionModelOpen] = useState(false);
  const [visionModelSearch, setVisionModelSearch] = useState("");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [modelsFetching, setModelsFetching] = useState(false);
  const [modelsFetched, setModelsFetched] = useState(false);
  const modelSearchRef = useRef<HTMLInputElement>(null);
  const visionModelSearchRef = useRef<HTMLInputElement>(null);

  // Connectivity test state
  const [aiTestResult, setAiTestResult] =
    useState<ConnectivityTestResult | null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const [exaTestResult, setExaTestResult] =
    useState<ConnectivityTestResult | null>(null);
  const [exaTesting, setExaTesting] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  // Load AI settings
  const loadAiSettings = useCallback(async () => {
    const settings = await getWorkspaceSettingsSnapshot();
    const provider = (settings.ai?.defaultProvider as AiProvider) || "openai";
    setAIProvider(provider);
    const config = settings.ai?.providerConfigs?.[provider];
    setAIBaseURL(config?.baseUrl || "");
    setAIModel(config?.model || "");
    setResumeImportVisionModel(settings.ai?.resumeImportVisionModel || "");
    const apiKey = await readSecretValue(`provider.${provider}.api_key`);
    setAIApiKey(apiKey || "");
    setExaPoolBaseURL(settings.ai?.exaPoolBaseUrl || "https://api.exa.ai");
    const exaApiKey = await readSecretValue("provider.exa_pool.api_key");
    setExaPoolApiKey(exaApiKey || "");
    setAiTestResult(null);
    setExaTestResult(null);
  }, []);

  // Load WebDAV settings
  const loadWebdavSettings = useCallback(async () => {
    try {
      const status = await getWebdavSyncStatus();
      setWebdavStatus(status);
      setWebdavServerUrl(status.serverUrl);
      setWebdavUsername(status.username);
      setWebdavRemotePath(status.remotePath || "JobPilot");
      setWebdavPassword("");
      setWebdavTestResult(null);
      setWebdavMessage(null);
    } catch (error) {
      console.error("Failed to load WebDAV settings:", error);
    }
  }, []);

  // Load settings on open
  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const settings = await getWorkspaceSettingsSnapshot();
        setTheme((settings.theme as ThemeMode) ?? "system");
        setLanguage(settings.locale || "zh");
        setAutoSave(settings.editor?.autoSave ?? true);
        setAutoSaveInterval(settings.editor?.autoSaveIntervalMs ?? 500);
        await loadAiSettings();
        await loadWebdavSettings();
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    })();
  }, [open, loadAiSettings, loadWebdavSettings]);

  // Focus model search input when popover opens
  useEffect(() => {
    if (modelOpen) {
      setTimeout(() => modelSearchRef.current?.focus(), 50);
    } else {
      setModelSearch("");
    }
  }, [modelOpen]);

  useEffect(() => {
    if (visionModelOpen) {
      setTimeout(() => visionModelSearchRef.current?.focus(), 50);
    } else {
      setVisionModelSearch("");
    }
  }, [visionModelOpen]);

  // Fetch models when combobox opens
  const fetchModelsForProvider = useCallback(async () => {
    setModelsFetching(true);
    try {
      const result = await fetchAiModels({
        provider: aiProvider,
        baseUrl: aiBaseURL,
        apiKey: aiApiKey,
      });
      setFetchedModels(result.models);
      setModelsFetched(true);
    } catch {
      setFetchedModels([]);
      setModelsFetched(true);
    } finally {
      setModelsFetching(false);
    }
  }, [aiProvider, aiBaseURL, aiApiKey]);

  useEffect(() => {
    if ((modelOpen || visionModelOpen) && !modelsFetched && !modelsFetching) {
      void fetchModelsForProvider();
    }
  }, [
    modelOpen,
    visionModelOpen,
    modelsFetched,
    modelsFetching,
    fetchModelsForProvider,
  ]);

  // Reset model fetch state when provider changes
  useEffect(() => {
    setModelOpen(false);
    setVisionModelOpen(false);
    setModelsFetched(false);
    setFetchedModels([]);
    setAiTestResult(null);
    setModelSearch("");
    setVisionModelSearch("");
  }, [aiProvider]);

  const filteredModels = fetchedModels.filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase()),
  );
  const filteredVisionModels = fetchedModels.filter((m) =>
    m.toLowerCase().includes(visionModelSearch.toLowerCase()),
  );

  // Auto-save handlers
  const saveAppearance = useCallback(
    async (updates: {
      locale?: string;
      theme?: ThemeMode;
      autoSave?: boolean;
      autoSaveIntervalMs?: number;
    }) => {
      try {
        const settings = await getWorkspaceSettingsSnapshot();
        await updateWorkspaceAppearanceSettings({
          locale: updates.locale ?? settings.locale ?? "zh",
          theme: updates.theme ?? settings.theme ?? "system",
          autoSave: updates.autoSave ?? settings.editor?.autoSave ?? true,
          autoSaveIntervalMs:
            updates.autoSaveIntervalMs ??
            settings.editor?.autoSaveIntervalMs ??
            500,
          rememberWindowState: true,
        });
        if (updates.theme) {
          applyDesktopTheme(updates.theme);
        }
        if (updates.locale) {
          void i18n.changeLanguage(updates.locale);
        }
      } catch (error) {
        console.error("Failed to save appearance settings:", error);
      }
    },
    [],
  );

  const saveAIConfig = useCallback(
    async (updates: {
      provider?: AiProvider;
      baseUrl?: string;
      model?: string;
      resumeImportVisionModel?: string;
      exaPoolBaseUrl?: string;
    }) => {
      try {
        const payload: ProviderConfigUpdateInput = {
          provider: updates.provider ?? aiProvider,
          baseUrl: updates.baseUrl ?? aiBaseURL,
          model: updates.model ?? aiModel,
          setAsDefault: true,
          resumeImportVisionModel:
            updates.resumeImportVisionModel ?? resumeImportVisionModel,
          exaPoolBaseUrl: updates.exaPoolBaseUrl ?? exaPoolBaseURL,
        };
        await updateAiProviderSettings(payload);
        window.dispatchEvent(new Event("ai-settings-changed"));
      } catch (error) {
        console.error("Failed to save AI settings:", error);
      }
    },
    [aiProvider, aiBaseURL, aiModel, resumeImportVisionModel, exaPoolBaseURL],
  );

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value);
    void saveAppearance({ theme: value });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    void saveAppearance({ locale: value });
  };

  const handleAutoSaveChange = (value: boolean) => {
    setAutoSave(value);
    void saveAppearance({ autoSave: value });
  };

  const handleAutoSaveIntervalChange = ([v]: number[]) => {
    setAutoSaveInterval(v);
    void saveAppearance({ autoSaveIntervalMs: v });
  };

  const handleProviderChange = async (value: AiProvider) => {
    setAIProvider(value);
    // Load config for new provider
    try {
      const settings = await getWorkspaceSettingsSnapshot();
      const config = settings.ai?.providerConfigs?.[value];
      setAIBaseURL(config?.baseUrl || "");
      setAIModel(config?.model || "");
      // Load API key for new provider
      const apiKey = await readSecretValue(`provider.${value}.api_key`);
      setAIApiKey(apiKey || "");
    } catch {
      /* ignore */
    }
    void saveAIConfig({ provider: value });
  };

  const handleBaseURLChange = (value: string) => {
    setAIBaseURL(value);
  };

  const handleBaseURLBlur = () => {
    void saveAIConfig({ baseUrl: aiBaseURL });
  };

  const handleModelChange = (value: string) => {
    setAIModel(value);
    setModelOpen(false);
    void saveAIConfig({ model: value });
  };

  const handleVisionModelChange = (value: string) => {
    setResumeImportVisionModel(value);
    setVisionModelOpen(false);
    void saveAIConfig({ resumeImportVisionModel: value });
  };

  const handleApiKeyBlur = async () => {
    if (aiApiKey.trim()) {
      try {
        await writeSecretValue({
          key: `provider.${aiProvider}.api_key`,
          provider: aiProvider,
          value: aiApiKey.trim(),
        });
      } catch (error) {
        console.error("Failed to save API key:", error);
      }
    }
  };

  const handleExaBaseURLChange = (value: string) => {
    setExaPoolBaseURL(value);
  };

  const handleExaBaseURLBlur = () => {
    void saveAIConfig({ exaPoolBaseUrl: exaPoolBaseURL });
  };

  const handleExaApiKeyBlur = async () => {
    if (exaPoolApiKey.trim()) {
      try {
        await writeSecretValue({
          key: "provider.exa_pool.api_key",
          provider: "openai",
          value: exaPoolApiKey.trim(),
        });
      } catch (error) {
        console.error("Failed to save Exa API key:", error);
      }
    }
  };

  const handleTestAiConnection = useCallback(async () => {
    // Save API key first before testing
    if (aiApiKey.trim()) {
      try {
        await writeSecretValue({
          key: `provider.${aiProvider}.api_key`,
          provider: aiProvider,
          value: aiApiKey.trim(),
        });
      } catch (error) {
        console.error("Failed to save API key before test:", error);
      }
    }
    // Also save other settings
    await saveAIConfig({ baseUrl: aiBaseURL, model: aiModel });

    setAiTesting(true);
    setAiTestResult(null);
    try {
      const result = await testAiConnectivity(aiProvider);
      setAiTestResult(result);
    } catch (error) {
      setAiTestResult({
        success: false,
        latencyMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAiTesting(false);
    }
  }, [aiProvider, aiApiKey, aiBaseURL, aiModel, saveAIConfig]);

  const handleTestExaConnection = useCallback(async () => {
    // Save Exa settings first before testing
    await saveAIConfig({ exaPoolBaseUrl: exaPoolBaseURL });
    if (exaPoolApiKey.trim()) {
      try {
        await writeSecretValue({
          key: "provider.exa_pool.api_key",
          provider: "openai",
          value: exaPoolApiKey.trim(),
        });
      } catch (error) {
        console.error("Failed to save Exa API key before test:", error);
      }
    }

    setExaTesting(true);
    setExaTestResult(null);
    try {
      const result = await testExaConnectivity();
      setExaTestResult(result);
    } catch (error) {
      setExaTestResult({
        success: false,
        latencyMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setExaTesting(false);
    }
  }, [exaPoolApiKey, exaPoolBaseURL, saveAIConfig]);

  const handleSaveWebdavSettings = useCallback(async () => {
    setWebdavMessage(null);
    try {
      const nextStatus = await updateWebdavSyncSettings({
        serverUrl: webdavServerUrl,
        username: webdavUsername,
        remotePath: webdavRemotePath,
        password: webdavPassword.trim().length > 0 ? webdavPassword : null,
      });
      setWebdavStatus(nextStatus);
      setWebdavPassword("");
      setWebdavMessage({ type: "success", text: t("webdavSettingsSaved") });
    } catch (error) {
      setWebdavMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("webdavSettingsSaveFailed"),
      });
    }
  }, [webdavServerUrl, webdavUsername, webdavRemotePath, webdavPassword, t]);

  const handleTestWebdavConnection = useCallback(async () => {
    setWebdavTesting(true);
    setWebdavTestResult(null);
    setWebdavMessage(null);
    try {
      const result = await testWebdavConnection();
      setWebdavTestResult(result);
      if (!result.success) {
        setWebdavMessage({
          type: "error",
          text: result.errorMessage || t("webdavConnectionFailed"),
        });
      }
    } catch (error) {
      const errResult = {
        success: false as const,
        latencyMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      setWebdavTestResult(errResult);
      setWebdavMessage({ type: "error", text: errResult.errorMessage });
    } finally {
      setWebdavTesting(false);
    }
  }, [t]);

  const handleUploadWebdavSnapshot = useCallback(async () => {
    setWebdavUploading(true);
    setWebdavMessage(null);
    try {
      const receipt = await uploadWebdavSnapshot();
      const nextStatus = await getWebdavSyncStatus();
      setWebdavStatus(nextStatus);
      setWebdavMessage({
        type: "success",
        text: t("webdavUploadSuccess", {
          name: receipt.snapshotName,
          secrets: receipt.secretCount,
        }),
      });
    } catch (error) {
      setWebdavMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("webdavUploadFailed"),
      });
    } finally {
      setWebdavUploading(false);
    }
  }, [t]);

  const handleRestoreWebdavSnapshot = useCallback(async () => {
    setWebdavRestoring(true);
    setWebdavMessage(null);
    try {
      await restoreWebdavSnapshot();
      setWebdavMessage({
        type: "success",
        text: t("webdavRestoreSuccess"),
      });
    } catch (error) {
      setWebdavMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("webdavRestoreFailed"),
      });
    } finally {
      setWebdavRestoring(false);
    }
  }, [t]);

  const handleManualSave = useCallback(async () => {
    setAiSaving(true);
    try {
      // Save AI provider config
      const payload: ProviderConfigUpdateInput = {
        provider: aiProvider,
        baseUrl: aiBaseURL,
        model: aiModel,
        setAsDefault: true,
        resumeImportVisionModel,
        exaPoolBaseUrl: exaPoolBaseURL,
      };
      await updateAiProviderSettings(payload);

      // Save API key
      if (aiApiKey.trim()) {
        await writeSecretValue({
          key: `provider.${aiProvider}.api_key`,
          provider: aiProvider,
          value: aiApiKey.trim(),
        });
      }

      // Save Exa API key
      if (exaPoolApiKey.trim()) {
        await writeSecretValue({
          key: "provider.exa_pool.api_key",
          provider: "openai",
          value: exaPoolApiKey.trim(),
        });
      }

      window.dispatchEvent(new Event("ai-settings-changed"));
      onClose();
    } catch (error) {
      console.error("Failed to save AI settings:", error);
    } finally {
      setAiSaving(false);
    }
  }, [
    aiProvider,
    aiBaseURL,
    aiModel,
    resumeImportVisionModel,
    exaPoolBaseURL,
    aiApiKey,
    exaPoolApiKey,
    onClose,
  ]);

  const handleCancelAi = useCallback(() => {
    void loadAiSettings();
    onClose();
  }, [loadAiSettings, onClose]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] p-0 flex flex-col"
        showCloseButton
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b dark:border-zinc-800">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-500" />
            {t("settings.title")}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {[
              { value: "ai", icon: Cpu, label: t("settings.ai.title") },
              {
                value: "appearance",
                icon: Paintbrush,
                label: t("settings.appearance.title"),
              },
              {
                value: "editor",
                icon: PenTool,
                label: t("settings.editorTab.title"),
              },
              {
                value: "sync",
                icon: Cloud,
                label: t("settingsTabSync"),
              },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                  settingsTab === value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "hover:text-zinc-900 dark:hover:text-zinc-100",
                )}
                onClick={() => setSettingsTab(value)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {/* AI Configuration Tab */}
            {settingsTab === "ai" && (
              <div className="space-y-4">
                {/* Provider */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.provider")}</Label>
                  <Select
                    value={aiProvider}
                    onValueChange={(v) =>
                      void handleProviderChange(v as AiProvider)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.apiKey")}</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={aiApiKey}
                      onChange={(e) => setAIApiKey(e.target.value)}
                      onBlur={() => void handleApiKeyBlur()}
                      placeholder={t("settings.ai.apiKeyPlaceholder")}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Base URL */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.baseURL")}</Label>
                  <Input
                    value={aiBaseURL}
                    onChange={(e) => handleBaseURLChange(e.target.value)}
                    onBlur={() => void handleBaseURLBlur()}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label>{t("settings.ai.model")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      disabled={modelsFetching}
                      onClick={() => void fetchModelsForProvider()}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3",
                          modelsFetching && "animate-spin",
                        )}
                      />
                    </Button>
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelOpen}
                      className="w-full justify-between cursor-pointer font-normal"
                      onClick={() => {
                        setModelOpen(!modelOpen);
                        setVisionModelOpen(false);
                      }}
                    >
                      <span className="truncate">
                        {aiModel || t("settings.ai.modelPlaceholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {modelOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b px-3 py-2 dark:border-zinc-800">
                          <Input
                            ref={modelSearchRef}
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            placeholder={t("settings.ai.modelPlaceholder")}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {modelsFetching && (
                            <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t("aiFetchingModels")}
                            </div>
                          )}
                          {!modelsFetching &&
                            filteredModels.length === 0 &&
                            modelsFetched && (
                              <div className="px-3 py-3 text-xs text-zinc-400">
                                {t("aiNoModelsFound")}
                              </div>
                            )}
                          {filteredModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={cn(
                                "flex w-full cursor-pointer items-center px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800",
                                aiModel === m && "bg-zinc-100 dark:bg-zinc-800",
                              )}
                              onClick={() => handleModelChange(m)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  aiModel === m ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {m}
                            </button>
                          ))}
                        </div>
                        <div className="border-t px-3 py-2 dark:border-zinc-800">
                          <Input
                            value={aiModel}
                            onChange={(e) => setAIModel(e.target.value)}
                            placeholder={t("settings.ai.modelPlaceholder")}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleModelChange(aiModel);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vision Model */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.resumeImportVisionModel")}</Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={visionModelOpen}
                      className="w-full justify-between cursor-pointer font-normal"
                      onClick={() => {
                        setVisionModelOpen(!visionModelOpen);
                        setModelOpen(false);
                      }}
                    >
                      <span className="truncate">
                        {resumeImportVisionModel ||
                          t("settings.ai.resumeImportVisionModelPlaceholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {visionModelOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b px-3 py-2 dark:border-zinc-800">
                          <Input
                            ref={visionModelSearchRef}
                            value={visionModelSearch}
                            onChange={(e) =>
                              setVisionModelSearch(e.target.value)
                            }
                            placeholder={t(
                              "settings.ai.resumeImportVisionModelPlaceholder",
                            )}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {modelsFetching && (
                            <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t("aiFetchingModels")}
                            </div>
                          )}
                          {!modelsFetching &&
                            filteredVisionModels.length === 0 &&
                            modelsFetched && (
                              <div className="px-3 py-3 text-xs text-zinc-400">
                                {t("aiNoModelsFound")}
                              </div>
                            )}
                          {filteredVisionModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={cn(
                                "flex w-full cursor-pointer items-center px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800",
                                resumeImportVisionModel === m &&
                                  "bg-zinc-100 dark:bg-zinc-800",
                              )}
                              onClick={() => handleVisionModelChange(m)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  resumeImportVisionModel === m
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {m}
                            </button>
                          ))}
                        </div>
                        <div className="border-t px-3 py-2 dark:border-zinc-800">
                          <Input
                            value={resumeImportVisionModel}
                            onChange={(e) =>
                              setResumeImportVisionModel(e.target.value)
                            }
                            placeholder={t(
                              "settings.ai.resumeImportVisionModelPlaceholder",
                            )}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleVisionModelChange(
                                  resumeImportVisionModel,
                                );
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {t("settings.ai.resumeImportVisionModelHint")}
                  </p>
                </div>

                {/* Test AI Connection */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    disabled={aiTesting}
                    onClick={() => void handleTestAiConnection()}
                  >
                    {aiTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                    {aiTesting ? t("aiTesting") : t("aiTestConnection")}
                  </Button>
                  {aiTestResult && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        aiTestResult.success
                          ? "text-green-600"
                          : "text-red-500",
                      )}
                    >
                      {aiTestResult.success
                        ? `${t("aiConnected")} (${aiTestResult.latencyMs}ms)`
                        : aiTestResult.errorMessage || t("aiConnectionFailed")}
                    </span>
                  )}
                </div>

                <Separator />

                {/* Web Tools (Exa) */}
                <div className="space-y-1 pt-2">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t("settings.ai.webToolsTitle")}
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {t("settings.ai.webToolsDescription")}
                  </p>
                </div>

                {/* Exa Base URL */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.exaPoolBaseURL")}</Label>
                  <Input
                    value={exaPoolBaseURL}
                    onChange={(e) => handleExaBaseURLChange(e.target.value)}
                    onBlur={handleExaBaseURLBlur}
                    placeholder={t("settings.ai.exaPoolBaseURLPlaceholder")}
                  />
                </div>

                {/* Exa API Key */}
                <div className="space-y-2">
                  <Label>{t("settings.ai.exaPoolApiKey")}</Label>
                  <div className="relative">
                    <Input
                      type={showExaPoolApiKey ? "text" : "password"}
                      value={exaPoolApiKey}
                      onChange={(e) => setExaPoolApiKey(e.target.value)}
                      onBlur={() => void handleExaApiKeyBlur()}
                      placeholder={t("settings.ai.exaPoolApiKeyPlaceholder")}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      onClick={() => setShowExaPoolApiKey(!showExaPoolApiKey)}
                    >
                      {showExaPoolApiKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Test Exa Connection */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    disabled={exaTesting}
                    onClick={() => void handleTestExaConnection()}
                  >
                    {exaTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                    {exaTesting ? t("aiTesting") : t("aiTestConnection")}
                  </Button>
                  {exaTestResult && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        exaTestResult.success
                          ? "text-green-600"
                          : "text-red-500",
                      )}
                    >
                      {exaTestResult.success
                        ? `${t("aiConnected")} (${exaTestResult.latencyMs}ms)`
                        : exaTestResult.errorMessage || t("aiConnectionFailed")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {settingsTab === "appearance" && (
              <div className="space-y-5">
                {/* Theme */}
                <div className="space-y-3">
                  <Label>{t("settings.appearance.theme")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        value: "light" as const,
                        icon: Sun,
                        label: t("settings.appearance.themeLight"),
                      },
                      {
                        value: "dark" as const,
                        icon: Moon,
                        label: t("settings.appearance.themeDark"),
                      },
                      {
                        value: "system" as const,
                        icon: Monitor,
                        label: t("settings.appearance.themeSystem"),
                      },
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleThemeChange(value)}
                        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                          theme === value
                            ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Language */}
                <div className="space-y-2">
                  <Label>{t("settings.appearance.language")}</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => handleLanguageChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Editor Tab */}
            {settingsTab === "editor" && (
              <div className="space-y-5">
                {/* Auto Save */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t("settings.editorTab.autoSave")}</Label>
                    <p className="text-xs text-zinc-400">
                      {t("settings.editorTab.autoSaveDescription")}
                    </p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={handleAutoSaveChange}
                  />
                </div>

                <Separator />

                {/* Auto Save Interval */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.editorTab.autoSaveInterval")}</Label>
                    <span className="text-sm text-zinc-500">
                      {(autoSaveInterval / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    value={[autoSaveInterval]}
                    onValueChange={handleAutoSaveIntervalChange}
                    min={300}
                    max={5000}
                    step={100}
                    disabled={!autoSave}
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>0.3s</span>
                    <span>5.0s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sync Tab */}
            {settingsTab === "sync" && (
              <div className="space-y-5">
                {/* WebDAV Status */}
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      webdavStatus?.configured
                        ? webdavStatus?.lastBackupAtEpochMs
                          ? "bg-green-500"
                          : "bg-yellow-500"
                        : "bg-zinc-300 dark:bg-zinc-600",
                    )}
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {webdavStatus?.configured
                      ? webdavStatus?.lastBackupAtEpochMs
                        ? t("webdavStatusConnected")
                        : t("webdavStatusNotBackedUp")
                      : t("webdavNotConfigured")}
                  </span>
                  {webdavStatus?.lastBackupAtEpochMs && (
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(webdavStatus.lastBackupAtEpochMs).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Server URL */}
                <div className="space-y-2">
                  <Label>{t("webdavServerUrlLabel")}</Label>
                  <Input
                    value={webdavServerUrl}
                    onChange={(e) => setWebdavServerUrl(e.target.value)}
                    placeholder="https://dav.example.com/path"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label>{t("webdavUsernameLabel")}</Label>
                  <Input
                    value={webdavUsername}
                    onChange={(e) => setWebdavUsername(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label>{t("webdavPasswordLabel")}</Label>
                  <div className="relative">
                    <Input
                      type={webdavShowPassword ? "text" : "password"}
                      value={webdavPassword}
                      onChange={(e) => setWebdavPassword(e.target.value)}
                      placeholder={
                        webdavStatus?.configured
                          ? t("webdavPasswordConfiguredPlaceholder")
                          : t("webdavPasswordPlaceholder")
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      onClick={() => setWebdavShowPassword(!webdavShowPassword)}
                    >
                      {webdavShowPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Remote Path */}
                <div className="space-y-2">
                  <Label>{t("webdavRemotePathLabel")}</Label>
                  <Input
                    value={webdavRemotePath}
                    onChange={(e) => setWebdavRemotePath(e.target.value)}
                    placeholder="JobPilot"
                  />
                </div>

                {/* Save & Test */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    onClick={() => void handleSaveWebdavSettings()}
                  >
                    {t("webdavSaveSettings")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    disabled={webdavTesting || !webdavStatus?.configured}
                    onClick={() => void handleTestWebdavConnection()}
                  >
                    {webdavTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                    {webdavTesting ? t("aiTesting") : t("aiTestConnection")}
                  </Button>
                  {webdavTestResult?.success && (
                    <span className="text-xs font-medium text-green-600">
                      {t("aiConnected")} ({webdavTestResult.latencyMs}ms)
                    </span>
                  )}
                </div>

                <Separator />

                {/* Encryption hint */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    <Shield className="h-3.5 w-3.5" />
                    {t("webdavBackupEncryption")}
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {t("webdavBackupEncryptionHint")}
                  </p>
                </div>

                {/* Upload / Restore */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    disabled={webdavUploading || !webdavStatus?.configured}
                    onClick={() => void handleUploadWebdavSnapshot()}
                  >
                    {webdavUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {webdavUploading ? t("webdavUploading") : t("webdavUpload")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    disabled={webdavRestoring || !webdavStatus?.configured}
                    onClick={() => void handleRestoreWebdavSnapshot()}
                  >
                    {webdavRestoring ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {webdavRestoring ? t("webdavRestoring") : t("webdavRestore")}
                  </Button>
                </div>

                {/* Status message */}
                {webdavMessage && (
                  <p
                    className={cn(
                      "text-xs font-medium",
                      webdavMessage.type === "success"
                        ? "text-green-600"
                        : "text-red-500",
                    )}
                  >
                    {webdavMessage.text}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer for AI tab */}
          {settingsTab === "ai" && (
            <div className="border-t border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleCancelAi}
                >
                  {t("settings.ai.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  disabled={aiSaving}
                  onClick={() => void handleManualSave()}
                >
                  {t("settings.ai.save")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
