// SkillSelector — dropdown that picks a Skill capability for a given scenario.
//
// The selector renders a shadcn Select bound to the "skillId:capabilityId"
// contract used by SkillStore.defaultSelections. The first option is always
// "Default assistant" (value=""), which maps to null on the onChange callback
// so callers can branch back to the hardcoded system prompt builder.
//
// State is read from useSkillStore (skills list + defaultSelections). The
// selector is a controlled component: the parent owns the live selection so
// it can drive handleSubmit with the same value without re-reading the store.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSkillStore } from "../../stores/skill-store";
import { SkillRuntime } from "../../lib/skill-runtime";
import { cn } from "@/lib/utils";

interface SkillSelectorProps {
  scenarioId: string;
  value?: string;
  onChange: (selection: string | null) => void;
  disabled?: boolean;
}

export function SkillSelector({
  scenarioId,
  value,
  onChange,
  disabled,
}: SkillSelectorProps) {
  const { t } = useTranslation();

  const skills = useSkillStore((state) => state.skills);

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  const defaultLabel = translate("skill.selectorDefault", "默认助手");

  const capabilities = useMemo(
    () => new SkillRuntime(skills).getCapabilitiesForScenario(scenarioId),
    [skills, scenarioId],
  );

  // Radix Select treats empty-string values as "no value" (the placeholder
  // state), so the default-assistant option uses a sentinel and we translate
  // between the sentinel and the external null contract here.
  const DEFAULT_SENTINEL = "__default__";
  const selectValue = value && value.length > 0 ? value : DEFAULT_SENTINEL;

  const handleChange = (next: string) => {
    if (next === DEFAULT_SENTINEL) {
      onChange(null);
      return;
    }
    onChange(next);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger
        aria-label={translate("skill.selectorLabel", "Skill")}
        className={cn(
          "h-7 max-w-[180px] gap-1 rounded-full border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-600 shadow-none",
          "dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
        )}
      >
        <SparklesIcon />
        <SelectValue placeholder={defaultLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__default__" className="text-xs">
          {defaultLabel}
        </SelectItem>
        {capabilities.map((capability) => (
          <SelectItem
            key={`${capability.skillId}:${capability.capabilityId}`}
            value={`${capability.skillId}:${capability.capabilityId}`}
            className="text-xs"
          >
            {capability.capabilityName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// A small inline icon to keep the trigger visually aligned with the model
// Select next to it (which uses a colored dot). Avoids adding a new lucide
// import just for the selector trigger.
function SparklesIcon() {
  return (
    <span
      aria-hidden="true"
      className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-400"
    />
  );
}
