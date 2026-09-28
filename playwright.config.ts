import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// .env.local (fairview-dev only) for the database fixture in tests/theming.
loadEnvConfig(process.cwd());

// @playwright/test is pinned to the exact version of the machine's global Playwright (1.60.0) so it reuses
// the browsers already in %LOCALAPPDATA%\ms-playwright instead of downloading new ones.
export default defineConfig({
  testDir: "tests/theming",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    navigationTimeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
