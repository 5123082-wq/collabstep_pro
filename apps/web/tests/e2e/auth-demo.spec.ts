import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo, loginWithCredentials, logout, registerUser } from './utils/auth';

const baseUrl = 'http://localhost:3000';

test('protected-redirect', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await page.goto(`${baseUrl}/app/dashboard`);
  await page.waitForURL('**/login');
  // Middleware redirects to /login, but not always with a toast query param.
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  expect(logs).toEqual([]);
});

test('logout', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await loginAsDemo(page, 'admin', baseUrl);
  await logout(page, baseUrl);
  await page.goto(`${baseUrl}/app/dashboard`);
  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  void logs;
});

test('admin-allowed', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  await loginAsDemo(page, 'admin', baseUrl);
  const response = await page.goto(`${baseUrl}/admin`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Панель администратора' })).toBeVisible();
  void logs;
});

test('admin-forbidden', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  const uniqueEmail = `e2e-non-admin-${Date.now()}@example.dev`;
  const password = 'devpass1!';
  await registerUser(page, { name: 'E2E User', email: uniqueEmail, password }, baseUrl);
  await loginWithCredentials(page, { email: uniqueEmail, password }, baseUrl);
  await page.goto(`${baseUrl}/admin`);
  await page.waitForURL('**/dashboard');
  void logs;
});

test('register-dev', async ({ page }) => {
  const logs: string[] = [];
  captureConsole(page, logs);
  const uniqueEmail = `dev-${Date.now()}@example.dev`;
  const password = 'devpass1!';
  await registerUser(page, { name: 'Тестовый пользователь', email: uniqueEmail, password }, baseUrl);
  await loginWithCredentials(page, { email: uniqueEmail, password }, baseUrl);
  await expect(page.getByTestId('role-badge')).toBeVisible();
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
