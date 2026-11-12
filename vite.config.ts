/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

// Django (mtg_ledger_core) serves the build: assets under /static/ui/, index.html for every page URL.
// In development Vite serves every page and forwards /api/, /admin/, /static/ and /favicon.ico to
// `manage.py runserver`, so the whole site works from the Vite address.
// `npm run dev:phone` (scripts/dev-phone.sh) publishes it on the tailnet over HTTPS for the phone.
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  // The backend: the local runserver by default, or another one (e.g. production).
  const django = (env.DJANGO_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const remote = !["localhost", "127.0.0.1", "[::1]"].includes(new URL(django).hostname);
  const phone = env.DEV_PHONE === "1";
  const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
  return {
    base: command === "build" ? "/static/ui/" : "/",
    plugins: [react(), tailwindcss()],
    // The app version (package.json), shown at the bottom of the sidebar.
    define: { __APP_VERSION__: JSON.stringify(version) },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: true,
      // Django's URLs; every other one is a page of this app. Host and X-Forwarded-Proto pass through
      // untouched, so behind Tailscale Django sees the https://<pc>.ts.net address.
      proxy: {
        "^/(api|admin|static)(/|$)|^/favicon\\.ico$": {
          target: django,
          // A remote Django checks Host, Origin and Referer (CSRF): make them its own, and keep its
          // cookies (session, csrftoken) on the Vite address.
          ...(remote && {
            changeOrigin: true,
            cookieDomainRewrite: "",
            headers: { Origin: django, Referer: `${django}/` },
          }),
        },
      },
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
