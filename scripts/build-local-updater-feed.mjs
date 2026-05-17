import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const feedDir = path.join(ROOT, "desktop", "dev-updater");
const artifactsDir = path.join(feedDir, "artifacts");
const latestJsonPath = path.join(feedDir, "latest.json");
const tauriConfigPath = path.join(ROOT, "desktop", "src-tauri", "tauri.conf.json");
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
const explicitBundleDir = process.env.DESKTOP_TAURI_BUNDLE_DIR?.trim();
const bundleDirCandidates = [
  explicitBundleDir,
  path.join(ROOT, ".codex-cargo-target", "desktop-tauri", "release", "bundle"),
  path.join(ROOT, "desktop", "src-tauri", "target", "release", "bundle"),
].filter((value) => typeof value === "string" && value.length > 0);
const bundleDir = bundleDirCandidates.find((candidate) => fs.existsSync(candidate));
const supportedArtifactExtensions = [".zip", ".exe", ".msi", ".dmg"];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

if (!bundleDir) {
  console.error(
    `[build-local-updater-feed] Bundle directory not found. Checked: ${bundleDirCandidates.join(", ")}. Run pnpm run build:tauri first.`,
  );
  process.exit(1);
}

const candidates = walk(bundleDir)
  .filter((filePath) =>
    supportedArtifactExtensions.some((extension) => filePath.endsWith(extension)),
  )
  .map((artifactPath) => ({
    artifactPath,
    sigPath: `${artifactPath}.sig`,
    stat: fs.statSync(artifactPath),
  }))
  .filter((entry) => fs.existsSync(entry.sigPath));

if (candidates.length === 0) {
  console.error(
    "[build-local-updater-feed] No signed updater artifact (.exe/.msi/.zip + .sig) was found under desktop/src-tauri/target/release/bundle.",
  );
  process.exit(1);
}

const preferred = candidates.sort((left, right) => {
  const score = (artifactPath) => {
    const extension = path.extname(artifactPath).toLowerCase();
    const normalized = artifactPath.toLowerCase();
    if (normalized.includes("nsis") && extension === ".exe") {
      return 4;
    }
    if (extension === ".dmg") {
      return 4;
    }
    if (normalized.includes("msi") && extension === ".msi") {
      return 3;
    }
    if (extension === ".zip") {
      return 2;
    }
    return 1;
  };
  const scoreDiff = score(right.artifactPath) - score(left.artifactPath);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return right.stat.mtimeMs - left.stat.mtimeMs;
})[0];

fs.mkdirSync(artifactsDir, { recursive: true });

const artifactName = path.basename(preferred.artifactPath);
const signatureName = path.basename(preferred.sigPath);
const artifactTargetPath = path.join(artifactsDir, artifactName);
const signatureTargetPath = path.join(artifactsDir, signatureName);

fs.copyFileSync(preferred.artifactPath, artifactTargetPath);
fs.copyFileSync(preferred.sigPath, signatureTargetPath);

const signature = fs.readFileSync(preferred.sigPath, "utf8").trim();
const baseUrl =
  process.env.DESKTOP_UPDATER_FEED_BASE_URL ?? "http://127.0.0.1:8765/artifacts";
const target = process.env.DESKTOP_UPDATER_TARGET?.trim()
  || (process.platform === "darwin"
    ? (process.arch === "arm64" ? "darwin-aarch64" : "darwin-x86_64")
    : "windows-x86_64");
const latestJson = {
  version: tauriConfig.version,
  notes: "Local updater smoke-test feed for RoleRover Desktop.",
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      url: `${baseUrl}/${encodeURIComponent(artifactName)}`,
      signature,
    },
  },
};

fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2));

console.log("[build-local-updater-feed] Feed generated successfully");
console.log(`- Artifact: ${artifactTargetPath}`);
console.log(`- Signature: ${signatureTargetPath}`);
console.log(`- Feed: ${latestJsonPath}`);
