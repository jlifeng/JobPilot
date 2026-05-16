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
  X,
  Plug,
  RefreshCw,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useUIStore } from "../../stores/ui-store";
import {
  getWorkspaceSettingsSnapshot,
  updateWorkspaceAppearanceSettings,
  updateAiProviderSettings,
  writeSecretValue,
  fetchAiModels,
  testAiConnectivity,
  testExaConnectivity,
  type ProviderConfigUpdateInput,
  type AiProvider,
  type ConnectivityTestResult,
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
  const [setAsDefault, setSetAsDefault] = useState(true);

  // Exa
  const [exaPoolBaseURL, setExaPoolBaseURL] = useState("https://api.exa.ai");
  const [exaPoolApiKey, setExaPoolApiKey] = useState("");
  const [showExaPoolApiKey, setShowExaPoolApiKey] = useState(false);

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
  const [aiTestResult, setAiTestResult] = useState<ConnectivityTestResult | null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const [exaTestResult, setExaTestResult] = useState<ConnectivityTestResult | null>(null);
  const [exaTesting, setExaTesting] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

        const provider = (settings.ai?.defaultProvider as AiProvider) || "openai";
        setAIProvider(provider);
        const config = settings.ai?.providerConfigs?.[provider];
        setAIBaseURL(config?.baseUrl || "");
        setAIModel(config?.model || "");
        setResumeImportVisionModel(settings.ai?.resumeImportVisionModel || "");
        setSetAsDefault(true);

        // Exa
        setExaPoolBaseURL(settings.ai?.exaPoolBaseUrl || "https://api.exa.ai");
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    })();
  }, [open]);

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
  }, [modelOpen, visionModelOpen, modelsFetched, modelsFetching, fetchModelsForProvider]);

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

  // Mark as changed when settings are modified
  const markChanged = () => setHasChanges(true);

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value);
    markChanged();
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    markChanged();
  };

  const handleAutoSaveChange = (value: boolean) => {
    setAutoSave(value);
    markChanged();
  };

  const handleAutoSaveIntervalChange = ([v]: number[]) => {
    setAutoSaveInterval(v);
    markChanged();
  };

  // Save AI settings
  const handleProviderChange = async (value: AiProvider) => {
    setAIProvider(value);
    markChanged();
    // Load config for new provider
    try {
      const settings = await getWorkspaceSettingsSnapshot();
      const config = settings.ai?.providerConfigs?.[value];
      setAIBaseURL(config?.baseUrl || "");
      setAIModel(config?.model || "");
    } catch { /* ignore */ }
  };

  // Save all settings
  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      // Save appearance settings
      await updateWorkspaceAppearanceSettings({
        locale: language,
        theme,
        autoSave,
        rememberWindowState: true,
      });
      applyDesktopTheme(theme);
      void i18n.changeLanguage(language);

      // Save AI settings
      const payload: ProviderConfigUpdateInput = {
        provider: aiProvider,
        baseUrl: aiBaseURL,
        model: aiModel,
        setAsDefault,
        resumeImportVisionModel,
      };
      await updateAiProviderSettings(payload);

      // Save API keys if provided
      if (aiApiKey.trim()) {
        await writeSecretValue({
          key: `provider.${aiProvider}.api_key`,
          provider: aiProvider,
          value: aiApiKey.trim(),
        });
      }
      if (exaPoolApiKey.trim()) {
        await writeSecretValue({
          key: "provider.exa_pool.api_key",
          provider: "openai",
          value: exaPoolApiKey.trim(),
        });
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  }, [theme, language, autoSave, aiProvider, aiBaseURL, aiModel, aiApiKey, resumeImportVisionModel, exaPoolApiKey, setAsDefault]);

  const handleTestAiConnection = useCallback(async () => {
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
  }, [aiProvider]);

  const handleTestExaConnection = useCallback(async () => {
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
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid items-start justify-items-center overflow-y-auto bg-black/50 p-4 sm:items-center"
    >
      <div
        className="relative my-4 w-full max-w-[540px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 px-6">
          <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {[
              { value: "ai", icon: Cpu, label: t("settings.ai.title") },
              { value: "appearance", icon: Paintbrush, label: t("settings.appearance.title") },
              { value: "editor", icon: PenTool, label: t("settings.editorTab.title") },
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

        {/* AI Configuration Tab */}
        {settingsTab === "ai" && (
          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Provider */}
            <div className="space-y-2">
              <Label>{t("settings.ai.provider")}</Label>
              <select
                value={aiProvider}
                onChange={(e) => void handleProviderChange(e.target.value as AiProvider)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>{t("settings.ai.apiKey")}</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => {
                    setAIApiKey(e.target.value);
                    markChanged();
                  }}
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
              <p className="text-xs text-zinc-400">{t("settings.ai.apiKeyHint")}</p>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label>{t("settings.ai.baseURL")}</Label>
              <Input
                value={aiBaseURL}
                onChange={(e) => {
                  setAIBaseURL(e.target.value);
                  markChanged();
                }}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            {/* Model — Combobox */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("settings.ai.model")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs cursor-pointer text-zinc-400 hover:text-zinc-600"
                  disabled={modelsFetching}
                  onClick={() => void fetchModelsForProvider()}
                >
                  <RefreshCw className={cn("h-3 w-3", modelsFetching && "animate-spin")} />
                  {modelsFetching ? t("aiFetchingModels") : t("settings.ai.fetchModels")}
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
                    {/* Search input */}
                    <div className="border-b px-3 py-2 dark:border-zinc-800">
                      <Input
                        ref={modelSearchRef}
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder={t("settings.ai.modelPlaceholder")}
                        className="h-8 text-sm"
                      />
                    </div>
                    {/* Model list */}
                    <div className="max-h-48 overflow-y-auto">
                      {modelsFetching && (
                        <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("aiFetchingModels")}
                        </div>
                      )}
                      {!modelsFetching && filteredModels.length === 0 && modelsFetched && (
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
                          onClick={() => {
                            setAIModel(m);
                            setModelOpen(false);
                            markChanged();
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", aiModel === m ? "opacity-100" : "opacity-0")} />
                          {m}
                        </button>
                      ))}
                    </div>
                    {/* Manual entry */}
                    <div className="border-t px-3 py-2 dark:border-zinc-800">
                      <Input
                        value={aiModel}
                        onChange={(e) => {
                          setAIModel(e.target.value);
                          markChanged();
                        }}
                        placeholder={t("settings.ai.modelPlaceholder")}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setModelOpen(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                    {resumeImportVisionModel || t("settings.ai.resumeImportVisionModelPlaceholder")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                {visionModelOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b px-3 py-2 dark:border-zinc-800">
                      <Input
                        ref={visionModelSearchRef}
                        value={visionModelSearch}
                        onChange={(e) => setVisionModelSearch(e.target.value)}
                        placeholder={t("settings.ai.resumeImportVisionModelPlaceholder")}
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
                      {!modelsFetching && filteredVisionModels.length === 0 && modelsFetched && (
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
                            resumeImportVisionModel === m && "bg-zinc-100 dark:bg-zinc-800",
                          )}
                          onClick={() => {
                            setResumeImportVisionModel(m);
                            setVisionModelOpen(false);
                            markChanged();
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              resumeImportVisionModel === m ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="border-t px-3 py-2 dark:border-zinc-800">
                      <Input
                        value={resumeImportVisionModel}
                        onChange={(e) => {
                          setResumeImportVisionModel(e.target.value);
                          markChanged();
                        }}
                        placeholder={t("settings.ai.resumeImportVisionModelPlaceholder")}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setVisionModelOpen(false);
                          }
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
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {t("settings.ai.webToolsTitle")}
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                {t("settings.ai.webToolsDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("settings.ai.exaPoolBaseURL")}</Label>
              <Input
                value={exaPoolBaseURL}
                onChange={(e) => {
                  setExaPoolBaseURL(e.target.value);
                  markChanged();
                }}
                placeholder={t("settings.ai.exaPoolBaseURLPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("settings.ai.exaPoolApiKey")}</Label>
              <div className="relative">
                <Input
                  type={showExaPoolApiKey ? "text" : "password"}
                  value={exaPoolApiKey}
                  onChange={(e) => {
                    setExaPoolApiKey(e.target.value);
                    markChanged();
                  }}
                  placeholder={t("settings.ai.exaPoolApiKeyPlaceholder")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  onClick={() => setShowExaPoolApiKey(!showExaPoolApiKey)}
                >
                  {showExaPoolApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-zinc-400">{t("settings.ai.exaPoolApiKeyHint")}</p>
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
          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Theme */}
            <div className="space-y-3">
              <Label>{t("settings.appearance.theme")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "light" as const, icon: Sun, label: t("settings.appearance.themeLight") },
                  { value: "dark" as const, icon: Moon, label: t("settings.appearance.themeDark") },
                  { value: "system" as const, icon: Monitor, label: t("settings.appearance.themeSystem") },
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
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                {LOCALES.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Editor Tab */}
        {settingsTab === "editor" && (
          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.editorTab.autoSave")}</Label>
                <p className="text-xs text-zinc-400">
                  {t("settings.editorTab.autoSaveDescription")}
                </p>
              </div>
              <Switch checked={autoSave} onCheckedChange={handleAutoSaveChange} />
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

        {/* Footer with Save button */}
        <div className="sticky bottom-0 border-t bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            {hasChanges && (
              <span className="text-xs text-amber-600">
                {t("settings.hasChanges")}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={onClose}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="cursor-pointer gap-1.5"
                disabled={saving || !hasChanges}
                onClick={() => void handleSaveAll()}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? t("settings.saving") : t("settings.save")}
              </Button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 cursor-pointer"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
