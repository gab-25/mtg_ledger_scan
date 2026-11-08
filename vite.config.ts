/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Django (mtg_ledger) serves the build: assets under /static/scan/, index.html for every /scan/... URL.
// In development Vite serves the app and forwards everything else to `manage.py runserver` on :8000.
const django = "http://localhost:8000";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/static/scan/" : "/",
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(["/api", "/static", "/login", "/logout", "/account"].map((p) => [p, django])),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
}));
