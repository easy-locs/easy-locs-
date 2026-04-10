import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sitemapPlugin } from "./vite-plugin-sitemap";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
  },
  server: {
    host: "::",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemapPlugin(),
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
    rollupOptions: {
      external: ["@capacitor/filesystem"],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
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
            if (id.includes("zod")) return "vendor-zod";
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
        },
      },
    },
  },
}));
