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
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "Easy-Locs",
        short_name: "Easy-Locs",
        theme_color: "#1a1a2e",
        background_color: "#0a0a0f",
        display: "standalone",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react-dom/") || id.includes("/react/")) return "vendor-react";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("three") || id.includes("@react-three")) return "vendor-3d";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("jspdf")) return "vendor-pdf";
            if (id.includes("date-fns")) return "vendor-datefns";
            if (id.includes("leaflet")) return "vendor-leaflet";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("next-themes") || id.includes("sonner") || id.includes("lucide")) return "vendor-ui";
          }
        },
      },
    },
  },
}));
