import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DESKTOP_DIR = path.join(ROOT, "desktop");
const TAURI_MODE = process.argv[2];
const TAURI_BIN = process.platform === "win32"
  ? path.join(DESKTOP_DIR, "node_modules", ".bin", "tauri.CMD")
  : path.join(DESKTOP_DIR, "node_modules", ".bin", "tauri");

if (TAURI_MODE !== "dev" && TAURI_MODE !== "build") {
  console.error(
    "[run-tauri-cli] Expected first argument to be `dev` or `build`.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  CARGO_TARGET_DIR:
    process.env.CARGO_TARGET_DIR
    || path.join(ROOT, ".codex-cargo-target", "desktop-tauri"),
};

if (process.platform === "win32" && !process.env.CARGO_BUILD_JOBS) {
  // Keep Tauri dev/build below Windows pagefile pressure during local native compilation.
  env.CARGO_BUILD_JOBS = "1";
}

// pnpm injects a `--` separator when forwarding script arguments (npm does not),
// so drop a leading separator before handing arguments to the Tauri CLI.
const forwardedArgs = process.argv.slice(3);
const args = [
  TAURI_MODE,
  ...(forwardedArgs[0] === "--" ? forwardedArgs.slice(1) : forwardedArgs),
];

function toPowerShellLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const child = process.platform === "win32"
  ? spawn("powershell.exe", [
      "-NoProfile",
      "-Command",
      `& ${toPowerShellLiteral(TAURI_BIN)} ${args.map(toPowerShellLiteral).join(" ")}`,
    ], {
      cwd: DESKTOP_DIR,
      env,
      stdio: "inherit",
    })
  : spawn(TAURI_BIN, args, {
      cwd: DESKTOP_DIR,
      env,
      stdio: "inherit",
    });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
