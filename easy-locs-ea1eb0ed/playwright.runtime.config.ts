import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Supreme Runtime Audit config (task #1069).
 *
 * Separate from the main `playwright.config.ts` because:
 *  - Targets a different testDir (`tests/runtime/execution`).
 *  - Defines six "worker groups" via Playwright `projects`, each tagged with
 *    a grep marker so the suite can be sliced (auth+dashboard, commerce,
 *    wallet+orders, orbit+notifications+profile, mobile+overlays,
 *    edge-case stress).
 *  - Captures trace/screenshot/console/network on failure, isolates browser
 *    contexts (default), and reuses the dev server already running on
 *    port 5000 (no global setup that requires Supabase service-role).
 */

const PORT = Number(process.env.PORT || 5000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const isExternalUrl =
  !!process.env.BASE_URL &&
  !/localhost|127\.0\.0\.1|\[::1\]/.test(process.env.BASE_URL);

export default defineConfig({
  testDir: "./tests/runtime",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.RUNTIME_WORKERS
    ? Number(process.env.RUNTIME_WORKERS)
    : process.env.CI
      ? 2
      : 4,
  reporter: [
    ["list"],
    ["./tests/runtime/execution/_stream-reporter.ts"],
    ["json", { outputFile: "runtime-audit-results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
  },
  timeout: 45_000,
  expect: { timeout: 10_000 },
  projects: [
    {
      name: "phase1-core-access",
      grep: /@phase1/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phase2-primary-flows",
      grep: /@phase2/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phase3-edge-stress",
      grep: /@phase3/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phase4-mobile",
      grep: /@phase4/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "phase5-deeplinks",
      grep: /@phase5/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(!isExternalUrl && {
    webServer: {
      command: process.env.CI
        ? `npx vite preview --port ${PORT} --strict-port`
        : "npm run dev",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
});
