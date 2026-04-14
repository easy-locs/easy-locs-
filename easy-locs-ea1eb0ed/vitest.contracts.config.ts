import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/contracts/**/*.contract.test.ts"],
    testTimeout: 30000,
    globals: true,
  },
});
