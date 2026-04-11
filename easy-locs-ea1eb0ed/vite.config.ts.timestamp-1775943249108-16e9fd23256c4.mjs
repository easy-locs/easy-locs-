// vite.config.ts
import { defineConfig } from "file:///home/runner/workspace/easy-locs-ea1eb0ed/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/easy-locs-ea1eb0ed/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/runner/workspace/easy-locs-ea1eb0ed/node_modules/lovable-tagger/dist/index.js";

// vite-plugin-sitemap.ts
var BASE = "https://www.easy-locs.com";
function sitemapPlugin() {
  return {
    name: "generate-sitemap",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path2 = await import("path");
        if (!fs.existsSync(path2.resolve("dist"))) {
          console.warn("[sitemap] dist/ not found, skipping");
          return;
        }
        const p1CountrySlugs = [
          "france",
          "uk",
          "spain",
          "germany",
          "italy",
          "portugal",
          "netherlands",
          "switzerland",
          "usa",
          "canada",
          "uae",
          "saudi-arabia",
          "turkey",
          "israel",
          "thailand",
          "japan",
          "australia",
          "singapore-sg",
          "indonesia",
          "morocco",
          "south-africa"
        ];
        const p1CitySlugs = [
          "paris",
          "marseille",
          "lyon",
          "nice",
          "bordeaux",
          "toulouse",
          "london",
          "manchester",
          "edinburgh",
          "birmingham",
          "madrid",
          "barcelona",
          "valencia",
          "malaga",
          "berlin",
          "munich",
          "hamburg",
          "frankfurt",
          "rome",
          "milan",
          "florence",
          "lisbon",
          "porto",
          "amsterdam",
          "zurich",
          "geneva",
          "new-york",
          "miami",
          "los-angeles",
          "san-francisco",
          "toronto",
          "vancouver",
          "montreal",
          "dubai",
          "abu-dhabi",
          "riyadh",
          "jeddah",
          "istanbul",
          "antalya",
          "tel-aviv",
          "bangkok",
          "phuket",
          "chiang-mai",
          "tokyo",
          "osaka",
          "sydney",
          "melbourne",
          "singapore-city",
          "bali",
          "marrakech",
          "casablanca",
          "cape-town",
          "johannesburg",
          "vienna",
          "warsaw",
          "athens",
          "dublin",
          "prague",
          "dubrovnik",
          "seoul",
          "mexico-city"
        ];
        const serviceCategories = [
          "cleaning",
          "maintenance",
          "transport",
          "car-rental",
          "tours",
          "airport-transfer",
          "personal",
          "spa",
          "water-sport",
          "restaurant",
          "coworking",
          "event",
          "yacht-rental",
          "private-chef"
        ];
        const activityTypes = [
          "desert-safari",
          "food-tour",
          "cooking-class",
          "boat-tour",
          "city-tour",
          "wine-tasting",
          "scuba-diving",
          "hiking",
          "surfing",
          "cultural-tour",
          "photography-tour",
          "snorkeling",
          "kayaking",
          "horse-riding",
          "helicopter-tour",
          "sunset-cruise"
        ];
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const toXml = (entries) => {
          const urls = entries.map(
            (e) => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod || today}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
          ).join("\n");
          return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        };
        const coreEntries = [
          ["/", "1.0"],
          ["/locations", "0.9"],
          ["/property-management", "0.9"],
          ["/long-term-rentals", "0.9"],
          ["/seasonal-rentals", "0.9"],
          ["/marketplace-services", "0.9"],
          ["/concierge-services", "0.9"],
          ["/activities", "0.9"],
          ["/rental-management", "0.8"],
          ["/property-owner-software", "0.8"],
          ["/property-management-platform", "0.8"],
          ["/rental-management-software", "0.8"],
          ["/rentals", "0.8"],
          ["/services", "0.9"],
          ["/marketplace", "0.9"],
          ["/login", "0.4"],
          ["/signup", "0.5"],
          ["/install", "0.4"],
          ["/guest", "0.5"],
          ["/vision", "0.5"],
          ["/terms", "0.3"],
          ["/privacy", "0.3"],
          ["/cookies", "0.3"],
          ["/legal-notice", "0.3"],
          ["/about", "0.5"],
          ["/contact", "0.5"],
          ["/help", "0.5"]
        ].map(([p, prio]) => ({ loc: `${BASE}${p}`, changefreq: "weekly", priority: prio }));
        const countryEntries = p1CountrySlugs.flatMap((s) => [
          { loc: `${BASE}/country/${s}`, changefreq: "monthly", priority: "0.8" },
          { loc: `${BASE}/property-management-${s}`, changefreq: "monthly", priority: "0.7" }
        ]);
        const cityEntries = p1CitySlugs.flatMap((s) => [
          { loc: `${BASE}/city/${s}`, changefreq: "weekly", priority: "0.8" },
          { loc: `${BASE}/city/${s}/services`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE}/city/${s}/activities`, changefreq: "monthly", priority: "0.7" },
          { loc: `${BASE}/city/${s}/concierge`, changefreq: "monthly", priority: "0.6" },
          { loc: `${BASE}/property-management-${s}`, changefreq: "monthly", priority: "0.6" }
        ]);
        const svcHubs = serviceCategories.map((s) => ({
          loc: `${BASE}/services/${s}`,
          changefreq: "monthly",
          priority: "0.7"
        }));
        const svcCity = serviceCategories.flatMap(
          (s) => p1CitySlugs.map((c) => ({ loc: `${BASE}/services/${s}/${c}`, changefreq: "monthly", priority: "0.6" }))
        );
        const top30Cities = p1CitySlugs.slice(0, 30);
        const actEntries = activityTypes.flatMap(
          (a) => top30Cities.map((c) => ({ loc: `${BASE}/activities/${a}-${c}`, changefreq: "monthly", priority: "0.6" }))
        );
        const mktCity = p1CitySlugs.map((c) => ({
          loc: `${BASE}/marketplace/${c}`,
          changefreq: "weekly",
          priority: "0.7"
        }));
        const mktSvcCity = serviceCategories.flatMap(
          (s) => top30Cities.map((c) => ({ loc: `${BASE}/marketplace/${s}/${c}`, changefreq: "monthly", priority: "0.6" }))
        );
        const sitemaps = {
          "sitemap-core.xml": coreEntries,
          "sitemap-countries.xml": countryEntries,
          "sitemap-cities.xml": cityEntries,
          "sitemap-services.xml": [...svcHubs, ...svcCity],
          "sitemap-activities.xml": actEntries,
          "sitemap-marketplace.xml": [...mktCity, ...mktSvcCity]
        };
        let totalUrls = 0;
        for (const [file, entries] of Object.entries(sitemaps)) {
          fs.writeFileSync(path2.resolve("dist", file), toXml(entries), "utf-8");
          totalUrls += entries.length;
        }
        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(sitemaps).map((f) => `  <sitemap><loc>${BASE}/${f}</loc><lastmod>${today}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
        fs.writeFileSync(path2.resolve("dist", "sitemap.xml"), indexXml, "utf-8");
        console.log(`[sitemap] Generated sitemap index + ${Object.keys(sitemaps).length} sub-sitemaps (${totalUrls} URLs total)`);
      }
    }
  };
}

// vite.config.ts
import { VitePWA } from "file:///home/runner/workspace/easy-locs-ea1eb0ed/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/home/runner/workspace/easy-locs-ea1eb0ed";
var vite_config_default = defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString())
  },
  server: {
    host: "::",
    port: 5e3,
    allowedHosts: true,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemapPlugin(),
    VitePWA({ disable: true })
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
      "date-fns"
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@radix-ui/react-primitive": path.resolve(__vite_injected_original_dirname, "./node_modules/@radix-ui/react-primitive/dist/index.mjs"),
      "@radix-ui/react-slot": path.resolve(__vite_injected_original_dirname, "./node_modules/@radix-ui/react-slot/dist/index.mjs")
    }
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : []
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
      polyfill: true
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
            if (id.includes("zod")) return "vendor-zod";
            if (id.includes("lucide-react")) return "vendor-icons";
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
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4tc2l0ZW1hcC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2UvZWFzeS1sb2NzLWVhMWViMGVkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL2Vhc3ktbG9jcy1lYTFlYjBlZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL2Vhc3ktbG9jcy1lYTFlYjBlZC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuaW1wb3J0IHsgc2l0ZW1hcFBsdWdpbiB9IGZyb20gXCIuL3ZpdGUtcGx1Z2luLXNpdGVtYXBcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBkZWZpbmU6IHtcbiAgICBfX0JVSUxEX1RJTUVTVEFNUF9fOiBKU09OLnN0cmluZ2lmeShEYXRlLm5vdygpLnRvU3RyaW5nKCkpLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogNTAwMCxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgc2l0ZW1hcFBsdWdpbigpLFxuICAgIFZpdGVQV0EoeyBkaXNhYmxlOiB0cnVlIH0pLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgXCJyZWFjdFwiLFxuICAgICAgXCJyZWFjdC9qc3gtcnVudGltZVwiLFxuICAgICAgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIixcbiAgICAgIFwicmVhY3QtZG9tXCIsXG4gICAgICBcInJlYWN0LWRvbS9jbGllbnRcIixcbiAgICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiLFxuICAgICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIixcbiAgICAgIFwibmV4dC10aGVtZXNcIixcbiAgICAgIFwienVzdGFuZFwiLFxuICAgICAgXCJ6dXN0YW5kL21pZGRsZXdhcmVcIixcbiAgICAgIFwic29ubmVyXCIsXG4gICAgICBcImZyYW1lci1tb3Rpb25cIixcbiAgICAgIFwiY2xzeFwiLFxuICAgICAgXCJ0YWlsd2luZC1tZXJnZVwiLFxuICAgICAgXCJjbGFzcy12YXJpYW5jZS1hdXRob3JpdHlcIixcbiAgICAgIFwibHVjaWRlLXJlYWN0XCIsXG4gICAgICBcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiLFxuICAgICAgXCJkYXRlLWZuc1wiLFxuICAgIF0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICBcIkByYWRpeC11aS9yZWFjdC1wcmltaXRpdmVcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9AcmFkaXgtdWkvcmVhY3QtcHJpbWl0aXZlL2Rpc3QvaW5kZXgubWpzXCIpLFxuICAgICAgXCJAcmFkaXgtdWkvcmVhY3Qtc2xvdFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL0ByYWRpeC11aS9yZWFjdC1zbG90L2Rpc3QvaW5kZXgubWpzXCIpLFxuICAgIH0sXG4gIH0sXG4gIGVzYnVpbGQ6IHtcbiAgICBkcm9wOiBtb2RlID09PSBcInByb2R1Y3Rpb25cIiA/IFtcImNvbnNvbGVcIiwgXCJkZWJ1Z2dlclwiXSA6IFtdLFxuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogXCJlczIwMjBcIixcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICBjc3NNaW5pZnk6IHRydWUsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogdHJ1ZSxcbiAgICBtb2R1bGVQcmVsb2FkOiB7XG4gICAgICBwb2x5ZmlsbDogdHJ1ZSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbXCJAY2FwYWNpdG9yL2ZpbGVzeXN0ZW1cIl0sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWFjdC1kb21cIikpIHJldHVybiBcInZlbmRvci1yZWFjdC1kb21cIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInJlYWN0L1wiKSB8fCBpZC5pbmNsdWRlcyhcInJlYWN0LXJvdXRlclwiKSB8fCBpZC5pbmNsdWRlcyhcInNjaGVkdWxlclwiKSkgcmV0dXJuIFwidmVuZG9yLXJlYWN0LWNvcmVcIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInJlY2hhcnRzXCIpIHx8IGlkLmluY2x1ZGVzKFwiZDMtXCIpKSByZXR1cm4gXCJ2ZW5kb3ItY2hhcnRzXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJ0aHJlZVwiKSB8fCBpZC5pbmNsdWRlcyhcIkByZWFjdC10aHJlZVwiKSkgcmV0dXJuIFwidmVuZG9yLTNkXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJqc3BkZlwiKSkgcmV0dXJuIFwidmVuZG9yLXBkZlwiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibGVhZmxldFwiKSkgcmV0dXJuIFwidmVuZG9yLWxlYWZsZXRcIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm1hcGJveC1nbFwiKSkgcmV0dXJuIFwidmVuZG9yLW1hcGJveFwiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiaHRtbDJjYW52YXNcIikpIHJldHVybiBcInZlbmRvci1odG1sMmNhbnZhc1wiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwianNxclwiKSB8fCBpZC5pbmNsdWRlcyhcImh0bWw1LXFyY29kZVwiKSkgcmV0dXJuIFwidmVuZG9yLXFyXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWFjdC1tYXJrZG93blwiKSkgcmV0dXJuIFwidmVuZG9yLW1hcmtkb3duXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJwb3N0aG9nXCIpKSByZXR1cm4gXCJ2ZW5kb3ItYW5hbHl0aWNzXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAc2VudHJ5XCIpKSByZXR1cm4gXCJ2ZW5kb3Itc2VudHJ5XCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJmcmFtZXItbW90aW9uXCIpKSByZXR1cm4gXCJ2ZW5kb3ItbW90aW9uXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAc3VwYWJhc2VcIikpIHJldHVybiBcInZlbmRvci1zdXBhYmFzZVwiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHJhZGl4LXVpXCIpKSByZXR1cm4gXCJ2ZW5kb3ItcmFkaXhcIjtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkB0YW5zdGFja1wiKSkgcmV0dXJuIFwidmVuZG9yLXRhbnN0YWNrXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJkYXRlLWZuc1wiKSB8fCBpZC5pbmNsdWRlcyhcImx1eG9uXCIpKSByZXR1cm4gXCJ2ZW5kb3ItZGF0ZVwiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiem9kXCIpKSByZXR1cm4gXCJ2ZW5kb3Item9kXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJsdWNpZGUtcmVhY3RcIikpIHJldHVybiBcInZlbmRvci1pY29uc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL2xpYi9pMThuLWRhdGFcIikpIHJldHVybiBcImkxOG4tZGF0YVwiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9zcmMvbGliL3RlbXBsYXRlcy9cIikpIHJldHVybiBcInRlbXBsYXRlc1wiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9zcmMvbGliL3RheG9ub215L1wiKSkgcmV0dXJuIFwidGF4b25vbXlcIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL2xpYi9kaXNjb3ZlcnkvXCIpKSByZXR1cm4gXCJkaXNjb3ZlcnlcIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL2xpYi9wZGYtZ2VuZXJhdG9yXCIpKSByZXR1cm4gXCJwZGYtZ2VuZXJhdG9yXCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3NyYy9wYWdlcy9cIikgJiYgaWQuaW5jbHVkZXMoXCJBZG1pblwiKSkgcmV0dXJuIFwicGFnZXMtYWRtaW5cIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL3BhZ2VzL1wiKSAmJiBpZC5pbmNsdWRlcyhcIk1lcmNoYW50XCIpKSByZXR1cm4gXCJwYWdlcy1tZXJjaGFudFwiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9zcmMvcGFnZXMvXCIpICYmIGlkLmluY2x1ZGVzKFwiRHJpdmVyXCIpKSByZXR1cm4gXCJwYWdlcy1kcml2ZXJcIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL3BhZ2VzL3JlYWwtZXN0YXRlL1wiKSkgcmV0dXJuIFwicGFnZXMtcmVhbC1lc3RhdGVcIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvc3JjL2NvbXBvbmVudHMvZGVsaXZlcnkvXCIpKSByZXR1cm4gXCJjb21wb25lbnRzLWRlbGl2ZXJ5XCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3NyYy9jb21wb25lbnRzL21hcC9cIikgfHwgaWQuaW5jbHVkZXMoXCIvc3JjL2xpYi9tYXAvXCIpKSByZXR1cm4gXCJtYXAtZW5naW5lXCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3NyYy9lbmdpbmVzL1wiKSkgcmV0dXJuIFwiZW5naW5lc1wiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9zcmMvY29tcG9uZW50cy9jYWxsL1wiKSB8fCBpZC5pbmNsdWRlcyhcIi9zcmMvbGliL2NhbGxcIikpIHJldHVybiBcImNhbGwtZW5naW5lXCI7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3NyYy9mYW1pbGllcy9vcmJpdFwiKSkgcmV0dXJuIFwib3JiaXQtZW5naW5lXCI7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2UvZWFzeS1sb2NzLWVhMWViMGVkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL2Vhc3ktbG9jcy1lYTFlYjBlZC92aXRlLXBsdWdpbi1zaXRlbWFwLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2UvZWFzeS1sb2NzLWVhMWViMGVkL3ZpdGUtcGx1Z2luLXNpdGVtYXAudHNcIjsvKipcbiAqIFZpdGUgcGx1Z2luIHRvIGdlbmVyYXRlIHNwbGl0IHNpdGVtYXBzIGF0IGJ1aWxkIHRpbWUuXG4gKiBHZW5lcmF0ZXM6XG4gKiAgIHNpdGVtYXAueG1sICAgICAgICAgICBcdTIwMTQgaW5kZXggcG9pbnRpbmcgdG8gc3ViLXNpdGVtYXBzXG4gKiAgIHNpdGVtYXAtY29yZS54bWxcbiAqICAgc2l0ZW1hcC1jb3VudHJpZXMueG1sXG4gKiAgIHNpdGVtYXAtY2l0aWVzLnhtbFxuICogICBzaXRlbWFwLXNlcnZpY2VzLnhtbFxuICogICBzaXRlbWFwLWFjdGl2aXRpZXMueG1sXG4gKiAgIHNpdGVtYXAtbWFya2V0cGxhY2UueG1sXG4gKi9cbmltcG9ydCB0eXBlIHsgUGx1Z2luIH0gZnJvbSBcInZpdGVcIjtcblxuY29uc3QgQkFTRSA9IFwiaHR0cHM6Ly93d3cuZWFzeS1sb2NzLmNvbVwiO1xuXG5pbnRlcmZhY2UgU2l0ZW1hcEVudHJ5IHtcbiAgbG9jOiBzdHJpbmc7XG4gIGNoYW5nZWZyZXE6IHN0cmluZztcbiAgcHJpb3JpdHk6IHN0cmluZztcbiAgbGFzdG1vZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpdGVtYXBQbHVnaW4oKTogYW55IHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcImdlbmVyYXRlLXNpdGVtYXBcIixcbiAgICBhcHBseTogXCJidWlsZFwiLFxuICAgIGNsb3NlQnVuZGxlOiB7XG4gICAgICBzZXF1ZW50aWFsOiB0cnVlLFxuICAgICAgYXN5bmMgaGFuZGxlcigpIHtcbiAgICAgICAgY29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoXCJmc1wiKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IGF3YWl0IGltcG9ydChcInBhdGhcIik7XG5cbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGgucmVzb2x2ZShcImRpc3RcIikpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiW3NpdGVtYXBdIGRpc3QvIG5vdCBmb3VuZCwgc2tpcHBpbmdcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGhhc2UtMSBkYXRhIFx1MjAxNCBtaXJyb3JlZCBmcm9tIHNlby1kYXRhLnRzXG4gICAgICAgIGNvbnN0IHAxQ291bnRyeVNsdWdzID0gW1xuICAgICAgICAgIFwiZnJhbmNlXCIsIFwidWtcIiwgXCJzcGFpblwiLCBcImdlcm1hbnlcIiwgXCJpdGFseVwiLCBcInBvcnR1Z2FsXCIsIFwibmV0aGVybGFuZHNcIixcbiAgICAgICAgICBcInN3aXR6ZXJsYW5kXCIsIFwidXNhXCIsIFwiY2FuYWRhXCIsIFwidWFlXCIsIFwic2F1ZGktYXJhYmlhXCIsIFwidHVya2V5XCIsIFwiaXNyYWVsXCIsXG4gICAgICAgICAgXCJ0aGFpbGFuZFwiLCBcImphcGFuXCIsIFwiYXVzdHJhbGlhXCIsIFwic2luZ2Fwb3JlLXNnXCIsIFwiaW5kb25lc2lhXCIsIFwibW9yb2Njb1wiLCBcInNvdXRoLWFmcmljYVwiLFxuICAgICAgICBdO1xuICAgICAgICBjb25zdCBwMUNpdHlTbHVncyA9IFtcbiAgICAgICAgICBcInBhcmlzXCIsIFwibWFyc2VpbGxlXCIsIFwibHlvblwiLCBcIm5pY2VcIiwgXCJib3JkZWF1eFwiLCBcInRvdWxvdXNlXCIsXG4gICAgICAgICAgXCJsb25kb25cIiwgXCJtYW5jaGVzdGVyXCIsIFwiZWRpbmJ1cmdoXCIsIFwiYmlybWluZ2hhbVwiLFxuICAgICAgICAgIFwibWFkcmlkXCIsIFwiYmFyY2Vsb25hXCIsIFwidmFsZW5jaWFcIiwgXCJtYWxhZ2FcIixcbiAgICAgICAgICBcImJlcmxpblwiLCBcIm11bmljaFwiLCBcImhhbWJ1cmdcIiwgXCJmcmFua2Z1cnRcIixcbiAgICAgICAgICBcInJvbWVcIiwgXCJtaWxhblwiLCBcImZsb3JlbmNlXCIsXG4gICAgICAgICAgXCJsaXNib25cIiwgXCJwb3J0b1wiLFxuICAgICAgICAgIFwiYW1zdGVyZGFtXCIsXG4gICAgICAgICAgXCJ6dXJpY2hcIiwgXCJnZW5ldmFcIixcbiAgICAgICAgICBcIm5ldy15b3JrXCIsIFwibWlhbWlcIiwgXCJsb3MtYW5nZWxlc1wiLCBcInNhbi1mcmFuY2lzY29cIixcbiAgICAgICAgICBcInRvcm9udG9cIiwgXCJ2YW5jb3V2ZXJcIiwgXCJtb250cmVhbFwiLFxuICAgICAgICAgIFwiZHViYWlcIiwgXCJhYnUtZGhhYmlcIixcbiAgICAgICAgICBcInJpeWFkaFwiLCBcImplZGRhaFwiLFxuICAgICAgICAgIFwiaXN0YW5idWxcIiwgXCJhbnRhbHlhXCIsXG4gICAgICAgICAgXCJ0ZWwtYXZpdlwiLFxuICAgICAgICAgIFwiYmFuZ2tva1wiLCBcInBodWtldFwiLCBcImNoaWFuZy1tYWlcIixcbiAgICAgICAgICBcInRva3lvXCIsIFwib3Nha2FcIixcbiAgICAgICAgICBcInN5ZG5leVwiLCBcIm1lbGJvdXJuZVwiLFxuICAgICAgICAgIFwic2luZ2Fwb3JlLWNpdHlcIixcbiAgICAgICAgICBcImJhbGlcIixcbiAgICAgICAgICBcIm1hcnJha2VjaFwiLCBcImNhc2FibGFuY2FcIixcbiAgICAgICAgICBcImNhcGUtdG93blwiLCBcImpvaGFubmVzYnVyZ1wiLFxuICAgICAgICAgIFwidmllbm5hXCIsIFwid2Fyc2F3XCIsIFwiYXRoZW5zXCIsIFwiZHVibGluXCIsIFwicHJhZ3VlXCIsIFwiZHVicm92bmlrXCIsIFwic2VvdWxcIiwgXCJtZXhpY28tY2l0eVwiLFxuICAgICAgICBdO1xuICAgICAgICBjb25zdCBzZXJ2aWNlQ2F0ZWdvcmllcyA9IFtcbiAgICAgICAgICBcImNsZWFuaW5nXCIsIFwibWFpbnRlbmFuY2VcIiwgXCJ0cmFuc3BvcnRcIiwgXCJjYXItcmVudGFsXCIsIFwidG91cnNcIixcbiAgICAgICAgICBcImFpcnBvcnQtdHJhbnNmZXJcIiwgXCJwZXJzb25hbFwiLCBcInNwYVwiLCBcIndhdGVyLXNwb3J0XCIsIFwicmVzdGF1cmFudFwiLFxuICAgICAgICAgIFwiY293b3JraW5nXCIsIFwiZXZlbnRcIiwgXCJ5YWNodC1yZW50YWxcIiwgXCJwcml2YXRlLWNoZWZcIixcbiAgICAgICAgXTtcbiAgICAgICAgY29uc3QgYWN0aXZpdHlUeXBlcyA9IFtcbiAgICAgICAgICBcImRlc2VydC1zYWZhcmlcIiwgXCJmb29kLXRvdXJcIiwgXCJjb29raW5nLWNsYXNzXCIsIFwiYm9hdC10b3VyXCIsIFwiY2l0eS10b3VyXCIsXG4gICAgICAgICAgXCJ3aW5lLXRhc3RpbmdcIiwgXCJzY3ViYS1kaXZpbmdcIiwgXCJoaWtpbmdcIiwgXCJzdXJmaW5nXCIsIFwiY3VsdHVyYWwtdG91clwiLFxuICAgICAgICAgIFwicGhvdG9ncmFwaHktdG91clwiLCBcInNub3JrZWxpbmdcIiwgXCJrYXlha2luZ1wiLCBcImhvcnNlLXJpZGluZ1wiLFxuICAgICAgICAgIFwiaGVsaWNvcHRlci10b3VyXCIsIFwic3Vuc2V0LWNydWlzZVwiLFxuICAgICAgICBdO1xuXG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgY29uc3QgdG9YbWwgPSAoZW50cmllczogU2l0ZW1hcEVudHJ5W10pOiBzdHJpbmcgPT4ge1xuICAgICAgICAgIGNvbnN0IHVybHMgPSBlbnRyaWVzLm1hcChlID0+XG4gICAgICAgICAgICBgICA8dXJsPjxsb2M+JHtlLmxvY308L2xvYz48bGFzdG1vZD4ke2UubGFzdG1vZCB8fCB0b2RheX08L2xhc3Rtb2Q+PGNoYW5nZWZyZXE+JHtlLmNoYW5nZWZyZXF9PC9jaGFuZ2VmcmVxPjxwcmlvcml0eT4ke2UucHJpb3JpdHl9PC9wcmlvcml0eT48L3VybD5gXG4gICAgICAgICAgKS5qb2luKFwiXFxuXCIpO1xuICAgICAgICAgIHJldHVybiBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuPHVybHNldCB4bWxucz1cImh0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3NjaGVtYXMvc2l0ZW1hcC8wLjlcIj5cXG4ke3VybHN9XFxuPC91cmxzZXQ+YDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyAxLiBDb3JlXG4gICAgICAgIGNvbnN0IGNvcmVFbnRyaWVzOiBTaXRlbWFwRW50cnlbXSA9IFtcbiAgICAgICAgICBbXCIvXCIsIFwiMS4wXCJdLCBbXCIvbG9jYXRpb25zXCIsIFwiMC45XCJdLFxuICAgICAgICAgIFtcIi9wcm9wZXJ0eS1tYW5hZ2VtZW50XCIsIFwiMC45XCJdLCBbXCIvbG9uZy10ZXJtLXJlbnRhbHNcIiwgXCIwLjlcIl0sXG4gICAgICAgICAgW1wiL3NlYXNvbmFsLXJlbnRhbHNcIiwgXCIwLjlcIl0sIFtcIi9tYXJrZXRwbGFjZS1zZXJ2aWNlc1wiLCBcIjAuOVwiXSxcbiAgICAgICAgICBbXCIvY29uY2llcmdlLXNlcnZpY2VzXCIsIFwiMC45XCJdLCBbXCIvYWN0aXZpdGllc1wiLCBcIjAuOVwiXSxcbiAgICAgICAgICBbXCIvcmVudGFsLW1hbmFnZW1lbnRcIiwgXCIwLjhcIl0sIFtcIi9wcm9wZXJ0eS1vd25lci1zb2Z0d2FyZVwiLCBcIjAuOFwiXSxcbiAgICAgICAgICBbXCIvcHJvcGVydHktbWFuYWdlbWVudC1wbGF0Zm9ybVwiLCBcIjAuOFwiXSwgW1wiL3JlbnRhbC1tYW5hZ2VtZW50LXNvZnR3YXJlXCIsIFwiMC44XCJdLFxuICAgICAgICAgIFtcIi9yZW50YWxzXCIsIFwiMC44XCJdLCBbXCIvc2VydmljZXNcIiwgXCIwLjlcIl0sIFtcIi9tYXJrZXRwbGFjZVwiLCBcIjAuOVwiXSxcbiAgICAgICAgICBbXCIvbG9naW5cIiwgXCIwLjRcIl0sIFtcIi9zaWdudXBcIiwgXCIwLjVcIl0sIFtcIi9pbnN0YWxsXCIsIFwiMC40XCJdLFxuICAgICAgICAgIFtcIi9ndWVzdFwiLCBcIjAuNVwiXSwgW1wiL3Zpc2lvblwiLCBcIjAuNVwiXSxcbiAgICAgICAgICBbXCIvdGVybXNcIiwgXCIwLjNcIl0sIFtcIi9wcml2YWN5XCIsIFwiMC4zXCJdLCBbXCIvY29va2llc1wiLCBcIjAuM1wiXSxcbiAgICAgICAgICBbXCIvbGVnYWwtbm90aWNlXCIsIFwiMC4zXCJdLCBbXCIvYWJvdXRcIiwgXCIwLjVcIl0sIFtcIi9jb250YWN0XCIsIFwiMC41XCJdLCBbXCIvaGVscFwiLCBcIjAuNVwiXSxcbiAgICAgICAgXS5tYXAoKFtwLCBwcmlvXSkgPT4gKHsgbG9jOiBgJHtCQVNFfSR7cH1gLCBjaGFuZ2VmcmVxOiBcIndlZWtseVwiLCBwcmlvcml0eTogcHJpbyBhcyBzdHJpbmcgfSkpO1xuXG4gICAgICAgIC8vIDIuIENvdW50cmllc1xuICAgICAgICBjb25zdCBjb3VudHJ5RW50cmllczogU2l0ZW1hcEVudHJ5W10gPSBwMUNvdW50cnlTbHVncy5mbGF0TWFwKHMgPT4gW1xuICAgICAgICAgIHsgbG9jOiBgJHtCQVNFfS9jb3VudHJ5LyR7c31gLCBjaGFuZ2VmcmVxOiBcIm1vbnRobHlcIiwgcHJpb3JpdHk6IFwiMC44XCIgfSxcbiAgICAgICAgICB7IGxvYzogYCR7QkFTRX0vcHJvcGVydHktbWFuYWdlbWVudC0ke3N9YCwgY2hhbmdlZnJlcTogXCJtb250aGx5XCIsIHByaW9yaXR5OiBcIjAuN1wiIH0sXG4gICAgICAgIF0pO1xuXG4gICAgICAgIC8vIDMuIENpdGllc1xuICAgICAgICBjb25zdCBjaXR5RW50cmllczogU2l0ZW1hcEVudHJ5W10gPSBwMUNpdHlTbHVncy5mbGF0TWFwKHMgPT4gW1xuICAgICAgICAgIHsgbG9jOiBgJHtCQVNFfS9jaXR5LyR7c31gLCBjaGFuZ2VmcmVxOiBcIndlZWtseVwiLCBwcmlvcml0eTogXCIwLjhcIiB9LFxuICAgICAgICAgIHsgbG9jOiBgJHtCQVNFfS9jaXR5LyR7c30vc2VydmljZXNgLCBjaGFuZ2VmcmVxOiBcIm1vbnRobHlcIiwgcHJpb3JpdHk6IFwiMC43XCIgfSxcbiAgICAgICAgICB7IGxvYzogYCR7QkFTRX0vY2l0eS8ke3N9L2FjdGl2aXRpZXNgLCBjaGFuZ2VmcmVxOiBcIm1vbnRobHlcIiwgcHJpb3JpdHk6IFwiMC43XCIgfSxcbiAgICAgICAgICB7IGxvYzogYCR7QkFTRX0vY2l0eS8ke3N9L2NvbmNpZXJnZWAsIGNoYW5nZWZyZXE6IFwibW9udGhseVwiLCBwcmlvcml0eTogXCIwLjZcIiB9LFxuICAgICAgICAgIHsgbG9jOiBgJHtCQVNFfS9wcm9wZXJ0eS1tYW5hZ2VtZW50LSR7c31gLCBjaGFuZ2VmcmVxOiBcIm1vbnRobHlcIiwgcHJpb3JpdHk6IFwiMC42XCIgfSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgLy8gNC4gU2VydmljZXNcbiAgICAgICAgY29uc3Qgc3ZjSHViczogU2l0ZW1hcEVudHJ5W10gPSBzZXJ2aWNlQ2F0ZWdvcmllcy5tYXAocyA9PiAoe1xuICAgICAgICAgIGxvYzogYCR7QkFTRX0vc2VydmljZXMvJHtzfWAsIGNoYW5nZWZyZXE6IFwibW9udGhseVwiLCBwcmlvcml0eTogXCIwLjdcIixcbiAgICAgICAgfSkpO1xuICAgICAgICBjb25zdCBzdmNDaXR5OiBTaXRlbWFwRW50cnlbXSA9IHNlcnZpY2VDYXRlZ29yaWVzLmZsYXRNYXAocyA9PlxuICAgICAgICAgIHAxQ2l0eVNsdWdzLm1hcChjID0+ICh7IGxvYzogYCR7QkFTRX0vc2VydmljZXMvJHtzfS8ke2N9YCwgY2hhbmdlZnJlcTogXCJtb250aGx5XCIsIHByaW9yaXR5OiBcIjAuNlwiIH0pKVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIDUuIEFjdGl2aXRpZXNcbiAgICAgICAgY29uc3QgdG9wMzBDaXRpZXMgPSBwMUNpdHlTbHVncy5zbGljZSgwLCAzMCk7XG4gICAgICAgIGNvbnN0IGFjdEVudHJpZXM6IFNpdGVtYXBFbnRyeVtdID0gYWN0aXZpdHlUeXBlcy5mbGF0TWFwKGEgPT5cbiAgICAgICAgICB0b3AzMENpdGllcy5tYXAoYyA9PiAoeyBsb2M6IGAke0JBU0V9L2FjdGl2aXRpZXMvJHthfS0ke2N9YCwgY2hhbmdlZnJlcTogXCJtb250aGx5XCIsIHByaW9yaXR5OiBcIjAuNlwiIH0pKVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIDYuIE1hcmtldHBsYWNlXG4gICAgICAgIGNvbnN0IG1rdENpdHk6IFNpdGVtYXBFbnRyeVtdID0gcDFDaXR5U2x1Z3MubWFwKGMgPT4gKHtcbiAgICAgICAgICBsb2M6IGAke0JBU0V9L21hcmtldHBsYWNlLyR7Y31gLCBjaGFuZ2VmcmVxOiBcIndlZWtseVwiLCBwcmlvcml0eTogXCIwLjdcIixcbiAgICAgICAgfSkpO1xuICAgICAgICBjb25zdCBta3RTdmNDaXR5OiBTaXRlbWFwRW50cnlbXSA9IHNlcnZpY2VDYXRlZ29yaWVzLmZsYXRNYXAocyA9PlxuICAgICAgICAgIHRvcDMwQ2l0aWVzLm1hcChjID0+ICh7IGxvYzogYCR7QkFTRX0vbWFya2V0cGxhY2UvJHtzfS8ke2N9YCwgY2hhbmdlZnJlcTogXCJtb250aGx5XCIsIHByaW9yaXR5OiBcIjAuNlwiIH0pKVxuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHNpdGVtYXBzOiBSZWNvcmQ8c3RyaW5nLCBTaXRlbWFwRW50cnlbXT4gPSB7XG4gICAgICAgICAgXCJzaXRlbWFwLWNvcmUueG1sXCI6IGNvcmVFbnRyaWVzLFxuICAgICAgICAgIFwic2l0ZW1hcC1jb3VudHJpZXMueG1sXCI6IGNvdW50cnlFbnRyaWVzLFxuICAgICAgICAgIFwic2l0ZW1hcC1jaXRpZXMueG1sXCI6IGNpdHlFbnRyaWVzLFxuICAgICAgICAgIFwic2l0ZW1hcC1zZXJ2aWNlcy54bWxcIjogWy4uLnN2Y0h1YnMsIC4uLnN2Y0NpdHldLFxuICAgICAgICAgIFwic2l0ZW1hcC1hY3Rpdml0aWVzLnhtbFwiOiBhY3RFbnRyaWVzLFxuICAgICAgICAgIFwic2l0ZW1hcC1tYXJrZXRwbGFjZS54bWxcIjogWy4uLm1rdENpdHksIC4uLm1rdFN2Y0NpdHldLFxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCB0b3RhbFVybHMgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IFtmaWxlLCBlbnRyaWVzXSBvZiBPYmplY3QuZW50cmllcyhzaXRlbWFwcykpIHtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgucmVzb2x2ZShcImRpc3RcIiwgZmlsZSksIHRvWG1sKGVudHJpZXMpLCBcInV0Zi04XCIpO1xuICAgICAgICAgIHRvdGFsVXJscyArPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGluZGV4WG1sID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHNpdGVtYXBpbmRleCB4bWxucz1cImh0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3NjaGVtYXMvc2l0ZW1hcC8wLjlcIj5cbiR7T2JqZWN0LmtleXMoc2l0ZW1hcHMpLm1hcChmID0+IGAgIDxzaXRlbWFwPjxsb2M+JHtCQVNFfS8ke2Z9PC9sb2M+PGxhc3Rtb2Q+JHt0b2RheX08L2xhc3Rtb2Q+PC9zaXRlbWFwPmApLmpvaW4oXCJcXG5cIil9XG48L3NpdGVtYXBpbmRleD5gO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgucmVzb2x2ZShcImRpc3RcIiwgXCJzaXRlbWFwLnhtbFwiKSwgaW5kZXhYbWwsIFwidXRmLThcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coYFtzaXRlbWFwXSBHZW5lcmF0ZWQgc2l0ZW1hcCBpbmRleCArICR7T2JqZWN0LmtleXMoc2l0ZW1hcHMpLmxlbmd0aH0gc3ViLXNpdGVtYXBzICgke3RvdGFsVXJsc30gVVJMcyB0b3RhbClgKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlMsU0FBUyxvQkFBb0I7QUFDMVUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1Qjs7O0FDVWhDLElBQU0sT0FBTztBQVNOLFNBQVMsZ0JBQXFCO0FBQ25DLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLGFBQWE7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLE1BQU0sVUFBVTtBQUNkLGNBQU0sS0FBSyxNQUFNLE9BQU8sSUFBSTtBQUM1QixjQUFNQSxRQUFPLE1BQU0sT0FBTyxNQUFNO0FBRWhDLFlBQUksQ0FBQyxHQUFHLFdBQVdBLE1BQUssUUFBUSxNQUFNLENBQUMsR0FBRztBQUN4QyxrQkFBUSxLQUFLLHFDQUFxQztBQUNsRDtBQUFBLFFBQ0Y7QUFHQSxjQUFNLGlCQUFpQjtBQUFBLFVBQ3JCO0FBQUEsVUFBVTtBQUFBLFVBQU07QUFBQSxVQUFTO0FBQUEsVUFBVztBQUFBLFVBQVM7QUFBQSxVQUFZO0FBQUEsVUFDekQ7QUFBQSxVQUFlO0FBQUEsVUFBTztBQUFBLFVBQVU7QUFBQSxVQUFPO0FBQUEsVUFBZ0I7QUFBQSxVQUFVO0FBQUEsVUFDakU7QUFBQSxVQUFZO0FBQUEsVUFBUztBQUFBLFVBQWE7QUFBQSxVQUFnQjtBQUFBLFVBQWE7QUFBQSxVQUFXO0FBQUEsUUFDNUU7QUFDQSxjQUFNLGNBQWM7QUFBQSxVQUNsQjtBQUFBLFVBQVM7QUFBQSxVQUFhO0FBQUEsVUFBUTtBQUFBLFVBQVE7QUFBQSxVQUFZO0FBQUEsVUFDbEQ7QUFBQSxVQUFVO0FBQUEsVUFBYztBQUFBLFVBQWE7QUFBQSxVQUNyQztBQUFBLFVBQVU7QUFBQSxVQUFhO0FBQUEsVUFBWTtBQUFBLFVBQ25DO0FBQUEsVUFBVTtBQUFBLFVBQVU7QUFBQSxVQUFXO0FBQUEsVUFDL0I7QUFBQSxVQUFRO0FBQUEsVUFBUztBQUFBLFVBQ2pCO0FBQUEsVUFBVTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsVUFBVTtBQUFBLFVBQ1Y7QUFBQSxVQUFZO0FBQUEsVUFBUztBQUFBLFVBQWU7QUFBQSxVQUNwQztBQUFBLFVBQVc7QUFBQSxVQUFhO0FBQUEsVUFDeEI7QUFBQSxVQUFTO0FBQUEsVUFDVDtBQUFBLFVBQVU7QUFBQSxVQUNWO0FBQUEsVUFBWTtBQUFBLFVBQ1o7QUFBQSxVQUNBO0FBQUEsVUFBVztBQUFBLFVBQVU7QUFBQSxVQUNyQjtBQUFBLFVBQVM7QUFBQSxVQUNUO0FBQUEsVUFBVTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQWE7QUFBQSxVQUNiO0FBQUEsVUFBYTtBQUFBLFVBQ2I7QUFBQSxVQUFVO0FBQUEsVUFBVTtBQUFBLFVBQVU7QUFBQSxVQUFVO0FBQUEsVUFBVTtBQUFBLFVBQWE7QUFBQSxVQUFTO0FBQUEsUUFDMUU7QUFDQSxjQUFNLG9CQUFvQjtBQUFBLFVBQ3hCO0FBQUEsVUFBWTtBQUFBLFVBQWU7QUFBQSxVQUFhO0FBQUEsVUFBYztBQUFBLFVBQ3REO0FBQUEsVUFBb0I7QUFBQSxVQUFZO0FBQUEsVUFBTztBQUFBLFVBQWU7QUFBQSxVQUN0RDtBQUFBLFVBQWE7QUFBQSxVQUFTO0FBQUEsVUFBZ0I7QUFBQSxRQUN4QztBQUNBLGNBQU0sZ0JBQWdCO0FBQUEsVUFDcEI7QUFBQSxVQUFpQjtBQUFBLFVBQWE7QUFBQSxVQUFpQjtBQUFBLFVBQWE7QUFBQSxVQUM1RDtBQUFBLFVBQWdCO0FBQUEsVUFBZ0I7QUFBQSxVQUFVO0FBQUEsVUFBVztBQUFBLFVBQ3JEO0FBQUEsVUFBb0I7QUFBQSxVQUFjO0FBQUEsVUFBWTtBQUFBLFVBQzlDO0FBQUEsVUFBbUI7QUFBQSxRQUNyQjtBQUVBLGNBQU0sU0FBUSxvQkFBSSxLQUFLLEdBQUUsWUFBWSxFQUFFLE1BQU0sR0FBRyxFQUFFO0FBQ2xELGNBQU0sUUFBUSxDQUFDLFlBQW9DO0FBQ2pELGdCQUFNLE9BQU8sUUFBUTtBQUFBLFlBQUksT0FDdkIsZUFBZSxFQUFFLEdBQUcsa0JBQWtCLEVBQUUsV0FBVyxLQUFLLHlCQUF5QixFQUFFLFVBQVUsMEJBQTBCLEVBQUUsUUFBUTtBQUFBLFVBQ25JLEVBQUUsS0FBSyxJQUFJO0FBQ1gsaUJBQU87QUFBQTtBQUFBLEVBQXlHLElBQUk7QUFBQTtBQUFBLFFBQ3RIO0FBR0EsY0FBTSxjQUE4QjtBQUFBLFVBQ2xDLENBQUMsS0FBSyxLQUFLO0FBQUEsVUFBRyxDQUFDLGNBQWMsS0FBSztBQUFBLFVBQ2xDLENBQUMsd0JBQXdCLEtBQUs7QUFBQSxVQUFHLENBQUMsc0JBQXNCLEtBQUs7QUFBQSxVQUM3RCxDQUFDLHFCQUFxQixLQUFLO0FBQUEsVUFBRyxDQUFDLHlCQUF5QixLQUFLO0FBQUEsVUFDN0QsQ0FBQyx1QkFBdUIsS0FBSztBQUFBLFVBQUcsQ0FBQyxlQUFlLEtBQUs7QUFBQSxVQUNyRCxDQUFDLHNCQUFzQixLQUFLO0FBQUEsVUFBRyxDQUFDLDRCQUE0QixLQUFLO0FBQUEsVUFDakUsQ0FBQyxpQ0FBaUMsS0FBSztBQUFBLFVBQUcsQ0FBQywrQkFBK0IsS0FBSztBQUFBLFVBQy9FLENBQUMsWUFBWSxLQUFLO0FBQUEsVUFBRyxDQUFDLGFBQWEsS0FBSztBQUFBLFVBQUcsQ0FBQyxnQkFBZ0IsS0FBSztBQUFBLFVBQ2pFLENBQUMsVUFBVSxLQUFLO0FBQUEsVUFBRyxDQUFDLFdBQVcsS0FBSztBQUFBLFVBQUcsQ0FBQyxZQUFZLEtBQUs7QUFBQSxVQUN6RCxDQUFDLFVBQVUsS0FBSztBQUFBLFVBQUcsQ0FBQyxXQUFXLEtBQUs7QUFBQSxVQUNwQyxDQUFDLFVBQVUsS0FBSztBQUFBLFVBQUcsQ0FBQyxZQUFZLEtBQUs7QUFBQSxVQUFHLENBQUMsWUFBWSxLQUFLO0FBQUEsVUFDMUQsQ0FBQyxpQkFBaUIsS0FBSztBQUFBLFVBQUcsQ0FBQyxVQUFVLEtBQUs7QUFBQSxVQUFHLENBQUMsWUFBWSxLQUFLO0FBQUEsVUFBRyxDQUFDLFNBQVMsS0FBSztBQUFBLFFBQ25GLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxZQUFZLFVBQVUsVUFBVSxLQUFlLEVBQUU7QUFHN0YsY0FBTSxpQkFBaUMsZUFBZSxRQUFRLE9BQUs7QUFBQSxVQUNqRSxFQUFFLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLFlBQVksV0FBVyxVQUFVLE1BQU07QUFBQSxVQUN0RSxFQUFFLEtBQUssR0FBRyxJQUFJLHdCQUF3QixDQUFDLElBQUksWUFBWSxXQUFXLFVBQVUsTUFBTTtBQUFBLFFBQ3BGLENBQUM7QUFHRCxjQUFNLGNBQThCLFlBQVksUUFBUSxPQUFLO0FBQUEsVUFDM0QsRUFBRSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxZQUFZLFVBQVUsVUFBVSxNQUFNO0FBQUEsVUFDbEUsRUFBRSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsYUFBYSxZQUFZLFdBQVcsVUFBVSxNQUFNO0FBQUEsVUFDNUUsRUFBRSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsZUFBZSxZQUFZLFdBQVcsVUFBVSxNQUFNO0FBQUEsVUFDOUUsRUFBRSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsY0FBYyxZQUFZLFdBQVcsVUFBVSxNQUFNO0FBQUEsVUFDN0UsRUFBRSxLQUFLLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLFlBQVksV0FBVyxVQUFVLE1BQU07QUFBQSxRQUNwRixDQUFDO0FBR0QsY0FBTSxVQUEwQixrQkFBa0IsSUFBSSxRQUFNO0FBQUEsVUFDMUQsS0FBSyxHQUFHLElBQUksYUFBYSxDQUFDO0FBQUEsVUFBSSxZQUFZO0FBQUEsVUFBVyxVQUFVO0FBQUEsUUFDakUsRUFBRTtBQUNGLGNBQU0sVUFBMEIsa0JBQWtCO0FBQUEsVUFBUSxPQUN4RCxZQUFZLElBQUksUUFBTSxFQUFFLEtBQUssR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLFdBQVcsVUFBVSxNQUFNLEVBQUU7QUFBQSxRQUN0RztBQUdBLGNBQU0sY0FBYyxZQUFZLE1BQU0sR0FBRyxFQUFFO0FBQzNDLGNBQU0sYUFBNkIsY0FBYztBQUFBLFVBQVEsT0FDdkQsWUFBWSxJQUFJLFFBQU0sRUFBRSxLQUFLLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxXQUFXLFVBQVUsTUFBTSxFQUFFO0FBQUEsUUFDeEc7QUFHQSxjQUFNLFVBQTBCLFlBQVksSUFBSSxRQUFNO0FBQUEsVUFDcEQsS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQUM7QUFBQSxVQUFJLFlBQVk7QUFBQSxVQUFVLFVBQVU7QUFBQSxRQUNuRSxFQUFFO0FBQ0YsY0FBTSxhQUE2QixrQkFBa0I7QUFBQSxVQUFRLE9BQzNELFlBQVksSUFBSSxRQUFNLEVBQUUsS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxXQUFXLFVBQVUsTUFBTSxFQUFFO0FBQUEsUUFDekc7QUFFQSxjQUFNLFdBQTJDO0FBQUEsVUFDL0Msb0JBQW9CO0FBQUEsVUFDcEIseUJBQXlCO0FBQUEsVUFDekIsc0JBQXNCO0FBQUEsVUFDdEIsd0JBQXdCLENBQUMsR0FBRyxTQUFTLEdBQUcsT0FBTztBQUFBLFVBQy9DLDBCQUEwQjtBQUFBLFVBQzFCLDJCQUEyQixDQUFDLEdBQUcsU0FBUyxHQUFHLFVBQVU7QUFBQSxRQUN2RDtBQUVBLFlBQUksWUFBWTtBQUNoQixtQkFBVyxDQUFDLE1BQU0sT0FBTyxLQUFLLE9BQU8sUUFBUSxRQUFRLEdBQUc7QUFDdEQsYUFBRyxjQUFjQSxNQUFLLFFBQVEsUUFBUSxJQUFJLEdBQUcsTUFBTSxPQUFPLEdBQUcsT0FBTztBQUNwRSx1QkFBYSxRQUFRO0FBQUEsUUFDdkI7QUFFQSxjQUFNLFdBQVc7QUFBQTtBQUFBLEVBRXZCLE9BQU8sS0FBSyxRQUFRLEVBQUUsSUFBSSxPQUFLLG1CQUFtQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxzQkFBc0IsRUFBRSxLQUFLLElBQUksQ0FBQztBQUFBO0FBRTlHLFdBQUcsY0FBY0EsTUFBSyxRQUFRLFFBQVEsYUFBYSxHQUFHLFVBQVUsT0FBTztBQUV2RSxnQkFBUSxJQUFJLHVDQUF1QyxPQUFPLEtBQUssUUFBUSxFQUFFLE1BQU0sa0JBQWtCLFNBQVMsY0FBYztBQUFBLE1BQzFIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjs7O0FEL0pBLFNBQVMsZUFBZTtBQUx4QixJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLHFCQUFxQixLQUFLLFVBQVUsS0FBSyxJQUFJLEVBQUUsU0FBUyxDQUFDO0FBQUEsRUFDM0Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsSUFDMUMsY0FBYztBQUFBLElBQ2QsUUFBUSxFQUFFLFNBQVMsS0FBSyxDQUFDO0FBQUEsRUFDM0IsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUNwQyw2QkFBNkIsS0FBSyxRQUFRLGtDQUFXLHlEQUF5RDtBQUFBLE1BQzlHLHdCQUF3QixLQUFLLFFBQVEsa0NBQVcsb0RBQW9EO0FBQUEsSUFDdEc7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNLFNBQVMsZUFBZSxDQUFDLFdBQVcsVUFBVSxJQUFJLENBQUM7QUFBQSxFQUMzRDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsY0FBYztBQUFBLElBQ2QsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUEsSUFDdkIsV0FBVztBQUFBLElBQ1gsc0JBQXNCO0FBQUEsSUFDdEIsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyx1QkFBdUI7QUFBQSxNQUNsQyxRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDL0IsZ0JBQUksR0FBRyxTQUFTLFdBQVcsRUFBRyxRQUFPO0FBQ3JDLGdCQUFJLEdBQUcsU0FBUyxRQUFRLEtBQUssR0FBRyxTQUFTLGNBQWMsS0FBSyxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDN0YsZ0JBQUksR0FBRyxTQUFTLFVBQVUsS0FBSyxHQUFHLFNBQVMsS0FBSyxFQUFHLFFBQU87QUFDMUQsZ0JBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDaEUsZ0JBQUksR0FBRyxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQ2pDLGdCQUFJLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNuQyxnQkFBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsZ0JBQUksR0FBRyxTQUFTLGFBQWEsRUFBRyxRQUFPO0FBQ3ZDLGdCQUFJLEdBQUcsU0FBUyxNQUFNLEtBQUssR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQy9ELGdCQUFJLEdBQUcsU0FBUyxnQkFBZ0IsRUFBRyxRQUFPO0FBQzFDLGdCQUFJLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNuQyxnQkFBSSxHQUFHLFNBQVMsU0FBUyxFQUFHLFFBQU87QUFDbkMsZ0JBQUksR0FBRyxTQUFTLGVBQWUsRUFBRyxRQUFPO0FBQ3pDLGdCQUFJLEdBQUcsU0FBUyxXQUFXLEVBQUcsUUFBTztBQUNyQyxnQkFBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsZ0JBQUksR0FBRyxTQUFTLFdBQVcsRUFBRyxRQUFPO0FBQ3JDLGdCQUFJLEdBQUcsU0FBUyxVQUFVLEtBQUssR0FBRyxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQzVELGdCQUFJLEdBQUcsU0FBUyxLQUFLLEVBQUcsUUFBTztBQUMvQixnQkFBSSxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFBQSxVQUMxQztBQUNBLGNBQUksR0FBRyxTQUFTLG9CQUFvQixFQUFHLFFBQU87QUFDOUMsY0FBSSxHQUFHLFNBQVMscUJBQXFCLEVBQUcsUUFBTztBQUMvQyxjQUFJLEdBQUcsU0FBUyxvQkFBb0IsRUFBRyxRQUFPO0FBQzlDLGNBQUksR0FBRyxTQUFTLHFCQUFxQixFQUFHLFFBQU87QUFDL0MsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEVBQUcsUUFBTztBQUNsRCxjQUFJLEdBQUcsU0FBUyxhQUFhLEtBQUssR0FBRyxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQy9ELGNBQUksR0FBRyxTQUFTLGFBQWEsS0FBSyxHQUFHLFNBQVMsVUFBVSxFQUFHLFFBQU87QUFDbEUsY0FBSSxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxRQUFRLEVBQUcsUUFBTztBQUNoRSxjQUFJLEdBQUcsU0FBUyx5QkFBeUIsRUFBRyxRQUFPO0FBQ25ELGNBQUksR0FBRyxTQUFTLDJCQUEyQixFQUFHLFFBQU87QUFDckQsY0FBSSxHQUFHLFNBQVMsc0JBQXNCLEtBQUssR0FBRyxTQUFTLGVBQWUsRUFBRyxRQUFPO0FBQ2hGLGNBQUksR0FBRyxTQUFTLGVBQWUsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxTQUFTLHVCQUF1QixLQUFLLEdBQUcsU0FBUyxlQUFlLEVBQUcsUUFBTztBQUNqRixjQUFJLEdBQUcsU0FBUyxxQkFBcUIsRUFBRyxRQUFPO0FBQUEsUUFDakQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
