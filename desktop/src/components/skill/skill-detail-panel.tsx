// SkillDetailPanel — 右栏详情面板，展示选中 Skill 的完整元信息。
//
// 展示内容：name（大字）/ description / 元信息行（version / author / source 标签 / id）/
// capabilities 列表（id / name / description / matchOn 摘要 / outputFormat / requiresTools）/
// references 数量 / 变量配置区（复用 SkillVariableForm，MVP 单 capability）/
// requiredContext / enabled 开关（与列表项同步逻辑）/ 删除按钮（仅 imported source）。
//
// 状态：纯展示组件，所有变更走 useSkillStore（saveSkill / removeSkill）。

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SkillVariableForm } from "./skill-variable-form";
import { useSkillStore } from "../../stores/skill-store";
import { listScenarios } from "../../lib/skill-scenarios";
import { cn } from "@/lib/utils";
import type { Skill, SkillCapability, SkillReference } from "../../types/skill";

interface SkillDetailPanelProps {
  skill: Skill | null;
}

export function SkillDetailPanel({ skill }: SkillDetailPanelProps) {
  const { t } = useTranslation();
  const saveSkill = useSkillStore((state) => state.saveSkill);
  const removeSkill = useSkillStore((state) => state.removeSkill);

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  if (!skill) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-zinc-950/40">
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          {translate("skill.management.noSelection", "选择左侧 Skill 查看详情")}
        </p>
      </div>
    );
  }

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
    : isImported
      ? "skill.management.sourceImported"
      : "skill.management.sourceImported";

  const handleToggleEnabled = (next: boolean) => {
    // saveSkill 是 upsert，传完整 skill，仅切换 enabled。
    void saveSkill({ ...skill, enabled: next });
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      translate("skill.management.deleteConfirm", "确定要删除吗？此操作不可恢复。").replace(
        "{name}",
        skill.name,
      ),
    );
    if (!confirmed) {
      return;
    }
    await removeSkill(skill.id);
  };

  // 切换 imported Skill 第一个 capability 的 matchOn.scenarios。
  // saveSkill 是 upsert，传完整 skill，仅修改第一个 capability 的 scenarios 字段。
  const handleToggleScenario = (scenarioId: string, next: boolean) => {
    if (capabilities.length === 0) {
      return;
    }
    const updated = capabilities.map((capability, index) => {
      if (index !== 0) {
        return capability;
      }
      const current = capability.matchOn.scenarios ?? [];
      const scenarios = next
        ? current.includes(scenarioId)
          ? current
          : [...current, scenarioId]
        : current.filter((id) => id !== scenarioId);
      return {
        ...capability,
        matchOn: { ...capability.matchOn, scenarios },
      };
    });
    void saveSkill({ ...skill, capabilities: updated });
  };

  const capabilities: SkillCapability[] = skill.capabilities ?? [];
  const references = skill.references ?? [];
  const variables = skill.variables ?? [];
  const requiredContext = skill.requiredContext ?? [];
  // MVP：变量配置区复用第一个 capability（单 capability 场景）。
  const primaryCapability = capabilities[0] ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      {/* 顶部：name + 元信息 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-950 dark:text-zinc-50">
            {skill.name}
          </h2>
          <Switch
            checked={skill.enabled}
            onCheckedChange={handleToggleEnabled}
            aria-label={translate("skill.management.enabled", "启用")}
          />
        </div>
        {skill.description ? (
          <p className="text-sm leading-6 text-slate-600 dark:text-zinc-300">
            {skill.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              sourceBadgeClass,
            )}
          >
            {translate(sourceLabelKey, isBuiltin ? "内置" : "导入")}
          </span>
          <span>v{skill.version}</span>
          {skill.author ? <span>· {skill.author}</span> : null}
          <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">
            {skill.id}
          </span>
        </div>
      </div>

      {/* capabilities 列表 */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
          {translate("skill.management.capabilities", "能力")}（{capabilities.length}）
        </h3>
        {capabilities.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500">—</p>
        ) : (
          <div className="flex flex-col gap-2">
            {capabilities.map((capability) => (
              <CapabilityRow key={capability.id} capability={capability} />
            ))}
          </div>
        )}
      </div>

      {/* 适用场景：仅 imported Skill 显示。builtin 的 scenarios 固定，不该改。 */}
      {isImported ? (
        <ScenarioPicker
          scenarios={primaryCapability?.matchOn.scenarios ?? []}
          onToggle={handleToggleScenario}
          translate={translate}
        />
      ) : null}

      {/* references */}
      <ReferenceSection references={references} translate={translate} />

      {/* requiredContext */}
      {requiredContext.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
            {translate("skill.management.requiredContext", "所需上下文")}
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-slate-600 dark:text-zinc-300">
            {requiredContext.map((req) => (
              <li key={`${req.type}-${req.description}`} className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {req.type}
                </span>
                <span>{req.description}</span>
                {req.required ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">*</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 变量配置区：复用 SkillVariableForm，MVP 单 capability */}
      {variables.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
            {translate("skill.management.variables", "变量")}
          </h3>
          <SkillVariableForm skill={skill} capability={primaryCapability} />
        </div>
      ) : null}

      {/* 删除按钮：仅 imported source */}
      {isImported ? (
        <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-zinc-800">
          <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4" />
            {translate("skill.management.delete", "删除")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface CapabilityRowProps {
  capability: SkillCapability;
}

function CapabilityRow({ capability }: CapabilityRowProps) {
  const matchOn = capability.matchOn;
  const matchSummary = [
    matchOn.scenarios.length > 0 ? matchOn.scenarios.join(", ") : null,
    matchOn.categories && matchOn.categories.length > 0
      ? matchOn.categories.join(", ")
      : null,
    matchOn.keywords && matchOn.keywords.length > 0
      ? matchOn.keywords.join(", ")
      : null,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" · ");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-950 dark:text-zinc-50">
          {capability.name}
        </p>
        <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">
          {capability.id}
        </span>
        {capability.outputFormat ? (
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-600 dark:bg-violet-950/50 dark:text-violet-200">
            {capability.outputFormat}
          </span>
        ) : null}
      </div>
      {capability.description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">
          {capability.description}
        </p>
      ) : null}
      {matchSummary ? (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
          matchOn: {matchSummary}
        </p>
      ) : null}
      {capability.requiresTools && capability.requiresTools.length > 0 ? (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
          tools: {capability.requiresTools.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

interface ScenarioPickerProps {
  /** 当前已选场景 id 列表（取自第一个 capability 的 matchOn.scenarios）。 */
  scenarios: string[];
  /** 切换某个场景的选中态。 */
  onToggle: (scenarioId: string, next: boolean) => void;
  /** i18n 翻译函数（fallback 模式）。 */
  translate: (key: string, fallback: string) => string;
}

/**
 * 适用场景多选控件：仅对 imported Skill 渲染。
 *
 * 用可点击 badge 标签实现多选（仓库无 checkbox 组件），符合现有 source-badge
 * 设计语言：选中=填充色 bg，未选中=描边 border。勾选/取消时通过 onToggle 更新
 * Skill 第一个 capability 的 matchOn.scenarios。
 */
function ScenarioPicker({ scenarios, onToggle, translate }: ScenarioPickerProps) {
  const availableScenarios = listScenarios();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
        {translate("skill.management.applicableScenarios", "适用场景")}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {availableScenarios.map((scenario) => {
          const selected = scenarios.includes(scenario.id);
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onToggle(scenario.id, !selected)}
              aria-pressed={selected}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                selected
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {translate(`skill.scenario.${scenario.id}`, scenario.name)}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
        {translate(
          "skill.management.scenariosHint",
          "勾选后该 Skill 会出现在对应场景的选择器中",
        )}
      </p>
    </div>
  );
}

interface ReferenceSectionProps {
  references: SkillReference[];
  translate: (key: string, fallback: string) => string;
}

/**
 * 引用文件区域：无引用时显示数量 0；有引用时显示可折叠列表，
 * 每个条目可点击展开查看 content 全文。
 */
function ReferenceSection({ references, translate }: ReferenceSectionProps) {
  const [listExpanded, setListExpanded] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (references.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
          {translate("skill.management.references", "引用文件")}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
          0
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* header row: label + count + chevron toggle */}
      <button
        type="button"
        onClick={() => setListExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
          {translate("skill.management.references", "引用文件")}（{references.length}）
        </span>
        {listExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
        )}
      </button>

      {/* expanded list */}
      {listExpanded ? (
        <div className="flex flex-col gap-2">
          {references.map((ref) => {
            const isOpen = expandedKey === ref.key;
            return (
              <div
                key={ref.key}
                className="rounded-lg border border-slate-200 bg-slate-50/60 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                {/* row header: clickable to expand/collapse content */}
                <button
                  type="button"
                  onClick={() => setExpandedKey(isOpen ? null : ref.key)}
                  className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                  )}
                  <span className="text-sm font-semibold text-slate-950 dark:text-zinc-50">
                    {ref.label}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                    {ref.filename}
                  </span>
                  {ref.whenScenario ? (
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-950/50 dark:text-amber-200">
                      {ref.whenScenario}
                    </span>
                  ) : null}
                  {ref.whenVariable ? (
                    <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-600 dark:bg-violet-950/50 dark:text-violet-200">
                      {ref.whenVariable}
                    </span>
                  ) : null}
                </button>

                {/* content block */}
                {isOpen ? (
                  <div className="border-t border-slate-200 px-3 pb-3 pt-2 dark:border-zinc-800">
                    <p className="mb-1 text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                      {translate("skill.management.refContent", "引用内容")}
                    </p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700 dark:text-zinc-300">
                      {ref.content}
                    </pre>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
