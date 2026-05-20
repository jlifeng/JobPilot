import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";
import { create } from "zustand";
import { getBootstrapContext, restartApp } from "../lib/desktop-api";

interface CheckForUpdatesOptions {
  silent?: boolean;
}

interface AppUpdateHandle {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
  rawJson: Record<string, unknown>;
  downloadAndInstall: (onEvent?: (event: DownloadEvent) => void) => Promise<void>;
  close?: () => Promise<void>;
}

interface AppUpdateStore {
  pendingUpdate: AppUpdateHandle | null;
  currentVersion: string | null;
  latestVersion: string | null;
  releaseNotes: string | null;
  releaseDate: string | null;
  downloadUrl: string | null;
  hasChecked: boolean;
  lastCheckedAt: number | null;
  isChecking: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  contentLength: number | null;
  downloadedBytes: number;
  dialogOpen: boolean;
  error: string | null;
  performInitialCheck: () => Promise<void>;
  checkForUpdates: (options?: CheckForUpdatesOptions) => Promise<boolean>;
  downloadAndInstall: () => Promise<void>;
  openDialog: () => void;
  closeDialog: () => void;
  clearError: () => void;
}

function closeUpdateResource(update: AppUpdateHandle | null): void {
  if (!update) {
    return;
  }

  void update.close?.().catch(() => undefined);
}

function extractDownloadUrl(rawJson: Record<string, unknown>): string | null {
  const directUrl =
    typeof rawJson.url === "string"
      ? rawJson.url
      : typeof rawJson.downloadUrl === "string"
        ? rawJson.downloadUrl
        : typeof rawJson.download_url === "string"
          ? rawJson.download_url
          : null;

  if (directUrl && directUrl.trim().length > 0) {
    return directUrl;
  }

  const platforms = rawJson.platforms;
  if (!platforms || typeof platforms !== "object") {
    return null;
  }

  for (const value of Object.values(platforms as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const platformUrl = (value as Record<string, unknown>).url;
    if (typeof platformUrl === "string" && platformUrl.trim().length > 0) {
      return platformUrl;
    }
  }

  return null;
}

async function resolveCurrentVersion(
  fallback: string | null,
): Promise<string | null> {
  try {
    const context = await getBootstrapContext();
    return context.appVersion;
  } catch {
    return fallback;
  }
}

function wrapNativeUpdate(update: Update): AppUpdateHandle {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
    rawJson: update.rawJson,
    downloadAndInstall: (onEvent) => update.downloadAndInstall(onEvent),
    close: () => update.close(),
  };
}

export const useAppUpdateStore = create<AppUpdateStore>((set, get) => ({
  pendingUpdate: null,
  currentVersion: null,
  latestVersion: null,
  releaseNotes: null,
  releaseDate: null,
  downloadUrl: null,
  hasChecked: false,
  lastCheckedAt: null,
  isChecking: false,
  isDownloading: false,
  isInstalling: false,
  contentLength: null,
  downloadedBytes: 0,
  dialogOpen: false,
  error: null,
  async performInitialCheck() {
    const state = get();
    if (
      state.hasChecked
      || state.isChecking
      || state.isDownloading
      || state.isInstalling
    ) {
      return;
    }

    await state.checkForUpdates({ silent: true });
  },
  async checkForUpdates(options) {
    const previousState = get();
    if (previousState.isChecking || previousState.isDownloading || previousState.isInstalling) {
      return Boolean(previousState.pendingUpdate);
    }

    set({
      isChecking: true,
      error: options?.silent ? previousState.error : null,
    });

    const currentVersion = await resolveCurrentVersion(previousState.currentVersion);

    try {
      const availableUpdate = await check().then((update) =>
        update ? wrapNativeUpdate(update) : null,
      );
      const existingUpdate = get().pendingUpdate;
      if (existingUpdate && existingUpdate !== availableUpdate) {
        closeUpdateResource(existingUpdate);
      }

      set({
        pendingUpdate: availableUpdate,
        currentVersion: availableUpdate?.currentVersion ?? currentVersion,
        latestVersion: availableUpdate?.version ?? null,
        releaseNotes: availableUpdate?.body ?? null,
        releaseDate: availableUpdate?.date ?? null,
        downloadUrl: availableUpdate
          ? extractDownloadUrl(availableUpdate.rawJson)
          : null,
        hasChecked: true,
        lastCheckedAt: Date.now(),
        isChecking: false,
        isDownloading: false,
        isInstalling: false,
        contentLength: null,
        downloadedBytes: 0,
        error: null,
      });

      return Boolean(availableUpdate);
    } catch (error) {
      set({
        currentVersion,
        hasChecked: true,
        lastCheckedAt: Date.now(),
        isChecking: false,
        error: options?.silent
          ? get().error
          : error instanceof Error
            ? error.message
            : "Failed to check for updates.",
      });

      return false;
    }
  },
  async downloadAndInstall() {
    const state = get();
    if (!state.pendingUpdate || state.isDownloading || state.isInstalling) {
      return;
    }

    set({
      isDownloading: true,
      isInstalling: false,
      contentLength: null,
      downloadedBytes: 0,
      error: null,
      dialogOpen: true,
    });

    try {
      await state.pendingUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          set({
            contentLength: event.data.contentLength ?? null,
            downloadedBytes: 0,
          });
          return;
        }

        if (event.event === "Progress") {
          set((current) => ({
            downloadedBytes: current.downloadedBytes + event.data.chunkLength,
          }));
          return;
        }

        set((current) => ({
          downloadedBytes: current.contentLength ?? current.downloadedBytes,
          isInstalling: true,
        }));
      });

      set({
        isDownloading: false,
        isInstalling: true,
      });

      // On macOS, the updater plugin replaces the .app bundle but does not restart.
      // We need to explicitly restart the app after installation completes.
      await restartApp();
    } catch (error) {
      set({
        isDownloading: false,
        isInstalling: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to download and install the update.",
      });
    }
  },
  openDialog() {
    set({ dialogOpen: true });
  },
  closeDialog() {
    set({ dialogOpen: false });
  },
  clearError() {
    set({ error: null });
  },
}));
