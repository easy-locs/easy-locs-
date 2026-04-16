import { defineConfig, devices } from "@playwright/test";

const CI_PREVIEW_PORT = 4173;
const BASE_URL = process.env.BASE_URL || (process.env.CI ? `http://localhost:${CI_PREVIEW_PORT}` : "http://localhost:5000");
const isExternalUrl = !!process.env.BASE_URL && !/localhost|127\.0\.0\.1|\[::1\]/.test(process.env.BASE_URL);

export default defineConfig({
  globalSetup: "./e2e/seed/seed.ts",
  globalTeardown: "./e2e/seed/cleanup.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "e2e-results.json" }],
    ["list"],
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
  updateSnapshots: process.env.CI ? "none" : (process.env.UPDATE_SNAPSHOTS === "true" ? "all" : "missing"),
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  ...(!isExternalUrl && {
    webServer: {
      command: process.env.CI ? `npx vite preview --port ${CI_PREVIEW_PORT} --strict-port` : "npm run dev",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
