import { defineConfig, type ViteDevServer, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import type { OutputBundle } from "rollup";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

import { sitemapPlugin } from "./vite-plugin-sitemap";
import { prerenderPlugin } from "./vite-plugin-prerender";
import { indexNowPlugin } from "./vite-plugin-indexnow";
import { feedsPlugin } from "./vite-plugin-feeds";
import { ogImagesPlugin } from "./vite-plugin-og-images";
import { seoValidatePlugin } from "./vite-plugin-seo-validate";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { partytownVite } from "@builder.io/partytown/utils";

function repairDiagPlugin(): Plugin {
  return {
    name: "repair-diag",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/__repair_diag_write", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c: string) => { body += c; });
          req.on("end", () => {
            try { fs.writeFileSync("/tmp/repair-diag.json", body); } catch {}
            res.writeHead(200); res.end("ok");
          });
          return;
        }
        try {
          const data = fs.readFileSync("/tmp/repair-diag.json", "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" }); res.end(data);
        } catch {
          res.writeHead(404); res.end("no data");
        }
      });
    },
  };
}

function cacheControlPlugin(): Plugin {
  return {
    name: "cache-control-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.match(/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|gif|webp|ico)(\?|$)/)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        next();
      });
    },
    closeBundle() {
      const headersContent = [
        "/assets/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
        "/*.html",
        "  Cache-Control: public, max-age=0, must-revalidate",
        "",
        "/sw.js",
        "  Cache-Control: public, max-age=0, must-revalidate",
        "",
      ].join("\n");
      try {
        fs.writeFileSync(path.resolve(__dirname, "dist/_headers"), headersContent);
      } catch {}
    },
  };
}

const CRITICAL_CHUNK_BUDGET_KB = 250;
const GLOBAL_CHUNK_BUDGET_KB = 300;

const PILLAR_BUDGETS_KB: Record<string, number> = {
  "pillar-dashboard": 350,
  "pillar-radar": 400,
  "pillar-orbit": 300,
  "pillar-wallet": 300,
  "pillar-me": 350,
};
const DEFAULT_PILLAR_BUDGET_KB = 400;

interface BudgetReport {
  timestamp: string;
  violations: Array<{ chunk: string; sizeKB: number; limitKB: number; category: string }>;
  warnings: Array<{ chunk: string; sizeKB: number; limitKB: number; category: string }>;
  summary: Record<string, { sizeKB: number; limitKB: number; ok: boolean }>;
}

function performanceBudgetPlugin(): Plugin {
  return {
    name: "performance-budget-enforcer",
    writeBundle(_options: unknown, bundle: OutputBundle) {
      const criticalPatterns = ["vendor-react-core", "vendor-react-dom", "vendor-supabase"];
      const violations: Array<{ chunk: string; sizeKB: number; limitKB: number; category: string }> = [];
      const warnings: Array<{ chunk: string; sizeKB: number; limitKB: number; category: string }> = [];
      const summary: Record<string, { sizeKB: number; limitKB: number; ok: boolean }> = {};

      for (const [fileName, entry] of Object.entries(bundle)) {
        if (entry.type !== "chunk" || !fileName.endsWith(".js")) continue;
        const sizeKB = Math.round(entry.code.length / 1024);
        const isCritical = criticalPatterns.some(p => fileName.includes(p));

        const pillarMatch = Object.keys(PILLAR_BUDGETS_KB).find(p => fileName.includes(p));

        if (isCritical) {
          summary[fileName] = { sizeKB, limitKB: CRITICAL_CHUNK_BUDGET_KB, ok: sizeKB <= CRITICAL_CHUNK_BUDGET_KB };
          if (sizeKB > CRITICAL_CHUNK_BUDGET_KB) {
            violations.push({ chunk: fileName, sizeKB, limitKB: CRITICAL_CHUNK_BUDGET_KB, category: "critical" });
          }
        } else if (pillarMatch) {
          const limit = PILLAR_BUDGETS_KB[pillarMatch];
          summary[fileName] = { sizeKB, limitKB: limit, ok: sizeKB <= limit };
          if (sizeKB > limit) {
            violations.push({ chunk: fileName, sizeKB, limitKB: limit, category: "pillar" });
          }
        } else if (fileName.includes("pillar-")) {
          summary[fileName] = { sizeKB, limitKB: DEFAULT_PILLAR_BUDGET_KB, ok: sizeKB <= DEFAULT_PILLAR_BUDGET_KB };
          if (sizeKB > DEFAULT_PILLAR_BUDGET_KB) {
            violations.push({ chunk: fileName, sizeKB, limitKB: DEFAULT_PILLAR_BUDGET_KB, category: "pillar" });
          }
        } else if (sizeKB > GLOBAL_CHUNK_BUDGET_KB) {
          summary[fileName] = { sizeKB, limitKB: GLOBAL_CHUNK_BUDGET_KB, ok: false };
          warnings.push({ chunk: fileName, sizeKB, limitKB: GLOBAL_CHUNK_BUDGET_KB, category: "global" });
        }
      }

      const report: BudgetReport = {
        timestamp: new Date().toISOString(),
        violations,
        warnings,
        summary,
      };

      try {
        fs.writeFileSync(path.resolve(__dirname, "dist/budget-report.json"), JSON.stringify(report, null, 2));
      } catch {}

      if (warnings.length > 0) {
        console.warn(`\n  Chunk Size Warnings (${warnings.length}):`);
        warnings.forEach(w => console.warn(`    ${w.chunk} is ${w.sizeKB}KB (limit: ${w.limitKB}KB)`));
      }

      if (violations.length > 0) {
        console.error(`\n  Performance Budget Violations (${violations.length}):`);
        violations.forEach(v => console.error(`    ${v.chunk} is ${v.sizeKB}KB (limit: ${v.limitKB}KB) [${v.category}]`));
        console.error("");

        if (process.env.CI === "true" || process.env.BUDGET_ENFORCE === "true") {
          throw new Error(`Performance budget failed: ${violations.length} violation(s). See dist/budget-report.json`);
        } else {
          console.warn("  Budget violations detected but not enforcing (set CI=true or BUDGET_ENFORCE=true to block)");
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
    'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(process.env.VITE_MAPBOX_TOKEN ?? ""),
  },
  server: {
    host: "::",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    partytownVite({
      dest: path.resolve(__dirname, "dist", "~partytown"),
    }),

    mode === "development" && repairDiagPlugin(),
    cacheControlPlugin(),
    sitemapPlugin(),
    prerenderPlugin(),
    ogImagesPlugin(),
    feedsPlugin(),
    indexNowPlugin(),
    seoValidatePlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api-swr",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
                    const url = new URL(request.url);
                    url.searchParams.delete("apikey");
                    const authHeader = request.headers?.get?.("Authorization") ?? "anon";
                    const encoder = new TextEncoder();
                    const data = encoder.encode(authHeader);
                    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                    const hashArray = Array.from(new Uint8Array(hashBuffer).slice(0, 8));
                    const authHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
                    return `${url.toString()}__u=${authHash}`;
                  },
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/(auth|realtime|storage)\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-critical-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 2 },
              networkTimeoutSeconds: 8,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
    mode === "production" && performanceBudgetPlugin(),
    mode === "production" && viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
    mode === "production" && viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
    }),
    mode === "production" && visualizer({
      filename: "dist/bundle-report.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ].filter(Boolean),
  optimizeDeps: {
    entries: ["src/**/*.{ts,tsx}", "!storybook-static/**"],
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "next-themes",
      "zustand",
      "zustand/middleware",
      "sonner",
      "framer-motion",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@supabase/supabase-js",
      "date-fns",
    ],
    exclude: [
      "mapbox-gl",
      "three",
      "jspdf",
      "html2canvas",
      "@capacitor/app",
      "@capacitor/camera",
      "@capacitor/haptics",
      "@capacitor/keyboard",
      "@capacitor/network",
      "@capacitor/push-notifications",
      "@capacitor/splash-screen",
      "@capacitor/status-bar",
      "@nicepkg/capacitor-nfc",
      "tesseract.js",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@radix-ui/react-primitive": path.resolve(__dirname, "./node_modules/@radix-ui/react-primitive/dist/index.mjs"),
      "@radix-ui/react-slot": path.resolve(__dirname, "./node_modules/@radix-ui/react-slot/dist/index.mjs"),
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  worker: {
    format: "es" as const,
    plugins: () => [react()],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    minify: "esbuild",
    cssMinify: true,
    chunkSizeWarningLimit: 300,
    sourcemap: false,
    reportCompressedSize: true,
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps, { hostId, hostType }) => {
        const critical = ["vendor-react-core", "vendor-react-dom", "vendor-supabase"];
        return deps.sort((a, b) => {
          const aIsCritical = critical.some((c) => a.includes(c));
          const bIsCritical = critical.some((c) => b.includes(c));
          if (aIsCritical && !bIsCritical) return -1;
          if (!aIsCritical && bIsCritical) return 1;
          return 0;
        });
      },
    },
    rollupOptions: {
      external: [
        "@capacitor/filesystem",
        "@capacitor/app",
        "@capacitor/camera",
        "@capacitor/haptics",
        "@capacitor/keyboard",
        "@capacitor/network",
        "@capacitor/push-notifications",
        "@capacitor/splash-screen",
        "@capacitor/status-bar",
        "@nicepkg/capacitor-nfc",
      ],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom")) return "vendor-react-dom";
            if (id.includes("react/") || id.includes("react-router") || id.includes("scheduler")) return "vendor-react-core";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("three") || id.includes("@react-three")) return "vendor-3d";
            if (id.includes("jspdf")) return "vendor-pdf";
            if (id.includes("leaflet")) return "vendor-leaflet";
            if (id.includes("mapbox-gl")) return "vendor-mapbox";
            if (id.includes("html2canvas")) return "vendor-html2canvas";
            if (id.includes("jsqr") || id.includes("html5-qrcode")) return "vendor-qr";
            if (id.includes("react-markdown")) return "vendor-markdown";
            if (id.includes("tesseract")) return "vendor-ocr";
            if (id.includes("posthog")) return "vendor-analytics";
            if (id.includes("@segment")) return "vendor-analytics";
            if (id.includes("@sentry")) return "vendor-sentry";
            if (id.includes("comlink")) return "vendor-utils";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("date-fns") || id.includes("luxon")) return "vendor-date";
            if (id.includes("zod") || id.includes("class-variance-authority") || id.includes("clsx") || id.includes("tailwind-merge")) return "vendor-utils";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
            if (id.includes("web-vitals")) return "vendor-vitals";
          }
          if (id.includes("/src/lib/i18n-data")) return "i18n-data";
          if (id.includes("/src/lib/templates/")) return "templates";
          if (id.includes("/src/lib/taxonomy/")) return "taxonomy";
          if (id.includes("/src/lib/discovery/")) return "discovery";
          if (id.includes("/src/lib/pdf-generator")) return "pdf-generator";
          if (id.includes("/src/pages/Dashboard") || id.includes("/src/pages/AddProperty") || id.includes("/src/pages/PropertyDetailHub") || id.includes("/src/pages/Leases") || id.includes("/src/pages/Tenants") || id.includes("/src/pages/Receipts") || id.includes("/src/pages/Documents") || id.includes("/src/pages/Finances") || id.includes("/src/pages/Interventions")) return "pillar-dashboard";
          if (id.includes("/src/pages/HyperRadar") || id.includes("/src/pages/Explore") || id.includes("/src/pages/SearchResults") || id.includes("/src/pages/universe/") || id.includes("/src/pages/food/") || id.includes("/src/pages/travel/") || id.includes("/src/pages/mobility/") || id.includes("/src/pages/property/")) return "pillar-radar";
          if (id.includes("/src/pages/Orbit") || id.includes("/src/families/orbit")) return "pillar-orbit";
          if (id.includes("/src/pages/Wallet") || id.includes("/src/pages/wallet/") || id.includes("/src/pages/pay/") || id.includes("/src/pages/payments/") || id.includes("/src/pages/Checkout") || id.includes("/src/pages/PaymentPage")) return "pillar-wallet";
          if (id.includes("/src/pages/MeCommand") || id.includes("/src/pages/me/") || id.includes("/src/pages/settings/") || id.includes("/src/pages/Favorites") || id.includes("/src/pages/Install") || id.includes("/src/pages/EditProfile")) return "pillar-me";
          if (id.includes("/src/pages/") && id.includes("Admin")) return "pages-admin";
          if (id.includes("/src/pages/") && id.includes("Merchant")) return "pages-merchant";
          if (id.includes("/src/pages/") && id.includes("Driver")) return "pages-driver";
          if (id.includes("/src/pages/real-estate/")) return "pages-real-estate";
          if (id.includes("/src/pages/pro/")) return "pages-pro";
          if (id.includes("/src/pages/seo/")) return "pages-seo";
          if (id.includes("/src/pages/customer/")) return "pages-customer";
          if (id.includes("/src/pages/seller/") || id.includes("/src/pages/boost/")) return "pages-seller";
          if (id.includes("/src/pages/builder/")) return "pages-builder";
          if (id.includes("/src/components/delivery/")) return "components-delivery";
          if (id.includes("/src/components/map/") || id.includes("/src/lib/map/")) return "map-engine";
          if (id.includes("/src/engines/")) return "engines";
          if (id.includes("/src/components/call/") || id.includes("/src/lib/call")) return "call-engine";
          if (id.includes("/src/families/orbit")) return "orbit-engine";
        },
      },
    },
  },
}));
