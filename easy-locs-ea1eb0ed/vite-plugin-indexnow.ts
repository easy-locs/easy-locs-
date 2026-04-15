import type { Plugin } from "vite";
import { BASE_URL } from "./vite-seo-data";
import { createHash } from "crypto";

const INDEXNOW_KEY = "easylocs2026indexnowkey";
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
  "https://searchadvisor.naver.com/indexnow",
  "https://search.seznam.cz/indexnow",
];

export function indexNowPlugin(): Plugin {
  return {
    name: "indexnow-submit",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const fs = await import("fs");
        const path = await import("path");

        const distDir = path.resolve("dist");
        if (!fs.existsSync(distDir)) {
          console.warn("[indexnow] dist/ not found, skipping");
          return;
        }

        const wellKnown = path.resolve(distDir, ".well-known");
        if (!fs.existsSync(wellKnown)) {
          fs.mkdirSync(wellKnown, { recursive: true });
        }
        fs.writeFileSync(path.resolve(wellKnown, "indexnow-key.txt"), INDEXNOW_KEY, "utf-8");
        fs.writeFileSync(path.resolve(distDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, "utf-8");

        const htmlFiles: Array<{ url: string; hash: string }> = [];
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name === "index.html") {
              const rel = path.relative(distDir, path.dirname(full));
              const urlPath = rel === "" ? "/" : `/${rel.replace(/\\/g, "/")}`;
              const content = fs.readFileSync(full, "utf-8");
              const hash = createHash("md5").update(content).digest("hex").slice(0, 12);
              htmlFiles.push({ url: `${BASE_URL}${urlPath}`, hash });
            }
          }
        };
        walk(distDir);

        const manifestPath = path.resolve(distDir, "_indexnow-manifest.json");
        let previousManifest: Record<string, string> = {};
        const cachePath = path.resolve(".indexnow-cache.json");
        if (fs.existsSync(cachePath)) {
          try {
            previousManifest = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
          } catch {
            previousManifest = {};
          }
        }

        const currentManifest: Record<string, string> = {};
        const changedUrls: string[] = [];
        for (const { url, hash } of htmlFiles) {
          currentManifest[url] = hash;
          if (previousManifest[url] !== hash) {
            changedUrls.push(url);
          }
        }

        fs.writeFileSync(cachePath, JSON.stringify(currentManifest, null, 2), "utf-8");
        fs.writeFileSync(manifestPath, JSON.stringify(changedUrls, null, 2), "utf-8");

        const urlsToSubmit = changedUrls.length > 0 ? changedUrls : htmlFiles.map(f => f.url);

        const submitBatch = async (endpoint: string, urls: string[]) => {
          const body = JSON.stringify({
            host: new URL(BASE_URL).hostname,
            key: INDEXNOW_KEY,
            keyLocation: `${BASE_URL}/.well-known/indexnow-key.txt`,
            urlList: urls.slice(0, 10000),
          });

          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body,
              signal: AbortSignal.timeout(10000),
            });
            return { endpoint, status: response.status, ok: response.ok };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return { endpoint, status: 0, ok: false, error: message };
          }
        };

        console.log(`[indexnow] ${htmlFiles.length} total URLs, ${changedUrls.length} changed since last build`);
        console.log(`[indexnow] Key file written to .well-known/indexnow-key.txt and ${INDEXNOW_KEY}.txt`);

        if (process.env.INDEXNOW_SKIP !== "true") {
          console.log(`[indexnow] Submitting ${urlsToSubmit.length} URLs to ${INDEXNOW_ENDPOINTS.length} endpoints...`);
          const results = await Promise.allSettled(
            INDEXNOW_ENDPOINTS.map(ep => submitBatch(ep, urlsToSubmit))
          );
          for (const r of results) {
            if (r.status === "fulfilled") {
              const { endpoint, status, ok } = r.value;
              console.log(`[indexnow] ${endpoint}: ${ok ? "✓" : "✗"} (HTTP ${status})`);
            }
          }
        } else {
          console.log(`[indexnow] Submission skipped (INDEXNOW_SKIP=true)`);
        }
      },
    },
  };
}
