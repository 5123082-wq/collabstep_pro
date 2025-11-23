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

async function collectAccounts(): Promise<DemoAccount[]> {
  // Проверяем, какие демо-аккаунты существуют в БД
  const accounts: DemoAccount[] = [];
  
  // Всегда проверяем администратора
  const adminAccount = getDemoAccount('admin');
  const adminUser = await usersRepository.findByEmail(adminAccount.email);
  if (adminUser) {
    accounts.push({
      role: 'admin',
      ...adminAccount
    });
  }
  
  // Роль 'user' больше не поддерживается - пользователь был удален
  
  return accounts;
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
  await ensureDemoAccountsInitialized();

  const payload = await readPayload(request);
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  // Сначала проверяем демо-аккаунты, но только если пользователь существует в БД
  const demoAccounts = await collectAccounts();
  const demoAccount = findMatchingAccount(demoAccounts, email, password);

  if (demoAccount) {
    // Получаем пользователя из БД для получения userId
    const user = await usersRepository.findByEmail(demoAccount.email);
    // Если пользователя нет в БД, не пропускаем вход (пользователь был удален)
    if (!user) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }
    const userId = user.id;
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
  const user = await usersRepository.findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  // Если у пользователя нет пароля, это ошибка - все пользователи должны иметь пароль
  if (!user.passwordHash) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  // Проверяем пароль для пользователя с установленным паролем
  const isValidPassword = verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

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
