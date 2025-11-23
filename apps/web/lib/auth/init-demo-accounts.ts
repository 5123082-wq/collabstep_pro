import { usersRepository, TEST_ADMIN_USER_ID } from '@collabverse/api';
import { hashPassword } from '@collabverse/api/utils/password';
import { getDemoAccount } from './demo-session';

let initialized = false;

/**
 * Инициализирует демо-аккаунт администратора с хэшированным паролем при первом использовании
 * Создает только admin.demo@collabverse.test
 */
export async function ensureDemoAccountsInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  const adminAccount = getDemoAccount('admin');

  // Инициализируем только админ-аккаунт
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
}

