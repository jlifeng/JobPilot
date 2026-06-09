import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Palette,
  RotateCcw,
  Space,
  Sparkles,
  Type,
} from "lucide-react";
import { TEMPLATES } from "@/lib/constants";
import { TemplateThumbnail } from "@/components/dashboard/template-thumbnail";
import { useResumeStore } from "../../stores/resume-store";
import { templateLabelsMap } from "../../lib/template-labels";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleSelect } from "../simple-select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import type { ThemeConfig } from "../../types/resume";

interface PresetTheme {
  id: string;
  colors: [string, string, string, string];
  config: Partial<ThemeConfig>;
}

const PRESET_THEMES: PresetTheme[] = [
  {
    id: "classic",
    colors: ["#1a1a1a", "#3b82f6", "#ffffff", "#374151"],
    config: {
      primaryColor: "#1a1a1a",
      accentColor: "#3b82f6",
      fontFamily: "Georgia",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 24, right: 24, bottom: 24, left: 24 },
      sectionSpacing: 16,
    },
  },
  {
    id: "modern",
    colors: ["#0f172a", "#6366f1", "#f8fafc", "#475569"],
    config: {
      primaryColor: "#0f172a",
      accentColor: "#6366f1",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.6,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 14,
    },
  },
  {
    id: "minimal",
    colors: ["#27272a", "#a1a1aa", "#ffffff", "#52525b"],
    config: {
      primaryColor: "#27272a",
      accentColor: "#a1a1aa",
      fontFamily: "Helvetica",
      fontSize: "small",
      lineSpacing: 1.4,
      margin: { top: 28, right: 28, bottom: 28, left: 28 },
      sectionSpacing: 12,
    },
  },
  {
    id: "elegant",
    colors: ["#1c1917", "#b45309", "#fffbeb", "#57534e"],
    config: {
      primaryColor: "#1c1917",
      accentColor: "#b45309",
      fontFamily: "Palatino",
      fontSize: "medium",
      lineSpacing: 1.6,
      margin: { top: 26, right: 26, bottom: 26, left: 26 },
      sectionSpacing: 18,
    },
  },
  {
    id: "bold",
    colors: ["#020617", "#e11d48", "#fff1f2", "#334155"],
    config: {
      primaryColor: "#020617",
      accentColor: "#e11d48",
      fontFamily: "Arial",
      fontSize: "large",
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
    },
  },
  {
    id: "creative",
    colors: ["#134e4a", "#0d9488", "#f0fdfa", "#115e59"],
    config: {
      primaryColor: "#134e4a",
      accentColor: "#0d9488",
      fontFamily: "Verdana",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 22, right: 22, bottom: 22, left: 22 },
      sectionSpacing: 14,
    },
  },
];

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#1a1a1a",
  accentColor: "#3b82f6",
  fontFamily: "Inter",
  fontSize: "medium",
  lineSpacing: 1.5,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  sectionSpacing: 16,
  avatarStyle: "oneInch",
};

const FONT_OPTIONS = [
  "Inter",
  "Georgia",
  "Helvetica",
  "Arial",
  "Palatino",
  "Verdana",
  "Times New Roman",
  "Garamond",
  "Courier New",
];

const FONT_SIZE_OPTIONS = ["small", "medium", "large"] as const;

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-sm border border-zinc-200 dark:border-zinc-700"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-24 font-mono text-xs"
        />
      </div>
    </div>
  );
}

function ThemeSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full cursor-pointer items-center gap-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
      </button>
      {isOpen ? <div className="space-y-3 pb-3 pl-5">{children}</div> : null}
    </div>
  );
}

export function ThemeEditor() {
  const { t } = useTranslation();
  const { currentResume, updateTheme, setTemplate } = useResumeStore();

  const themeConfig: ThemeConfig = {
    ...DEFAULT_THEME,
    ...(currentResume?.themeConfig || {}),
  };

  const updateThemeConfig = useCallback(
    (updates: Partial<ThemeConfig>) => {
      updateTheme(updates);
    },
    [updateTheme],
  );

  const applyPreset = useCallback(
    (preset: PresetTheme) => {
      updateThemeConfig(preset.config);
    },
    [updateThemeConfig],
  );

  const resetTheme = useCallback(() => {
    updateThemeConfig(DEFAULT_THEME);
  }, [updateThemeConfig]);

  const fontSizeLabels: Record<(typeof FONT_SIZE_OPTIONS)[number], string> = {
    small: t("themeEditor.fontSize.small"),
    medium: t("themeEditor.fontSize.medium"),
    large: t("themeEditor.fontSize.large"),
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-card dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-white/10 dark:bg-card">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-200">
            <Palette className="h-4 w-4" />
          </span>
          {t("themeEditor.title")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={resetTheme}
          title={t("themeEditor.reset")}
          className="w-7 cursor-pointer rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 px-4 py-3">
          <ThemeSection
            icon={LayoutGrid}
            title={t("themeEditor.templateSection")}
            defaultOpen={false}
          >
            <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto pr-1">
              {TEMPLATES.map((template) => {
                const isSelected = currentResume?.template === template;

                return (
                  <button
                    key={template}
                    type="button"
                    className={cn(
                      "group/tpl relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-200",
                      isSelected
                        ? "border-blue-500 shadow-sm shadow-blue-500/10 dark:border-blue-400"
                        : "border-slate-200 hover:border-blue-200 hover:shadow-sm dark:border-zinc-700 dark:hover:border-blue-500/40",
                    )}
                    onClick={() => setTemplate(template)}
                  >
                    <div className="relative bg-slate-50 p-1 dark:bg-zinc-800/50">
                      <TemplateThumbnail
                        template={template}
                        className="mx-auto h-[56px] w-[40px] shadow-sm ring-1 ring-zinc-200/50"
                      />
                      {isSelected ? (
                        <div className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm dark:bg-blue-500">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "truncate px-1 py-0.5 text-center text-[10px] font-medium transition-colors",
                        isSelected
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                          : "text-slate-500 dark:text-zinc-400",
                      )}
                    >
                      {t(templateLabelsMap[template])}
                    </div>
                  </button>
                );
              })}
            </div>
          </ThemeSection>

          <Separator />

          <ThemeSection icon={Sparkles} title={t("themeEditor.presets")}>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_THEMES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-slate-200 p-2 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm dark:border-zinc-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/20"
                  title={t(`themeEditor.preset.${preset.id}`)}
                >
                  <div className="flex gap-0.5">
                    {preset.colors.map((color, index) => (
                      <div
                        key={`${preset.id}-${index}`}
                        className="h-3 w-3 rounded-full border border-zinc-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-blue-700 dark:text-zinc-400 dark:group-hover:text-blue-200">
                    {t(`themeEditor.preset.${preset.id}`)}
                  </span>
                </button>
              ))}
            </div>
          </ThemeSection>

          <Separator />

          <ThemeSection icon={Palette} title={t("themeEditor.colors")}>
            <ColorPickerField
              label={t("themeEditor.primaryColor")}
              value={themeConfig.primaryColor}
              onChange={(color) => updateThemeConfig({ primaryColor: color })}
            />
            <ColorPickerField
              label={t("themeEditor.accentColor")}
              value={themeConfig.accentColor}
              onChange={(color) => updateThemeConfig({ accentColor: color })}
            />
          </ThemeSection>

          <Separator />

          <ThemeSection icon={Type} title={t("themeEditor.typography")}>
            <div className="space-y-1.5">
              <Label>{t("themeEditor.fontFamily")}</Label>
              <SimpleSelect
                value={themeConfig.fontFamily}
                onValueChange={(value) =>
                  updateThemeConfig({ fontFamily: value })
                }
                options={FONT_OPTIONS.map((font) => ({
                  value: font,
                  label: font,
                }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("themeEditor.fontSizeLabel")}</Label>
              <div className="grid grid-cols-3 gap-1">
                {FONT_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateThemeConfig({ fontSize: size })}
                    className={cn(
                      "cursor-pointer rounded-md border px-2 py-1 text-xs transition-all",
                      themeConfig.fontSize === size
                        ? "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600",
                    )}
                  >
                    {fontSizeLabels[size]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t("themeEditor.lineSpacing")}</Label>
                <span className="text-xs text-zinc-400">
                  {themeConfig.lineSpacing.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[themeConfig.lineSpacing]}
                onValueChange={([value]) =>
                  updateThemeConfig({ lineSpacing: value })
                }
                min={1}
                max={2.5}
                step={0.1}
              />
            </div>
          </ThemeSection>

          <Separator />

          <ThemeSection icon={Space} title={t("themeEditor.spacing")}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t("themeEditor.sectionSpacing")}</Label>
                <span className="text-xs text-zinc-400">
                  {themeConfig.sectionSpacing}px
                </span>
              </div>
              <Slider
                value={[themeConfig.sectionSpacing]}
                onValueChange={([value]) =>
                  updateThemeConfig({ sectionSpacing: value })
                }
                min={4}
                max={32}
                step={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("themeEditor.pageMargin")}</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <div key={side} className="space-y-0.5">
                    <span className="block text-center text-[10px] text-zinc-400">
                      {t(`themeEditor.margin.${side}`)}
                    </span>
                    <Input
                      type="number"
                      value={themeConfig.margin[side]}
                      onChange={(event) =>
                        updateThemeConfig({
                          margin: {
                            ...themeConfig.margin,
                            [side]: Math.max(
                              0,
                              Math.min(
                                60,
                                Number(event.target.value) || 0,
                              ),
                            ),
                          },
                        })
                      }
                      min={0}
                      max={60}
                      className="h-7 px-1 text-center text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ThemeSection>
        </div>
      </ScrollArea>
    </div>
  );
}
