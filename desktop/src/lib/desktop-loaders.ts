import {
  getDocument,
  getDomainContractSummary,
  getImporterDryRun,
  getInterviewReport,
  getInterviewSession,
  getLegacyImportContract,
  listDocuments,
  listInterviewSessions,
  getReleaseReadinessSnapshot,
  getSecretInventorySnapshot,
  getSecretVaultStatus,
  getStorageSnapshot,
  getTemplateValidationSnapshot,
  getWorkspaceSettingsSnapshot,
  getWorkspaceSnapshot,
  type DesktopDocumentListItem,
  type DomainContractSummary,
  type ImporterDryRunSnapshot,
  type ProviderRuntimeContract,
  type SecretVaultStatus,
  type StorageSnapshot,
  type TemplateValidationSnapshot,
  type WorkspaceSettingsDocument,
  type WorkspaceSnapshot,
  type LegacyImportContract,
  type ReleaseReadinessSnapshot,
  type SecretInventorySnapshot,
  type WebdavSyncStatus,
} from "./desktop-api";
import type {
  InterviewReport,
  InterviewSession,
  InterviewSessionDetail,
} from "../types/interview";

export interface HomeRouteData {
  workspace: WorkspaceSnapshot;
  storage: StorageSnapshot;
  settings: WorkspaceSettingsDocument;
  domainContract: DomainContractSummary;
  importContract: LegacyImportContract;
  importer: ImporterDryRunSnapshot;
}

export interface LibraryRouteData {
  workspace: WorkspaceSnapshot;
  storage: StorageSnapshot;
  domainContract: DomainContractSummary;
  importContract: LegacyImportContract;
  templateValidation: TemplateValidationSnapshot;
}

export interface ImportsRouteData {
  workspace: WorkspaceSnapshot;
  importer: ImporterDryRunSnapshot;
  importContract: LegacyImportContract;
}

export interface SettingsRouteData {
  workspace: WorkspaceSnapshot;
  settings: WorkspaceSettingsDocument;
  vault: SecretVaultStatus;
  secretInventory: SecretInventorySnapshot;
  domainContract: DomainContractSummary;
  releaseReadiness: ReleaseReadinessSnapshot;
}

export interface InterviewLobbyRouteData {
  sessions: InterviewSession[];
}

export interface InterviewSetupRouteData {
  resumes: DesktopDocumentListItem[];
}

export interface InterviewSessionRouteData {
  session: InterviewSessionDetail | null;
}

export interface InterviewReportRouteData {
  session: InterviewSessionDetail | null;
  report: InterviewReport | null;
}

export interface ProviderRegistryEntry {
  provider: string;
  model: string;
  baseUrl: string;
  secretKey: string | null;
  isDefault: boolean;
}

export function countTableRows(storage: StorageSnapshot, table: string): number {
  return storage.tableCounts.find((entry) => entry.table === table)?.rowCount ?? 0;
}

export function getDetectedLegacySources(workspace: WorkspaceSnapshot) {
  return workspace.legacySources.filter((source) => source.exists);
}

export function getProviderRegistryEntries(
  settings: WorkspaceSettingsDocument,
  domainContract: DomainContractSummary,
): ProviderRegistryEntry[] {
  const contractByProvider = new Map<string, ProviderRuntimeContract>(
    domainContract.defaultSettings.ai.providers.map((provider) => [
      provider.provider,
      provider,
    ]),
  );
  const providerNames = new Set<string>([
    ...Object.keys(settings.ai.providerConfigs),
    ...contractByProvider.keys(),
  ]);

  return Array.from(providerNames)
    .sort((left, right) => left.localeCompare(right))
    .map((provider) => {
      const configured = settings.ai.providerConfigs[provider];
      const contract = contractByProvider.get(provider);

      return {
        provider,
        model: configured?.model ?? contract?.model ?? "unconfigured",
        baseUrl: configured?.baseUrl ?? contract?.baseUrl ?? "",
        secretKey: contract?.apiKeySecretKey ?? null,
        isDefault: settings.ai.defaultProvider === provider,
      };
    });
}

function attachInterviewResumeTitles(
  sessions: InterviewSession[],
  resumes: DesktopDocumentListItem[],
): InterviewSession[] {
  const resumeTitleById = new Map(
    resumes.map((resume) => [resume.id, resume.title] as const),
  );

  return sessions.map((session) => ({
    ...session,
    resumeTitle: session.resumeId
      ? resumeTitleById.get(session.resumeId) ?? null
      : null,
  }));
}

function attachInterviewSessionResumeTitle(
  session: InterviewSessionDetail | null,
  resumeTitle?: string | null,
): InterviewSessionDetail | null {
  if (!session) {
    return null;
  }

  return {
    ...session,
    resumeTitle: session.resumeId ? resumeTitle ?? null : null,
  };
}

export async function loadHomeRouteData(): Promise<HomeRouteData> {
  const [workspace, storage, settings, domainContract, importContract, importer] =
    await Promise.all([
      getWorkspaceSnapshot(),
      getStorageSnapshot(),
      getWorkspaceSettingsSnapshot(),
      getDomainContractSummary(),
      getLegacyImportContract(),
      getImporterDryRun(),
    ]);

  return {
    workspace,
    storage,
    settings,
    domainContract,
    importContract,
    importer,
  };
}

export async function loadLibraryRouteData(): Promise<LibraryRouteData> {
  const [workspace, storage, domainContract, importContract, templateValidation] =
    await Promise.all([
    getWorkspaceSnapshot(),
    getStorageSnapshot(),
    getDomainContractSummary(),
    getLegacyImportContract(),
    getTemplateValidationSnapshot(),
  ]);

  return {
    workspace,
    storage,
    domainContract,
    importContract,
    templateValidation,
  };
}

export async function loadImportsRouteData(): Promise<ImportsRouteData> {
  const [workspace, importer, importContract] = await Promise.all([
    getWorkspaceSnapshot(),
    getImporterDryRun(),
    getLegacyImportContract(),
  ]);

  return { workspace, importer, importContract };
}

export async function loadSettingsRouteData(): Promise<SettingsRouteData> {
  const [
    workspace,
    settings,
    vault,
    secretInventory,
    domainContract,
    releaseReadiness,
  ] = await Promise.all([
    getWorkspaceSnapshot(),
    getWorkspaceSettingsSnapshot(),
    getSecretVaultStatus(),
    getSecretInventorySnapshot(),
    getDomainContractSummary(),
    getReleaseReadinessSnapshot(),
  ]);

  return {
    workspace,
    settings,
    vault,
    secretInventory,
    domainContract,
    releaseReadiness,
  };
}

export async function loadInterviewLobbyRouteData(): Promise<InterviewLobbyRouteData> {
  const [sessions, resumes] = await Promise.all([
    listInterviewSessions(),
    listDocuments(),
  ]);

  return {
    sessions: attachInterviewResumeTitles(sessions, resumes),
  };
}

export async function loadInterviewSetupRouteData(): Promise<InterviewSetupRouteData> {
  const resumes = await listDocuments();
  return { resumes };
}

export async function loadInterviewSessionRouteData(
  sessionId: string,
): Promise<InterviewSessionRouteData> {
  const session = await getInterviewSession(sessionId);
  const resume = session?.resumeId ? await getDocument(session.resumeId) : null;

  return {
    session: attachInterviewSessionResumeTitle(session, resume?.title ?? null),
  };
}

export async function loadInterviewReportRouteData(
  sessionId: string,
): Promise<InterviewReportRouteData> {
  const [session, report] = await Promise.all([
    getInterviewSession(sessionId),
    getInterviewReport(sessionId),
  ]);
  const resume = session?.resumeId ? await getDocument(session.resumeId) : null;

  return {
    session: attachInterviewSessionResumeTitle(session, resume?.title ?? null),
    report,
  };
}
