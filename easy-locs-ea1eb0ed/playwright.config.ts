import { defineConfig, devices } from "@playwright/test";

const CI_PREVIEW_PORT = 4173;
const BASE_URL =
  process.env.BASE_URL ||
  (process.env.CI ? `http://localhost:${CI_PREVIEW_PORT}` : "http://localhost:5000");
const isExternalUrl =
  !!process.env.BASE_URL && !/localhost|127\.0\.0\.1|\[::1\]/.test(process.env.BASE_URL);

/**
 * Browser channels to activate.
 *
 * Default: chromium-desktop + chromium-mobile (fastest, backward-compatible).
 * Set E2E_BROWSERS=all  to run the full armada:
 *   chromium-desktop · firefox-desktop · webkit-desktop ·
 *   chromium-mobile  · webkit-mobile
 * Set E2E_BROWSERS=chromium,firefox  to pick a subset.
 *
 * Examples
 *   E2E_BROWSERS=all npx playwright test
 *   E2E_BROWSERS=chromium,firefox npx playwright test --shard=1/4
 */
const ACTIVE_BROWSERS = new Set(
  (process.env.E2E_BROWSERS ?? "chromium").toLowerCase().split(",").map((b) => b.trim()),
);
const ALL_BROWSERS = ACTIVE_BROWSERS.has("all");

/** Parallel workers:  CI default = 4  (override with E2E_WORKERS=N). */
const WORKERS = process.env.E2E_WORKERS
  ? Number(process.env.E2E_WORKERS)
  : process.env.CI
  ? 4
  : undefined;

export default defineConfig({
  globalSetup: "./e2e/seed/seed.ts",
  globalTeardown: "./e2e/seed/cleanup.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: WORKERS,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "e2e-results.json" }],
    ["list"],
    ...(process.env.CI ? [["junit", { outputFile: "e2e-results.xml" }] as const] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  updateSnapshots:
    process.env.CI
      ? "none"
      : process.env.UPDATE_SNAPSHOTS === "true"
      ? "all"
      : "missing",

  /* ── Armada: one project per browser channel ─────────────────────────── */
  projects: [
    // ── Chromium — always on ──────────────────────────────────────────────
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
    // ── Firefox ───────────────────────────────────────────────────────────
    ...(ALL_BROWSERS || ACTIVE_BROWSERS.has("firefox")
      ? [
          {
            name: "firefox-desktop",
            use: { ...devices["Desktop Firefox"] },
          },
        ]
      : []),
    // ── WebKit (Safari) ───────────────────────────────────────────────────
    ...(ALL_BROWSERS || ACTIVE_BROWSERS.has("webkit")
      ? [
          {
            name: "webkit-desktop",
            use: { ...devices["Desktop Safari"] },
          },
          {
            name: "webkit-mobile",
            use: { ...devices["iPhone 14"] },
          },
        ]
      : []),
  ],

  ...(!isExternalUrl && {
    webServer: {
      command: process.env.CI
        ? `npx vite preview --port ${CI_PREVIEW_PORT} --strict-port`
        : "npm run dev",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
