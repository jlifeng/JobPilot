import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = process.argv[2];
const outputPath = process.argv[3];

if (!inputDir || !outputPath) {
  console.error(
    "[merge-updater-manifests] Usage: node merge-updater-manifests.mjs <input-dir> <output-path>",
  );
  process.exit(1);
}

const manifestFiles = fs
  .readdirSync(inputDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => path.join(inputDir, name));

if (manifestFiles.length === 0) {
  console.error("[merge-updater-manifests] No manifest JSON files found in input directory.");
  process.exit(1);
}

const manifests = manifestFiles.map((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
});

const versions = new Set(manifests.map((m) => m.version));
if (versions.size > 1) {
  console.error(
    `[merge-updater-manifests] Version mismatch across manifests: ${[...versions].join(", ")}`,
  );
  process.exit(1);
}

const merged = {
  version: manifests[0].version,
  notes: manifests.reduce((longest, m) => (m.notes?.length > (longest?.length ?? 0) ? m.notes : longest), ""),
  pub_date: manifests.reduce((latest, m) => (m.pub_date > latest ? m.pub_date : latest), manifests[0].pub_date),
  platforms: {},
};

for (const manifest of manifests) {
  if (manifest.platforms && typeof manifest.platforms === "object") {
    Object.assign(merged.platforms, manifest.platforms);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);

const platformList = Object.keys(merged.platforms).join(", ");
console.log(`[merge-updater-manifests] Merged ${manifests.length} manifest(s) -> ${outputPath}`);
console.log(`[merge-updater-manifests] Platforms: ${platformList}`);
console.log(`[merge-updater-manifests] Version: ${merged.version}`);
