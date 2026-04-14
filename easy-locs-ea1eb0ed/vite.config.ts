import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { sitemapPlugin } from "./vite-plugin-sitemap";
import { prerenderPlugin } from "./vite-plugin-prerender";
import { VitePWA } from "vite-plugin-pwa";

function repairDiagPlugin() {
  return {
    name: "repair-diag",
    configureServer(server: any) {
      server.middlewares.use("/__repair_diag_write", (req: any, res: any) => {
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
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
    mode === "development" && componentTagger(),
    mode === "development" && repairDiagPlugin(),
    sitemapPlugin(),
    prerenderPlugin(),
    VitePWA({ disable: true }),
  ].filter(Boolean),
  optimizeDeps: {
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
      "lucide-react",
      "@supabase/supabase-js",
      "date-fns",
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
  build: {
    target: "es2020",
    cssCodeSplit: true,
    minify: "esbuild",
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    reportCompressedSize: true,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      external: ["@capacitor/filesystem"],
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
            if (id.includes("posthog")) return "vendor-analytics";
            if (id.includes("@sentry")) return "vendor-sentry";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("date-fns") || id.includes("luxon")) return "vendor-date";
            if (id.includes("zod") || id.includes("class-variance-authority") || id.includes("clsx") || id.includes("tailwind-merge")) return "vendor-utils";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
          }
          if (id.includes("/src/lib/i18n-data")) return "i18n-data";
          if (id.includes("/src/lib/templates/")) return "templates";
          if (id.includes("/src/lib/taxonomy/")) return "taxonomy";
          if (id.includes("/src/lib/discovery/")) return "discovery";
          if (id.includes("/src/lib/pdf-generator")) return "pdf-generator";
          if (id.includes("/src/pages/") && id.includes("Admin")) return "pages-admin";
          if (id.includes("/src/pages/") && id.includes("Merchant")) return "pages-merchant";
          if (id.includes("/src/pages/") && id.includes("Driver")) return "pages-driver";
          if (id.includes("/src/pages/real-estate/")) return "pages-real-estate";
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
