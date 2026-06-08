import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const defaultKeyPath = path.join(ROOT, "desktop", ".tauri", "updater.key");
const localEnvPath = path.join(ROOT, ".env.local");

function readLocalEnvValue(key) {
  if (!existsSync(localEnvPath)) {
    return undefined;
  }

  const lines = readFileSync(localEnvPath, "utf8").split(/\r?\n/gu);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();
    if (name !== key) {
      continue;
    }

    let value = line.slice(separatorIndex + 1);
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

const env = { ...process.env };
for (const key of [
  "TAURI_SIGNING_PRIVATE_KEY",
  "TAURI_SIGNING_PRIVATE_KEY_PATH",
  "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
  "TAURI_PRIVATE_KEY",
  "TAURI_PRIVATE_KEY_PATH",
  "TAURI_PRIVATE_KEY_PASSWORD",
]) {
  if (!env[key]) {
    const localValue = readLocalEnvValue(key);
    if (typeof localValue === "string" && localValue.length > 0) {
      env[key] = localValue;
    }
  }
}
if (!env.CI) {
  env.CI = "true";
}
if (!env.TAURI_SIGNING_PRIVATE_KEY && env.TAURI_PRIVATE_KEY) {
  env.TAURI_SIGNING_PRIVATE_KEY = env.TAURI_PRIVATE_KEY;
}
if (!env.TAURI_SIGNING_PRIVATE_KEY_PATH && env.TAURI_PRIVATE_KEY_PATH) {
  env.TAURI_SIGNING_PRIVATE_KEY_PATH = env.TAURI_PRIVATE_KEY_PATH;
}
if (
  !env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  && env.TAURI_PRIVATE_KEY_PASSWORD
) {
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = env.TAURI_PRIVATE_KEY_PASSWORD;
}

const configuredKeyPath = firstDefined(
  env.TAURI_SIGNING_PRIVATE_KEY_PATH?.trim(),
  env.TAURI_PRIVATE_KEY_PATH?.trim(),
  defaultKeyPath,
);
const shouldLoadKeyFromFile = !env.TAURI_SIGNING_PRIVATE_KEY;
const tauriBuildArgs = process.argv.slice(2);

if (!existsSync(configuredKeyPath) && shouldLoadKeyFromFile) {
  console.error(
    "[build-tauri-desktop] Missing updater signing key. Provide TAURI_SIGNING_PRIVATE_KEY(_PATH) or place the private key at desktop/.tauri/updater.key.",
  );
  process.exit(1);
}

if (shouldLoadKeyFromFile) {
  env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(configuredKeyPath, "utf8").trim();
  env.TAURI_SIGNING_PRIVATE_KEY_PATH = configuredKeyPath;
  console.log(
    `[build-tauri-desktop] Loaded updater signing key from ${configuredKeyPath}`,
  );
}

env.TAURI_PRIVATE_KEY = env.TAURI_SIGNING_PRIVATE_KEY;
env.TAURI_PRIVATE_KEY_PATH = env.TAURI_SIGNING_PRIVATE_KEY_PATH;

if (env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  env.TAURI_PRIVATE_KEY_PASSWORD = env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
} else if (configuredKeyPath === defaultKeyPath) {
  // The checked local smoke key is expected to use an empty password.
  // Setting it explicitly avoids the Tauri CLI waiting on an interactive prompt.
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "";
  env.TAURI_PRIVATE_KEY_PASSWORD = "";
  env.CI ??= "true";
}

const child = (() => {
  if (process.platform === "win32") {
    const scriptParts = [];
    const tauriBuildCommand = [
      "& npm.cmd --prefix desktop run tauri:build --",
      ...tauriBuildArgs.map((arg) => toPowerShellLiteral(arg)),
    ].join(" ");

    if (shouldLoadKeyFromFile) {
      const escapedKeyPath = configuredKeyPath.replace(/'/gu, "''");
      scriptParts.push(
        `$env:TAURI_SIGNING_PRIVATE_KEY_PATH='${escapedKeyPath}'`,
        `$env:TAURI_SIGNING_PRIVATE_KEY=[System.IO.File]::ReadAllText('${escapedKeyPath}').Trim()`,
      );
    }

    scriptParts.push(
      "if ($env:TAURI_PRIVATE_KEY_PASSWORD -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $env:TAURI_PRIVATE_KEY_PASSWORD }",
      "$env:TAURI_PRIVATE_KEY=$env:TAURI_SIGNING_PRIVATE_KEY",
      "$env:TAURI_PRIVATE_KEY_PATH=$env:TAURI_SIGNING_PRIVATE_KEY_PATH",
      "if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = '' }",
      "if ($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { $env:TAURI_PRIVATE_KEY_PASSWORD = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD }",
      "if (-not $env:TAURI_PRIVATE_KEY_PASSWORD) { $env:TAURI_PRIVATE_KEY_PASSWORD = '' }",
      "if (-not $env:CI) { $env:CI = 'true' }",
      tauriBuildCommand,
    );

    const script = scriptParts.join("; ");

    return spawn("powershell.exe", ["-NoProfile", "-Command", script], {
      cwd: ROOT,
      env: shouldLoadKeyFromFile
        ? {
            ...env,
            TAURI_SIGNING_PRIVATE_KEY: undefined,
            TAURI_PRIVATE_KEY: undefined,
          }
        : env,
      stdio: "inherit",
    });
  }

  return spawn("npm", [
    "--prefix",
    "desktop",
    "run",
    "tauri:build",
    "--",
    ...tauriBuildArgs,
  ], {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });
})();

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
