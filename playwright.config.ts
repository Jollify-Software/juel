// Browser tests (`npm run test:browser`): Playwright in the installed Chrome,
// against pages served from the repo root. Unit tests stay in Jest (`npm test`).
import { defineConfig } from '@playwright/test';

const port = 4174;

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    reporter: [['list']],
    use: {
        baseURL: `http://localhost:${port}/`,
        channel: 'chrome',
        headless: true,
    },
    webServer: {
        command: `node tests/e2e/server.mjs ${port}`,
        url: `http://localhost:${port}/tests/e2e/server.mjs`,
        reuseExistingServer: !process.env.CI,
    },
});
