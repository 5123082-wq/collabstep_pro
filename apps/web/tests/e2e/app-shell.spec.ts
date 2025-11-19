import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'user', appOrigin);
  });

  test('dashboard без ошибок в консоли', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Рабочий стол/);
    expect(logs).toEqual([]);
  });

  test('ширина контента не меняется при раскрытии меню', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    const content = page.locator('.content-area');
    const initialBox = await content.boundingBox();
    expect(initialBox?.width).toBeTruthy();

    const expandButton = page.getByRole('button', { name: 'Раскрыть Маркетплейс' });
    await expandButton.click();
    await page.waitForTimeout(150);
    const expandedBox = await content.boundingBox();
    expect(expandedBox?.width).toBeCloseTo(initialBox!.width!, 1);

    const collapseButton = page.getByRole('button', { name: 'Свернуть Маркетплейс' });
    await collapseButton.click();
    await page.waitForTimeout(150);
    const collapsedBox = await content.boundingBox();
    expect(collapsedBox?.width).toBeCloseTo(initialBox!.width!, 1);
    expect(logs).toEqual([]);
  });

  test('основные маршруты /app доступны', async ({ page }) => {
    const paths = [
      '/app/dashboard',
      '/app/marketplace/templates',
      '/app/performers/specialists',
      '/app/finance/wallet',
      '/app/docs/files',
      '/app/profile',
      '/app/profile/badges',
      '/app/support/help'
    ];

    for (const path of paths) {
      const response = await page.goto(`${appOrigin}${path}`);
      expect(response?.status(), `${path} должен возвращать 200`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('меню создания требует выбор проекта и показывает toast', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await page.goto(`${appOrigin}/app/dashboard`);
    await page.getByRole('button', { name: 'Создать' }).click();
    const dialog = page.getByRole('dialog', { name: 'Меню создания' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Найдите проект по названию, коду или стадии')).toBeVisible();
    await dialog.getByRole('button', { name: 'Astro CRM', exact: false }).first().click();
    await dialog.getByRole('button', { name: 'Задачу' }).click();
    const toast = page.getByText('TODO: Создать задачу');
    await expect(toast).toBeVisible();
    expect(logs).toEqual([]);
  });

  test('командная палитра поддерживает маски', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await page.goto(`${appOrigin}/app/dashboard`);
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: 'Командная палитра' });
    await expect(palette).toBeVisible();
    await page.keyboard.type('#12');
    await expect(palette.locator('span', { hasText: 'task' }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+K');
    await page.keyboard.type('@demo');
    await expect(palette.getByRole('button').first()).toBeVisible();
    const badgeTexts = await palette.locator('span').allTextContents();
    const filtered = badgeTexts
      .map((text) => text.toLowerCase())
      .filter((text) => ['project', 'user', 'task', 'invoice'].includes(text));
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((type) => type === 'project' || type === 'user')).toBe(true);
    await page.keyboard.press('Escape');
    expect(logs).toEqual([]);
  });

  test('переключатель фона сохраняет состояние', async ({ page }) => {
    await page.goto(`${appOrigin}/app/dashboard`);
    await page.getByRole('button', { name: 'Halo' }).click();
    await expect(page.locator('body')).toHaveClass(/app-bg-halo/);
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/app-bg-halo/);
  });
});
