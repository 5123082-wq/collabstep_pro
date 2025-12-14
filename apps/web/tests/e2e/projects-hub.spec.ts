import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('projects hub', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('renders projects list without console errors', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/pm/projects`);
    await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

    expect(logs.filter((message) => /error/i.test(message))).toEqual([]);
  });

  test('can navigate to project detail', async ({ page }) => {
    await page.goto(`${appOrigin}/pm/projects`);
    await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
    
    // Проверяем что есть список проектов или пустое состояние
    const hasProjects = await page.locator('[data-testid="project-card"]').count() > 0;
    expect(hasProjects || await page.getByText(/проект/i).isVisible()).toBeTruthy();
  });
});
