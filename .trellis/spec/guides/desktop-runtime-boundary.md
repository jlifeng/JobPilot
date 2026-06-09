# Desktop Runtime Boundary

> Purpose: Define the executable cross-layer contract for the PR1 desktop shell boundary between the React/Vite renderer and the Tauri/Rust command layer.

## Scope

This contract covers the bootstrap-stage desktop shell in `desktop/`:

1. Tauri starts the desktop-local Vite dev/build pipeline
2. Rust exposes bootstrap/runtime commands
3. Renderer requests runtime/workspace/settings snapshots through Tauri commands
4. Renderer can request representative template validation snapshots, secret inventory snapshots, and native multi-format export writes through Tauri commands
5. Renderer can mutate desktop-local provider config / secrets, fetch provider model catalogs, test provider connectivity, and start native AI prompt streams through Tauri write commands
6. Renderer can import resumes through local PDF/image preprocessing while honoring the persisted vision-model contract for scanned or image-only files
7. Renderer consumes incremental AI events from the desktop-native `desktop://ai-stream` event bridge
8. Renderer can request a native release-readiness snapshot that reflects bundling, updater, tray, and window-state posture
9. Renderer falls back to explicit placeholder data only when Tauri commands are unavailable
10. UI must surface fallback limitations instead of presenting fallback data as native readiness

## Files

- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/src/ai.rs`
- `desktop/src-tauri/src/release.rs`
- `desktop/src-tauri/src/storage.rs`
- `desktop/src-tauri/src/settings.rs`
- `desktop/src-tauri/src/workspace.rs`
- `desktop/src/components/dashboard/create-resume-dialog.tsx`
- `desktop/src/components/editor/export-dialog.tsx`
- `desktop/src/components/editor/settings-dialog.tsx`
- `desktop/src/lib/desktop-api.ts`
- `desktop/src/lib/desktop-loaders.ts`
- `desktop/src/lib/resume-export.ts`
- `desktop/src/lib/resume-import.ts`
- `desktop/src/lib/template-validation.ts`
- `desktop/src/routes/root.tsx`
- `desktop/src/routes/home.tsx`
- `desktop/src/routes/dashboard.tsx`
- `desktop/src/routes/editor.tsx`
- `desktop/src/routes/templates.tsx`
- `desktop/src/routes/settings.tsx`
- `desktop/src/i18n.ts`
- `src/lib/constants.ts`
- `src/lib/export/index.ts`
- `src/lib/pdf/export-tailwind-css.ts`
- `src/lib/template-renderer/index.ts`
- `src/lib/template-renderer/template-contract.ts`
- `src/lib/template-renderer/types.ts`
- `src/lib/template-renderer/templates/classic.tsx`
- `src/lib/template-renderer/templates/modern.tsx`
- `src/types/resume.ts`
- `scripts/build-export-css.ts`
- `scripts/dev-local.mjs`
- `scripts/verify-desktop-lint-boundary.mjs`

## Local Commands

```bash
pnpm dev:tauri
pnpm run dev:tauri:local-updater
pnpm run sync:desktop-version
pnpm run verify:desktop:version-sync
pnpm run lint:desktop:active
pnpm run lint:desktop:shared
pnpm run lint:web:reference
pnpm run report:web:reference
pnpm run lint:repo:full
pnpm run verify:desktop:migration
pnpm run report:desktop:release-readiness
pnpm run verify:desktop:release-readiness
pnpm run build:desktop:release-updater-manifest
pnpm run build:desktop:updater-feed
pnpm run serve:desktop:updater-feed
pnpm lint   # product-aligned desktop/shared lint + web-reference observation
```

## Lightweight Development Workflow

To avoid high CPU/memory usage from repeated Rust recompilation during active development, follow this decoupled workflow:

1. **Browser-Only Mode for UI/Component Changes**:
   Run the Vite dev server pure in the browser without Tauri.
   ```bash
   pnpm --filter @rolerover/desktop run dev
   ```
   *Open `http://localhost:1420` in your browser. The renderer will automatically fall back to placeholder data for native commands, allowing fast UI iteration.*

2. **Background HMR for Native Desktop**:
   If you need to test the UI inside the native shell, start Tauri once and leave it running.
   ```bash
   pnpm run tauri:dev
   ```
   *Vite's Hot Module Replacement (HMR) will stream React changes directly to the Tauri window without requiring Rust to restart.*

3. **Rust-Only Validation**:
   When changing Rust code in `desktop/src-tauri/`, avoid full local builds. Use cargo's fast check mode instead:
   ```bash
   cd desktop/src-tauri && cargo check
   ```

4. **GitHub CI Delegation**:
   Avoid running `pnpm build` or full `tauri build` locally. Push your code and rely on GitHub CI to produce the final `.exe` or `.msi` artifacts.

5. **Local Updater Smoke Override**:
   The committed `tauri.conf.json` points updater checks at the hosted GitHub Release feed. If you need localhost updater smoke, run:
   ```bash
   pnpm run dev:tauri:local-updater
   ```
   *This command generates a temporary `TAURI_CONFIG` override so the native shell can talk to `http://127.0.0.1:8765/latest.json` without committing localhost updater settings into production config.*

## Staged Migration Lint Boundary

Blocking hard gate for the current desktop migration slice:

- `pnpm type-check`
- `pnpm run lint:desktop:active`
- `pnpm run lint:desktop:shared`
- `pnpm --filter @rolerover/desktop build`
- `cargo check --manifest-path desktop/src-tauri/Cargo.toml --target-dir .codex-cargo-target/desktop-tauri`

Desktop blocking surface enforced by `lint:desktop:active`:

- `desktop/src/lib/desktop-api.ts`
- `desktop/src/lib/ai/reasoning-parser.ts`
- `desktop/src/lib/template-validation.ts`
- `desktop/src/i18n.ts`
- `desktop/src/routes/root.tsx`
- `desktop/src/routes/home.tsx`
- `desktop/src/routes/dashboard.tsx`
- `desktop/src/routes/editor.tsx`
- `desktop/src/routes/templates.tsx`
- `desktop/src/routes/settings.tsx`
- `desktop/src/components/ai/ai-chat-panel.tsx`
- `desktop/src/components/ai/ai-chat-bubble.tsx`
- `desktop/src/components/ai/reasoning-block.tsx`
- `desktop/src/components/ai/tool-execution-card.tsx`
- `desktop/src/components/dashboard/create-resume-dialog.tsx`
- `desktop/src/lib/resume-import.ts`

Shared blocking surface enforced by `lint:desktop:shared`:

- `src/components/ui/`
- `src/components/dashboard/template-thumbnail.tsx`
- `src/components/preview/`
- `src/lib/constants.ts`
- `src/lib/export/`
- `src/lib/pdf/export-tailwind-css.ts`
- `src/lib/ai/parse-schema.ts`
- `src/lib/qrcode.ts`
- `src/lib/section-content.ts`
- `src/lib/template-labels.ts`
- `src/lib/template-renderer/index.ts`
- `src/lib/template-renderer/template-contract.ts`
- `src/lib/template-renderer/types.ts`
- `src/lib/template-renderer/templates/classic.tsx`
- `src/lib/template-renderer/templates/modern.tsx`
- `src/lib/utils.ts`
- `src/types/resume.ts`
- `scripts/build-export-css.ts` when the export CSS contract changes
- `scripts/verify-desktop-lint-boundary.mjs` when the migration gate changes

Pure web-reference observation surface reported by `lint:web:reference` /
`report:web:reference`:

- `src/app/`
- `src/components/ai/`
- `src/components/auth/`
- `src/components/dashboard/` except `template-thumbnail.tsx`
- `src/components/editor/`
- `src/components/landing/`
- `src/components/layout/`
- `src/components/resume/`
- `src/components/settings/`
- `src/components/tour/`
- `src/hooks/`
- `src/i18n/`
- `src/lib/ai/` except `parse-schema.ts`
- `src/lib/auth/`
- `src/lib/config.ts`
- `src/lib/db/`
- `src/lib/desktop/`
- `src/lib/resume-target.ts`
- `src/lib/utils/`
- `src/middleware.ts`
- `src/stores/`
- `src/types/` except `resume.ts`

Observation-only signals for this migration stage:

- `pnpm lint` as the product-aligned composite: desktop/shared blocking lint +
  web-reference observation
- `pnpm run report:web:reference` for archived web feature debt that should not
  block desktop shipping
- `pnpm run lint:repo:full` when you intentionally need the full legacy repo
  lint sweep
- Desktop build chunk warnings
- Shared-surface warnings that remain outside the current blocking contract

## Dev Command Contract

`desktop/src-tauri/tauri.conf.json` must start desktop-local frontend commands from the `desktop/` package directory:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://127.0.0.1:1420",
    "frontendDist": "../dist"
  }
}
```

Important rule:

- Do **not** point `beforeDevCommand` at the repo-root `pnpm dev` / `npm --prefix .. run dev` flow.
- Tauri expects the desktop renderer on port `1420`; the root Next.js dev stack uses a different runtime and can create false startup failures.

## Bootstrap Command Contract

Rust command:

- File: `desktop/src-tauri/src/lib.rs`
- Command: `get_bootstrap_context`

Returned payload fields:

```json
{
  "appName": "RoleRover Desktop",
  "appVersion": "0.1.0",
  "frontendShell": "React + Vite + TanStack Router + react-i18next",
  "runtime": "Tauri + Rust bootstrap shell",
  "platform": "windows",
  "buildChannel": "development",
  "branch": "tauri-rust-desktop-rewrite",
  "runtimeMode": "tauri",
  "supportsNativeCommands": true,
  "limitations": []
}
```

Renderer fallback shape:

- File: `desktop/src/lib/desktop-api.ts`
- Constant: `FALLBACK_CONTEXT`

Required fallback values:

```json
{
  "runtimeMode": "browser_fallback",
  "supportsNativeCommands": false,
  "limitations": [
    "Native Tauri commands are unavailable in browser fallback mode.",
    "Workspace, storage, settings, and importer snapshots are placeholders for shell development only.",
    "Use the desktop shell to validate real filesystem, secrets, and migration behavior."
  ]
}
```

## Renderer Access Contract

Renderer helper:

- File: `desktop/src/lib/desktop-api.ts`
- Function: `invokeWithFallback(command, fallback)`

Rules:

1. `get_bootstrap_context`, `get_workspace_snapshot`, `get_storage_snapshot`, `get_workspace_settings_snapshot`, `get_secret_vault_status`, `get_secret_inventory_snapshot`, `get_release_readiness_snapshot`, `get_importer_dry_run`, and `get_template_validation_snapshot` must route through `invokeWithFallback(...)`.
2. `fetch_ai_models`, `test_ai_connectivity`, and `test_exa_connectivity` must also route through `invokeWithFallback(...)` so browser preview stays truthful when native commands are absent.
3. Fallback reads must log the failing command name via `reportDesktopFallback(...)`.
4. Renderer pages must use `isBrowserFallbackRuntime(context)` instead of string-matching raw runtime text.
5. Native write commands such as `write_template_validation_export`, `write_export_file`, `write_pdf_export`, `update_ai_provider_settings`, `write_secret_value`, and `start_ai_prompt_stream` must not silently fall back; write failures should surface as explicit UI errors.

## AI Runtime Streaming Contract

Rust commands:

- File: `desktop/src-tauri/src/lib.rs`
- Commands:
  - `get_secret_inventory_snapshot`
  - `update_ai_provider_settings`
  - `write_secret_value`
  - `start_ai_prompt_stream`

Rust runtime module:

- File: `desktop/src-tauri/src/ai.rs`
- Event: `desktop://ai-stream`

Secret inventory read payload:

```json
{
  "backend": "os_keyring",
  "encryptedAtRest": true,
  "warnings": [
    "Active secret descriptors are backed by Windows Credential Manager."
  ],
  "updatedAtEpochMs": 1710000000000,
  "entries": [
    {
      "key": "provider.openai.api_key",
      "provider": "openai",
      "purpose": "Desktop AI runtime credential for openai.",
      "updatedAtEpochMs": 1710000000000,
      "isConfigured": true
    }
  ]
}
```

Provider config write input:

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "setAsDefault": true
}
```

Secret write input:

```json
{
  "key": "provider.openai.api_key",
  "provider": "openai",
  "purpose": "Desktop AI runtime credential for openai.",
  "value": "sk-..."
}
```

Prompt stream start input:

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "documentId": "resume-1",
  "prompt": "Summarize the desktop runtime boundary.",
  "systemPrompt": "Respond in concise English.",
  "conversation": [
    {
      "role": "user",
      "content": "Rewrite my summary to sound more quantitative."
    },
    {
      "role": "assistant",
      "content": "Share the current summary and I will update it."
    }
  ]
}
```

Prompt stream start receipt:

```json
{
  "requestId": "4a4f7b6f-1f25-4b6d-a1a8-0b83e5c7023d",
  "provider": "openai",
  "model": "gpt-4o",
  "eventName": "desktop://ai-stream",
  "startedAtEpochMs": 1710000000000
}
```

Incremental event payload:

```json
{
  "requestId": "4a4f7b6f-1f25-4b6d-a1a8-0b83e5c7023d",
  "provider": "openai",
  "model": "gpt-4o",
  "kind": "delta",
  "startedAtEpochMs": 1710000000000,
  "emittedAtEpochMs": 1710000001200,
  "finishedAtEpochMs": null,
  "chunkIndex": 3,
  "deltaText": "desktop",
  "accumulatedText": "RoleRover desktop",
  "errorMessage": null
}
```

Tool event payload:

```json
{
  "requestId": "4a4f7b6f-1f25-4b6d-a1a8-0b83e5c7023d",
  "provider": "openai",
  "model": "gpt-4o",
  "kind": "tool",
  "startedAtEpochMs": 1710000000000,
  "emittedAtEpochMs": 1710000001300,
  "finishedAtEpochMs": null,
  "chunkIndex": null,
  "deltaText": null,
  "accumulatedText": null,
  "errorMessage": null,
  "toolCall": {
    "toolCallId": "call_123",
    "toolName": "replaceResumeText",
    "state": "output-available",
    "input": {
      "patches": [
        {
          "sectionId": "summary-1",
          "originalText": "Led a team and shipped releases.",
          "replacementText": "Led a 12-person team and shipped three releases.",
          "reason": "Adds concrete scope and delivery impact."
        }
      ]
    },
    "output": {
      "success": true,
      "documentId": "resume-1",
      "appliedCount": 1,
      "skippedCount": 0
    },
    "errorText": null
  }
}
```

Rules:

1. `get_secret_inventory_snapshot` may expose secret descriptors and presence only; it must never return plaintext secret values.
2. `update_ai_provider_settings` persists the selected provider's `baseUrl` / `model` under the desktop workspace settings document and may also flip `defaultProvider`.
3. `write_secret_value` must prefer the Windows OS keyring backend for new writes, update the manifest descriptor list, and only retain fallback storage when migration debt still exists; clearing or missing values must not silently claim success.
4. `start_ai_prompt_stream` resolves provider config and secret from the desktop workspace contract, not from browser local storage or web request headers.
5. Renderer must pass the current `documentId` plus a bounded `conversation` array when chat continuity or resume-edit tool execution depends on prior turns; desktop runtime must not infer either value from browser-only state.
6. Resume-edit tool execution is part of the same `start_ai_prompt_stream` contract. When the model emits OpenAI-compatible `tool_calls` or Anthropic `tool_use` blocks, the runtime must execute supported tools (`replaceResumeText`, `updateResumeMetadata`) against desktop storage and mirror the result back through `desktop://ai-stream` with `kind="tool"`.
7. Resume-edit tools are only valid when `documentId` is present. Missing `documentId` must fail explicitly instead of pretending the resume was updated.
8. Renderer consumers must filter `desktop://ai-stream` events by `requestId`, merge `kind="delta"` into the transcript, and preserve `kind="tool"` as a visible tool execution trail instead of silently collapsing writes into plain assistant text.
9. Resume content edits must use `replaceResumeText` exact-text patches instead of full section overwrite. The legacy `updateSection` executor may exist for compatibility, but it must not be the model-facing chat edit tool.
10. Future providers extend by adding dispatcher branches behind the same command + event contract; the renderer event model must stay stable.

## AI Provider Discovery And Resume Import Settings Contract

Rust commands:

- File: `desktop/src-tauri/src/lib.rs`
- Commands:
  - `update_ai_provider_settings`
  - `fetch_ai_models`
  - `test_ai_connectivity`
  - `test_exa_connectivity`

Renderer / settings files:

- `desktop/src-tauri/src/ai.rs`
- `desktop/src-tauri/src/settings.rs`
- `desktop/src/lib/desktop-api.ts`
- `desktop/src/components/editor/settings-dialog.tsx`
- `desktop/src/components/dashboard/create-resume-dialog.tsx`
- `desktop/src/lib/resume-import.ts`
- `desktop/vite.config.ts`
- `desktop/src/vite-env.d.ts`

Workspace settings payload fields:

```json
{
  "ai": {
    "defaultProvider": "openai",
    "providerConfigs": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "model": "gpt-4o"
      }
    },
    "exaPoolBaseUrl": "https://api.exa.ai",
    "resumeImportVisionModel": "gpt-4.1-mini"
  }
}
```

Provider config write input:

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "setAsDefault": true,
  "resumeImportVisionModel": "gpt-4.1-mini"
}
```

Fetch models result:

```json
{
  "provider": "openai",
  "models": ["gpt-4.1", "gpt-4.1-mini", "gpt-4o"]
}
```

Connectivity result:

```json
{
  "success": true,
  "latencyMs": 812,
  "errorMessage": null
}
```

Rules:

1. `update_ai_provider_settings` must reject unsupported providers plus empty `baseUrl` or `model`; when `resumeImportVisionModel` is present but blank, the persisted field must be cleared to `null` instead of saving whitespace.
2. `fetch_ai_models` resolves the provider from the optional input override or the persisted `defaultProvider`, reads the provider API key from `provider.{provider}.api_key`, and returns `{ provider, models: [] }` when no key is configured.
3. Provider-specific model discovery must stay explicit: OpenAI-compatible providers call `GET {baseUrl}/models`, Anthropic calls `GET {baseUrl}/v1/models` with `x-api-key` and `anthropic-version`, and Gemini calls `GET {baseUrl}/models?key={apiKey}` then strips the `models/` prefix from returned names.
4. `test_ai_connectivity` and `test_exa_connectivity` must return `{ success, latencyMs, errorMessage }` even for common upstream failures; browser fallback returns `success=false`, `latencyMs=0`, and `errorMessage="Desktop runtime not available"`.
5. `settings-dialog.tsx` must use the fetched model list for both the main model picker and the resume-import vision-model picker, while still allowing a manual text override that persists through `update_ai_provider_settings`.
6. `create-resume-dialog.tsx` and `resume-import.ts` must read `resumeImportVisionModel` from runtime settings, block direct image uploads when it is missing, and switch scanned-PDF parsing to the vision model only after text extraction proves the PDF is not text-based.
7. `desktop/vite.config.ts` must keep `mupdf` out of `optimizeDeps`, and `desktop/src/lib/resume-import.ts` must load `mupdf-wasm.wasm` through a Vite `?url` import; otherwise the renderer can receive HTML instead of Wasm and fail with `WebAssembly.instantiate(): expected magic word`.

## WebDAV Sync Settings Contract

### 1. Scope / Trigger

- Trigger: the renderer and Rust command layer share the WebDAV sync settings payload, including sync mode and auto-sync interval fields.
- Scope: configuration persistence plus native background upload scheduling. The desktop runtime starts a lightweight WebDAV scheduler during Tauri bootstrap; when `syncMode="auto"` and credentials are configured, the scheduler periodically uploads a snapshot after the configured interval has elapsed since the last backup.

### 2. Signatures

Rust commands:

- File: `desktop/src-tauri/src/lib.rs`
- Commands:
  - `get_webdav_sync_status`
  - `update_webdav_sync_settings`
  - `test_webdav_connection`

Renderer / settings files:

- `desktop/src-tauri/src/sync.rs`
- `desktop/src-tauri/src/settings.rs`
- `desktop/src/lib/desktop-api.ts`
- `desktop/src/components/editor/settings-dialog.tsx`
- `desktop/src/routes/settings.tsx`

### 3. Contracts

Workspace settings payload fields:

```json
{
  "sync": {
    "webdav": {
      "serverUrl": "https://dav.example.com/path",
      "username": "user@example.com",
      "remotePath": "JobPilot",
      "syncMode": "manual",
      "autoSyncIntervalMinutes": 60,
      "lastSnapshotName": null,
      "lastBackupAtEpochMs": null,
      "lastRestoreAtEpochMs": null
    }
  }
}
```

`update_webdav_sync_settings` input:

```json
{
  "serverUrl": "https://dav.example.com/path",
  "username": "user@example.com",
  "remotePath": "JobPilot",
  "syncMode": "manual",
  "autoSyncIntervalMinutes": 60,
  "password": null
}
```

`get_webdav_sync_status` / `update_webdav_sync_settings` response:

```json
{
  "configured": true,
  "serverUrl": "https://dav.example.com/path",
  "username": "user@example.com",
  "remotePath": "JobPilot",
  "syncMode": "manual",
  "autoSyncIntervalMinutes": 60,
  "passwordConfigured": true,
  "lastSnapshotName": null,
  "lastBackupAtEpochMs": null,
  "lastRestoreAtEpochMs": null
}
```

Defaults:

- `syncMode`: `"manual"`
- `autoSyncIntervalMinutes`: `60`
- `remotePath`: `"JobPilot"`

UI contract:

- `/settings` must not duplicate the cloud sync section.
- `/sync` renders `SettingsContent mode="sync-only"` and shows only WebDAV connection plus sync policy configuration.
- Upload / restore snapshot actions may exist as lower-level commands, but the cloud sync page must not expose them unless a future design explicitly adds that workflow back.

### 4. Validation & Error Matrix

| Condition | Runtime behavior | UI expectation |
|---|---|---|
| Empty `serverUrl` | `update_webdav_sync_settings` rejects with `WebDAV server URL is required` | Show the returned save error |
| `syncMode="auto"` | Persist `"auto"` | Switch is on and interval input is visible |
| Any other `syncMode` value | Persist `"manual"` | Switch is off after status reload |
| `autoSyncIntervalMinutes < 5` | Clamp to `5` | Renderer should clamp before save and mirror returned value |
| `autoSyncIntervalMinutes > 1440` | Clamp to `1440` | Renderer should clamp before save and mirror returned value |
| Blank `remotePath` | Normalize to `"JobPilot"` | Reloaded field shows `"JobPilot"` |
| Blank `password` on update | Keep existing secret unchanged | Password input clears after save and placeholder indicates saved state |

### 5. Good / Base / Bad Cases

- Good: user opens `/sync`, enters WebDAV credentials, leaves auto sync off, saves, and status reloads with `syncMode="manual"` plus `autoSyncIntervalMinutes=60`.
- Good: user enables auto sync and chooses `30`; the renderer saves `syncMode="auto"` and `autoSyncIntervalMinutes=30`, and the native scheduler uploads the next snapshot after the interval has elapsed.
- Base: old settings documents without sync mode fields deserialize with manual mode and a 60-minute interval.
- Bad: frontend adds a new sync mode string without Rust validation; runtime must coerce it to manual until the contract is deliberately extended.
- Bad: UI claims auto sync is healthy when credentials are missing, `syncMode` is not `auto`, or the latest background upload failed.

### 6. Tests Required

- Type/build check: `pnpm build:desktop-shell` must compile the renderer with the shared TypeScript payload fields.
- Rust check: `cargo check --manifest-path desktop/src-tauri/Cargo.toml --target-dir .codex-cargo-target/desktop-tauri` must compile the command structs and settings document defaults.
- Manual native smoke: in Tauri, open `/sync`, save manual mode, then enable auto mode with a custom interval and reopen the page to confirm values persist.
- Contract assertion points: missing legacy fields default correctly, invalid interval values clamp to `5..1440`, and `/settings` does not render the sync section.

### 7. Wrong vs Correct

#### Wrong

```tsx
<SettingsContent variant="page" mode="settings" />
```

on the cloud sync route, because it duplicates AI / appearance / editor settings.

#### Correct

```tsx
<SettingsContent variant="page" mode="sync-only" />
```

so the dedicated cloud sync navigation entry exposes only sync configuration.

## Native Resume Export Contract

Rust commands:

- File: `desktop/src-tauri/src/lib.rs`
- Commands:
  - `write_export_file`
  - `write_pdf_export`

Renderer / shared export files:

- `desktop/src-tauri/src/storage.rs`
- `desktop/src/lib/desktop-api.ts`
- `desktop/src/lib/resume-export.ts`
- `desktop/src/components/editor/export-dialog.tsx`
- `src/lib/export/index.ts`
- `src/app/api/resume/[id]/export/docx.ts`
- `src/app/api/resume/[id]/export/utils.ts`

Binary export input:

```json
{
  "outputPath": "C:/Users/Avery/Desktop/resume.docx",
  "expectedExtension": "docx",
  "bytes": [80, 75, 3, 4]
}
```

PDF export input:

```json
{
  "outputPath": "C:/Users/Avery/Desktop/resume.pdf",
  "html": "<!DOCTYPE html><html><body>...</body></html>"
}
```

Write success payload:

```json
{
  "fileName": "resume.pdf",
  "outputPath": "C:/Users/Avery/Desktop/resume.pdf",
  "bytesWritten": 48231
}
```

Rules:

1. Desktop export must reuse shared web export builders through `src/lib/export/index.ts` for HTML / TXT / DOCX generation, while the renderer delegates the final file write to native Tauri commands.
2. `write_export_file` must normalize the requested path to the required extension, reject parentless or extension-mismatched destinations, create missing parent directories, and return the final resolved path plus `bytesWritten`.
3. `write_pdf_export` must normalize to `.pdf`, write temporary HTML under `app_cache_dir()/exports`, resolve a local Chrome / Edge executable, invoke headless `--print-to-pdf`, delete the temp HTML, and fail explicitly when the browser command does not produce the requested output file.
4. `write_pdf_export` must not block renderer success on the browser process exiting naturally. The Rust command should poll the requested PDF path while the child process is running, treat a non-empty stable PDF file as success, terminate the still-running child process, then run the final file-size and `%PDF-` validation before returning the native receipt. This prevents Apple Silicon Chrome / Edge headless hangs from leaving `export-dialog.tsx` in `exporting` after the file has already landed.
5. `desktop/src/lib/resume-export.ts` may inject the `fitToOnePage` scaling script only for the `pdf-one-page` variant; the normal PDF path must preserve the original rendered layout.
6. Browser fallback must never claim native export success for `write_export_file` or `write_pdf_export`; export UI should keep these flows disabled or surface a direct write error instead of fabricating a receipt.

## Resume Import Contract

Renderer files:

- `desktop/src/components/dashboard/create-resume-dialog.tsx`
- `desktop/src/lib/resume-import.ts`
- `desktop/src/components/editor/ai-dialog-helpers.ts`
- `desktop/src-tauri/tauri.conf.json`

Progress payload:

```json
{
  "stage": "extracting",
  "completed": 2,
  "total": 3,
  "fileName": "resume.pdf"
}
```

Allowed `stage` values:

- `validating`
- `extracting`
- `rendering`
- `parsing`
- `saving`

Known import error codes:

- `vision_model_required_for_image`
- `vision_model_required_for_scanned_pdf`

Rules:

1. The create-resume upload lane must show a concrete progress state, not only a spinner, while `importResumeFromFile(...)` advances through validation, extraction/rendering, parsing, and save stages.
2. `resolveResumeImportMimeType(...)` only accepts `application/pdf`, `image/png`, `image/jpeg`, and `image/webp`; unsupported types must fail before any AI request is sent.
3. Text-based PDFs must prefer local MuPDF text extraction and continue on the standard text model. Only PDFs whose extracted text length stays at or below `TEXT_BASED_PDF_THRESHOLD=200` may render page images and switch to the configured vision model.
4. Direct image imports always require `resumeImportVisionModel`; `create-resume-dialog.tsx` must block the action early and surface the configuration hint before invoking AI when that value is absent.
5. Successful parsing must convert the returned JSON into the desktop document contract and persist via `importDocument(...)`, with the final progress stage set to `saving` before the dialog closes or navigates away.
6. Windows desktop drag-and-drop import relies on the renderer receiving the native HTML5 drop event. `desktop/src-tauri/tauri.conf.json` must keep the main window `dragDropEnabled: false`; otherwise Tauri intercepts the file drop and the import surface will never receive the file.

## Template Validation Contract

Rust commands:

- File: `desktop/src-tauri/src/lib.rs`
- Commands:
  - `get_template_validation_snapshot`
  - `write_template_validation_export`

Read payload:

```json
{
  "source": "workspace_documents",
  "representativeTemplates": ["classic", "modern"],
  "documents": [
    {
      "metadata": {
        "id": "resume-1",
        "title": "Classic Contract Baseline",
        "template": "classic",
        "language": "en",
        "targetJobTitle": "Senior Product Engineer",
        "targetCompany": "RoleRover",
        "isDefault": true,
        "isSample": false,
        "createdAtEpochMs": 1710000000000,
        "updatedAtEpochMs": 1710000000000
      },
      "theme": {
        "primaryColor": "#111827",
        "accentColor": "#2563eb",
        "fontFamily": "Inter",
        "fontSize": "medium",
        "lineSpacing": 1.6,
        "margin": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
        "sectionSpacing": 16,
        "avatarStyle": "circle"
      },
      "sections": [
        {
          "id": "section-1",
          "documentId": "resume-1",
          "sectionType": "summary",
          "title": "Summary",
          "sortOrder": 1,
          "visible": true,
          "content": { "text": "..." },
          "createdAtEpochMs": 1710000000000,
          "updatedAtEpochMs": 1710000000000
        }
      ]
    }
  ]
}
```

Allowed `source` values:

- `workspace_documents`
- `native_sample_documents`
- `workspace_plus_native_sample_documents`
- `browser_fallback_sample`

Write input:

```json
{
  "fileName": "classic-contract-baseline-classic.html",
  "outputPath": "C:/Users/Avery/Desktop/classic-contract-baseline-classic.html",
  "html": "<!DOCTYPE html>..."
}
```

Write success payload:

```json
{
  "fileName": "classic-contract-baseline-classic.html",
  "outputPath": "C:/Users/.../workspace/exports/classic-contract-baseline-classic.html",
  "bytesWritten": 24567
}
```

Rules:

1. `get_template_validation_snapshot` must return representative `classic` / `modern` documents from workspace storage when present, and may fill gaps with clearly marked native sample documents (`metadata.isSample=true`).
2. `desktop/src/lib/template-validation.ts` must normalize the snapshot into shared `Resume` input before calling the unified template renderer.
3. `write_template_validation_export` may write to a user-selected system path when `outputPath` is provided; otherwise it may fall back to the workspace `exports` directory for validation flows. In both cases it must normalize `.html`, reject invalid parentless paths, and return the final resolved output path.
4. Browser fallback may preview representative sample HTML, but it must not claim native export success.

## Window State Contract

Files:

- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/src/storage.rs`
- `desktop/src-tauri/src/settings.rs`
- `desktop/src-tauri/src/workspace.rs`

Rules:

1. Native startup may restore the main window geometry from `workspace_settings.window_state_json` only when the persisted document still has `window.rememberWindowState=true` and the stored JSON is valid; imported legacy window-state payloads must be rewritten through this command path to prove the runtime read them.
2. Restoration applies the previously recorded normal bounds (after clamping to the desktop shell's supported minima/maxima) and replays any persisted `maximized` or `fullscreen` flags without overwriting the normal-bounds snapshot so the next session can resume at the same size if the user exits in a maximized/fullscreen mode.
3. Native window events such as `Moved`, `Resized`, and `ScaleFactorChanged` must refresh the in-memory normal-bounds snapshot, while `CloseRequested` / `Destroyed` must persist the latest normal bounds plus any `maximized` / `fullscreen` state into `workspace_settings.window_state_json`.
4. Browser fallback may surface the `rememberWindowState` toggle but must never claim real persistence is active.

## Tray Contract

Files:

- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/tauri.conf.json`

Rules:

1. Native startup may create a single system tray icon only when the default window icon is available; tray boot failures must log explicitly and must not abort the desktop shell.
2. The tray menu must expose concrete shell actions (`Show RoleRover`, `Hide To Tray`, `Quit`) against the main window instead of placeholder items.
3. Tray click handling may restore and focus the hidden main window; menu-driven quit must exit the shell cleanly instead of leaving background zombie processes.
4. Browser fallback must never imply that tray affordances are active or testable there.

## Release Readiness Contract

Files:

- `desktop/src-tauri/src/release.rs`
- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src/lib/desktop-api.ts`
- `desktop/src/lib/desktop-loaders.ts`
- `desktop/src/routes/settings.tsx`
- `scripts/build-release-updater-manifest.mjs`
- `scripts/build-tauri-desktop.mjs`
- `scripts/run-tauri-local-updater.mjs`
- `scripts/sync-desktop-version.mjs`
- `scripts/verify-desktop-release-readiness.mjs`

Rust command:

- `get_release_readiness_snapshot`
- `check_for_app_update`

Read payload:

```json
{
  "bundleActive": true,
  "updaterPluginWired": true,
  "updaterConfigDeclared": true,
  "updaterConfigured": true,
  "updaterArtifactsEnabled": true,
  "updaterArtifactsMode": "current",
  "updaterEndpointCount": 1,
  "updaterPubkeyConfigured": true,
  "updaterDangerousInsecureTransport": false,
  "updaterUsesLocalhost": false,
  "updaterWindowsInstallMode": "passive",
  "trayIconReady": true,
  "rememberWindowStateEnabled": true,
  "blockers": [],
  "warnings": [],
}
```

Rules:

1. The native desktop runtime must wire `tauri-plugin-updater` during bootstrap even if the renderer does not expose a user-facing update button yet.
2. `tauri.conf.json` must declare the production updater endpoint as the hosted GitHub Release feed, not localhost, and it must carry the current updater public key.
3. Localhost updater smoke must flow through the generated `TAURI_CONFIG` override from `scripts/run-tauri-local-updater.mjs`; production config must not keep `dangerousInsecureTransportProtocol=true`.
4. After `update.downloadAndInstall(...)` resolves, the renderer must relaunch through `@tauri-apps/plugin-process` instead of relying only on a custom command. `desktop/src-tauri/src/lib.rs` must register `tauri_plugin_process::init()`, `desktop/src-tauri/capabilities/default.json` must include `process:allow-restart`, and `desktop/src/lib/desktop-api.ts::restartApp()` may keep the custom `restart_app` command only as a fallback.
5. Root `package.json` is the single version source. `desktop/package.json`, `desktop/src-tauri/tauri.conf.json`, and `desktop/src-tauri/Cargo.toml` must be synchronized through `scripts/sync-desktop-version.mjs`.
6. Tagged desktop releases use `vX.Y.Z` tags that match the root package version and create a draft GitHub Release containing installers, `.sig` files, and `latest.json`.
7. `bundle.createUpdaterArtifacts` must be enabled so the native build emits signed updater payloads instead of only wiring the runtime plugin.
8. `settings.tsx` must surface release blockers and warnings from the snapshot so PR6 can track truthful release posture inside the native shell.
9. Browser fallback must return an explicitly blocked placeholder snapshot and must not imply real release readiness.
10. `check_for_app_update` must fail explicitly when the feed is unreachable and must return parsed remote version metadata when the hosted feed or a temporary local smoke override is available.

## UI Truthfulness Contract

Pages:

- `desktop/src/routes/root.tsx`
- `desktop/src/routes/home.tsx`
- `desktop/src/routes/dashboard.tsx`
- `desktop/src/routes/editor.tsx`
- `desktop/src/routes/templates.tsx`
- `desktop/src/routes/settings.tsx`

Rules:

1. Root shell must show runtime mode, native-command readiness, and fallback limitations.
2. `home.tsx` must map fallback runtime to:
   - `workspaceStateFallback`
   - `migrationStateNeedsDesktop`
3. `dashboard.tsx` must not present fallback storage as initialized native storage.
4. `templates.tsx` template validation lane must show whether representative documents came from workspace data, native samples, or browser fallback.
5. `templates.tsx` must disable native export actions in browser fallback mode and surface saved, cancelled, and write-error outcomes explicitly instead of silently succeeding.
6. `settings.tsx` must not present fallback vault/settings snapshots as proof of native desktop readiness.
7. `settings.tsx` AI controls must disable native config writes and prompt streaming in browser fallback mode.
8. `settings.tsx` must show whether the selected provider secret is configured and must keep native streaming limitations explicit for each provider.

## Validation And Error Matrix

| Boundary | Input | Success | Failure | UI / Runtime Expectation |
|---|---|---|---|---|
| Tauri startup -> frontend dev server | `beforeDevCommand`, `devUrl=1420` | Vite listens on `127.0.0.1:1420` | Wrong cwd or wrong command path | `tauri dev` fails early; fix command path instead of changing renderer contract |
| Renderer -> `get_bootstrap_context` | Tauri command available | `runtimeMode="tauri"` and `supportsNativeCommands=true` | Tauri API unavailable | Renderer falls back to `browser_fallback` and logs the failing command |
| Renderer -> workspace/storage/settings snapshots | Matching Tauri commands available | Real native paths and statuses | Command throws / browser runtime | Placeholder snapshot returned; page must mark it as fallback-only |
| Renderer -> `get_secret_inventory_snapshot` | Native secrets manifest or fallback exists | Descriptor-only inventory returns, with no plaintext secret values | Command throws / browser runtime | Placeholder inventory returns and UI marks the surface as fallback-only |
| Renderer -> `get_template_validation_snapshot` | Workspace has representative templates | Representative documents render from workspace data | No representative docs available | Rust returns native sample docs and UI labels the source honestly |
| Renderer -> `write_template_validation_export` | Valid HTML + writable user-selected path or workspace exports dir | HTML file lands at the selected system path (or workspace fallback path) and receipt returns final path | Browser fallback / cancelled save dialog / write failure / invalid path | Export button stays disabled in fallback; UI shows cancelled or explicit error state |
| Renderer -> `write_export_file` | Valid `outputPath`, matching `expectedExtension`, and encoded bytes | Native write returns `{ fileName, outputPath, bytesWritten }` for HTML / TXT / DOCX / JSON exports | Browser fallback / invalid extension / invalid path / filesystem write failure | Export dialog must show a direct write error and never pretend the file was saved |
| Renderer -> `write_pdf_export` | Valid `outputPath` and rendered HTML | Native PDF lands at the selected path and receipt reports actual output size | Browser fallback / browser executable missing / headless print failure / output file absent | Export dialog surfaces the PDF-specific failure and keeps the user-selected path visible |
| Native startup / window events -> `workspace_settings.window_state_json` | Desktop runtime active + `rememberWindowState=true` | Main window reapplies the most recent normal bounds plus any `maximized`/`fullscreen` flags, while move/resize/close events persist the updated geometry | Browser fallback / invalid stored JSON / native window event wiring failure | Runtime logs a warning, fallback mode stays explicit, and the shell reverts to the default geometry without claiming persistence |
| Native startup / tray events -> system tray icon + tray menu | Desktop runtime active + default icon available | Tray icon exposes Show / Hide To Tray / Quit actions and tray interaction can restore the main window | Browser fallback / missing icon / tray init failure | Runtime logs the tray failure explicitly and keeps the main window shell usable without pretending tray support |
| Renderer -> `get_release_readiness_snapshot` | Native desktop runtime + Tauri config available | Settings page shows the real bundling/updater/tray/window-state posture with blockers when needed | Browser fallback / config gaps / missing updater feed/signing | Fallback stays explicitly blocked and native UI keeps incomplete updater chains visible instead of implying parity |
| Renderer -> `check_for_app_update` | Native desktop runtime + running updater feed | Settings page reports current/latest versions or an available update without leaving the app | Browser fallback / unreachable feed / invalid latest.json | UI shows an explicit updater check error and keeps local smoke limitations visible |
| Renderer -> `update_ai_provider_settings` | Provider, base URL, model are valid | Settings document is persisted and subsequent reads reflect the change, including `ai.resumeImportVisionModel` when provided | Browser fallback / invalid provider / empty model or base URL | UI shows explicit error; no silent fallback write |
| Renderer -> `fetch_ai_models` | Supported provider plus configured API key | Provider model list returns in provider-specific normalized shape | Browser fallback / missing API key / upstream non-2xx / malformed response | Settings keeps the picker usable, may show an empty list, and must not claim models were discovered |
| Renderer -> `test_ai_connectivity` | Supported provider with saved API key | Result returns `success=true`, measured `latencyMs`, and `errorMessage=null` | Browser fallback / missing API key / upstream auth or network failure | Settings shows the returned error text without crashing or throwing away the current draft values |
| Renderer -> `test_exa_connectivity` | Saved Exa API key and reachable Exa base URL | Result returns `success=true`, measured `latencyMs`, and `errorMessage=null` | Browser fallback / missing API key / upstream auth or network failure | Settings shows the returned Exa error text and keeps the rest of the panel interactive |
| Renderer -> `write_secret_value` | Valid secret key contract + non-empty value | Secret manifest and vault fallback update together | Browser fallback / invalid key / file write failure | UI shows explicit error; plaintext secret never echoes back to renderer |
| Renderer -> `start_ai_prompt_stream` | Supported provider + saved secret + prompt, plus `documentId` when resume-edit tools are needed | Start receipt returns and `desktop://ai-stream` emits started / delta / tool / completed events | Unsupported provider / missing secret / upstream error / missing `documentId` for resume tools | UI shows explicit failure state, keeps tool activity visible, and reloads desktop resume state after successful tool writes |
| Create Resume dialog -> `importResumeFromFile` | Supported file type and configured vision model when required | Progress advances through `validating` / `extracting|rendering` / `parsing` / `saving`, and `importDocument` returns a desktop document | Unsupported file / missing vision model / invalid AI JSON / save failure | Dialog shows progress or a specific import error instead of a generic endless spinner |
| Page state mapping | `BootstrapContext` | Runtime-specific labels and warnings | Raw status shown without runtime check | UI becomes misleading and PR1 is not complete |

## Good / Base / Bad Cases

### Good

- `pnpm dev:tauri` starts Vite on `1420`
- `root.tsx` shows native runtime badge
- `dashboard.tsx` shows real SQLite version instead of `browser-fallback`
- `templates.tsx` renders representative `classic` / `modern` previews and writes HTML exports to a user-selected system path through the native save dialog
- Editor export writes HTML / TXT / JSON / DOCX through `write_export_file` and writes PDF / PDF one-page through `write_pdf_export`, with the final receipt matching the path chosen in the native save dialog.
- Desktop window restores the last geometry (including maximized/fullscreen state) after restart and honors the `rememberWindowState` toggle.
- Native tray icon can hide the window, restore it from the tray, and quit the desktop shell without placeholder behavior.
- `build:desktop:release-updater-manifest` emits a GitHub Release-ready `latest.json` whose `version` matches the tagged desktop build and whose URL points at the signed release artifact.
- `build:desktop:updater-feed` emits a signed local `latest.json`, and `dev:tauri:local-updater` lets settings perform a native updater check against the local smoke feed without mutating committed production config.
- `settings.tsx` saves an OpenAI-compatible provider config + API key into the desktop workspace and streams an assistant response through `desktop://ai-stream`
- Desktop AI chat keeps a bounded recent conversation history, shows tool execution blocks for resume writes, and reloads the affected desktop resume after successful `replaceResumeText` / `updateResumeMetadata` events.
- `settings-dialog.tsx` loads provider-specific models, lets the user choose a dedicated resume-import vision model from the same returned list, and reports AI / Exa connectivity with explicit latency and error text.
- Resume import shows stage-by-stage progress, parses text PDFs on the standard text model, switches scanned PDFs or direct images onto the configured vision model, and accepts drag-and-drop file input on Windows.

### Base

- Opening the renderer directly in a browser returns fallback context
- Pages still render, but root/home/library/settings all display fallback messaging and limitations
- Template validation previews may render fallback samples, but export actions remain disabled
- Settings may preview provider contracts, but config writes and native AI streaming stay unavailable
- Settings model pickers may still open in browser fallback, but model discovery returns an empty list and connectivity tests return `Desktop runtime not available`.
- Create-resume may still show the upload flow in browser preview, but native import/save success cannot be claimed there.
- Tray behavior is intentionally unavailable in browser fallback; tray checks wait for the native desktop shell.
- Release readiness stays blocked in browser fallback and does not claim real updater posture.
- Hosted production config stays on the GitHub Release feed, while local updater smoke remains opt-in through the generated localhost override.

### Bad

- `tauri.conf.json` points `beforeDevCommand` at the repo-root Next.js stack
- Renderer infers fallback by string-matching ad hoc runtime text only
- Fallback snapshots render `created` / `cleanWorkspace` / `Initialized` without a fallback warning
- Export UI claims success without a native write receipt from `write_template_validation_export`
- Export UI claims success for DOCX / JSON / TXT / PDF without a receipt from `write_export_file` or `write_pdf_export`
- Tray menu items exist but do nothing, or tray boot failure silently removes the feature without logging.
- Production updater config quietly drifts back to localhost / insecure transport, or version files drift away from the root package version.
- Settings UI implies updater parity even though feed/signing/artifact requirements are still missing.
- Settings UI claims a provider is stream-ready without a saved secret or while browser fallback is active
- Settings UI lets users select an arbitrary vision model value that is not persisted under `ai.resumeImportVisionModel`
- Renderer consumes all `desktop://ai-stream` events globally without filtering by `requestId`
- Desktop window always opens at the default size and ignores the previously persisted maximized/fullscreen state.
- Resume import stays on a generic spinner even though stage-aware progress is available, or it sends scanned/image-only files through the text-only model path.
- Vite prebundles `mupdf` or serves the Wasm URL as HTML, leading to `WebAssembly.instantiate(): expected magic word`.

## Required Tests And Assertion Points

Manual assertions:

1. Run `pnpm dev:tauri`; confirm `http://127.0.0.1:1420` responds and the desktop shell opens.
2. In the desktop shell, confirm root banner shows native runtime mode and no fallback limitations.
3. In a browser-only renderer context, confirm root banner shows fallback mode and limitations.
4. In the desktop shell, confirm `templates.tsx` shows the template validation lane with representative `classic` / `modern` templates.
5. Trigger HTML export from the native desktop shell, choose a custom system save path, and confirm the returned path matches the selected location.
6. Trigger the same export flow and cancel the save dialog; confirm the UI reports a cancelled outcome and no file is written.
7. From the editor export dialog, save HTML, TXT, JSON, DOCX, PDF, and PDF one-page outputs from the native desktop shell; confirm each receipt path matches the selected location and that PDF one-page applies the fit-to-page layout.
8. Confirm browser fallback keeps the template validation lane visible but disables native export.
9. In the native desktop shell, save an OpenAI-compatible provider config and API key from `settings.tsx`.
10. Open the settings model picker and the resume-import vision-model picker; confirm both are populated from `fetch_ai_models(...)`, and manual entry still persists if a model is not listed.
11. Run the AI and Exa connectivity checks from `settings.tsx`; confirm each result returns latency plus either success or an explicit error string without leaving the dialog stuck in loading state.
12. Import a text-based PDF and confirm progress advances through `validating` -> `extracting` -> `parsing` -> `saving`, with the standard text model remaining active.
13. Import an image resume with no configured vision model and confirm the create-resume dialog blocks the action with the vision-model guidance instead of spinning forever.
14. Import a scanned PDF with a configured vision model and confirm progress advances through `validating` -> `extracting` -> `rendering` -> `parsing` -> `saving`.
15. Confirm browser fallback keeps the AI controls visible but disables config writes and native streaming.
16. Confirm library/settings copy changes between native and fallback modes.
17. Resize or move the desktop window, close the app, and confirm the next launch restores the latest normal bounds while replaying any maximized/fullscreen state active at exit.
18. Toggle between normal, maximized, and fullscreen states, close the shell, and confirm the restored session replays the flags while keeping the normal bounds updated for future runs.
19. In the native desktop shell, confirm the tray icon can hide the window, restore it from tray interaction, and exit cleanly through the tray menu.
20. Run `pnpm run verify:desktop:version-sync` and confirm desktop version files still match the root `package.json`.
21. In the native desktop shell, confirm settings show hosted updater wiring without production localhost/insecure warnings.
22. Run `pnpm run verify:desktop:release-readiness` and confirm it passes once updater feed, signing pubkey, and artifacts are configured.
23. Run `pnpm run build:desktop:release-updater-manifest` with `GITHUB_REPOSITORY` and `RELEASE_TAG` set; confirm the emitted `latest.json` points at the signed GitHub Release asset.
24. Run `pnpm run build:desktop:updater-feed`, start `pnpm run serve:desktop:updater-feed`, then launch `pnpm run dev:tauri:local-updater` and confirm Settings can execute a native updater check against the local smoke feed.

Automated / static assertions:

1. `pnpm --filter @rolerover/desktop build`
2. `cargo check --manifest-path desktop/src-tauri/Cargo.toml --target-dir .codex-cargo-target/desktop-tauri`
3. `pnpm run lint:desktop:active`
4. `pnpm run lint:desktop:shared`
5. `pnpm run report:web:reference` as archived web observation
6. `pnpm lint` as the product-aligned desktop/shared composite
7. `pnpm --filter @rolerover/desktop exec tsc -b`
8. `npm --prefix desktop run build`
9. `pnpm run verify:desktop:version-sync`
10. `pnpm run verify:desktop:migration`


