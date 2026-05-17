import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const ROOT_PACKAGE_PATH = "package.json";
const DESKTOP_PACKAGE_PATH = "desktop/package.json";
const TAURI_CONFIG_PATH = "desktop/src-tauri/tauri.conf.json";
const TAURI_CARGO_PATH = "desktop/src-tauri/Cargo.toml";
const TAURI_ICON_PATH = "desktop/src-tauri/icons/icon.ico";
const CHECKLIST_CANDIDATES = [
  ".trellis/spec/guides/windows-release-smoke-checklist.md",
  ".trellis/tasks/03-29-desktop-hardening-release-readiness/windows-release-smoke-checklist.md",
  ".trellis/tasks/archive/2026-04/03-29-desktop-hardening-release-readiness/windows-release-smoke-checklist.md",
];

function resolveFromRoot(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(resolveFromRoot(relativePath), {
      encoding: "utf8",
    }),
  );
}

function readText(relativePath) {
  return fs.readFileSync(resolveFromRoot(relativePath), {
    encoding: "utf8",
  });
}

function fileExists(relativePath) {
  return fs.existsSync(resolveFromRoot(relativePath));
}

function resolveChecklistPath() {
  return CHECKLIST_CANDIDATES.find((candidate) => fileExists(candidate))
    ?? CHECKLIST_CANDIDATES[0];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function hasCargoDependency(cargoText, crateName) {
  const pattern = new RegExp(`^\\s*${escapeRegex(crateName)}\\s*=`, "mu");
  return pattern.test(cargoText);
}

function hasDesktopDependency(packageJson, dependencyName) {
  return Boolean(
    packageJson.dependencies?.[dependencyName] ??
      packageJson.devDependencies?.[dependencyName],
  );
}

function getUpdaterArtifactsMode(tauriConfig) {
  const value = tauriConfig.bundle?.createUpdaterArtifacts;
  if (value === true) {
    return "current";
  }
  if (value === "v1Compatible") {
    return "v1Compatible";
  }
  return "disabled";
}

function getUpdaterConfig(tauriConfig) {
  return tauriConfig.plugins && typeof tauriConfig.plugins === "object"
    ? tauriConfig.plugins.updater ?? null
    : null;
}

function getUpdaterEndpointCount(updaterConfig) {
  return Array.isArray(updaterConfig?.endpoints)
    ? updaterConfig.endpoints.filter(
        (endpoint) => typeof endpoint === "string" && endpoint.trim().length > 0,
      ).length
    : 0;
}

function hasUpdaterPubkey(updaterConfig) {
  return typeof updaterConfig?.pubkey === "string" && updaterConfig.pubkey.trim().length > 0;
}

function usesInsecureUpdaterTransport(updaterConfig) {
  return updaterConfig?.dangerousInsecureTransportProtocol === true;
}

function usesLocalUpdaterEndpoint(updaterConfig) {
  return Array.isArray(updaterConfig?.endpoints)
    && updaterConfig.endpoints.some(
      (endpoint) => typeof endpoint === "string"
        && /(127\.0\.0\.1|localhost)/iu.test(endpoint),
    );
}

function formatStatus(status) {
  switch (status) {
    case "pass":
      return "PASS";
    case "warn":
      return "WARN";
    default:
      return "FAIL";
  }
}

function collectChecks() {
  const rootPackage = readJson(ROOT_PACKAGE_PATH);
  const desktopPackage = readJson(DESKTOP_PACKAGE_PATH);
  const tauriConfig = readJson(TAURI_CONFIG_PATH);
  const tauriCargo = readText(TAURI_CARGO_PATH);
  const checklistPath = resolveChecklistPath();
  const updaterConfig = getUpdaterConfig(tauriConfig);
  const updaterEndpointCount = getUpdaterEndpointCount(updaterConfig);
  const updaterPubkeyConfigured = hasUpdaterPubkey(updaterConfig);
  const updaterArtifactsMode = getUpdaterArtifactsMode(tauriConfig);
  const updaterInsecureTransport = usesInsecureUpdaterTransport(updaterConfig);
  const updaterLocalEndpoint = usesLocalUpdaterEndpoint(updaterConfig);

  return [
    {
      status:
        tauriConfig.bundle && typeof tauriConfig.bundle.active === "boolean"
          ? tauriConfig.bundle.active
            ? "pass"
            : "fail"
          : "fail",
      label: "Tauri bundle.active is enabled",
      detail: `desktop/src-tauri/tauri.conf.json -> bundle.active = ${String(
        tauriConfig.bundle?.active,
      )}`,
    },
    {
      status: rootPackage.scripts?.["build:tauri"] ? "pass" : "fail",
      label: "Root package exposes Windows build entrypoint",
      detail: 'Expected root script `build:tauri`.',
    },
    {
      status: rootPackage.scripts?.["verify:desktop:migration"] ? "pass" : "fail",
      label: "Root package exposes migration verification gate",
      detail: 'Expected root script `verify:desktop:migration`.',
    },
    {
      status: desktopPackage.scripts?.["tauri:build"] ? "pass" : "fail",
      label: "Desktop package exposes tauri build command",
      detail: 'Expected desktop script `tauri:build`.',
    },
    {
      status: fileExists(TAURI_ICON_PATH) ? "pass" : "fail",
      label: "Windows desktop icon asset exists",
      detail: `Expected icon at ${TAURI_ICON_PATH}.`,
    },
    {
      status: fileExists("desktop/src-tauri/icons/icon.icns") ? "pass" : "warn",
      label: "macOS desktop icon asset exists",
      detail: "Expected icon at desktop/src-tauri/icons/icon.icns.",
    },
    {
      status: fileExists("desktop/src-tauri/entitlements/macOS.entitlements") ? "pass" : "warn",
      label: "macOS entitlements file exists",
      detail: "Expected entitlements at desktop/src-tauri/entitlements/macOS.entitlements.",
    },
    {
      status: fileExists(checklistPath) ? "pass" : "fail",
      label: "Windows release smoke checklist exists",
      detail: `Expected checklist at ${checklistPath}.`,
    },
    {
      status: hasCargoDependency(tauriCargo, "tauri-plugin-updater")
        ? "pass"
        : "fail",
      label: "Rust updater plugin dependency is wired",
      detail: "Expected `tauri-plugin-updater` in desktop/src-tauri/Cargo.toml.",
    },
    {
      status: hasDesktopDependency(desktopPackage, "@tauri-apps/plugin-updater")
        ? "pass"
        : "warn",
      label: "Renderer updater dependency is present when a user-facing update surface is needed",
      detail:
        "Desktop package currently does not depend on `@tauri-apps/plugin-updater`.",
    },
    {
      status:
        updaterConfig
          ? "pass"
          : "fail",
      label: "Tauri updater config is declared",
      detail:
        "Expected updater plugin configuration under desktop/src-tauri/tauri.conf.json.",
    },
    {
      status: updaterArtifactsMode !== "disabled" ? "pass" : "fail",
      label: "Bundle is configured to create updater artifacts",
      detail: `desktop/src-tauri/tauri.conf.json -> bundle.createUpdaterArtifacts = ${JSON.stringify(
        tauriConfig.bundle?.createUpdaterArtifacts ?? false,
      )}`,
    },
    {
      status: updaterEndpointCount > 0 ? "pass" : "fail",
      label: "Updater endpoint feed is configured",
      detail: `Configured updater endpoints: ${updaterEndpointCount}.`,
    },
    {
      status: updaterPubkeyConfigured ? "pass" : "fail",
      label: "Updater signing pubkey is configured",
      detail: "Expected a non-empty updater pubkey in desktop/src-tauri/tauri.conf.json.",
    },
    {
      status: fileExists("scripts/build-local-updater-feed.mjs") ? "pass" : "warn",
      label: "Local updater feed generation script exists",
      detail: "Expected scripts/build-local-updater-feed.mjs for local updater smoke.",
    },
    {
      status: fileExists("scripts/serve-local-updater-feed.mjs") ? "pass" : "warn",
      label: "Local updater feed server script exists",
      detail: "Expected scripts/serve-local-updater-feed.mjs for local updater smoke.",
    },
    {
      status: updaterInsecureTransport ? "warn" : "pass",
      label: "Updater transport posture",
      detail: updaterInsecureTransport
        ? "Updater feed currently allows insecure HTTP for local smoke."
        : "Updater feed uses secure transport requirements.",
    },
    {
      status: updaterLocalEndpoint ? "warn" : "pass",
      label: "Updater endpoint scope",
      detail: updaterLocalEndpoint
        ? "Updater endpoint currently targets localhost for local smoke."
        : "Updater endpoint is configured as a hosted feed.",
    },
    {
      status: "warn",
      label: "Packaged Windows smoke remains manual",
      detail: `Use ${checklistPath} after \`pnpm run build:tauri\` to record installer/unpacked smoke results.`,
    },
  ];
}

function printUsage() {
  console.log(`Usage:
  node scripts/verify-desktop-release-readiness.mjs report
  node scripts/verify-desktop-release-readiness.mjs check`);
}

const mode = process.argv[2] ?? "report";

if (!["report", "check"].includes(mode)) {
  console.error(
    `[verify-desktop-release-readiness] Unknown mode: ${mode}`,
  );
  printUsage();
  process.exit(1);
}

const checks = collectChecks();
const failures = checks.filter((check) => check.status === "fail");
const warnings = checks.filter((check) => check.status === "warn");
const checklistPath = resolveChecklistPath();

console.log("[verify-desktop-release-readiness] Windows desktop release status");
for (const check of checks) {
  console.log(
    `- ${formatStatus(check.status)} ${check.label}: ${check.detail}`,
  );
}

console.log(
  `\n[verify-desktop-release-readiness] Summary: ${checks.length - failures.length - warnings.length} pass, ${warnings.length} warn, ${failures.length} fail.`,
);
console.log(
  `[verify-desktop-release-readiness] Manual smoke checklist: ${checklistPath}`,
);

if (mode === "check" && failures.length > 0) {
  process.exit(1);
}
