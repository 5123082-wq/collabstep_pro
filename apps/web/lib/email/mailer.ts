type SendOrganizationInviteEmailInput = {
  toEmail: string;
  inviteToken: string;
  /**
   * Base URL (origin) used to build absolute links. Prefer request.nextUrl.origin in routes.
   * Falls back to NEXT_PUBLIC_SITE_URL and then http://localhost:3000
   */
  baseUrl?: string;
};

function normalizeBaseUrl(value: string | undefined): string {
  const fallback = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').trim();
  const raw = (value ?? fallback).trim();
  return raw.replace(/\/$/, '');
}

/**
 * MVP mailer stub.
 *
 * Today we only log the email payload and link.
 * Later we can swap this implementation to Resend/SendGrid/SMTP while keeping call sites stable.
 */
export async function sendOrganizationInviteEmail(input: SendOrganizationInviteEmailInput): Promise<void> {
  const toEmail = input.toEmail.trim().toLowerCase();
  const baseUrl = normalizeBaseUrl(input.baseUrl);

  const url = new URL('/register', baseUrl);
  url.searchParams.set('inviteToken', input.inviteToken);

  // Avoid noisy logs in Jest runs.
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[Email Mock][Org Invite]', { toEmail, registerUrl: url.toString() });
}


