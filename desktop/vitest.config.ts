import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Vitest config for the desktop frontend.
//
// Reuses the Vite alias so `@/` resolves to the shared `../src/` directory,
// matching the renderer's module resolution. Tests live alongside the modules
// they exercise (e.g. `desktop/src/lib/__tests__/skill-runtime.test.ts`) and
// are excluded from the production `tsc -b` build via this config — Vitest
// handles its own transpilation.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
});
