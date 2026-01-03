import { test, expect, type Page } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';
let cachedOrganizationId: string | null = null;

async function getOrganizationId(page: Page) {
  if (cachedOrganizationId) return cachedOrganizationId;
  const res = await page.request.get(`${appOrigin}/api/organizations`);
  const payload = await res.json().catch(() => ({}));
  const organizationId = payload?.data?.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error('Нет доступной организации для создания проекта в тесте.');
  }
  cachedOrganizationId = organizationId;
  return organizationId;
}
const REQUIRED_SECTIONS = [
  'Маркетплейс',
  'Исполнители',
  'Маркетинг',
  'AI-хаб',
  'Комьюнити',
  'Финансы',
  'Документы',
  'Админка'
];

test.describe('app navigation integrity', () => {
  test('sidebar lists key sections for admin session', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    const navigation = page.getByRole('navigation', { name: 'Навигация приложения' });
    await expect(navigation).toBeVisible();

    for (const label of REQUIRED_SECTIONS) {
      await expect(navigation.getByRole('link', { name: label, exact: false })).toBeVisible();
    }

    expect(logs).toEqual([]);
  });

  test('project workspace keeps global menu stable', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Создаём проект, чтобы ссылка гарантированно была в списке
    const organizationId = await getOrganizationId(page);
    const projectRes = await page.request.post(`${appOrigin}/api/pm/projects`, {
      data: { title: 'E2E Navigation Project', organizationId }
    });
    if (projectRes.status() >= 400) {
      const body = await projectRes.text();
      throw new Error(`Не удалось создать проект для navigation-integrity: ${projectRes.status()} ${body}`);
    }
    const projectJson = await projectRes.json();
    const projectId = projectJson?.data?.project?.id ?? projectJson?.project?.id;
    if (!projectId) {
      throw new Error('API не вернул id созданного проекта для navigation-integrity');
    }

    const sidebar = page.locator('aside').first();
    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeTruthy();

    // Переходим сразу в созданный проект, чтобы избежать гонок с рендером списка
    await page.goto(`${appOrigin}/pm/projects/${projectId}`);
    await page.waitForURL(`**/pm/projects/${projectId}`);

    const workspaceSidebar = page.locator('aside').first();
    const workspaceBox = await workspaceSidebar.boundingBox();
    expect(workspaceBox?.width).toBeCloseTo(initialBox!.width!, 1);

    const navigation = page.getByRole('navigation', { name: 'Навигация приложения' });
    for (const label of REQUIRED_SECTIONS) {
      await expect(navigation.getByRole('link', { name: label, exact: false })).toBeVisible();
    }

    expect(logs).toEqual([]);
  });

  test('overlays and rail do not affect sidebar layout', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    const sidebar = page.locator('aside').first();
    const navigation = page.getByRole('navigation', { name: 'Навигация приложения' });
    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeTruthy();

    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page.getByRole('menu', { name: 'Меню создания' })).toBeVisible();
    const withCreateBox = await sidebar.boundingBox();
    expect(withCreateBox?.width).toBeCloseTo(initialBox!.width!, 1);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: 'Командная палитра' })).toBeVisible();
    const withPaletteBox = await sidebar.boundingBox();
    expect(withPaletteBox?.width).toBeCloseTo(initialBox!.width!, 1);
    await page.keyboard.press('Escape');

    const railButton = page.locator('aside[data-expanded] button').first();
    await railButton.focus();
    await page.waitForTimeout(200);
    const withRailBox = await sidebar.boundingBox();
    expect(withRailBox?.width).toBeCloseTo(initialBox!.width!, 1);

    await expect(navigation.getByRole('link', { name: 'Маркетплейс', exact: false })).toBeVisible();
    expect(logs).toEqual([]);
  });
});
