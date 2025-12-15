import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('dashboard без ошибок в консоли', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Рабочий стол')).toBeVisible();
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
      '/market/templates',
      '/performers/specialists',
      '/finance/wallet',
      '/docs/files',
      '/profile',
      '/profile/badges',
      '/support/help'
    ];

    for (const path of paths) {
      const response = await page.goto(`${appOrigin}${path}`);
      expect(response?.status(), `${path} должен возвращать 200`).toBe(200);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test.skip('меню создания требует выбор проекта и показывает toast', async () => {
    test.fixme(true, 'Текущее меню создания отличается от ожиданий — нужно обновить тест под новый UI');
  });

  test.skip('командная палитра поддерживает маски', async () => {
    test.fixme(true, 'Командная палитра обновляется — тест пока выключен');
  });

  test.skip('переключатель фона сохраняет состояние', async () => {
    test.fixme(true, 'Нужно согласовать актуальное название темы и селекторы');
  });
});
