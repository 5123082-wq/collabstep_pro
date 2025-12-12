import { NextRequest, NextResponse } from 'next/server';
import { getDemoAccount } from '@/lib/auth/demo-session';
import { ensureDemoAccountsInitialized } from '@/lib/auth/init-demo-accounts';
import { invitationsRepository, usersRepository } from '@collabverse/api';
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
  const inviteToken = sanitizeString(payload.inviteToken);
  const email = sanitizeString(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const title = sanitizeString(payload.title);

  const isInviteFlow = !!inviteToken;
  let inviteEmailLower: string | null = null;
  let inviteId: string | null = null;

  if (isInviteFlow) {
    try {
      const invite = await invitationsRepository.findOrganizationInviteByToken(inviteToken);
      if (!invite) {
        return NextResponse.json({ error: 'Приглашение не найдено' }, { status: 404 });
      }
      if (invite.status !== 'pending') {
        return NextResponse.json({ error: 'Приглашение больше не активно' }, { status: 400 });
      }
      if (!invite.inviteeEmail) {
        return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
      }
      inviteEmailLower = invite.inviteeEmail.trim().toLowerCase();
      inviteId = invite.id;
    } catch (error) {
      console.error('[Register] Error resolving inviteToken:', error);
      return NextResponse.json({ error: 'Не удалось проверить приглашение' }, { status: 500 });
    }
  }

  const effectiveEmail = isInviteFlow ? inviteEmailLower ?? '' : email;
  if (!name || !effectiveEmail || !isValidEmail(effectiveEmail) || !validatePassword(password)) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const emailLower = effectiveEmail.toLowerCase();

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
  const createdUser = await usersRepository.create({
    name,
    email: emailLower,
    passwordHash,
    ...(title && { title })
  });

  // При регистрации по приглашению: привязываем инвайт к новому userId, но не принимаем автоматически.
  if (isInviteFlow && inviteId) {
    try {
      await invitationsRepository.updateOrganizationInviteStatus(inviteId, 'pending', createdUser.id);
    } catch (error) {
      console.error('[Register] Error linking invite to user:', error);
      // Non-fatal: user is created; invite will still be visible by email match (until linked elsewhere).
    }
  }

  // Не создаем сессию - пользователь должен войти вручную
  return NextResponse.json({ redirect: '/login?toast=register-success' });
}
