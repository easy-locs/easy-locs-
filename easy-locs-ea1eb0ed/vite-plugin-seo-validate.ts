import type { Plugin } from "vite";
import { BASE_URL } from "./vite-seo-data";

export function seoValidatePlugin(): Plugin {
  return {
    name: "seo-validate",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path = await import("path");

        const distDir = path.resolve("dist");
        if (!fs.existsSync(distDir)) {
          console.warn("[seo-validate] dist/ not found, skipping");
          return;
        }

        const issues: string[] = [];
        const warnings: string[] = [];
        const titles = new Map<string, string>();
        const canonicals = new Map<string, string>();
        let totalPages = 0;
        let pagesWithJsonLd = 0;
        let pagesWithValidJsonLd = 0;
        let pagesWithOgImage = 0;
        let pagesWithCanonical = 0;
        let pagesWithSpeculationRules = 0;

        const htmlFiles: Array<{ path: string; rel: string }> = [];
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === "assets" || entry.name === ".well-known") continue;
              walk(full);
            } else if (entry.name.endsWith(".html") && entry.name !== "offline.html" && entry.name !== "bundle-report.html") {
              htmlFiles.push({ path: full, rel: path.relative(distDir, full) });
            }
          }
        };
        walk(distDir);

        for (const file of htmlFiles) {
          const content = fs.readFileSync(file.path, "utf-8");
          totalPages++;

          const titleMatch = content.match(/<title>([^<]*)<\/title>/);
          if (titleMatch) {
            const title = titleMatch[1];
            if (title.length > 70) {
              warnings.push(`Title too long (${title.length} chars) in ${file.rel}: "${title.slice(0, 50)}..."`);
            }
            if (titles.has(title)) {
              warnings.push(`Duplicate title "${title.slice(0, 50)}..." in ${file.rel} (also in ${titles.get(title)})`);
            } else {
              titles.set(title, file.rel);
            }
          } else {
            issues.push(`Missing <title> in ${file.rel}`);
          }

          const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/);
          if (descMatch) {
            if (descMatch[1].length > 155) {
              issues.push(`Description exceeds 155 chars (${descMatch[1].length}) in ${file.rel}`);
            }
            if (descMatch[1].length < 50) {
              warnings.push(`Description too short (${descMatch[1].length} chars) in ${file.rel}`);
            }
          }

          const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
          if (canonicalMatch) {
            pagesWithCanonical++;
            const canonical = canonicalMatch[1];
            if (!canonical.startsWith("https://")) {
              issues.push(`Canonical URL not HTTPS in ${file.rel}: ${canonical}`);
            }
            if (!canonical.startsWith(BASE_URL)) {
              issues.push(`Canonical URL domain mismatch in ${file.rel}: ${canonical} (expected ${BASE_URL})`);
            }
            if (canonicals.has(canonical) && file.rel !== canonicals.get(canonical)) {
              warnings.push(`Duplicate canonical ${canonical} in ${file.rel} (also in ${canonicals.get(canonical)})`);
            } else {
              canonicals.set(canonical, file.rel);
            }
          }

          const jsonLdMatches = content.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/g);
          if (jsonLdMatches) {
            pagesWithJsonLd++;
            let pageHasValidLd = false;
            const VALID_SCHEMA_TYPES = new Set([
              "LocalBusiness", "Organization", "WebSite", "WebPage",
              "BreadcrumbList", "FAQPage", "HowTo", "ItemList",
              "Service", "Article", "Product", "Offer", "Review",
              "AggregateRating", "Event", "Place", "PostalAddress",
              "GeoCoordinates", "ImageObject", "Person", "Thing",
              "CollectionPage", "SearchAction", "ListItem",
            ]);
            for (const match of jsonLdMatches) {
              const jsonStr = match.replace(/type="application\/ld\+json">/, "").replace(/<\/script>/, "").trim();
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed["@context"] && (parsed["@type"] || parsed["@graph"])) {
                  pageHasValidLd = true;
                } else {
                  warnings.push(`JSON-LD missing @context/@type/@graph in ${file.rel}`);
                }
                const validateType = (type: string, context: string) => {
                  if (!VALID_SCHEMA_TYPES.has(type)) {
                    warnings.push(`JSON-LD unknown schema.org type "${type}" in ${context} (${file.rel})`);
                  }
                };
                if (parsed["@type"]) validateType(parsed["@type"], "root");
                if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
                  for (const node of parsed["@graph"]) {
                    if (!node["@type"]) {
                      warnings.push(`JSON-LD @graph node missing @type in ${file.rel}`);
                    } else {
                      validateType(node["@type"], "@graph");
                    }
                  }
                }
              } catch {
                issues.push(`Invalid JSON-LD (parse error) in ${file.rel}`);
              }
            }
            if (pageHasValidLd) pagesWithValidJsonLd++;
          }

          const ogImageMatch = content.match(/property="og:image"\s+content="([^"]*)"/);
          if (ogImageMatch) {
            pagesWithOgImage++;
            const ogUrl = ogImageMatch[1];
            if (ogUrl.startsWith(BASE_URL)) {
              const ogPath = ogUrl.replace(BASE_URL, "");
              const ogFile = path.resolve(distDir, ogPath.startsWith("/") ? ogPath.slice(1) : ogPath);
              if (!fs.existsSync(ogFile)) {
                warnings.push(`OG image file missing: ${ogPath} (referenced in ${file.rel})`);
              } else if (ogFile.endsWith(".svg")) {
                const svgContent = fs.readFileSync(ogFile, "utf-8");
                const widthMatch = svgContent.match(/width="(\d+)"/);
                const heightMatch = svgContent.match(/height="(\d+)"/);
                if (widthMatch && heightMatch) {
                  const w = parseInt(widthMatch[1], 10);
                  const h = parseInt(heightMatch[1], 10);
                  if (w !== 1200 || h !== 630) {
                    warnings.push(`OG image wrong dimensions ${w}×${h} (expected 1200×630) in ${ogFile}`);
                  }
                }
              }
            }
          }

          if (content.includes('type="speculationrules"')) {
            pagesWithSpeculationRules++;
          }

          const isContentHub = file.rel.startsWith("guide/") || file.rel.startsWith("best/") || file.rel.startsWith("compare/");
          if (isContentHub) {
            const bodyMatch = content.match(/<div id="seo-prerender">([\s\S]*?)<\/div>/);
            if (bodyMatch) {
              const textContent = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              const wordCount = textContent.split(" ").filter(w => w.length > 0).length;
              if (wordCount < 800) {
                warnings.push(`Content hub page below 800 words (${wordCount} words) in ${file.rel}`);
              }
            }
          }
        }

        const sitemapFiles = ["sitemap.xml", "sitemap-core.xml", "sitemap-cities.xml", "sitemap-services.xml", "sitemap-activities.xml", "sitemap-marketplace.xml", "sitemap-guides.xml", "sitemap-best.xml", "sitemap-compare.xml", "sitemap-countries.xml", "sitemap-images.xml", "sitemap-news.xml"];
        let sitemapUrlCount = 0;
        const missingSitemaps: string[] = [];
        for (const sf of sitemapFiles) {
          const fp = path.resolve(distDir, sf);
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, "utf-8");
            const urlCount = (content.match(/<url>/g) || []).length + (content.match(/<sitemap>/g) || []).length;
            sitemapUrlCount += urlCount;
          } else {
            missingSitemaps.push(sf);
          }
        }
        if (missingSitemaps.length > 0) {
          warnings.push(`Missing sitemap files: ${missingSitemaps.join(", ")}`);
        }

        const ogDir = path.resolve(distDir, "og");
        let ogFileCount = 0;
        if (fs.existsSync(ogDir)) {
          const ogFiles = fs.readdirSync(ogDir);
          ogFileCount = ogFiles.filter((f: string) => f.endsWith(".svg")).length;
        }

        const trustFiles = [
          ".well-known/security.txt",
          "humans.txt",
          "llms.txt",
          "robots.txt",
          ".well-known/indexnow-key.txt",
        ];
        const missingTrust = trustFiles.filter(f => !fs.existsSync(path.resolve(distDir, f)));

        const feedFiles = ["feed.xml", "feed/cities.xml", "feed/services.xml", "feed/atom.xml", "feed/cities-atom.xml", "feed/services-atom.xml"];
        const missingFeeds = feedFiles.filter(f => !fs.existsSync(path.resolve(distDir, f)));

        const rawScore =
          (Math.min(pagesWithCanonical, totalPages) / Math.max(totalPages, 1)) * 20 +
          (Math.min(pagesWithValidJsonLd, totalPages) / Math.max(totalPages, 1)) * 20 +
          (Math.min(pagesWithOgImage, totalPages) / Math.max(totalPages, 1)) * 15 +
          (1 - missingTrust.length / trustFiles.length) * 10 +
          (1 - missingFeeds.length / feedFiles.length) * 10 +
          (missingSitemaps.length === 0 ? 10 : 5) +
          (ogFileCount > 50 ? 10 : ogFileCount > 10 ? 5 : 0) +
          (issues.length === 0 ? 5 : 0);
        const score = Math.max(0, Math.min(100, Math.round(rawScore)));

        const report = [
          "═══════════════════════════════════════════════════",
          "  Easy-Locs SEO Health Report (2026 Ultra)",
          "═══════════════════════════════════════════════════",
          "",
          `  SEO Score: ${score}/100`,
          "",
          `  Pages analyzed:         ${totalPages}`,
          `  Unique titles:          ${titles.size}`,
          `  Pages with canonical:   ${pagesWithCanonical}`,
          `  Pages with JSON-LD:     ${pagesWithJsonLd}`,
          `  Pages with valid LD:    ${pagesWithValidJsonLd}`,
          `  Pages with OG image:    ${pagesWithOgImage}`,
          `  Pages with spec rules:  ${pagesWithSpeculationRules}`,
          `  Sitemap URLs/entries:   ${sitemapUrlCount}`,
          `  OG image files:         ${ogFileCount}`,
          "",
          `  Trust files:            ${trustFiles.length - missingTrust.length}/${trustFiles.length}`,
          ...(missingTrust.length > 0 ? [`    Missing: ${missingTrust.join(", ")}`] : []),
          `  RSS feeds:              ${feedFiles.length - missingFeeds.length}/${feedFiles.length}`,
          ...(missingFeeds.length > 0 ? [`    Missing: ${missingFeeds.join(", ")}`] : []),
          `  Sitemap files:          ${sitemapFiles.length - missingSitemaps.length}/${sitemapFiles.length}`,
          ...(missingSitemaps.length > 0 ? [`    Missing: ${missingSitemaps.join(", ")}`] : []),
          "",
          ...(issues.length > 0 ? [
            `  ❌ Critical Issues (${issues.length}):`,
            `  Issue type breakdown:`,
            ...Object.entries(
              issues.reduce<Record<string, number>>((acc, i) => {
                const key = i.replace(/in [^\s]+$/, "").replace(/\s+\([^)]+\)/g, "").replace(/[\d]+/g, "N").slice(0, 80);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([k, v]) => `    × ${v} — ${k}`),
            `  First 25 examples:`,
            ...issues.slice(0, 25).map(i => `    - ${i}`),
          ] : ["  ✓ No critical issues"]),
          "",
          ...(warnings.length > 0 ? [
            `  ⚠ Warnings (${warnings.length}):`,
            ...warnings.slice(0, 20).map(w => `    - ${w}`),
          ] : ["  ✓ No warnings"]),
          "",
          "═══════════════════════════════════════════════════",
        ].join("\n");

        fs.writeFileSync(path.resolve(distDir, "seo-report.txt"), report, "utf-8");
        console.log(`\n${report}`);

        const SEO_GATE_BYPASS = process.env.SEO_GATE_BYPASS === "1" || process.env.VERCEL === "1";
        const SEO_ISSUES_THRESHOLD = Number(process.env.SEO_ISSUES_THRESHOLD ?? 0);

        if (issues.length > SEO_ISSUES_THRESHOLD) {
          const msg = `[seo-validate] BUILD GATE: ${issues.length} critical SEO issue(s) detected (threshold ${SEO_ISSUES_THRESHOLD}) — see report above`;
          if (SEO_GATE_BYPASS) {
            console.warn(`⚠️  ${msg}`);
            console.warn(`⚠️  SEO_GATE_BYPASS active — build will continue. Fix issues then remove bypass.`);
          } else {
            console.error(msg);
            throw new Error(msg);
          }
        }

        if (missingTrust.length > 0) {
          const msg = `[seo-validate] BUILD GATE: Missing trust files: ${missingTrust.join(", ")}`;
          if (SEO_GATE_BYPASS) {
            console.warn(`⚠️  ${msg}`);
          } else {
            console.error(msg);
            throw new Error(msg);
          }
        }

        if (score < 50) {
          const msg = `[seo-validate] BUILD GATE: SEO score ${score}/100 is below minimum threshold of 50`;
          if (SEO_GATE_BYPASS) {
            console.warn(`⚠️  ${msg}`);
          } else {
            console.error(msg);
            throw new Error(msg);
          }
        }
      },
    },
  };
}
