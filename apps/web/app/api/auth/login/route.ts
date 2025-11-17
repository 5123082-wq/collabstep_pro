import { NextRequest, NextResponse } from 'next/server';
import { encodeDemoSession, getDemoAccount, isDemoAuthEnabled, type DemoRole } from '@/lib/auth/demo-session';
import { withSessionCookie } from '@/lib/auth/session-cookie';
import { ensureDemoAccountsInitialized } from '@/lib/auth/init-demo-accounts';
import { usersRepository } from '@collabverse/api';
import { verifyPassword } from '@collabverse/api/utils/password';

const INVALID_MESSAGE = 'Неверная почта или пароль';

type LoginPayload = {
  email?: unknown;
  password?: unknown;
  returnTo?: unknown;
};

type DemoAccount = {
  role: DemoRole;
  email: string;
  password: string;
};

function collectAccounts(): DemoAccount[] {
  return (['admin', 'user'] as DemoRole[]).map((role) => ({
    role,
    ...getDemoAccount(role)
  }));
}

function resolveReturnPath(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed || '/dashboard';
    }
  }

  return '/dashboard';
}

async function readPayload(request: NextRequest): Promise<LoginPayload> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) as LoginPayload;
    } catch (error) {
      return {};
    }
  }

  try {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries()) as LoginPayload;
  } catch (error) {
    return {};
  }
}

function findMatchingAccount(accounts: DemoAccount[], email: string, password: string): DemoAccount | null {
  return accounts.find((account) => account.email === email && account.password === password) ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDemoAuthEnabled()) {
    return NextResponse.json({ error: 'Dev authentication disabled' }, { status: 403 });
  }

  // Инициализируем демо-аккаунты при первом использовании
  ensureDemoAccountsInitialized();

  const payload = await readPayload(request);
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  // Сначала проверяем демо-аккаунты
  const demoAccounts = collectAccounts();
  const demoAccount = findMatchingAccount(demoAccounts, email, password);

  if (demoAccount) {
    // Получаем пользователя из БД для получения userId
    const user = usersRepository.findByEmail(demoAccount.email);
    const userId = user?.id || demoAccount.email; // Fallback на email для обратной совместимости
    const sessionToken = encodeDemoSession({ 
      email: demoAccount.email, 
      userId,
      role: demoAccount.role, 
      issuedAt: Date.now() 
    });
    const redirectPath = resolveReturnPath(payload.returnTo);
    const response = NextResponse.json({ redirect: redirectPath });
    return withSessionCookie(response, sessionToken);
  }

  // Затем проверяем пользователей из БД
  const user = usersRepository.findByEmail(email);
  if (user && user.passwordHash) {
    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (isValidPassword) {
      // Определяем роль: если это админ по email, то admin, иначе user
      const role: DemoRole = email.toLowerCase() === getDemoAccount('admin').email.toLowerCase() ? 'admin' : 'user';
      const sessionToken = encodeDemoSession({ 
        email: user.email, 
        userId: user.id,
        role, 
        issuedAt: Date.now() 
      });
      const redirectPath = resolveReturnPath(payload.returnTo);
      const response = NextResponse.json({ redirect: redirectPath });
      return withSessionCookie(response, sessionToken);
    }
  }

  return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
}
