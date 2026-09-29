import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// .env.local (fairview-dev only) for the database fixture in tests/theming.
loadEnvConfig(process.cwd());

// @playwright/test is pinned to the exact version of the machine's global Playwright (1.60.0) so it reuses
// the browsers already in %LOCALAPPDATA%\ms-playwright instead of downloading new ones.
export default defineConfig({
  testDir: "tests",
  testMatch: ["theming/**/*.spec.ts", "e2e/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    // Port 3100, not 3000: other local projects commonly occupy 3000, and reusing their server gives false results.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    navigationTimeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
