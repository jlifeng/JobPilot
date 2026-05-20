import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUpdateStore } from "../stores/app-update-store";

export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"update" | "uptodate" | null>(null);
  const {
    currentVersion,
    pendingUpdate,
    latestVersion,
    checkForUpdates,
    openDialog: openUpdateDialog,
  } = useAppUpdateStore();

  if (!open) {
    return null;
  }

  async function handleCheckForUpdates() {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const foundUpdate = await checkForUpdates();
      if (foundUpdate) {
        setCheckResult("update");
        openUpdateDialog();
        onClose();
      } else {
        setCheckResult("uptodate");
      }
    } catch {
      setCheckResult(null);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 60 }}
      onClick={onClose}
    >
      <div
        className="dialog-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="dialog-title">{t("aboutTitle")}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                JobPilot Desktop
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-4">
          <div className="flex items-center justify-center">
            <img
              src="/icon.png"
              alt="JobPilot"
              className="h-16 w-16"
            />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              JobPilot
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("aboutVersion")}: {currentVersion ?? t("notAvailable")}
            </p>
          </div>

          {checkResult === "uptodate" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t("updaterNoUpdateAvailable")}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => void handleCheckForUpdates()}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("updaterChecking")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t("updaterCheckButton")}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
