// @ts-check
const { defineConfig, devices } = require('./backend/node_modules/@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false, // Run sequentially for shared state/db consistency
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        viewport: { width: 1280, height: 720 } 
      },
    },
    {
      name: 'Mobile Chrome (375px)',
      use: {
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
});
