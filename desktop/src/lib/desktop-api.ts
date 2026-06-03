import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import type {
  CreateInterviewSessionInput,
  GenerateInterviewReportInput,
  InterviewerConfig,
  InterviewMessage,
  InterviewMessageMetadata,
  InterviewReport,
  InterviewSession,
  InterviewSessionDetail,
  InterviewRound,
  StartInterviewTurnStreamInput,
  UpdateInterviewMessageMetadataInput,
} from "../types/interview";

export type DesktopRuntimeMode = "tauri" | "browser_fallback";

export interface BootstrapContext {
  appName: string;
  appVersion: string;
  frontendShell: string;
  runtime: string;
  platform: string;
  buildChannel: string;
  branch: string;
  runtimeMode: DesktopRuntimeMode;
  supportsNativeCommands: boolean;
  limitations: string[];
}

export interface LegacySourceSnapshot {
  id: string;
  label: string;
  kind: string;
  path: string;
  exists: boolean;
}

export interface WorkspaceSnapshot {
  schemaVersion: number;
  workspaceId: string;
  bootstrapStatus: "created" | "reused";
  migrationStatus: "legacySourcesDetected" | "cleanWorkspace";
  createdAtEpochMs: number;
  lastOpenedAtEpochMs: number;
  rootDir: string;
  manifestPath: string;
  databasePath: string;
  secureSettingsPath: string;
  documentsDir: string;
  exportsDir: string;
  importsDir: string;
  cacheDir: string;
  manifestsDir: string;
  legacySources: LegacySourceSnapshot[];
}

export interface TableCountSnapshot {
  table: string;
  rowCount: number;
}

export interface StorageSnapshot {
  schemaVersion: number;
  bootstrapStatus: "created" | "reused";
  workspaceRoot: string;
  databasePath: string;
  workspaceId: string;
  initialized: boolean;
  sqliteVersion: string;
  tableCounts: TableCountSnapshot[];
}

export interface DesktopDocumentListItem {
  id: string;
  title: string;
  template: string;
  language: string;
  themeJson: string;
  isDefault: boolean;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface DesktopDocumentSectionItem {
  id: string;
  documentId: string;
  sectionType: string;
  title: string;
  sortOrder: number;
  visible: boolean;
  contentJson: string;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface DesktopDocumentDetail extends DesktopDocumentListItem {
  sections: DesktopDocumentSectionItem[];
}

export interface CreateDocumentInput {
  title?: string;
  template?: string;
  language?: string;
  themeJson?: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
}

export interface UpdateDocumentMetadataInput {
  id: string;
  title?: string;
  template?: string;
  language?: string;
  themeJson?: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
}

export interface SaveDocumentSectionInput {
  id: string;
  documentId: string;
  sectionType: string;
  title: string;
  sortOrder: number;
  visible: boolean;
  content: Record<string, unknown>;
  createdAtEpochMs?: number;
  updatedAtEpochMs?: number;
}

export interface SaveDocumentInput {
  id: string;
  title: string;
  template: string;
  language: string;
  themeJson: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  sections: SaveDocumentSectionInput[];
}

export interface ImportDocumentSectionInput {
  sectionType: string;
  title: string;
  sortOrder?: number;
  visible?: boolean;
  content: Record<string, unknown>;
}

export interface ImportDocumentInput {
  title: string;
  template?: string;
  themeJson?: string;
  language?: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  sections: ImportDocumentSectionInput[];
}

export type WorkspaceModel = "single_workspace";

export type ResumeSectionType =
  | "personal_info"
  | "qr_codes"
  | "summary"
  | "work_experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "custom"
  | "github";

export type AvatarStyle = "circle" | "one_inch";

export interface ResumePageMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResumeThemeConfig {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  lineSpacing: number;
  margin: ResumePageMargin;
  sectionSpacing: number;
  avatarStyle: AvatarStyle;
}

export type AiProvider = "openai" | "anthropic" | "gemini";

export interface ProviderRuntimeContract {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKeySecretKey: string;
}

export interface ExaPoolSettingsContract {
  baseUrl: string;
  apiKeySecretKey: string;
}

export interface WorkspaceContractSettings {
  ai: {
    defaultProvider: AiProvider;
    providers: ProviderRuntimeContract[];
    exaPool: ExaPoolSettingsContract;
  };
  editor: {
    autoSave: boolean;
    autoSaveIntervalMs: number;
  };
}

export type DomainLegacySourceKind = "sqlite" | "secure_settings" | "window_state";

export interface LegacySourceDescriptor {
  kind: DomainLegacySourceKind;
  path: string;
  storageProfile: string;
}

export type MigrationCheckpointStatus = "pending" | "passed" | "failed" | "skipped";

export interface MigrationCheckpoint {
  name: string;
  required: boolean;
  status: MigrationCheckpointStatus;
  notes: string | null;
}

export type MigrationStatus =
  | "pending"
  | "legacy_sources_detected"
  | "validation_failed"
  | "imported";

export interface MigrationEnvelope {
  source: LegacySourceDescriptor;
  targetSchemaVersion: number;
  status: MigrationStatus;
  checkpoints: MigrationCheckpoint[];
}

export interface DomainContractSummary {
  contractVersion: number;
  workspaceModel: WorkspaceModel;
  supportedSectionTypes: ResumeSectionType[];
  defaultTheme: ResumeThemeConfig;
  defaultSettings: WorkspaceContractSettings;
  migrationEnvelopeTemplate: MigrationEnvelope;
}

export interface ProviderRuntimeSettings {
  baseUrl: string;
  model: string;
}

export interface WorkspaceSettingsDocument {
  schemaVersion: number;
  locale: string;
  theme: string;
  ai: {
    defaultProvider: string;
    providerConfigs: Record<string, ProviderRuntimeSettings>;
    exaPoolBaseUrl: string;
    resumeImportVisionModel?: string | null;
  };
  editor: {
    autoSave: boolean;
    autoSaveIntervalMs: number;
  };
  window: {
    rememberWindowState: boolean;
    restoreLastWorkspace: boolean;
  };
  sync: {
    webdav: {
      serverUrl: string;
      username: string;
      remotePath: string;
      lastSnapshotName?: string | null;
      lastBackupAtEpochMs?: number | null;
      lastRestoreAtEpochMs?: number | null;
    };
  };
  updatedAtEpochMs: number;
}

export type LegacyImportSourceKind =
  | "sqliteDatabase"
  | "secureSettings"
  | "windowState"
  | "localStorageFallback";

export type LegacyTableAction =
  | "importAsIs"
  | "importWithTransform"
  | "mergeIntoWorkspace"
  | "dropWithAudit";

export interface LegacyTableMapping {
  source: string;
  target: string;
  action: LegacyTableAction;
  notes: string;
}

export interface LegacyImportContract {
  sourcePriority: LegacyImportSourceKind[];
  tableMappings: LegacyTableMapping[];
  droppedSurfaces: string[];
}

export type SecretVaultBackend =
  | "unconfigured"
  | "os_keyring"
  | "stronghold"
  | "file_fallback";

export type SecretVaultReadiness =
  | "ready"
  | "needs_configuration"
  | "degraded";

export interface SecretVaultStatus {
  backend: SecretVaultBackend;
  encryptedAtRest: boolean;
  status: SecretVaultReadiness;
  warnings: string[];
  manifestPath: string;
  fallbackPath: string;
  registeredSecretCount: number;
}

export interface SecretInventoryEntry {
  key: string;
  provider: string | null;
  purpose: string;
  updatedAtEpochMs: number;
  isConfigured: boolean;
}

export interface SecretInventorySnapshot {
  backend: SecretVaultBackend;
  encryptedAtRest: boolean;
  warnings: string[];
  updatedAtEpochMs: number;
  entries: SecretInventoryEntry[];
}

export interface ProviderConfigUpdateInput {
  provider: string;
  baseUrl: string;
  model: string;
  setAsDefault: boolean;
  resumeImportVisionModel?: string;
  exaPoolBaseUrl?: string;
}

export interface WorkspaceAppearanceSettingsUpdateInput {
  locale: string;
  theme: string;
  autoSave: boolean;
  autoSaveIntervalMs?: number;
  rememberWindowState: boolean;
}

export interface SecretValueWriteInput {
  key: string;
  provider?: string | null;
  purpose?: string | null;
  value: string;
}

export interface WebdavSyncStatus {
  configured: boolean;
  serverUrl: string;
  username: string;
  remotePath: string;
  passwordConfigured: boolean;
  lastSnapshotName?: string | null;
  lastBackupAtEpochMs?: number | null;
  lastRestoreAtEpochMs?: number | null;
}

export interface WebdavSettingsUpdateInput {
  serverUrl: string;
  username: string;
  remotePath: string;
  password?: string | null;
}

export interface WebdavConnectivityResult {
  success: boolean;
  latencyMs: number;
  errorMessage: string | null;
}

export interface WebdavSnapshotReceipt {
  snapshotName: string;
  remotePath: string;
  databaseBytes: number;
  secretCount: number;
  settingsIncluded: boolean;
  completedAtEpochMs: number;
}

export interface WebdavRestoreReceipt {
  snapshotName: string;
  localBackupPath: string;
  restoredSecretCount: number;
  restoredAtEpochMs: number;
}

export interface StartAiPromptStreamInput {
  provider: string;
  prompt: string;
  documentId?: string;
  model?: string;
  baseUrl?: string;
  requestId?: string;
  systemPrompt?: string;
  images?: string[];
  conversation?: DesktopAiConversationMessage[];
  thinkingEnabled?: boolean;
}

export interface DesktopAiConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiStreamStartReceipt {
  requestId: string;
  provider: string;
  model: string;
  eventName: string;
  startedAtEpochMs: number;
}

export type DesktopAiStreamEventKind =
  | "started"
  | "delta"
  | "delta_thinking"
  | "completed"
  | "error"
  | "tool";

export type DesktopAiToolCallState =
  | "input-streaming"
  | "output-available"
  | "output-error";

export interface DesktopAiToolCallPayload {
  toolCallId: string;
  toolName: string;
  state: DesktopAiToolCallState;
  input?: unknown;
  output?: unknown;
  errorText?: string | null;
}

export interface DesktopAiStreamEvent {
  requestId: string;
  provider: string;
  model: string;
  kind: DesktopAiStreamEventKind;
  startedAtEpochMs: number;
  emittedAtEpochMs: number;
  finishedAtEpochMs?: number | null;
  chunkIndex?: number | null;
  deltaText?: string | null;
  accumulatedText?: string | null;
  accumulatedThinking?: string | null;
  errorMessage?: string | null;
  toolCall?: DesktopAiToolCallPayload | null;
}

export type ImporterSourceKind =
  | "sqlite_database"
  | "secure_settings"
  | "window_state"
  | "local_storage_fallback";

export type StagingAction = "copy" | "skip_missing" | "ignore_unsupported";

export type ValidationSeverity = "blocking" | "warning" | "info";

export type TransformMode =
  | "import_as_is"
  | "import_with_transform"
  | "merge_into_workspace"
  | "drop_with_audit";

export type RollbackStrategy =
  | "staging_cleanup_only"
  | "transaction_rollback_and_backup_restore";

export type ImporterState =
  | "planned"
  | "dry_run_failed"
  | "ready_for_execution";

export type StagingExecutionState = "success" | "partial" | "failed";

export type AuditWriteStatus = "written" | "skipped" | "failed";

export type MigrationExecutionState = "success" | "failed";

export interface DiscoveredSource {
  id: string;
  sourceKind: ImporterSourceKind;
  path: string;
  exists: boolean;
  priority: number;
}

export interface StagedFile {
  sourceId: string;
  sourcePath: string;
  stagedPath: string;
  fileKind: ImporterSourceKind;
}

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  sourceId?: string | null;
}

export interface TransformStep {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  mode: TransformMode;
  notes: string;
}

export interface DroppedSurface {
  name: string;
  reason: string;
}

export interface ImporterDryRunSnapshot {
  plan: {
    version: number;
    config: {
      runId: string;
      workspaceRoot: string;
      workspaceDatabasePath: string;
      stagingRoot: string;
      strictMode: boolean;
    };
    discovery: {
      sources: DiscoveredSource[];
      hasViableInput: boolean;
      warnings: string[];
    };
    staging: {
      stagingDir: string;
      stagedFiles: StagedFile[];
      actions: StagingAction[];
    };
    validation: {
      totals: {
        discoveredSources: number;
        stagedFiles: number;
        blockingIssues: number;
        warningIssues: number;
      };
      issues: ValidationIssue[];
      isReadyForTransform: boolean;
    };
    transform: {
      targetSchemaVersion: number;
      steps: TransformStep[];
      droppedSurfaces: DroppedSurface[];
    };
    commitBoundary: {
      transactionScope: string;
      rollbackStrategy: RollbackStrategy;
      checkpointWrites: string[];
    };
  };
  result: {
    runId: string;
    state: ImporterState;
    summary: string;
    blockingIssues: ValidationIssue[];
  };
  stagingExecution?: StagingExecutionResult | null;
  migrationExecution?: MigrationExecutionResult | null;
}

export interface StagingExecutionResult {
  runId: string;
  state: StagingExecutionState;
  stagedFileCount: number;
  copiedBytes: number;
  manifestPath: string;
  auditArtifactPath: string;
  auditWriteStatus: AuditWriteStatus;
  warnings: string[];
}

export interface MigrationEntityCount {
  entity: string;
  count: number;
}

export interface DroppedEntityCount {
  entity: string;
  count: number;
  reason: string;
}

export interface MigrationExecutionResult {
  runId: string;
  state: MigrationExecutionState;
  summary: string;
  sourceDatabasePath?: string | null;
  backupPath?: string | null;
  importedCounts: MigrationEntityCount[];
  droppedCounts: DroppedEntityCount[];
  warningCount: number;
  warnings: string[];
  auditRowsWritten: number;
}

export type TemplateValidationSource =
  | "workspace_documents"
  | "native_sample_documents"
  | "workspace_plus_native_sample_documents"
  | "browser_fallback_sample";

export interface TemplateValidationDocumentMetadata {
  id: string;
  title: string;
  template: string;
  language: string;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  isDefault: boolean;
  isSample: boolean;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface TemplateValidationTheme {
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: string;
  lineSpacing?: number;
  margin?: Partial<ResumePageMargin>;
  sectionSpacing?: number;
  avatarStyle?: AvatarStyle | "oneInch";
}

export interface TemplateValidationSection {
  id: string;
  documentId: string;
  sectionType: ResumeSectionType;
  title: string;
  sortOrder: number;
  visible: boolean;
  content: Record<string, unknown>;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface TemplateValidationDocument {
  metadata: TemplateValidationDocumentMetadata;
  theme: TemplateValidationTheme;
  sections: TemplateValidationSection[];
}

export interface TemplateValidationSnapshot {
  source: TemplateValidationSource;
  representativeTemplates: string[];
  documents: TemplateValidationDocument[];
}

export interface TemplateValidationExportReceipt {
  fileName: string;
  outputPath: string;
  bytesWritten: number;
}

export interface TemplateValidationExportInput extends Record<string, unknown> {
  fileName?: string;
  outputPath?: string;
  html: string;
}

export interface ExportFileWriteInput extends Record<string, unknown> {
  outputPath: string;
  expectedExtension: string;
  bytes: number[];
}

export interface PdfExportWriteInput extends Record<string, unknown> {
  outputPath: string;
  html: string;
}

export type UpdaterArtifactsMode =
  | "disabled"
  | "current"
  | "v1_compatible";

export interface ReleaseReadinessSnapshot {
  bundleActive: boolean;
  updaterPluginWired: boolean;
  updaterConfigDeclared: boolean;
  updaterConfigured: boolean;
  updaterArtifactsEnabled: boolean;
  updaterArtifactsMode: UpdaterArtifactsMode;
  updaterEndpointCount: number;
  updaterPubkeyConfigured: boolean;
  updaterDangerousInsecureTransport: boolean;
  updaterUsesLocalhost: boolean;
  updaterWindowsInstallMode?: string | null;
  trayIconReady: boolean;
  rememberWindowStateEnabled: boolean;
  blockers: string[];
  warnings: string[];
}

export interface AppUpdateCheckResult {
  checkedAtEpochMs: number;
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string | null;
  target?: string | null;
  downloadUrl?: string | null;
  notes?: string | null;
  pubDate?: string | null;
}

interface RawInterviewSessionListItem {
  id: string;
  resumeId?: string | null;
  jobDescription: string;
  jobTitle?: string | null;
  selectedInterviewers: unknown;
  currentRound: number;
  totalRounds: number;
  status: InterviewSession["status"];
  hasReport: boolean;
  overallScore?: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

interface RawInterviewMessageItem {
  id: string;
  roundId: string;
  role: InterviewMessage["role"];
  content: string;
  metadata: unknown;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

interface RawInterviewRoundDetail {
  id: string;
  sessionId: string;
  interviewerType: string;
  interviewerConfig: unknown;
  sortOrder: number;
  status: InterviewRound["status"];
  questionCount: number;
  maxQuestions: number;
  summary?: unknown;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
  messages: RawInterviewMessageItem[];
}

interface RawInterviewReportRecord {
  id: string;
  sessionId: string;
  overallScore: number;
  summary: string;
  overallFeedback: string;
  improvementSuggestions: string[];
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

interface RawInterviewSessionDetail {
  id: string;
  resumeId?: string | null;
  jobDescription: string;
  jobTitle?: string | null;
  selectedInterviewers: unknown;
  currentRound: number;
  totalRounds: number;
  status: InterviewSession["status"];
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
  rounds: RawInterviewRoundDetail[];
  report?: RawInterviewReportRecord | null;
}

const FALLBACK_CONTEXT: BootstrapContext = {
  appName: "JobPilot Desktop",
  appVersion: "0.1.0",
  frontendShell: "React + Vite + TanStack Router + react-i18next",
  runtime: "Tauri bootstrap shell (browser fallback)",
  platform: "browser",
  buildChannel: "development",
  branch: "tauri-rust-desktop-rewrite",
  runtimeMode: "browser_fallback",
  supportsNativeCommands: false,
  limitations: [
    "Native Tauri commands are unavailable in browser fallback mode.",
    "Workspace, storage, settings, and importer snapshots are placeholders for shell development only.",
    "Use the desktop shell to validate real filesystem, secrets, and migration behavior.",
  ],
};

const FALLBACK_WORKSPACE: WorkspaceSnapshot = {
  schemaVersion: 2,
  workspaceId: "browser-fallback",
  bootstrapStatus: "created",
  migrationStatus: "cleanWorkspace",
  createdAtEpochMs: 0,
  lastOpenedAtEpochMs: 0,
  rootDir: "desktop/workspace",
  manifestPath: "desktop/workspace/manifests/workspace.json",
  databasePath: "desktop/workspace/rolerover.db",
  secureSettingsPath: "desktop/workspace/secrets/secrets-manifest.json",
  documentsDir: "desktop/workspace/documents",
  exportsDir: "desktop/workspace/exports",
  importsDir: "desktop/workspace/imports",
  cacheDir: "desktop/workspace/cache",
  manifestsDir: "desktop/workspace/manifests",
  legacySources: [],
};

const FALLBACK_STORAGE: StorageSnapshot = {
  schemaVersion: 2,
  bootstrapStatus: "created",
  workspaceRoot: "desktop/workspace",
  databasePath: "desktop/workspace/rolerover.db",
  workspaceId: "browser-workspace",
  initialized: false,
  sqliteVersion: "browser-fallback",
  tableCounts: [],
};

const FALLBACK_DOMAIN_CONTRACT: DomainContractSummary = {
  contractVersion: 1,
  workspaceModel: "single_workspace",
  supportedSectionTypes: [
    "personal_info",
    "qr_codes",
    "summary",
    "work_experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages",
    "custom",
    "github",
  ],
  defaultTheme: {
    primaryColor: "#111827",
    accentColor: "#2563eb",
    fontFamily: "Inter",
    fontSize: "14px",
    lineSpacing: 1.6,
    margin: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
    sectionSpacing: 16,
    avatarStyle: "circle",
  },
  defaultSettings: {
    ai: {
      defaultProvider: "openai",
      providers: [
        {
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o",
          apiKeySecretKey: "provider.openai.api_key",
        },
        {
          provider: "anthropic",
          baseUrl: "https://api.anthropic.com",
          model: "claude-sonnet-4-20250514",
          apiKeySecretKey: "provider.anthropic.api_key",
        },
        {
          provider: "gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          model: "gemini-2.0-flash",
          apiKeySecretKey: "provider.gemini.api_key",
        },
      ],
      exaPool: {
        baseUrl: "https://api.exa.ai",
        apiKeySecretKey: "provider.exa_pool.api_key",
      },
    },
    editor: {
      autoSave: true,
      autoSaveIntervalMs: 500,
    },
  },
  migrationEnvelopeTemplate: {
    source: {
      kind: "sqlite",
      path: "workspace/imports/legacy/jade.db",
      storageProfile: "electron-next-local",
    },
    targetSchemaVersion: 2,
    status: "pending",
    checkpoints: [
      {
        name: "source-discovery",
        required: true,
        status: "pending",
        notes: null,
      },
      {
        name: "schema-validation",
        required: true,
        status: "pending",
        notes: null,
      },
      {
        name: "content-import",
        required: true,
        status: "pending",
        notes: null,
      },
      {
        name: "secure-settings-import",
        required: false,
        status: "pending",
        notes: "Skipped when no secure settings store is detected.",
      },
    ],
  },
};

const FALLBACK_SETTINGS: WorkspaceSettingsDocument = {
  schemaVersion: 1,
  locale: "zh",
  theme: "system",
  ai: {
    defaultProvider: "openai",
    providerConfigs: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
      },
      anthropic: {
        baseUrl: "https://api.anthropic.com",
        model: "claude-sonnet-4-20250514",
      },
      gemini: {
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.0-flash",
      },
    },
    exaPoolBaseUrl: "https://api.exa.ai",
    resumeImportVisionModel: "",
  },
  editor: {
    autoSave: true,
    autoSaveIntervalMs: 500,
  },
  window: {
    rememberWindowState: true,
    restoreLastWorkspace: true,
  },
  sync: {
    webdav: {
      serverUrl: "",
      username: "",
      remotePath: "JobPilot",
      lastSnapshotName: null,
      lastBackupAtEpochMs: null,
      lastRestoreAtEpochMs: null,
    },
  },
  updatedAtEpochMs: 0,
};

const FALLBACK_WEBDAV_SYNC_STATUS: WebdavSyncStatus = {
  configured: false,
  serverUrl: "",
  username: "",
  remotePath: "JobPilot",
  passwordConfigured: false,
  lastSnapshotName: null,
  lastBackupAtEpochMs: null,
  lastRestoreAtEpochMs: null,
};

const FALLBACK_LEGACY_IMPORT_CONTRACT: LegacyImportContract = {
  sourcePriority: [
    "secureSettings",
    "sqliteDatabase",
    "localStorageFallback",
    "windowState",
  ],
  tableMappings: [
    {
      source: "users",
      target: "workspace metadata",
      action: "mergeIntoWorkspace",
      notes:
        "Single-workspace migration; user identity is not retained at runtime.",
    },
    {
      source: "auth_accounts",
      target: "migration audit",
      action: "dropWithAudit",
      notes: "Desktop runtime does not preserve OAuth account sessions.",
    },
    {
      source: "resumes",
      target: "documents",
      action: "importWithTransform",
      notes: "Drop share fields and normalize optional target fields.",
    },
    {
      source: "resume_sections",
      target: "document_sections",
      action: "importWithTransform",
      notes: "Repair malformed content JSON to empty object and emit warning.",
    },
    {
      source: "chat_sessions",
      target: "ai_chat_sessions",
      action: "importAsIs",
      notes: "Relink sessions to migrated document IDs.",
    },
    {
      source: "chat_messages",
      target: "ai_chat_messages",
      action: "importAsIs",
      notes: "Preserve role/content/metadata payloads.",
    },
    {
      source: "resume_shares",
      target: "none",
      action: "dropWithAudit",
      notes: "Public share surface is removed in desktop-first scope.",
    },
    {
      source: "jd_analyses",
      target: "ai_analysis_records(type=jd)",
      action: "importWithTransform",
      notes: "Preserve result payload and score fields.",
    },
    {
      source: "grammar_checks",
      target: "ai_analysis_records(type=grammar)",
      action: "importWithTransform",
      notes: "Preserve result payload and score fields.",
    },
  ],
  droppedSurfaces: [
    "online share tokens",
    "public share views",
    "request fingerprint runtime identity",
    "oauth session runtime records",
  ],
};

const FALLBACK_VAULT_STATUS: SecretVaultStatus = {
  backend: "unconfigured",
  encryptedAtRest: false,
  status: "needs_configuration",
  warnings: ["Vault backend is not configured in browser fallback mode."],
  manifestPath: "desktop/workspace/secrets/secrets-manifest.json",
  fallbackPath: "desktop/workspace/secrets/vault-fallback.json",
  registeredSecretCount: 0,
};

const FALLBACK_SECRET_INVENTORY: SecretInventorySnapshot = {
  backend: "unconfigured",
  encryptedAtRest: false,
  warnings: [
    "Secret inventory is unavailable in browser fallback mode.",
  ],
  updatedAtEpochMs: 0,
  entries: [
    {
      key: "provider.openai.api_key",
      provider: "openai",
      purpose: "Desktop AI runtime credential.",
      updatedAtEpochMs: 0,
      isConfigured: false,
    },
    {
      key: "provider.anthropic.api_key",
      provider: "anthropic",
      purpose: "Desktop AI runtime credential.",
      updatedAtEpochMs: 0,
      isConfigured: false,
    },
    {
      key: "provider.gemini.api_key",
      provider: "gemini",
      purpose: "Desktop AI runtime credential.",
      updatedAtEpochMs: 0,
      isConfigured: false,
    },
  ],
};

const FALLBACK_IMPORTER_DRY_RUN: ImporterDryRunSnapshot = {
  plan: {
    version: 1,
    config: {
      runId: "browser-fallback",
      workspaceRoot: "desktop/workspace",
      workspaceDatabasePath: "desktop/workspace/rolerover.db",
      stagingRoot: "desktop/workspace/imports/staging/browser-fallback",
      strictMode: false,
    },
    discovery: {
      sources: [],
      hasViableInput: false,
      warnings: ["Importer dry-run is unavailable in browser fallback mode."],
    },
    staging: {
      stagingDir: "desktop/workspace/imports/staging/browser-fallback",
      stagedFiles: [],
      actions: [],
    },
    validation: {
      totals: {
        discoveredSources: 0,
        stagedFiles: 0,
        blockingIssues: 1,
        warningIssues: 0,
      },
      issues: [
        {
          code: "browser_fallback",
          severity: "blocking",
          message:
            "Tauri importer dry-run is unavailable in browser fallback mode.",
          sourceId: null,
        },
      ],
      isReadyForTransform: false,
    },
    transform: {
      targetSchemaVersion: 2,
      steps: [],
      droppedSurfaces: [],
    },
    commitBoundary: {
      transactionScope: "workspace-db + migration-audit + secrets-adapter",
      rollbackStrategy: "transaction_rollback_and_backup_restore",
      checkpointWrites: [],
    },
  },
  result: {
    runId: "browser-fallback",
    state: "dry_run_failed",
    summary: "Importer dry-run is unavailable in browser fallback mode.",
    blockingIssues: [
      {
        code: "browser_fallback",
        severity: "blocking",
        message:
          "Tauri importer dry-run is unavailable in browser fallback mode.",
        sourceId: null,
      },
    ],
  },
  stagingExecution: null,
  migrationExecution: null,
};

const FALLBACK_TEMPLATE_THEME: ResumeThemeConfig = {
  primaryColor: "#111827",
  accentColor: "#2563eb",
  fontFamily: "Inter",
  fontSize: "medium",
  lineSpacing: 1.6,
  margin: {
    top: 24,
    right: 24,
    bottom: 24,
    left: 24,
  },
  sectionSpacing: 16,
  avatarStyle: "circle",
};

function createFallbackTemplateValidationDocument(config: {
  id: string;
  title: string;
  template: "classic" | "modern";
  accentColor: string;
  primaryColor: string;
  summary: string;
  workHighlights: string[];
  projectName: string;
}): TemplateValidationDocument {
  return {
    metadata: {
      id: config.id,
      title: config.title,
      template: config.template,
      language: "en",
      targetJobTitle: "Senior Product Engineer",
      targetCompany: "JobPilot",
      isDefault: config.template === "classic",
      isSample: true,
      createdAtEpochMs: 0,
      updatedAtEpochMs: 0,
    },
    theme: {
      ...FALLBACK_TEMPLATE_THEME,
      primaryColor: config.primaryColor,
      accentColor: config.accentColor,
    },
    sections: [
      {
        id: `${config.id}-personal`,
        documentId: config.id,
        sectionType: "personal_info",
        title: "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: "Avery Morgan",
          jobTitle: "Senior Product Engineer",
          email: "avery@example.com",
          phone: "+1 555 0100",
          location: "Hong Kong",
          website: "https://rolerover.dev",
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
      {
        id: `${config.id}-summary`,
        documentId: config.id,
        sectionType: "summary",
        title: "Summary",
        sortOrder: 1,
        visible: true,
        content: {
          text: config.summary,
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
      {
        id: `${config.id}-work`,
        documentId: config.id,
        sectionType: "work_experience",
        title: "Work Experience",
        sortOrder: 2,
        visible: true,
        content: {
          items: [
            {
              id: `${config.id}-work-item`,
              company: "JobPilot",
              position: "Staff Product Engineer",
              location: "Remote",
              startDate: "2022.01",
              endDate: null,
              current: true,
              description:
                "Led the desktop rewrite to unify document editing, preview, and export flows.",
              technologies: ["Tauri", "Rust", "React", "TypeScript"],
              highlights: config.workHighlights,
            },
          ],
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
      {
        id: `${config.id}-education`,
        documentId: config.id,
        sectionType: "education",
        title: "Education",
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: `${config.id}-education-item`,
              institution: "City University",
              degree: "B.Sc.",
              field: "Computer Science",
              location: "Hong Kong",
              startDate: "2014.09",
              endDate: "2018.06",
              highlights: ["Graduated with distinction."],
            },
          ],
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
      {
        id: `${config.id}-skills`,
        documentId: config.id,
        sectionType: "skills",
        title: "Skills",
        sortOrder: 4,
        visible: true,
        content: {
          categories: [
            {
              id: `${config.id}-skills-core`,
              name: "Core",
              skills: ["Desktop Architecture", "Template Systems", "SQLite"],
            },
            {
              id: `${config.id}-skills-delivery`,
              name: "Delivery",
              skills: ["Product Thinking", "Migration Planning", "QA"],
            },
          ],
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
      {
        id: `${config.id}-projects`,
        documentId: config.id,
        sectionType: "projects",
        title: "Projects",
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: `${config.id}-project-item`,
              name: config.projectName,
              startDate: "2025.10",
              endDate: null,
              description:
                "Built a representative template validation lane to exercise preview and export paths in the desktop shell.",
              technologies: ["Template Contract", "HTML Export", "Validation"],
              highlights: [
                "Validated representative templates without depending on the legacy web runtime.",
              ],
            },
          ],
        },
        createdAtEpochMs: 0,
        updatedAtEpochMs: 0,
      },
    ],
  };
}

const FALLBACK_TEMPLATE_VALIDATION_SNAPSHOT: TemplateValidationSnapshot = {
  source: "browser_fallback_sample",
  representativeTemplates: ["classic", "modern"],
  documents: [
    createFallbackTemplateValidationDocument({
      id: "browser-fallback-classic",
      title: "Classic Contract Baseline",
      template: "classic",
      accentColor: "#2563eb",
      primaryColor: "#111827",
      summary:
        "Desktop-side validation sample for the unified classic template contract.",
      workHighlights: [
        "Replaced decorative placeholders with a real template validation lane in the desktop shell.",
        "Kept preview and export on the same canonical document input.",
      ],
      projectName: "Classic Preview + Export Baseline",
    }),
    createFallbackTemplateValidationDocument({
      id: "browser-fallback-modern",
      title: "Modern Contract Baseline",
      template: "modern",
      accentColor: "#e94560",
      primaryColor: "#0f3460",
      summary:
        "Desktop-side validation sample for the unified modern template contract.",
      workHighlights: [
        "Verified a second representative template to prove the contract extends beyond one baseline style.",
        "Used the same canonical sections to drive desktop preview and HTML export output.",
      ],
      projectName: "Modern Preview + Export Baseline",
    }),
  ],
};

const FALLBACK_RELEASE_READINESS: ReleaseReadinessSnapshot = {
  bundleActive: false,
  updaterPluginWired: false,
  updaterConfigDeclared: false,
  updaterConfigured: false,
  updaterArtifactsEnabled: false,
  updaterArtifactsMode: "disabled",
  updaterEndpointCount: 0,
  updaterPubkeyConfigured: false,
  updaterDangerousInsecureTransport: false,
  updaterUsesLocalhost: false,
  updaterWindowsInstallMode: null,
  trayIconReady: false,
  rememberWindowStateEnabled: false,
  blockers: [
    "Release readiness snapshot is unavailable in browser fallback mode.",
  ],
  warnings: [
    "Launch the native desktop shell before treating release posture as authoritative.",
  ],
};

function deriveInterviewTitle(
  jobTitle: string | null | undefined,
  jobDescription: string,
): string {
  const normalizedTitle = jobTitle?.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const firstLine = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine || "Interview Session";
}

function normalizeInterviewerConfig(value: unknown): InterviewerConfig {
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    type: String(record.type ?? "hr") as InterviewerConfig["type"],
    name: String(record.name ?? ""),
    title: String(record.title ?? ""),
    avatar: String(record.avatar ?? ""),
    bio: String(record.bio ?? ""),
    style: String(record.style ?? ""),
    focusAreas: Array.isArray(record.focusAreas)
      ? record.focusAreas
          .map((item) => (typeof item === "string" ? item : ""))
          .filter((item) => item.length > 0)
      : [],
    systemPrompt: String(record.systemPrompt ?? ""),
    personality: String(record.personality ?? ""),
  };
}

function normalizeInterviewerConfigList(value: unknown): InterviewerConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeInterviewerConfig);
}

function normalizeInterviewMessageMetadata(value: unknown): InterviewMessageMetadata {
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    marked: record.marked === true,
    hinted: record.hinted === true,
    skipped: record.skipped === true,
  };
}

function normalizeInterviewMessage(item: RawInterviewMessageItem): InterviewMessage {
  return {
    id: item.id,
    roundId: item.roundId,
    role: item.role,
    content: item.content,
    metadata: normalizeInterviewMessageMetadata(item.metadata),
    createdAtEpochMs: item.createdAtEpochMs,
  };
}

function normalizeInterviewRound(item: RawInterviewRoundDetail): InterviewRound {
  const summaryRecord =
    typeof item.summary === "object" && item.summary !== null && !Array.isArray(item.summary)
      ? (item.summary as Record<string, unknown>)
      : null;

  return {
    id: item.id,
    sessionId: item.sessionId,
    interviewerType: item.interviewerType as InterviewRound["interviewerType"],
    interviewerConfig: normalizeInterviewerConfig(item.interviewerConfig),
    sortOrder: item.sortOrder,
    status: item.status,
    questionCount: item.questionCount,
    maxQuestions: item.maxQuestions,
    summary: summaryRecord
      ? {
          score:
            typeof summaryRecord.score === "number" ? summaryRecord.score : null,
          feedback: String(summaryRecord.feedback ?? ""),
        }
      : null,
    messages: item.messages.map(normalizeInterviewMessage),
    createdAtEpochMs: item.createdAtEpochMs,
    updatedAtEpochMs: item.updatedAtEpochMs,
  };
}

function normalizeInterviewReport(
  item: RawInterviewReportRecord,
): InterviewReport {
  return {
    id: item.id,
    sessionId: item.sessionId,
    overallScore: item.overallScore,
    summary: item.summary,
    overallFeedback: item.overallFeedback,
    improvementSuggestions: Array.isArray(item.improvementSuggestions)
      ? item.improvementSuggestions.filter((suggestion): suggestion is string => {
          return typeof suggestion === "string" && suggestion.trim().length > 0;
        })
      : [],
    createdAtEpochMs: item.createdAtEpochMs,
  };
}

function normalizeInterviewSession(
  item: RawInterviewSessionListItem,
): InterviewSession {
  return {
    id: item.id,
    resumeId: item.resumeId ?? null,
    resumeTitle: null,
    jobDescription: item.jobDescription,
    jobTitle: deriveInterviewTitle(item.jobTitle, item.jobDescription),
    selectedInterviewers: normalizeInterviewerConfigList(item.selectedInterviewers),
    currentRound: item.currentRound,
    status: item.status,
    reportId: null,
    reportOverallScore: item.overallScore ?? null,
    createdAtEpochMs: item.createdAtEpochMs,
    updatedAtEpochMs: item.updatedAtEpochMs,
  };
}

function normalizeInterviewSessionDetail(
  item: RawInterviewSessionDetail,
): InterviewSessionDetail {
  return {
    id: item.id,
    resumeId: item.resumeId ?? null,
    resumeTitle: null,
    jobDescription: item.jobDescription,
    jobTitle: deriveInterviewTitle(item.jobTitle, item.jobDescription),
    selectedInterviewers: normalizeInterviewerConfigList(item.selectedInterviewers),
    currentRound: item.currentRound,
    status: item.status,
    reportId: item.report?.id ?? null,
    reportOverallScore: item.report?.overallScore ?? null,
    createdAtEpochMs: item.createdAtEpochMs,
    updatedAtEpochMs: item.updatedAtEpochMs,
    rounds: item.rounds.map(normalizeInterviewRound),
    report: item.report ? normalizeInterviewReport(item.report) : null,
  };
}

function reportDesktopFallback(command: string, error: unknown): void {
  console.warn(`[desktop-api] Falling back for ${command}.`, error);
}

export const DESKTOP_AI_STREAM_EVENT = "desktop://ai-stream";

async function invokeWithFallback<T>(
  command: string,
  fallback: T,
  payload?: Record<string, unknown>,
): Promise<T> {
  try {
    return payload ? await invoke<T>(command, payload) : await invoke<T>(command);
  } catch (error) {
    reportDesktopFallback(command, error);
    return fallback;
  }
}

export async function openExternalUrl(
  url: string,
  app?: string | null,
): Promise<void> {
  const normalizedUrl = url.trim();
  if (normalizedUrl.length === 0) {
    throw new Error("Missing URL.");
  }

  if (isTauri()) {
    await invoke("plugin:opener|open_url", {
      url: normalizedUrl,
      with: app ?? null,
    });
    return;
  }

  if (typeof window !== "undefined") {
    const openedWindow = window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    if (openedWindow) {
      openedWindow.opener = null;
      return;
    }

    window.location.assign(normalizedUrl);
    return;
  }

  throw new Error("Unable to open URL in the current runtime.");
}

export async function restartApp(): Promise<void> {
  try {
    await relaunch();
  } catch {
    await invoke("restart_app");
  }
}

export function isBrowserFallbackRuntime(context: BootstrapContext): boolean {
  return context.runtimeMode === "browser_fallback";
}

export async function getBootstrapContext(): Promise<BootstrapContext> {
  return invokeWithFallback("get_bootstrap_context", FALLBACK_CONTEXT);
}

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  return invokeWithFallback("get_workspace_snapshot", FALLBACK_WORKSPACE);
}

export async function getDomainContractSummary(): Promise<DomainContractSummary> {
  return invokeWithFallback(
    "get_domain_contract_summary",
    FALLBACK_DOMAIN_CONTRACT,
  );
}

export async function getLegacyImportContract(): Promise<LegacyImportContract> {
  return invokeWithFallback(
    "get_legacy_import_contract",
    FALLBACK_LEGACY_IMPORT_CONTRACT,
  );
}

export async function getStorageSnapshot(): Promise<StorageSnapshot> {
  return invokeWithFallback("get_storage_snapshot", FALLBACK_STORAGE);
}

export async function listDocuments(): Promise<DesktopDocumentListItem[]> {
  return invokeWithFallback("list_documents", []);
}

export async function getDocument(
  documentId: string,
): Promise<DesktopDocumentDetail | null> {
  return invokeWithFallback("get_document", null, { documentId });
}

export async function createDocument(
  input: CreateDocumentInput,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("create_document", { input });
}

export async function updateDocumentMetadata(
  input: UpdateDocumentMetadataInput,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("update_document_metadata", { input });
}

export async function saveDocument(
  input: SaveDocumentInput,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("save_document", { input });
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  return invoke<boolean>("delete_document", { documentId });
}

export async function duplicateDocument(
  documentId: string,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("duplicate_document", { documentId });
}

export async function importDocument(
  input: ImportDocumentInput,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("import_document", { input });
}

export async function renameDocument(
  documentId: string,
  newTitle: string,
): Promise<DesktopDocumentDetail> {
  return invoke<DesktopDocumentDetail>("rename_document", {
    documentId,
    newTitle,
  });
}

export async function getWorkspaceSettingsSnapshot(): Promise<WorkspaceSettingsDocument> {
  return invokeWithFallback("get_workspace_settings_snapshot", FALLBACK_SETTINGS);
}

export async function getSecretVaultStatus(): Promise<SecretVaultStatus> {
  return invokeWithFallback("get_secret_vault_status", FALLBACK_VAULT_STATUS);
}

export async function getSecretInventorySnapshot(): Promise<SecretInventorySnapshot> {
  return invokeWithFallback(
    "get_secret_inventory_snapshot",
    FALLBACK_SECRET_INVENTORY,
  );
}

export async function getReleaseReadinessSnapshot(): Promise<ReleaseReadinessSnapshot> {
  return invokeWithFallback(
    "get_release_readiness_snapshot",
    FALLBACK_RELEASE_READINESS,
  );
}

export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  return invoke<AppUpdateCheckResult>("check_for_app_update");
}

export async function getImporterDryRun(): Promise<ImporterDryRunSnapshot> {
  return invokeWithFallback("get_importer_dry_run", FALLBACK_IMPORTER_DRY_RUN);
}

export async function getTemplateValidationSnapshot(): Promise<TemplateValidationSnapshot> {
  return invokeWithFallback(
    "get_template_validation_snapshot",
    FALLBACK_TEMPLATE_VALIDATION_SNAPSHOT,
  );
}

export async function executeImporterStaging(): Promise<ImporterDryRunSnapshot> {
  return invoke<ImporterDryRunSnapshot>("execute_importer_staging");
}

export async function executeImporterMigration(): Promise<ImporterDryRunSnapshot> {
  return invoke<ImporterDryRunSnapshot>("execute_importer_migration");
}

export async function writeTemplateValidationExport(
  input: TemplateValidationExportInput,
): Promise<TemplateValidationExportReceipt> {
  return invoke<TemplateValidationExportReceipt>(
    "write_template_validation_export",
    input,
  );
}

export async function writeExportFile(
  input: ExportFileWriteInput,
): Promise<TemplateValidationExportReceipt> {
  return invoke<TemplateValidationExportReceipt>("write_export_file", input);
}

export async function writePdfExport(
  input: PdfExportWriteInput,
): Promise<TemplateValidationExportReceipt> {
  return invoke<TemplateValidationExportReceipt>("write_pdf_export", input);
}

export async function updateAiProviderSettings(
  input: ProviderConfigUpdateInput,
): Promise<WorkspaceSettingsDocument> {
  return invoke<WorkspaceSettingsDocument>("update_ai_provider_settings", {
    input,
  });
}

export async function updateWorkspaceAppearanceSettings(
  input: WorkspaceAppearanceSettingsUpdateInput,
): Promise<WorkspaceSettingsDocument> {
  return invoke<WorkspaceSettingsDocument>("update_workspace_appearance_settings", {
    input,
  });
}

export async function writeSecretValue(
  input: SecretValueWriteInput,
): Promise<SecretInventorySnapshot> {
  return invoke<SecretInventorySnapshot>("write_secret_value", { input });
}

export async function readSecretValue(key: string): Promise<string | null> {
  return invoke<string | null>("read_secret_value", { key });
}

export async function getWebdavSyncStatus(): Promise<WebdavSyncStatus> {
  return invokeWithFallback(
    "get_webdav_sync_status",
    FALLBACK_WEBDAV_SYNC_STATUS,
  );
}

export async function updateWebdavSyncSettings(
  input: WebdavSettingsUpdateInput,
): Promise<WebdavSyncStatus> {
  return invoke<WebdavSyncStatus>("update_webdav_sync_settings", { input });
}

export async function testWebdavConnection(): Promise<WebdavConnectivityResult> {
  return invokeWithFallback<WebdavConnectivityResult>(
    "test_webdav_connection",
    {
      success: false,
      latencyMs: 0,
      errorMessage: "Desktop runtime not available",
    },
  );
}

export async function uploadWebdavSnapshot(
): Promise<WebdavSnapshotReceipt> {
  return invoke<WebdavSnapshotReceipt>("upload_webdav_snapshot");
}

export async function restoreWebdavSnapshot(
): Promise<WebdavRestoreReceipt> {
  return invoke<WebdavRestoreReceipt>("restore_webdav_snapshot");
}

export async function startAiPromptStream(
  input: StartAiPromptStreamInput,
): Promise<AiStreamStartReceipt> {
  return invoke<AiStreamStartReceipt>("start_ai_prompt_stream", { input });
}

export async function listInterviewSessions(): Promise<InterviewSession[]> {
  const sessions = await invokeWithFallback<RawInterviewSessionListItem[]>(
    "list_interview_sessions",
    [],
  );
  return sessions.map(normalizeInterviewSession);
}

export async function getInterviewSession(
  sessionId: string,
): Promise<InterviewSessionDetail | null> {
  const session = await invokeWithFallback<RawInterviewSessionDetail | null>(
    "get_interview_session",
    null,
    { sessionId },
  );
  return session ? normalizeInterviewSessionDetail(session) : null;
}

export async function createInterviewSession(
  input: CreateInterviewSessionInput,
): Promise<InterviewSessionDetail> {
  const payload = {
    input: {
      resumeId: input.resumeId ?? null,
      jobDescription: input.jobDescription,
      jobTitle: input.jobTitle,
      rounds: input.interviewers.map((interviewer) => ({
        interviewerType: interviewer.type,
        interviewerConfig: interviewer,
        maxQuestions: 8,
      })),
    },
  };
  console.log("createInterviewSession payload:", JSON.stringify(payload, null, 2));
  const detail = await invoke<RawInterviewSessionDetail>("create_interview_session", payload);

  return normalizeInterviewSessionDetail(detail);
}

export async function updateInterviewMessageMetadata(
  input: UpdateInterviewMessageMetadataInput,
): Promise<InterviewMessage> {
  const metadata: Record<string, boolean> = {};
  if (typeof input.marked === "boolean") {
    metadata.marked = input.marked;
  }
  if (typeof input.hinted === "boolean") {
    metadata.hinted = input.hinted;
  }
  if (typeof input.skipped === "boolean") {
    metadata.skipped = input.skipped;
  }

  const message = await invoke<RawInterviewMessageItem>(
    "update_interview_message_metadata",
    {
      input: {
        messageId: input.messageId,
        metadata,
      },
    },
  );

  return normalizeInterviewMessage(message);
}

export async function getInterviewReport(
  sessionId: string,
): Promise<InterviewReport | null> {
  const report = await invokeWithFallback<RawInterviewReportRecord | null>(
    "get_interview_report",
    null,
    { sessionId },
  );
  return report ? normalizeInterviewReport(report) : null;
}

export async function generateInterviewReport(
  input: GenerateInterviewReportInput,
): Promise<InterviewReport> {
  const report = await invoke<RawInterviewReportRecord>("generate_interview_report", {
    input,
  });
  return normalizeInterviewReport(report);
}

export async function startInterviewTurnStream(
  input: StartInterviewTurnStreamInput,
): Promise<AiStreamStartReceipt> {
  return invoke<AiStreamStartReceipt>("start_interview_turn_stream", {
    input: {
      sessionId: input.sessionId,
      roundId: input.roundId,
      kind: input.kind,
      message: input.prompt,
      provider: input.provider,
      model: input.model,
      baseUrl: input.baseUrl,
      requestId: input.requestId,
      locale: input.locale,
    },
  });
}

export interface FetchAiModelsInput {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface FetchAiModelsResult {
  provider: string;
  models: string[];
}

export interface ConnectivityTestResult {
  success: boolean;
  latencyMs: number;
  errorMessage: string | null;
}

export async function fetchAiModels(
  input: FetchAiModelsInput,
): Promise<FetchAiModelsResult> {
  return invokeWithFallback("fetch_ai_models", { provider: "", models: [] }, {
    input: {
      provider: input.provider ?? null,
      baseUrl: input.baseUrl ?? null,
      apiKey: input.apiKey ?? null,
    },
  });
}

export async function testAiConnectivity(
  provider?: string,
): Promise<ConnectivityTestResult> {
  return invokeWithFallback<ConnectivityTestResult>(
    "test_ai_connectivity",
    { success: false, latencyMs: 0, errorMessage: "Desktop runtime not available" },
    { provider: provider ?? null },
  );
}

export async function testExaConnectivity(): Promise<ConnectivityTestResult> {
  return invokeWithFallback<ConnectivityTestResult>(
    "test_exa_connectivity",
    { success: false, latencyMs: 0, errorMessage: "Desktop runtime not available" },
  );
}

export async function listenToAiStreamEvents(
  handler: (event: DesktopAiStreamEvent) => void,
): Promise<UnlistenFn> {
  try {
    return await listen<DesktopAiStreamEvent>(DESKTOP_AI_STREAM_EVENT, (event) => {
      handler(event.payload);
    });
  } catch (error) {
    reportDesktopFallback(DESKTOP_AI_STREAM_EVENT, error);
    return () => undefined;
  }
}

// ============================================================================
// Markdown Resume Parser
// ============================================================================

export interface ParseMarkdownResumeInput {
  content: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  locale?: string;
}

export interface ParsedResumeSection {
  sectionType: string;
  title: string;
  content: Record<string, unknown>;
}

export interface ParsedResumeData {
  title: string;
  template: string;
  language: string;
  sections: ParsedResumeSection[];
}

export async function parseMarkdownResume(
  input: ParseMarkdownResumeInput,
): Promise<ParsedResumeData> {
  return invoke<ParsedResumeData>("parse_markdown_resume", { input });
}

// ============================================================================
// PDF Resume Parser
// ============================================================================

export interface ParsePdfResumeInput {
  content: number[]; // PDF bytes as array
  provider?: string;
  model?: string;
  baseUrl?: string;
  locale?: string;
}

export async function parsePdfResume(
  input: ParsePdfResumeInput,
): Promise<ParsedResumeData> {
  return invoke<ParsedResumeData>("parse_pdf_resume", { input });
}
