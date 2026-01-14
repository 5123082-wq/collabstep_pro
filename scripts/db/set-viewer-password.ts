#!/usr/bin/env tsx
/**
 * Скрипт для установки пароля пользователю viewer@example.com
 */

import dotenv from 'dotenv';
import path from 'path';
import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
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

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function setViewerPassword() {
    try {
        const email = 'viewer@example.com';
        // Используем простой пароль "viewer" по умолчанию
        // Можно изменить через аргумент командной строки
        const password = process.argv[2] || 'viewer';

        console.log(`🔐 Установка пароля для пользователя: ${email}\n`);

        // Проверяем, существует ли пользователь в БД
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (!user) {
            console.log(`❌ Пользователь не найден в базе данных: ${email}`);
            process.exit(1);
        }

        console.log(`   Найден пользователь: ${user.name || 'Без имени'} (${user.id})`);

        // Хэшируем пароль
        const passwordHash = hashPassword(password);

        // Обновляем пароль напрямую в БД
        const [updatedUser] = await db
            .update(users)
            .set({ 
                passwordHash,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id))
            .returning();

        if (updatedUser && updatedUser.passwordHash) {
            console.log(`\n✅ Пароль успешно установлен!`);
            console.log(`\n═══════════════════════════════════════════════════════════`);
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Пароль: ${password}`);
            console.log(`═══════════════════════════════════════════════════════════\n`);
        } else {
            console.log(`⚠️  Пароль обновлен, но не найден при проверке`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при установке пароля:', error);
        if (error instanceof Error) {
            console.error('Детали:', error.message);
            if (error.stack) {
                console.error('\nStack trace:', error.stack);
            }
        }
        process.exit(1);
    }
}

setViewerPassword();
