import type { Page } from '@playwright/test';

const DEFAULT_ORIGIN = 'http://localhost:3000';

export async function loginAsDemo(
  page: Page,
  role: 'admin' = 'admin',
  origin: string = DEFAULT_ORIGIN
): Promise<void> {
  // UI "Войти демо-админом" uses alert() on errors which blocks Playwright.
  // Use API login to make tests deterministic.
  const response = await page.request.post(`${origin}/api/auth/login-demo`, {
    data: { role }
  });

  if (response.status() >= 400) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Demo login failed: ${response.status()} ${payload}`);
  }

  await page.goto(`${origin}/app/dashboard`);
  await page.getByTestId('role-badge').waitFor({ state: 'visible' });
}

export async function registerUser(
  page: Page,
  input: { name: string; email: string; password: string },
  origin: string = DEFAULT_ORIGIN
): Promise<void> {
  await page.goto(`${origin}/register`);
  await page.getByLabel('Имя').fill(input.name);
  await page.getByLabel('Почта').fill(input.email);
  await page.getByLabel('Пароль').fill(input.password);
  await page.getByLabel('Я согласен с условиями использования').check();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.waitForURL('**/login');
  await page.getByRole('status').filter({ hasText: 'Регистрация успешна' }).waitFor({ state: 'visible' });
}

export async function loginWithCredentials(
  page: Page,
  input: { email: string; password: string },
  origin: string = DEFAULT_ORIGIN
): Promise<void> {
  const response = await page.request.post(`${origin}/api/auth/login`, {
    data: { email: input.email, password: input.password, returnTo: '/app/dashboard' }
  });

  if (response.status() >= 400) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Credentials login failed: ${response.status()} ${payload}`);
  }

  await page.goto(`${origin}/app/dashboard`);
  await page.getByTestId('role-badge').waitFor({ state: 'visible' });
}

export async function logout(page: Page, origin: string = DEFAULT_ORIGIN): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`${origin}/login`);
}
