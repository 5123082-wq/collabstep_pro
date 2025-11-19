import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const baseUrl = 'http://127.0.0.1:3000';

test('protected-redirect', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto(`${baseUrl}/app/dashboard`);
  await page.waitForURL('**/login');
  await expect(page.getByRole('status').filter({ hasText: 'Нужно войти в систему' })).toBeVisible();
  expect(logs).toEqual([]);
});

test('logout', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await loginAsDemo(page, 'user', baseUrl);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await page.waitForURL('**/login');
  await page.goto(`${baseUrl}/app/dashboard`);
  await page.waitForURL('**/login');
  await expect(page.getByRole('status').filter({ hasText: 'Нужно войти в систему' })).toBeVisible();
  expect(logs).toEqual([]);
});

test('admin-allowed', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await loginAsDemo(page, 'admin', baseUrl);
  await expect(page.getByRole('link', { name: 'Админка' })).toBeVisible();
  const response = await page.goto(`${baseUrl}/app/admin`);
  expect(response?.status()).toBe(200);
  expect(logs).toEqual([]);
});

test('admin-forbidden', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await loginAsDemo(page, 'user', baseUrl);
  await page.goto(`${baseUrl}/app/admin`);
  await page.waitForURL('**/app/dashboard');
  await expect(page.getByRole('status').filter({ hasText: 'Недостаточно прав' })).toBeVisible();
  expect(logs).toEqual([]);
});

test('register-dev', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto(`${baseUrl}/register`);
  const uniqueEmail = `dev-${Date.now()}@example.dev`;
  await page.getByLabel('Имя').fill('Тестовый пользователь');
  await page.getByLabel('Почта').fill(uniqueEmail);
  await page.getByLabel('Пароль').fill('devpass');
  await page.getByLabel('Это тестовый аккаунт (dev-режим)').check();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.waitForURL('**/app/dashboard');
  await expect(page.getByTestId('role-badge')).toHaveText('Пользователь');
  await expect(page.getByRole('status').filter({ hasText: 'Регистрация успешна' })).toBeVisible();
  expect(logs).toEqual([]);
});

test('login-invalid', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('Email').fill('unknown@example.dev');
  await page.getByLabel('Пароль').fill('wrongpass');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Неверная почта или пароль' })).toBeVisible();
  expect(logs).toEqual([]);
});
