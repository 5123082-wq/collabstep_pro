import { test, expect } from '@playwright/test';
import { loginAsDemo } from './utils/auth';
import { captureConsole } from './utils/console';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('demo admin smoke workflow', () => {
  test('admin can create project and task workspace items', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await loginAsDemo(page, 'admin', appOrigin);

    await page.goto(`${appOrigin}/pm/projects/create`);
    await page.waitForURL('**/pm/projects/create', { waitUntil: 'load' });

    const projectName = `Admin Smoke Project ${Date.now()}`;
    await page.getByLabel('Название проекта').fill(projectName);

    await page.getByRole('button', { name: 'Далее' }).click();
    await page.getByRole('button', { name: 'К подтверждению' }).click();
    await page.getByRole('button', { name: 'Создать проект' }).click();

    await page.waitForURL('**/pm/projects/**', { timeout: 15000 });
    await expect(page).toHaveURL(/\/pm\/projects\/[^/]+$/);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    expect(logs).toEqual([]);
  });
});
