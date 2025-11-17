import { NextRequest, NextResponse } from 'next/server';
import { encodeDemoSession, getDemoAccount } from '@/lib/auth/demo-session';
import { withSessionCookie } from '@/lib/auth/session-cookie';
import { ensureDemoAccountsInitialized } from '@/lib/auth/init-demo-accounts';
import { usersRepository } from '@collabverse/api';
import { hashPassword, verifyPassword } from '@collabverse/api/utils/password';

const INVALID_MESSAGE = 'Заполните все поля корректно';
const EMAIL_EXISTS_MESSAGE = 'Пользователь с таким email уже зарегистрирован';

function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validatePassword(value: string): boolean {
  return value.length >= 6;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Инициализируем демо-аккаунты при первом использовании
  ensureDemoAccountsInitialized();

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const name = sanitizeString(payload.name);
  const email = sanitizeString(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const title = sanitizeString(payload.title);

  if (!name || !email || !isValidEmail(email) || !validatePassword(password)) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const emailLower = email.toLowerCase();

  // Проверяем, существует ли пользователь
  const existingUser = usersRepository.findByEmail(emailLower);
  if (existingUser) {
    // Если пользователь существует и у него есть пароль, проверяем его
    if (existingUser.passwordHash) {
      const isValidPassword = verifyPassword(password, existingUser.passwordHash);
      if (isValidPassword) {
        // Пароль верный, создаём сессию
        const role = emailLower === getDemoAccount('admin').email.toLowerCase() ? 'admin' : 'user';
        const sessionToken = encodeDemoSession({ 
          email: existingUser.email, 
          userId: existingUser.id,
          role, 
          issuedAt: Date.now() 
        });
        const response = NextResponse.json({ redirect: '/dashboard' });
        return withSessionCookie(response, sessionToken);
      } else {
        // Пароль неверный, возвращаем ошибку
        return NextResponse.json({ error: EMAIL_EXISTS_MESSAGE }, { status: 400 });
      }
    } else {
      // Пользователь существует, но без пароля (старый пользователь)
      // Обновляем его, добавляя пароль
      const passwordHash = hashPassword(password);
      usersRepository.updatePassword(emailLower, passwordHash);
      const role = emailLower === getDemoAccount('admin').email.toLowerCase() ? 'admin' : 'user';
      const sessionToken = encodeDemoSession({ 
        email: existingUser.email, 
        userId: existingUser.id,
        role, 
        issuedAt: Date.now() 
      });
      const response = NextResponse.json({ redirect: '/dashboard' });
      return withSessionCookie(response, sessionToken);
    }
  }

  // Создаём нового пользователя с хэшированным паролем
  const passwordHash = hashPassword(password);
  const newUser = usersRepository.create({
    name,
    email: emailLower,
    passwordHash,
    ...(title && { title })
  });

  // Создаём сессию
  const role = emailLower === getDemoAccount('admin').email.toLowerCase() ? 'admin' : 'user';
  const sessionToken = encodeDemoSession({ 
    email: newUser.email, 
    userId: newUser.id,
    role, 
    issuedAt: Date.now() 
  });
  const response = NextResponse.json({ redirect: '/dashboard' });

  return withSessionCookie(response, sessionToken);
}
