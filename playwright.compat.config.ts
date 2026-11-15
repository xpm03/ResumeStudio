import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testIgnore: [],
  testMatch: '**/compatibility.spec.ts',
  projects: [
    { name: 'firefox', use: { browserName: 'firefox', channel: undefined } },
    { name: 'webkit', use: { browserName: 'webkit', channel: undefined } },
  ],
});
