import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
  },
  webServer: {
    command:
      "sh -c 'rm -rf apps/web/.next && pnpm --filter @collabverse/web dev --hostname 127.0.0.1 --port 3000'",
    url: 'http://127.0.0.1:3000',
    timeout: 180000,
    reuseExistingServer: !isCI,
    env: {
      NEXT_DISABLE_VERSION_CHECK: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      NAV_V1: 'on',
      FEATURE_PROJECTS_V1: '1',
      NEXT_PUBLIC_FEATURE_FINANCE_GLOBAL: '1',
      NEXT_PUBLIC_FEATURE_PROJECTS_OVERVIEW: '1',
      NEXT_PUBLIC_FEATURE_PROJECTS_V1: '1',
      NEXT_PUBLIC_FEATURE_CREATE_WIZARD: '1',
      NEXT_PUBLIC_FEATURE_PROJECT_DASHBOARD: '1',
      NEXT_PUBLIC_FEATURE_TASKS_WORKSPACE: '1',
      NEXT_PUBLIC_FEATURE_BUDGET_LIMITS: '0',
      NEXT_PUBLIC_FEATURE_FINANCE_AUTOMATIONS: '0',
      HOSTNAME: '127.0.0.1',
      PORT: '3000'
    }
  }
});
