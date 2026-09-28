import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.test.ts"],
    // .env.local (development only) is loaded for suites that talk to fairview-dev.
    env: loadEnv(mode, process.cwd(), ""),
    // The isolation suite shares fixtures and a hosted database; never run files in parallel.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 300_000,
  },
}));
