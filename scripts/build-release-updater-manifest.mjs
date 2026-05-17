import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { collectReleaseNotes } from "./release-notes-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const TAURI_CONFIG_PATH = path.join(ROOT, "desktop", "src-tauri", "tauri.conf.json");
const DEFAULT_OUTPUT_PATH = path.join(
  ROOT,
  "desktop",
  ".codex-temp",
  "release-assets",
  "latest.json",
);
const releaseTag =
  process.env.RELEASE_TAG?.trim() || process.env.GITHUB_REF_NAME?.trim() || "";
const repository = process.env.GITHUB_REPOSITORY?.trim() || "";
const outputPath = path.resolve(
  ROOT,
  process.env.RELEASE_UPDATER_MANIFEST_OUTPUT?.trim() || DEFAULT_OUTPUT_PATH,
);
const explicitBundleDir = process.env.DESKTOP_TAURI_BUNDLE_DIR?.trim();
const bundleDirCandidates = [
  explicitBundleDir,
  path.join(ROOT, ".codex-cargo-target", "desktop-tauri", "release", "bundle"),
  path.join(ROOT, "desktop", "src-tauri", "target", "release", "bundle"),
].filter((value) => typeof value === "string" && value.length > 0);
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

function scoreArtifact(artifactPath) {
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
}

if (!/^v.+/u.test(releaseTag)) {
  throw new Error(
    "RELEASE_TAG (or GITHUB_REF_NAME) must be set to a tag like v1.2.3 before building latest.json.",
  );
}

if (!/^[^/]+\/[^/]+$/u.test(repository)) {
  throw new Error(
    "GITHUB_REPOSITORY must be set to <owner>/<repo> before building latest.json.",
  );
}

const bundleDir = bundleDirCandidates.find((candidate) => fs.existsSync(candidate));
if (!bundleDir) {
  throw new Error(
    `No Tauri bundle directory was found. Checked: ${bundleDirCandidates.join(", ")}`,
  );
}

const tauriConfig = JSON.parse(fs.readFileSync(TAURI_CONFIG_PATH, "utf8"));
const versionFromTag = releaseTag.replace(/^v/u, "");
if (tauriConfig.version !== versionFromTag) {
  throw new Error(
    `Tag ${releaseTag} does not match desktop/src-tauri/tauri.conf.json version ${tauriConfig.version}.`,
  );
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
  throw new Error(
    `No signed updater artifact (.exe/.msi/.zip + .sig) was found under ${bundleDir}.`,
  );
}

const preferred = candidates.sort((left, right) => {
  const scoreDiff = scoreArtifact(right.artifactPath) - scoreArtifact(left.artifactPath);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return right.stat.mtimeMs - left.stat.mtimeMs;
})[0];

const artifactName = path.basename(preferred.artifactPath);
const signature = fs.readFileSync(preferred.sigPath, "utf8").trim();
const target = process.env.DESKTOP_UPDATER_TARGET?.trim()
  || (process.platform === "darwin"
    ? (process.arch === "arm64" ? "darwin-aarch64" : "darwin-x86_64")
    : "windows-x86_64");
const downloadUrl = `https://github.com/${repository}/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(artifactName.replace(/ /g, "."))}`;
const releaseNotes = collectReleaseNotes(ROOT, releaseTag, repository);

const latestJson = {
  version: versionFromTag,
  notes: releaseNotes.body,
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      url: downloadUrl,
      signature,
    },
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(latestJson, null, 2)}\n`);

console.log("[build-release-updater-manifest] Draft release updater manifest generated");
console.log(`- Bundle directory: ${bundleDir}`);
console.log(`- Artifact: ${preferred.artifactPath}`);
console.log(`- Manifest: ${outputPath}`);
