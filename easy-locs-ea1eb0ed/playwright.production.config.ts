import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://easy-locs.com";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 4,
  reporter: [
    ["json", { outputFile: "e2e-results.json" }],
    ["list"],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  updateSnapshots: "none",
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
});
