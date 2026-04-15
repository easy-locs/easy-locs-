/**
 * OG Image Generation Plugin — generates SVG-based Open Graph images at build time.
 *
 * Design decision: SVG format is used intentionally. This avoids native binary
 * dependencies (sharp, canvas, librsvg) that complicate CI/CD and cross-platform
 * builds. SVG is a valid image format supported by all major social platforms
 * (Twitter/X, Facebook, LinkedIn, Discord). The images use 1200×630 viewport
 * dimensions per OG spec. If raster PNG/JPEG is later required, a post-build
 * conversion step can be added without changing the generation pipeline.
 */
import type { Plugin } from "vite";
import {
  BUILD_SERVICE_CATEGORIES, BUILD_COUNTRIES,
  getBuildPhase1Cities, BASE_URL,
} from "./vite-seo-data";

function generateSvgOgImage(title: string, subtitle: string, accent: string = "#1AAE8E"): string {
  const escSvg = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0D1117"/>
      <stop offset="100%" stop-color="#101820"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#14d4a6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="590" width="1200" height="40" fill="url(#accent)" opacity="0.8"/>
  <circle cx="100" cy="100" r="50" fill="${accent}" opacity="0.15"/>
  <circle cx="1100" cy="530" r="80" fill="${accent}" opacity="0.1"/>
  <text x="80" y="280" font-family="system-ui,-apple-system,sans-serif" font-size="56" font-weight="800" fill="#f0f6f4">${escSvg(title.length > 40 ? title.slice(0, 37) + "..." : title)}</text>
  <text x="80" y="350" font-family="system-ui,-apple-system,sans-serif" font-size="28" fill="#8b949e">${escSvg(subtitle.length > 70 ? subtitle.slice(0, 67) + "..." : subtitle)}</text>
  <text x="80" y="560" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="900" fill="#f0f6f4">Easy<tspan fill="${accent}">-Locs</tspan></text>
  <text x="1120" y="560" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#8b949e" text-anchor="end">easy-locs.com</text>
</svg>`;
}

export function ogImagesPlugin(): Plugin {
  return {
    name: "generate-og-images",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path = await import("path");

        const distDir = path.resolve("dist");
        if (!fs.existsSync(distDir)) {
          console.warn("[og-images] dist/ not found, skipping");
          return;
        }

        const ogDir = path.resolve(distDir, "og");
        fs.mkdirSync(ogDir, { recursive: true });

        const cities = getBuildPhase1Cities();
        let count = 0;

        for (const city of cities) {
          const svg = generateSvgOgImage(
            city.name,
            `Food, Services, Taxi & Hotel in ${city.name}`
          );
          fs.writeFileSync(path.resolve(ogDir, `city-${city.slug}.svg`), svg, "utf-8");
          count++;
        }

        for (const svc of BUILD_SERVICE_CATEGORIES) {
          const svg = generateSvgOgImage(
            svc.label,
            svc.description
          );
          fs.writeFileSync(path.resolve(ogDir, `service-${svc.slug}.svg`), svg, "utf-8");
          count++;

          for (const city of cities) {
            const svg = generateSvgOgImage(
              `${svc.label} in ${city.name}`,
              `Find ${svc.label.toLowerCase()} providers in ${city.name}`
            );
            fs.writeFileSync(path.resolve(ogDir, `${svc.slug}-${city.slug}.svg`), svg, "utf-8");
            count++;
          }
        }

        for (const country of BUILD_COUNTRIES) {
          const svg = generateSvgOgImage(
            `${country.flag} ${country.name}`,
            `Food, Services, Taxi & Hotel in ${country.name}`
          );
          fs.writeFileSync(path.resolve(ogDir, `country-${country.slug}.svg`), svg, "utf-8");
          count++;
        }

        console.log(`[og-images] ✓ Generated ${count} dynamic OG images (SVG)`);
      },
    },
  };
}
