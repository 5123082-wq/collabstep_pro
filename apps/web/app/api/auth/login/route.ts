import { NextRequest, NextResponse } from 'next/server';
import { encodeDemoSession, getDemoAccount, isDemoAuthEnabled, type DemoRole } from '@/lib/auth/demo-session';
import { withSessionCookie } from '@/lib/auth/session-cookie';
import { ensureDemoAccountsInitialized } from '@/lib/auth/init-demo-accounts';
import { usersRepository } from '@collabverse/api';
import { verifyPassword } from '@collabverse/api/utils/password';
import { db } from '@collabverse/api/db/config';
import { userControls } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';

const hasDbConnection = !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
const isDbStorage = process.env.AUTH_STORAGE === 'db' && hasDbConnection;

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
  
  try {
    // Всегда проверяем администратора
    const adminAccount = getDemoAccount('admin');
    const adminUser = await usersRepository.findByEmail(adminAccount.email);
    if (adminUser) {
      accounts.push({
        role: 'admin',
        ...adminAccount
      });
    }
  } catch (error) {
    console.error('[Login] Error checking admin account:', error);
    // Продолжаем выполнение, но не добавляем аккаунт
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
  try {
    if (!isDemoAuthEnabled()) {
      return NextResponse.json({ error: 'Dev authentication disabled' }, { status: 403 });
    }

    // Инициализируем демо-аккаунты при первом использовании
    try {
      await ensureDemoAccountsInitialized();
    } catch (error) {
      console.error('[Login] Error in ensureDemoAccountsInitialized:', error);
      return NextResponse.json(
        { error: 'Внутренняя ошибка сервера при инициализации аккаунтов.' },
        { status: 500 }
      );
    }

    const payload = await readPayload(request);
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    // Сначала проверяем демо-аккаунты, но только если пользователь существует в БД
    let demoAccounts: DemoAccount[] = [];
    try {
      demoAccounts = await collectAccounts();
    } catch (error) {
      console.error('[Login] Error in collectAccounts:', error);
      return NextResponse.json(
        { error: 'Внутренняя ошибка сервера при проверке аккаунтов.' },
        { status: 500 }
      );
    }

    const demoAccount = findMatchingAccount(demoAccounts, email, password);

    if (demoAccount) {
      // Получаем пользователя из БД для получения userId
      let user;
      try {
        user = await usersRepository.findByEmail(demoAccount.email);
      } catch (error) {
        console.error('[Login] Error finding user by email:', error);
        return NextResponse.json(
          { error: 'Внутренняя ошибка сервера при поиске пользователя.' },
          { status: 500 }
        );
      }
      // Если пользователя нет в БД, не пропускаем вход (пользователь был удален)
      if (!user) {
        return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
      }
      
      // Проверяем роли из базы данных (если используется БД)
      let role: DemoRole = demoAccount.role;
      if (isDbStorage) {
        try {
          const [control] = await db.select().from(userControls).where(eq(userControls.userId, user.id)).limit(1);
          if (control && control.roles && Array.isArray(control.roles)) {
            // Если у пользователя есть productAdmin или featureAdmin, он администратор
            if (control.roles.includes('productAdmin') || control.roles.includes('featureAdmin')) {
              role = 'admin';
            } else {
              // Если ролей нет, но это демо-админ по email, оставляем admin
              role = demoAccount.role;
            }
          }
        } catch (error) {
          console.error('[Login] Error checking user controls for demo account:', error);
          // В случае ошибки используем роль из демо-аккаунта
        }
      }
      
      const userId = user.id;
      const sessionToken = encodeDemoSession({ 
        email: demoAccount.email, 
        userId,
        role, 
        issuedAt: Date.now() 
      });
      const redirectPath = resolveReturnPath(payload.returnTo);
      const response = NextResponse.json({ redirect: redirectPath });
      return withSessionCookie(response, sessionToken);
    }

    // Затем проверяем пользователей из БД
    let user;
    try {
      user = await usersRepository.findByEmail(email);
    } catch (error) {
      console.error('[Login] Error finding user by email:', error);
      return NextResponse.json(
        { error: 'Внутренняя ошибка сервера при поиске пользователя.' },
        { status: 500 }
      );
    }
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

    // Определяем роль: проверяем роли из базы данных или по email
    let role: DemoRole = 'user';
    
    // Проверяем роли из базы данных (если используется БД)
    if (isDbStorage) {
      try {
        const [control] = await db.select().from(userControls).where(eq(userControls.userId, user.id)).limit(1);
        if (control && control.roles && Array.isArray(control.roles)) {
          // Если у пользователя есть productAdmin или featureAdmin, он администратор
          if (control.roles.includes('productAdmin') || control.roles.includes('featureAdmin')) {
            role = 'admin';
          }
        }
      } catch (error) {
        console.error('[Login] Error checking user controls:', error);
        // В случае ошибки продолжаем с проверкой по email
      }
    }
    
    // Если роль не определена из БД, проверяем по email (для обратной совместимости)
    if (role === 'user' && email.toLowerCase() === getDemoAccount('admin').email.toLowerCase()) {
      role = 'admin';
    }
    
    const sessionToken = encodeDemoSession({ 
      email: user.email, 
      userId: user.id,
      role, 
      issuedAt: Date.now() 
    });
    const redirectPath = resolveReturnPath(payload.returnTo);
    const response = NextResponse.json({ redirect: redirectPath });
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    console.error('[Login] Unexpected error:', error);
    console.error('[Login] Error details:', {
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
