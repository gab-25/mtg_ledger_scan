/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Django (mtg_ledger_core) serves the build: assets under /static/scan/, index.html for every /scan/... URL.
// In development Vite serves the app under /scan/ and forwards every other URL (collection, login, /api, /static…)
// to `manage.py runserver`, so the whole site works from the Vite address.
// `npm run dev:phone` (scripts/dev-phone.sh) publishes it on the tailnet over HTTPS for the phone.
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const django = `http://127.0.0.1:${env.DJANGO_PORT || "8000"}`;
  const phone = env.DEV_PHONE === "1";
  return {
    base: command === "build" ? "/static/scan/" : "/",
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: true,
      // Everything but the app (/scan/...) and Vite's own files goes to Django. Host and X-Forwarded-Proto
      // pass through untouched, so behind Tailscale Django sees the https://<pc>.ts.net address.
      proxy: { "^/(?!scan(?:/|$)|@|src/|node_modules/)": { target: django } },
      // Behind `tailscale serve`: accept the tailnet name and connect the live reload through port 443.
      ...(phone && { allowedHosts: [".ts.net"], hmr: { clientPort: 443 } }),
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
