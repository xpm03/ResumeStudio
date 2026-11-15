import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Playwright inherits undefined options. Remove Chromium's channel from the
// shared configuration instead of trying to override it with undefined.
const { channel: _chromiumChannel, ...sharedUse } = base.use || {};
export default defineConfig({ ...base, use: sharedUse }, {
  testIgnore: [],
  testMatch: '**/compatibility.spec.ts',
  projects: [
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
