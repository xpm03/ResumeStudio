import { defineConfig } from '@playwright/test';

const localUrl = `http://127.0.0.1:4173${process.env.GITHUB_ACTIONS ? '/ResumeStudio/' : '/'}`;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  expect: { timeout: 45000 },
  fullyParallel: false,
  workers: 1,
  use: { channel: 'chromium', baseURL: process.env.PLAYWRIGHT_BASE_URL || localUrl, trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: localUrl, reuseExistingServer: false,
  },
});
