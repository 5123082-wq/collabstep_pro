import { NextRequest, NextResponse } from 'next/server';
import { encodeDemoSession, getDemoAccount, isDemoAuthEnabled, parseDemoRole, type DemoRole } from '@/lib/auth/demo-session';
import { withSessionCookie } from '@/lib/auth/session-cookie';
import { buildEmergencyAdminUser } from '@collabverse/api';

type DemoLoginResponse = NextResponse<unknown>;

function disabledResponse(request: NextRequest): DemoLoginResponse {
  return NextResponse.json(
    { error: 'Demo authentication is disabled.' },
    { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Demo-Auth': 'disabled', 'X-Request-Path': request.nextUrl.pathname } }
  );
}

async function extractRole(request: NextRequest): Promise<DemoRole | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = await request.json();
      return parseDemoRole((payload as Record<string, unknown>)?.role);
    } catch (error) {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return parseDemoRole(formData.get('role'));
  } catch (error) {
    return null;
  }
}

export async function GET(_request: NextRequest): Promise<DemoLoginResponse> {
  void _request;
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests. Please use the login form.' },
    { status: 405, headers: { 'Allow': 'POST' } }
  );
}

export async function POST(request: NextRequest): Promise<DemoLoginResponse> {
  try {
    if (!isDemoAuthEnabled()) {
      return disabledResponse(request);
    }

    const role = await extractRole(request);

    if (!role) {
      return NextResponse.json({ error: 'Invalid role supplied.' }, { status: 400 });
    }

    const account = getDemoAccount(role);

    try {
      // Блокируем удаленные демо-аккаунты
      const blockedEmails = ['user.demo@collabverse.test'];
      if (blockedEmails.includes(account.email.toLowerCase())) {
        return NextResponse.json(
          { error: 'Этот демо-аккаунт больше не доступен.' },
          { status: 403 }
        );
      }

      const emergencyAdmin = buildEmergencyAdminUser();

      const sessionToken = encodeDemoSession({
        email: account.email,
        userId: emergencyAdmin.id,
        role,
        issuedAt: Date.now()
      });
      const response = NextResponse.redirect(new URL('/app/dashboard', request.url), { status: 303 });
      return withSessionCookie(response, sessionToken);
    } catch (error) {
      console.error('[Login Demo] Error finding user or creating session:', error);
      return NextResponse.json(
        { error: 'Внутренняя ошибка сервера при создании сессии.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Login Demo] Error:', error);
    console.error('[Login Demo] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при входе.' },
      { status: 500 }
    );
  }
}
