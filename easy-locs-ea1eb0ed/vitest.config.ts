import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "tests/**"],
    testTimeout: 15000,
    sequence: {
      shuffle: true,
      seed: 42,
    },
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/components/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/services/**/*.{ts,tsx}",
        "src/stores/**/*.{ts,tsx}",
        "src/engines/**/*.{ts,tsx}",
        "src/domains/**/*.{ts,tsx}",
        "src/core/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/test/**",
        "src/e2e/**",
        "src/**/__mocks__/**",
        "src/stories/**",
        "src/types/**",
      ],
      thresholds: {
        branches: 70,
        lines: 75,
        functions: 75,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
