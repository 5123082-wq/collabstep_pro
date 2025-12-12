import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('project workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('project-landing', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    const response = await page.goto(`${appOrigin}/project/DEMO/overview`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Демо-проект' })).toBeVisible();
    expect(logs).toEqual([]);
  });

  test('project-tabs-width', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await page.goto(`${appOrigin}/project/DEMO/overview`);
    const content = page.locator('.project-content');
    await expect(content).toBeVisible();
    const initialBox = await content.boundingBox();
    expect(initialBox?.width).toBeTruthy();

    await page.getByRole('link', { name: 'Задачи' }).click();
    await page.waitForURL('**/project/DEMO/tasks');
    const tasksBox = await content.boundingBox();

    await page.getByRole('link', { name: 'Интеграции' }).click();
    await page.waitForURL('**/project/DEMO/integrations');
    const integrationsBox = await content.boundingBox();

    expect(tasksBox?.width).toBeCloseTo(initialBox!.width!, 1);
    expect(integrationsBox?.width).toBeCloseTo(initialBox!.width!, 1);
    expect(logs).toEqual([]);
  });

  test('project-header-actions', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await page.goto(`${appOrigin}/project/DEMO/overview`);

    const actions = [
      { label: 'Открыть вакансию', toast: 'TODO: Открыть вакансию' },
      { label: 'Запросить смету', toast: 'TODO: Запросить смету' },
      { label: 'Открыть эскроу', toast: 'TODO: Открыть эскроу' },
      { label: 'Настройки проекта', toast: 'TODO: Настройки проекта' }
    ];

    for (const action of actions) {
      await page.getByRole('button', { name: action.label }).click();
      await expect(page.getByText(action.toast)).toBeVisible();
    }

    expect(logs).toEqual([]);
  });

  test('create-menu-context', async ({ page }) => {
    await page.goto(`${appOrigin}/project/DEMO/overview`);
    await page.getByRole('button', { name: 'Открыть меню создания' }).click();
    const projectDialog = page.getByRole('dialog', { name: 'Меню создания' });
    await expect(projectDialog.getByText('Демо-проект')).toBeVisible();
    await expect(projectDialog.getByText('Найдите проект по названию, коду или стадии')).toHaveCount(0);
    await projectDialog.getByRole('button', { name: 'Задачу' }).click();
    await expect(page.getByText('TODO: Создать задачу')).toBeVisible();

    await page.goto(`${appOrigin}/app/dashboard`);
    await page.getByRole('button', { name: 'Создать' }).click();
    const globalDialog = page.getByRole('dialog', { name: 'Меню создания' });
    const switchButton = globalDialog.getByRole('button', { name: 'Сменить' });
    if ((await switchButton.count()) > 0) {
      await switchButton.click();
    }
    await expect(globalDialog.getByText('Найдите проект по названию, коду или стадии')).toBeVisible();
    const projectCard = globalDialog.getByRole('button', { name: /Демо-проект/ }).first();
    await expect(projectCard).toBeVisible();
    await projectCard.click();
    await globalDialog.getByRole('button', { name: 'Задачу' }).click();
    await expect(page.getByText('TODO: Создать задачу')).toBeVisible();
  });

  test('palette-scope', async ({ page }) => {
    await page.goto(`${appOrigin}/project/DEMO/overview`);
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: 'Командная палитра' });
    await expect(palette).toBeVisible();

    await page.keyboard.type('#');
    const taskRows = palette.locator('li');
    const taskCount = await taskRows.count();
    expect(taskCount).toBeGreaterThan(0);
    for (let index = 0; index < taskCount; index += 1) {
      const row = taskRows.nth(index);
      await expect(row.locator('span')).toHaveText('task');
      await expect(row.locator('p').nth(1)).toContainText('DEMO');
    }
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+K');
    await page.keyboard.type('$');
    const invoiceRows = palette.locator('li');
    const invoiceCount = await invoiceRows.count();
    expect(invoiceCount).toBeGreaterThan(0);
    for (let index = 0; index < invoiceCount; index += 1) {
      const row = invoiceRows.nth(index);
      await expect(row.locator('span')).toHaveText('invoice');
      await expect(row.locator('p').nth(1)).toContainText('DEMO');
    }
    await page.keyboard.press('Escape');
  });
});
