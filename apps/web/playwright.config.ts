import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [["line"]],
  webServer: [
    {
      command: "VULCAN_API_PORT=8791 pnpm --filter @vulcan/api start",
      url: "http://127.0.0.1:8791/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "VULCAN_API_BASE_URL=http://127.0.0.1:8791 NEXT_PUBLIC_VULCAN_WS_URL=ws://127.0.0.1:8791/api/ws pnpm --filter @vulcan/web dev --port 3216 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3216",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3216",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
});
