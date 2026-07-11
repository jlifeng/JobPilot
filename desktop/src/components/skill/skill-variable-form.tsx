// SkillVariableForm — renders inputs for a Skill's variables.
//
// Each variable is rendered by its `type`:
//   - text     → <input>
//   - textarea → <textarea>
//   - select   → shadcn <Select> (options from variable.options)
//
// Values are read from useSkillStore.variableValues[skillId][key] (with
// fallback to variable.defaultValue) and written back through
// useSkillStore.setVariableValue for optimistic local updates. The submitted
// prompt reads the same store, so edits land in the next handleSubmit call.
//
// When the active capability has no variables, the form renders nothing.

import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSkillStore } from "../../stores/skill-store";
import { cn } from "@/lib/utils";
import type { Skill, SkillCapability, SkillVariable } from "../../types/skill";

interface SkillVariableFormProps {
  skill: Skill | null;
  capability: SkillCapability | null;
}

export function SkillVariableForm({
  skill,
  capability,
}: SkillVariableFormProps) {
  const { t } = useTranslation();
  const variableValues = useSkillStore((state) => state.variableValues);
  const setVariableValue = useSkillStore((state) => state.setVariableValue);

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  if (!skill || !capability) {
    return null;
  }

  // MVP: show all variables defined on the Skill. Capability-scoped variable
  // filtering is a later-phase concern; for now every variable participates.
  const variables: SkillVariable[] = skill.variables ?? [];

  if (variables.length === 0) {
    // Skill defines no variables — nothing to render. The SkillSelector already
    // provides visual feedback that a Skill is active, so a "no variables" hint
    // is unnecessary noise.
    return null;
  }

  const stored = variableValues[skill.id] ?? {};

  const resolveValue = (variable: SkillVariable) =>
    stored[variable.key] ?? variable.defaultValue ?? "";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {translate("skill.variableFormTitle", "变量配置")}
      </div>
      <div className="flex flex-col gap-2">
        {variables.map((variable) => (
          <VariableInput
            key={variable.key}
            variable={variable}
            value={resolveValue(variable)}
            onChange={(next) => setVariableValue(skill.id, variable.key, next)}
          />
        ))}
      </div>
    </div>
  );
}

interface VariableInputProps {
  variable: SkillVariable;
  value: string;
  onChange: (next: string) => void;
}

function VariableInput({ variable, value, onChange }: VariableInputProps) {
  const labelId = `skill-var-${variable.key}`;

  const baseClass = cn(
    "w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400",
    "focus:outline-none focus:ring-2 focus:ring-violet-300/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
  );

  if (variable.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={labelId}
          className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
        >
          {variable.label}
        </label>
        <textarea
          id={labelId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className={cn(baseClass, "resize-none")}
        />
      </div>
    );
  }

  if (variable.type === "select") {
    // Radix Select needs a non-empty value; use a sentinel for empty/missing.
    const DEFAULT_SENTINEL = "__var_default__";
    const selectValue = value && value.length > 0 ? value : DEFAULT_SENTINEL;
    const options = variable.options ?? [];

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={labelId}
          className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
        >
          {variable.label}
        </label>
        <Select
          value={selectValue}
          onValueChange={(next) => {
            onChange(next === DEFAULT_SENTINEL ? "" : next);
          }}
        >
          <SelectTrigger id={labelId} className={cn(baseClass, "h-8")}>
            <SelectValue placeholder={variable.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_SENTINEL} className="text-xs">
              —
            </SelectItem>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // default: text
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={labelId}
        className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
      >
        {variable.label}
      </label>
      <input
        id={labelId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={baseClass}
      />
    </div>
  );
}
