import { usersRepository, TEST_ADMIN_USER_ID, TEST_USER_ID } from '@collabverse/api';
import { hashPassword } from '@collabverse/api/utils/password';
import { getDemoAccount } from './demo-session';

let initialized = false;

/**
 * Инициализирует демо-аккаунты с хэшированными паролями при первом использовании
 */
export async function ensureDemoAccountsInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  const adminAccount = getDemoAccount('admin');
  const userAccount = getDemoAccount('user');

  // Инициализируем админ-аккаунт
  const adminUser = await usersRepository.findByEmail(adminAccount.email);
  if (adminUser && !adminUser.passwordHash) {
    // Обновляем существующего пользователя, добавляя пароль
    await usersRepository.updatePassword(adminAccount.email, hashPassword(adminAccount.password));
  } else if (!adminUser) {
    // Создаём нового пользователя с паролем (используем предсказуемый UUID для тестового администратора)
    await usersRepository.create({
      id: TEST_ADMIN_USER_ID,
      name: 'Алина Админ',
      email: adminAccount.email,
      title: 'Руководитель продукта',
      department: 'Продукт',
      location: 'Москва',
      passwordHash: hashPassword(adminAccount.password)
    });
  }

  // Инициализируем пользовательский аккаунт
  const regularUser = await usersRepository.findByEmail(userAccount.email);
  if (regularUser && !regularUser.passwordHash) {
    // Обновляем существующего пользователя, добавляя пароль
    await usersRepository.updatePassword(userAccount.email, hashPassword(userAccount.password));
  } else if (!regularUser) {
    // Создаём нового пользователя с паролем (используем предсказуемый UUID для тестового пользователя)
    await usersRepository.create({
      id: TEST_USER_ID,
      name: 'Игорь Участник',
      email: userAccount.email,
      title: 'Менеджер проектов',
      department: 'Операции',
      location: 'Санкт-Петербург',
      passwordHash: hashPassword(userAccount.password)
    });
  }
}

