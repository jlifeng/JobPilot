// SkillManagementPage — Skill 管理主页面（双栏布局）。
//
// 左栏：Skill 列表（卡片式），每项显示 name / description / version / source 标签
//   （builtin=蓝色"内置"、imported=绿色"导入"）/ enabled 开关。顶部有"导入 Skill"按钮。
// 右栏：选中 Skill 的详情面板 <SkillDetailPanel skill={selected} />。
//
// 挂载时 useSkillStore.loadSkills() + loadSettings()。
// 空状态：无 Skill 时显示引导文案 + 导入按钮。
// 列表项交互：点击选中（高亮）；enabled 开关调 saveSkill({...skill, enabled: next}) 更新；
//   builtin 项不显示删除按钮；imported 项显示删除按钮 → 确认弹窗 → deleteSkill(id) → 刷新。
//
// 导入入口：点击"导入 Skill"按钮 → 打开 SkillImportPreviewDialog。

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SkillDetailPanel } from "./skill-detail-panel";
import { SkillImportPreviewDialog } from "./skill-import-preview-dialog";
import { useSkillStore } from "../../stores/skill-store";
import { cn } from "@/lib/utils";
import type { Skill } from "../../types/skill";

export function SkillManagementPage() {
  const { t } = useTranslation();
  const skills = useSkillStore((state) => state.skills);
  const isLoading = useSkillStore((state) => state.isLoading);
  const loadSkills = useSkillStore((state) => state.loadSkills);
  const loadSettings = useSkillStore((state) => state.loadSettings);
  const saveSkill = useSkillStore((state) => state.saveSkill);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"imported" | "builtin">("imported");

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  // 挂载时加载 Skill 列表 + 设置。
  useEffect(() => {
    void loadSkills();
    void loadSettings();
  }, [loadSkills, loadSettings]);

  // 按 source tab 过滤：imported 或 builtin。
  const filteredSkills = skills.filter((item) =>
    sourceFilter === "imported"
      ? String(item.source) === "imported"
      : String(item.source) === "builtin",
  );

  // 选中态：优先用 selectedId，否则默认选过滤后第一项。
  const selectedSkill: Skill | null =
    filteredSkills.find((item) => item.id === selectedId) ?? filteredSkills[0] ?? null;

  const handleToggleEnabled = (skill: Skill, next: boolean) => {
    // saveSkill 是 upsert，传完整 skill，仅切换 enabled。
    void saveSkill({ ...skill, enabled: next });
  };

  const handleImported = () => {
    // 导入成功后刷新列表。
    void loadSkills();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      {/* 页面标题由顶栏 navbar 承担，此处仅保留导入入口。 */}
      <div className="flex justify-end">
        <Button onClick={() => setImportOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          {translate("skill.management.importButton", "导入 Skill")}
        </Button>
      </div>

      {/* 主体：双栏布局 */}
      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-300" />
        </div>
      ) : skills.length === 0 ? (
        // 空状态
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-zinc-950/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
            <Package className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-zinc-50">
            {translate("skill.management.empty.title", "暂无 Skill")}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            {translate("skill.management.empty.hint", "导入 .skill 包以扩展 AI 能力")}
          </p>
          <Button onClick={() => setImportOpen(true)} className="mt-5">
            <Plus className="h-4 w-4" />
            {translate("skill.management.importButton", "导入 Skill")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* 左栏：Skill 列表 */}
          <div className="flex flex-col gap-2">
            {/* Tab 筛选：导入 / 内置 */}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => { setSourceFilter("imported"); setSelectedId(null); }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  sourceFilter === "imported"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {translate("skill.management.tabImported", "导入")}
                <span className="ml-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  {skills.filter((s) => String(s.source) === "imported").length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setSourceFilter("builtin"); setSelectedId(null); }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  sourceFilter === "builtin"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {translate("skill.management.tabBuiltin", "内置")}
                <span className="ml-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  {skills.filter((s) => String(s.source) === "builtin").length}
                </span>
              </button>
            </div>

            {filteredSkills.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center dark:border-zinc-700 dark:bg-zinc-950/40">
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  {sourceFilter === "imported"
                    ? translate("skill.management.emptyImported", "暂无导入 Skill")
                    : translate("skill.management.emptyBuiltin", "暂无内置 Skill")}
                </p>
              </div>
            ) : (
              filteredSkills.map((skill) => (
                <SkillListCard
                  key={skill.id}
                  skill={skill}
                  selected={selectedSkill?.id === skill.id}
                  onSelect={() => setSelectedId(skill.id)}
                  onToggleEnabled={(next) => handleToggleEnabled(skill, next)}
                />
              ))
            )}
          </div>

          {/* 右栏：详情面板 */}
          <SkillDetailPanel skill={selectedSkill} />
        </div>
      )}

      {/* 导入预览弹窗 */}
      <SkillImportPreviewDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
}

interface SkillListCardProps {
  skill: Skill;
  selected: boolean;
  onSelect: () => void;
  onToggleEnabled: (next: boolean) => void;
}

function SkillListCard({
  skill,
  selected,
  onSelect,
  onToggleEnabled,
}: SkillListCardProps) {
  const { t } = useTranslation();

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  // 源标签：builtin=蓝色"内置"、imported=绿色"导入"。
  const isBuiltin = String(skill.source) === "builtin";
  const isImported = String(skill.source) === "imported";
  const sourceBadgeClass = isBuiltin
    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-200"
    : isImported
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  const sourceLabelKey = isBuiltin
    ? "skill.management.sourceBuiltin"
    : "skill.management.sourceImported";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-xl border bg-white p-4 transition-colors dark:bg-zinc-950",
        selected
          ? "border-violet-300 ring-1 ring-violet-200 dark:border-violet-500/40 dark:ring-violet-500/30"
          : "border-slate-200 hover:border-violet-200 hover:bg-violet-50/30 dark:border-zinc-800 dark:hover:border-violet-500/30 dark:hover:bg-violet-950/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-950 dark:text-zinc-50">
              {skill.name}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                sourceBadgeClass,
              )}
            >
              {translate(sourceLabelKey, isBuiltin ? "内置" : "导入")}
            </span>
          </div>
          {skill.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-zinc-400">
              {skill.description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
            <span>v{skill.version}</span>
            <span className="font-mono">{skill.id}</span>
          </div>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={skill.enabled}
            onCheckedChange={onToggleEnabled}
            aria-label={translate("skill.management.enabled", "启用")}
          />
        </div>
      </div>
    </div>
  );
}
