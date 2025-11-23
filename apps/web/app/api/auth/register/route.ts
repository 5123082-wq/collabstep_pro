import { NextRequest, NextResponse } from 'next/server';
import { getDemoAccount } from '@/lib/auth/demo-session';
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
  await ensureDemoAccountsInitialized();

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
  const existingUser = await usersRepository.findByEmail(emailLower);
  if (existingUser) {
    // Если пользователь существует и у него есть пароль, проверяем его
    if (existingUser.passwordHash) {
      const isValidPassword = verifyPassword(password, existingUser.passwordHash);
      if (isValidPassword) {
        // Пароль верный - это не регистрация, а вход
        // Возвращаем ошибку, так как пользователь должен использовать /api/auth/login
        return NextResponse.json({ error: 'Пользователь с таким email уже зарегистрирован. Используйте форму входа.' }, { status: 400 });
      } else {
        // Пароль неверный, возвращаем ошибку
        return NextResponse.json({ error: EMAIL_EXISTS_MESSAGE }, { status: 400 });
      }
    } else {
      // Пользователь существует, но без пароля (старый пользователь)
      // Обновляем его, добавляя пароль
      const passwordHash = hashPassword(password);
      await usersRepository.updatePassword(emailLower, passwordHash);
      // Не создаем сессию - пользователь должен войти вручную
      return NextResponse.json({ redirect: '/login?toast=register-success' });
    }
  }

  // Проверяем, что это не попытка зарегистрировать demo-аккаунт
  const demoAdminEmail = getDemoAccount('admin').email.toLowerCase();
  const blockedDemoEmails = [
    'user.demo@collabverse.test',
    'designer.demo@collabverse.test',
    'finance.pm@collabverse.test'
  ];
  if (emailLower === demoAdminEmail || blockedDemoEmails.includes(emailLower)) {
    return NextResponse.json({ error: 'Этот email зарезервирован для демо-аккаунта' }, { status: 400 });
  }

  // Создаём нового пользователя с хэшированным паролем
  // Все новые пользователи получают роль 'user' (не admin)
  const passwordHash = hashPassword(password);
  await usersRepository.create({
    name,
    email: emailLower,
    passwordHash,
    ...(title && { title })
  });

  // Не создаем сессию - пользователь должен войти вручную
  return NextResponse.json({ redirect: '/login?toast=register-success' });
}
