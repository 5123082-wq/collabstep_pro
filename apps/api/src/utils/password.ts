import 'server-only';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

/**
 * Хэширует пароль с использованием PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  // Формат: salt:hash (оба в hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Проверяет пароль против хэша
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
  if (!passwordHash) {
    return false;
  }

  try {
    const [saltHex, hashHex] = passwordHash.split(':');
    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    const computedHash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

    // Используем timingSafeEqual для защиты от timing attacks
    if (storedHash.length !== computedHash.length) {
      return false;
    }

    return timingSafeEqual(storedHash, computedHash);
  } catch (error) {
    return false;
  }
}

