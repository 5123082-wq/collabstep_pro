import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo, loginWithCredentials, registerUser } from './utils/auth';

const appOrigin = 'http://localhost:3000';

async function requireOrgInvitesDb(page: import('@playwright/test').Page): Promise<void> {
  // Invites API is DB-backed via @vercel/postgres. If DB is not configured,
  // the endpoint typically returns 500. We skip to keep local runs usable.
  const response = await page.request.get(`${appOrigin}/api/invites`);
  if (response.status() >= 500) {
    test.skip(true, 'Org invites require POSTGRES_URL (DB). Skipping in this environment.');
  }
}

test.describe('Org invites via messaging', () => {
  test('registered user: invite → messages/invites → accept → member appears in org team', async ({ page, browser }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    // Admin creates org + invite
    await loginAsDemo(page, 'admin', appOrigin);
    await requireOrgInvitesDb(page);

    const orgName = `E2E Org ${Date.now()}`;
    const orgCreate = await page.request.post(`${appOrigin}/api/organizations`, {
      data: { name: orgName }
    });
    expect(orgCreate.ok()).toBe(true);
    const orgCreateJson = (await orgCreate.json()) as { ok: true; data: { organization: { id: string; name: string } } };
    const orgId = orgCreateJson.data.organization.id;

    // Owner (admin) should see full org navigation (team/settings/finance).
    await page.goto(`${appOrigin}/org/${orgId}/team`);
    const ownerOrgNav = page.getByRole('navigation', { name: 'Навигация по разделам организации' });
    await expect(ownerOrgNav.getByRole('link', { name: 'Команда' })).toBeVisible();
    await expect(ownerOrgNav.getByRole('link', { name: 'Настройки' })).toBeVisible();
    await expect(ownerOrgNav.getByRole('link', { name: 'Финансы' })).toBeVisible();

    const inviteeEmail = `e2e-invitee-${Date.now()}@example.dev`;
    const inviteePassword = 'devpass1!';

    // Create invitee account (separate browser context)
    const inviteeContext = await browser.newContext({ baseURL: appOrigin });
    const inviteePage = await inviteeContext.newPage();
    await registerUser(inviteePage, { name: 'E2E Invitee', email: inviteeEmail, password: inviteePassword }, appOrigin);
    await loginWithCredentials(inviteePage, { email: inviteeEmail, password: inviteePassword }, appOrigin);

    // Create org invite for existing user (email-based is enough; matching by email works).
    const inviteCreate = await page.request.post(`${appOrigin}/api/organizations/${orgId}/invites`, {
      data: { source: 'email', email: inviteeEmail, role: 'member' }
    });
    expect(inviteCreate.ok()).toBe(true);

    // Invitee accepts from Communications modal (AllChatsModal) → Invites tab.
    await inviteePage.goto(`${appOrigin}/app/dashboard`);
    await inviteePage.getByRole('button', { name: 'Уведомления' }).first().click();
    await inviteePage.getByRole('button', { name: 'Приглашения' }).click();
    await expect(inviteePage.getByText(orgName).first()).toBeVisible();

    await inviteePage.getByRole('button', { name: new RegExp(orgName) }).first().click();
    await expect(inviteePage.getByRole('button', { name: 'Принять' })).toBeEnabled();
    await inviteePage.getByRole('button', { name: 'Принять' }).click();

    // Verify membership on org team page.
    await inviteePage.goto(`${appOrigin}/org/${orgId}/team`);
    await expect(inviteePage.getByText(inviteeEmail).first()).toBeVisible({ timeout: 10000 });

    // Member should see only "Команда" tab in org navigation.
    const memberOrgNav = inviteePage.getByRole('navigation', { name: 'Навигация по разделам организации' });
    await expect(memberOrgNav.getByRole('link', { name: 'Команда' })).toBeVisible();
    await expect(memberOrgNav.getByRole('link', { name: 'Настройки' })).toHaveCount(0);
    await expect(memberOrgNav.getByRole('link', { name: 'Финансы' })).toHaveCount(0);

    // Direct access to settings should be denied for member.
    await inviteePage.goto(`${appOrigin}/org/${orgId}/settings`);
    await expect(inviteePage.getByText('Access Denied')).toBeVisible();

    // Leave org and ensure access is cut off (org-only scope).
    const leaveRes = await inviteePage.request.post(`${appOrigin}/api/organizations/${orgId}/leave`);
    expect(leaveRes.ok()).toBe(true);

    const membersRes = await inviteePage.request.get(`${appOrigin}/api/organizations/${orgId}/members`);
    expect(membersRes.status()).toBe(403);

    // After leaving, team page should redirect away (no active membership).
    await inviteePage.goto(`${appOrigin}/org/${orgId}/team`);
    await inviteePage.waitForURL('**/org/team**');

    await inviteeContext.close();
    expect(logs).toEqual([]);
  });

  test('unregistered user: invite email → /register?inviteToken → register (email locked) → login → accept', async ({ page, browser }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await loginAsDemo(page, 'admin', appOrigin);
    await requireOrgInvitesDb(page);

    const orgName = `E2E Org ${Date.now()}`;
    const orgCreate = await page.request.post(`${appOrigin}/api/organizations`, {
      data: { name: orgName }
    });
    expect(orgCreate.ok()).toBe(true);
    const orgCreateJson = (await orgCreate.json()) as { ok: true; data: { organization: { id: string; name: string } } };
    const orgId = orgCreateJson.data.organization.id;

    const inviteeEmail = `e2e-unregistered-${Date.now()}@example.dev`;
    const inviteePassword = 'devpass1!';

    const inviteCreate = await page.request.post(`${appOrigin}/api/organizations/${orgId}/invites`, {
      data: { source: 'email', email: inviteeEmail, role: 'member' }
    });
    expect(inviteCreate.ok()).toBe(true);
    const inviteCreateJson = (await inviteCreate.json()) as { ok: true; data: { invite: { token: string } } };
    const inviteToken = inviteCreateJson.data.invite.token;

    // New user registers by inviteToken (separate context to mimic unregistered user).
    const inviteeContext = await browser.newContext({ baseURL: appOrigin });
    const inviteePage = await inviteeContext.newPage();

    await inviteePage.goto(`${appOrigin}/register?inviteToken=${encodeURIComponent(inviteToken)}`);
    await expect(inviteePage.getByText('Вас пригласили в команду')).toBeVisible();

    const emailInput = inviteePage.getByLabel('Почта');
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveValue(inviteeEmail);

    await inviteePage.getByLabel('Имя').fill('E2E Invitee');
    await inviteePage.getByLabel('Пароль').fill(inviteePassword);
    await inviteePage.getByLabel('Я согласен с условиями использования').check();
    await inviteePage.getByRole('button', { name: 'Создать аккаунт' }).click();
    await inviteePage.waitForURL('**/login');
    await expect(inviteePage.getByRole('status').filter({ hasText: 'Регистрация успешна' })).toBeVisible();

    await loginWithCredentials(inviteePage, { email: inviteeEmail, password: inviteePassword }, appOrigin);

    await inviteePage.getByRole('button', { name: 'Уведомления' }).first().click();
    await inviteePage.getByRole('button', { name: 'Приглашения' }).click();
    await expect(inviteePage.getByText(orgName).first()).toBeVisible();
    await inviteePage.getByRole('button', { name: new RegExp(orgName) }).first().click();
    await inviteePage.getByRole('button', { name: 'Принять' }).click();

    await inviteePage.goto(`${appOrigin}/org/${orgId}/team`);
    await expect(inviteePage.getByText(inviteeEmail).first()).toBeVisible({ timeout: 10000 });

    await inviteeContext.close();
    expect(logs).toEqual([]);
  });
});


