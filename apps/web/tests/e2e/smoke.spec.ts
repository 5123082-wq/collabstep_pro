import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';

test('opens-home', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto('http://127.0.0.1:3000/');
  await expect(page.locator('h1')).toHaveText(/Платформа для креативных и продуктовых команд/i);
  expect(logs).toEqual([]);
});

test('menu-desktop', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto('http://127.0.0.1:3000/');
  const productButton = page.getByRole('button', { name: 'Продукт' });
  await productButton.focus();
  await expect(productButton).toHaveAttribute('aria-expanded', 'true');
  const overviewLink = page.locator('#mega-product').getByRole('menuitem', { name: 'Обзор платформы' }).first();
  await overviewLink.click();
  await expect(page).toHaveURL(/\/product$/);
  const productStatus = await page.request.get('http://127.0.0.1:3000/product');
  expect(productStatus.status()).toBe(200);
  expect(logs).toEqual([]);
});

test.describe('menu-mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('раскрытие бургер-меню и переход к аудитории', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await page.goto('http://127.0.0.1:3000/');
    await page.getByRole('button', { name: 'Меню' }).click();
    const dialog = page.getByRole('dialog', { name: 'Мобильная навигация' });
    await expect(dialog).toBeVisible();
    const audienceToggle = dialog.getByRole('button', { name: 'Для кого' });
    await audienceToggle.click();
    await expect(audienceToggle).toHaveAttribute('aria-expanded', 'true');
    const targetLink = dialog.getByRole('link', { name: 'Бизнес / Основатель' });
    await targetLink.click();
    await expect(page).toHaveURL(/\/audience/);
    const audienceStatus = await page.request.get('http://127.0.0.1:3000/audience');
    expect(audienceStatus.status()).toBe(200);
    expect(logs).toEqual([]);
  });
});

test('routes-200', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  const paths = [
    '/product',
    '/projects',
    '/projects/cases',
    '/specialists',
    '/contractors',
    '/pricing',
    '/blog',
    '/login',
    '/register'
  ];

  for (const path of paths) {
    logs.length = 0;
    const response = await page.goto(`http://127.0.0.1:3000${path}`);
    expect(response?.status(), `${path} should return 200`).toBe(200);
    expect(logs, `${path} should not log errors`).toEqual([]);
  }
});
