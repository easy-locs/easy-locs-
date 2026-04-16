import { test, expect } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import mime from "mime-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const SWAP_ROOT = path.join(REPO_ROOT, "e2e", ".swap-cache-test");
const V1_DIR = DIST_DIR;
const V2_DIR = path.join(SWAP_ROOT, "v2");

const NEW_BUILD_VERSION = `e2e-newbuild-${Date.now()}`;
const V2_MARKER = `e2e-swap-marker-${NEW_BUILD_VERSION}`;

type ServableRoot = { current: string };

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(s), d);
    else fs.copyFileSync(s, d);
  }
}

function detectBuildVersion(distDir: string): string | null {
  const swPath = path.join(distDir, "sw.js");
  if (!fs.existsSync(swPath)) return null;
  const sw = fs.readFileSync(swPath, "utf8");
  const m = sw.match(/easylocs-([A-Za-z0-9._-]+)/);
  return m ? m[1] : null;
}

function mutateV2(v2Dir: string, oldVersion: string, newVersion: string) {
  const rewriteFiles = ["sw.js", "firebase-messaging-sw.js", "index.html"];
  for (const rel of rewriteFiles) {
    const p = path.join(v2Dir, rel);
    if (!fs.existsSync(p)) continue;
    let txt = fs.readFileSync(p, "utf8");
    txt = txt.split(oldVersion).join(newVersion);
    fs.writeFileSync(p, txt);
  }

  // Inject an HTML marker so the test can confirm the new deploy was served.
  const indexPath = path.join(v2Dir, "index.html");
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    const marker = `<meta name="e2e-build-marker" content="${V2_MARKER}" />`;
    if (!html.includes(marker)) {
      html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n    ${marker}`);
      fs.writeFileSync(indexPath, html);
    }
  }

  // Re-stamp firebase SW banner so __APP_BUILD_VERSION__ matches new version.
  const fbSw = path.join(v2Dir, "firebase-messaging-sw.js");
  if (fs.existsSync(fbSw)) {
    const original = fs.readFileSync(fbSw, "utf8");
    const cleaned = original.replace(
      /^\/\/ build-version: .*\nself\.__APP_BUILD_VERSION__ = .*;\n/,
      "",
    );
    const banner =
      `// build-version: ${newVersion}\n` +
      `self.__APP_BUILD_VERSION__ = ${JSON.stringify(newVersion)};\n`;
    fs.writeFileSync(fbSw, banner + cleaned);
  }
}

function startSwappableServer(state: ServableRoot): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", "http://localhost");
        let rel = decodeURIComponent(url.pathname);
        if (rel.endsWith("/")) rel += "index.html";
        const filePath = path.normalize(path.join(state.current, rel));
        if (!filePath.startsWith(state.current)) {
          res.statusCode = 403;
          res.end("forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          // SPA fallback for navigations
          const accept = req.headers.accept || "";
          if (accept.includes("text/html")) {
            const fallback = path.join(state.current, "index.html");
            if (fs.existsSync(fallback)) {
              res.statusCode = 200;
              res.setHeader("content-type", "text/html; charset=utf-8");
              res.setHeader("cache-control", "no-store");
              res.end(fs.readFileSync(fallback));
              return;
            }
          }
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const type = mime.lookup(filePath) || "application/octet-stream";
        res.statusCode = 200;
        res.setHeader("content-type", type);
        // Disable cache at transport level; the SW is what we're testing.
        res.setHeader("cache-control", "no-store");
        res.end(fs.readFileSync(filePath));
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const hasV1Build = fs.existsSync(path.join(V1_DIR, "sw.js"))
  && fs.existsSync(path.join(V1_DIR, "index.html"));

test.describe("Service worker cache swap on fresh deploy", () => {
  test.skip(
    !hasV1Build,
    "Requires a production build (dist/sw.js) — run `npm run build` first.",
  );

  let server: http.Server;
  let baseUrl: string;
  const state: ServableRoot = { current: V1_DIR };
  let oldVersion: string;

  test.beforeAll(async () => {
    const detected = detectBuildVersion(V1_DIR);
    expect(detected, "Expected sw.js to contain a BUILD_VERSION tag").toBeTruthy();
    oldVersion = detected!;

    if (fs.existsSync(V2_DIR)) fs.rmSync(V2_DIR, { recursive: true, force: true });
    copyDirSync(V1_DIR, V2_DIR);
    mutateV2(V2_DIR, oldVersion, NEW_BUILD_VERSION);

    server = await startSwappableServer(state);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(V2_DIR)) {
      fs.rmSync(V2_DIR, { recursive: true, force: true });
    }
  });

  test("fresh deploy replaces old SW caches and renders new build on first reload", async ({ browser }, testInfo) => {
    // Run once on desktop chromium — SW lifecycle does not vary by viewport
    // and doubling it on mobile only inflates CI time.
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "SW cache swap test runs in chromium-desktop only.",
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    // --- Phase 1: Install the old build's service worker ---
    state.current = V1_DIR;
    await page.goto(`${baseUrl}/`, { waitUntil: "load" });

    await page.waitForFunction(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    }, null, { timeout: 30_000 });

    // Confirm v1 caches exist (workbox precache and/or html-shell).
    await expect.poll(
      async () => await page.evaluate(() => caches.keys()),
      { timeout: 15_000, message: "workbox caches never appeared" },
    ).toEqual(expect.arrayContaining([expect.stringMatching(/^(easylocs|html-shell)-/)]));

    // Confirm the v2 marker is NOT present yet.
    const markerBefore = await page.locator('meta[name="e2e-build-marker"]').count();
    expect(markerBefore).toBe(0);

    // --- Phase 2: Swap in the new build artifact ---
    state.current = V2_DIR;

    // --- Phase 3: Reload once and assert the new build renders ---
    await page.reload({ waitUntil: "load" });

    // The new marker must appear after the first reload.
    await expect(page.locator('meta[name="e2e-build-marker"]')).toHaveAttribute(
      "content",
      V2_MARKER,
      { timeout: 20_000 },
    );

    // The app root must hydrate beyond the loading-logo trap.
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.childElementCount > 0;
    }, null, { timeout: 20_000 });

    // SW must pick up the new version: either a new version-tagged cache
    // appears, or the old version-tagged caches have been cleaned up.
    await expect.poll(
      async () => {
        const names = await page.evaluate(() => caches.keys());
        const hasNewTagged = names.some((n) => n.includes(NEW_BUILD_VERSION));
        const oldTaggedRemaining = names.filter((n) => n.includes(oldVersion));
        return hasNewTagged || oldTaggedRemaining.length === 0;
      },
      { timeout: 20_000, message: "SW caches never reflected the new build" },
    ).toBe(true);

    await context.close();
  });
});
