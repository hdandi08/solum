import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.test if present (local dev only — CI gets vars from SSM/env)
const envTestPath = path.join(__dirname, '.env.test');
if (fs.existsSync(envTestPath)) dotenv.config({ path: envTestPath });

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.DEV_BASE_URL || 'https://dev.d3pa095gzazg3c.amplifyapp.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'public',
      testMatch: /specs\/(0[1-4])-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      teardown: 'teardown',
    },
    {
      name: 'authenticated',
      testMatch: /specs\/05-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'teardown',
      testDir: './setup',
      testMatch: /teardown\.ts/,
    },
  ],
});
