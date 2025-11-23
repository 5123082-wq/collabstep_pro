import { usersRepository } from '@collabverse/api';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

/**
 * Хэширует пароль с использованием PBKDF2
 */
function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  // Формат: salt:hash (оба в hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

const users = [
  'admin.demo@collabverse.test',
  'designer.demo@collabverse.test',
  'user.demo@collabverse.test',
  'finance.pm@collabverse.test'
];

async function main() {
  console.log('Установка паролей для пользователей...\n');

  for (const email of users) {
    // Извлекаем часть email до знака @ как пароль
    const password = email.split('@')[0];
    
    // Проверяем, существует ли пользователь
    const user = await usersRepository.findByEmail(email);
    
    if (!user) {
      console.log(`⚠️  Пользователь не найден: ${email}`);
      continue;
    }

    // Хэшируем пароль
    const passwordHash = hashPassword(password);
    
    // Обновляем пароль
    const updated = await usersRepository.updatePassword(email, passwordHash);
    
    if (updated) {
      // Проверяем, что пароль действительно установлен
      const updatedUser = await usersRepository.findByEmail(email);
      if (updatedUser?.passwordHash) {
        console.log(`✅ Пароль установлен для ${email}: ${password}`);
      } else {
        console.log(`⚠️  Пароль обновлен, но не найден при проверке для ${email}`);
      }
    } else {
      console.log(`❌ Не удалось установить пароль для ${email}`);
    }
  }

  console.log('\n✅ Готово!');
  
  // Финальная проверка всех пользователей
  console.log('\nПроверка установленных паролей:');
  for (const email of users) {
    const user = await usersRepository.findByEmail(email);
    if (user?.passwordHash) {
      console.log(`  ✅ ${email} - пароль установлен`);
    } else {
      console.log(`  ❌ ${email} - пароль НЕ установлен`);
    }
  }
}

main().catch((error) => {
  console.error('Ошибка при установке паролей:', error);
  process.exitCode = 1;
});

