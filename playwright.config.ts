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
  // A production build, not the dev server: on this machine the dev server compiled each route on first use (29 to
  // 35 s per page) and once left a server action unanswered (PHASE_2_REWORK_4.md N12). Production is also what
  // Vercel serves. Secure cookies still work, since browsers treat http://localhost as a secure context.
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 600_000,
  },
});
