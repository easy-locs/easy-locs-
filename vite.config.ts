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
    port: 8080,
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
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@radix-ui/react-primitive": path.resolve(__dirname, "./node_modules/@radix-ui/react-primitive/dist/index.mjs"),
      "@radix-ui/react-slot": path.resolve(__dirname, "./node_modules/@radix-ui/react-slot/dist/index.mjs"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // ── Core React — always loaded ──
            if (id.includes("/react-dom/") || id.includes("/react/")) return "vendor-react";
            if (id.includes("react-router")) return "vendor-router";

            // ── Supabase — split realtime from core ──
            if (id.includes("@supabase/realtime")) return "vendor-supabase-rt";
            if (id.includes("@supabase")) return "vendor-supabase";

            // ── UI framework ──
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("next-themes") || id.includes("sonner")) return "vendor-ui-core";
            if (id.includes("@tanstack")) return "vendor-tanstack";

            // ── Heavy — always lazy ──
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("three") || id.includes("@react-three")) return "vendor-3d";
            if (id.includes("jspdf")) return "vendor-pdf";
            if (id.includes("leaflet")) return "vendor-leaflet";
            if (id.includes("mapbox-gl")) return "vendor-mapbox";
            if (id.includes("html2canvas")) return "vendor-html2canvas";
            if (id.includes("jsqr") || id.includes("html5-qrcode")) return "vendor-qr";
            if (id.includes("date-fns")) return "vendor-datefns";
            if (id.includes("qrcode")) return "vendor-qrgen";
            if (id.includes("dompurify")) return "vendor-sanitize";
            if (id.includes("posthog")) return "vendor-analytics";
            if (id.includes("@sentry")) return "vendor-sentry";
            if (id.includes("react-markdown")) return "vendor-markdown";
            if (id.includes("zod")) return "vendor-zod";
          }

          // ── App-level code splits ──

          // Orbit families — isolate call/media/device from core messaging
          if (id.includes("/families/calls/") || id.includes("/families/device/call-")) return "orbit-calls";
          if (id.includes("/families/media/batch/") || id.includes("/families/media/transport/")) return "orbit-media";

          // Orbit heavy components — lazy-split
          if (id.includes("/components/call/")) return "orbit-call-ui";

          // Storefront/seller — split further by weight
          if (id.includes("/components/storefront/")) return "domain-storefront";
          if (id.includes("/components/seller/")) return "domain-seller";

          // Admin pages
          if (id.includes("/pages/Admin") || id.includes("/components/admin/")) return "domain-admin";

          // Delivery — split heavy components
          if (id.includes("/components/delivery/SellerLogistics")) return "domain-delivery-logistics";
          if (id.includes("/components/delivery/")) return "domain-delivery";

          // Canonical UI engine — shared but heavy
          if (id.includes("/lib/engines/") || id.includes("/canonical-ui-engine")) return "app-engines";
        },
      },
    },
  },
}));
