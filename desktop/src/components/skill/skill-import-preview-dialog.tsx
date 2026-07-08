// SkillImportPreviewDialog — Skill 包导入流程弹窗。
//
// 流程：
//   1. 管理页"导入 Skill"按钮 → 调 Tauri dialog 选文件（.skill / .zip）
//   2. 拿到 path → importSkillPackage(path) → 打开预览弹窗
//   3. 预览内容：skill.name / description / version / author / capabilities 列表 / referencesCount
//   4. 冲突处理（根据 preview.conflict）：
//      - 无冲突：显示"确认导入"按钮 → confirmImportSkillPackage(skill)
//      - 有冲突：显示警告"已存在 v{existingVersion}"，给三个选项：
//        a) 覆盖（同 id）→ confirmImportSkillPackage(skill)
//        b) 跳过 → 关闭弹窗
//        c) 作为新 id 导入 → 输入新 id → confirmImportSkillPackage(skill, newId)
//   5. 错误态：导入命令报错时显示错误信息（如路径遍历被拒、SKILL.md 缺失）
//
// 该组件自管理状态：父组件传 open/onClose/onImported，内部维护 preview/error/working 状态。
// 文件选择由本组件触发（调 Tauri dialog open）。

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2, Package, X } from "lucide-react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importSkillPackage, confirmImportSkillPackage } from "../../lib/skill-api";
import type { Skill, SkillPackagePreview } from "../../types/skill";

interface SkillImportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type DialogState = "idle" | "working" | "preview" | "confirming" | "error";

export function SkillImportPreviewDialog({
  open,
  onClose,
  onImported,
}: SkillImportPreviewDialogProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>("idle");
  const [preview, setPreview] = useState<SkillPackagePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState("");

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  // 弹窗关闭时重置内部状态。
  useEffect(() => {
    if (!open) {
      setState("idle");
      setPreview(null);
      setError(null);
      setNewId("");
    }
  }, [open]);

  // 弹窗打开时自动触发文件选择。
  useEffect(() => {
    if (!open) {
      return;
    }
    // 仅在 idle 态（未选过文件）时自动触发文件选择。
    if (state !== "idle") {
      return;
    }
    void handlePickFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePickFile = useCallback(async () => {
    setState("working");
    setError(null);
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: "Skill Package", extensions: ["skill", "zip"] }],
      });
      // 用户取消选择：直接关闭弹窗。
      if (selected === null || Array.isArray(selected) || selected === "") {
        onClose();
        return;
      }
      const filePath = typeof selected === "string" ? selected : null;
      if (!filePath) {
        onClose();
        return;
      }
      const result = await importSkillPackage(filePath);
      setPreview(result);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [onClose]);

  const resetToPickFile = () => {
    setState("idle");
    setPreview(null);
    setError(null);
    setNewId("");
  };

  const handleConfirmOverwrite = async () => {
    if (!preview) {
      return;
    }
    setState("confirming");
    setError(null);
    try {
      // 覆盖（同 id）：直接传 skill，Rust 端 save_skill 是 upsert。
      await confirmImportSkillPackage(preview.skill);
      onImported();
      onClose();
    } catch (err) {
      // 确认失败：回到预览态，在预览面板内联展示错误，不切回完整 error 视图。
      setError(err instanceof Error ? err.message : String(err));
      setState("preview");
    }
  };

  const handleConfirmAsNew = async () => {
    if (!preview) {
      return;
    }
    const trimmed = newId.trim();
    if (!trimmed) {
      return;
    }
    setState("confirming");
    setError(null);
    try {
      await confirmImportSkillPackage(preview.skill, trimmed);
      onImported();
      onClose();
    } catch (err) {
      // 确认失败：回到预览态，在预览面板内联展示错误。
      setError(err instanceof Error ? err.message : String(err));
      setState("preview");
    }
  };

  if (!open) {
    return null;
  }

  const skill: Skill | null = preview?.skill ?? null;
  const conflict = preview?.conflict ?? null;
  const hasConflict = conflict?.hasConflict === true;
  const existingVersion = conflict?.existingVersion ?? null;
  const capabilities = skill?.capabilities ?? [];

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 60 }}
      onClick={state === "confirming" ? undefined : onClose}
    >
      <div
        className="dialog-content dialog-content--lg max-h-[88vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="dialog-header border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="dialog-title">
                {translate("skill.import.previewTitle", "导入预览")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {translate("skill.management.subtitle", "管理已安装的能力包")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            disabled={state === "confirming"}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body flex-1 overflow-y-auto">
          {state === "working" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {translate("skill.management.importButton", "导入 Skill")}...
              </p>
            </div>
          ) : state === "error" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">
                    {translate("skill.import.errorTitle", "导入失败")}
                  </p>
                  {error ? <p className="break-all">{error}</p> : null}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  {t("close")}
                </Button>
                <Button variant="outline" onClick={resetToPickFile}>
                  {translate("skill.management.importButton", "导入 Skill")}
                </Button>
              </div>
            </div>
          ) : skill ? (
            <div className="space-y-5">
              {/* Skill 元信息 */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-950 dark:text-zinc-50">
                    {skill.name}
                  </h3>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    v{skill.version}
                  </span>
                  {skill.author ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      · {skill.author}
                    </span>
                  ) : null}
                </div>
                {skill.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
                    {skill.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    {translate("skill.import.referencesCount", "引用文件数")}:{" "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                      {preview?.referencesCount ?? 0}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    {skill.id}
                  </span>
                </div>
              </div>

              {/* capabilities 列表 */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {translate("skill.management.capabilities", "能力")}（{capabilities.length}）
                </h4>
                {capabilities.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">—</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {capabilities.map((capability) => (
                      <div
                        key={capability.id}
                        className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950 dark:text-zinc-50">
                            {capability.name}
                          </p>
                          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                            {capability.id}
                          </span>
                        </div>
                        {capability.description ? (
                          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            {capability.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 冲突处理 */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                {hasConflict ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {translate(
                          "skill.import.conflictWarning",
                          "已存在同 id Skill",
                        ).replace("{version}", existingVersion ?? "")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => void handleConfirmOverwrite()}
                          disabled={state === "confirming"}
                        >
                          {state === "confirming" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {translate("skill.import.overwrite", "覆盖现有")}
                        </Button>
                        <Button variant="secondary" onClick={onClose} disabled={state === "confirming"}>
                          {translate("skill.import.skip", "跳过")}
                        </Button>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <label
                          htmlFor="skill-new-id"
                          className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                        >
                          {translate("skill.import.asNew", "作为新 id 导入")} ·{" "}
                          {translate("skill.import.newIdLabel", "新 id")}
                        </label>
                        <div className="mt-2 flex gap-2">
                          <Input
                            id="skill-new-id"
                            value={newId}
                            onChange={(event) => setNewId(event.target.value)}
                            placeholder={skill.id}
                            className="h-8 text-xs"
                            disabled={state === "confirming"}
                          />
                          <Button
                            size="sm"
                            onClick={() => void handleConfirmAsNew()}
                            disabled={state === "confirming" || newId.trim().length === 0}
                          >
                            {translate("skill.import.confirm", "确认导入")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <span>
                        {translate("skill.import.noConflict", "新 Skill，无冲突")}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => void handleConfirmOverwrite()}
                        disabled={state === "confirming"}
                      >
                        {state === "confirming" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {translate("skill.import.confirm", "确认导入")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 错误态（确认阶段报错）：回到预览态内联展示 */}
              {error && state === "preview" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="dialog-footer border-t border-zinc-100 dark:border-zinc-800">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={state === "confirming" || state === "working"}
          >
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
