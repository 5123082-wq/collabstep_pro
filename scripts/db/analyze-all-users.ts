#!/usr/bin/env tsx
/**
 * Скрипт для анализа всех пользователей в системе
 * Разделяет пользователей на тестовых/администраторов и зарегистрированных через форму
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { db } from '../apps/api/src/db/config';
import { users } from '../apps/api/src/db/schema';
import { memory } from '../apps/api/src/data/memory';
import { 
  TEST_ADMIN_USER_ID, 
  TEST_USER_ID, 
  TEST_FINANCE_USER_ID, 
  TEST_DESIGNER_USER_ID 
} from '../apps/api/src/data/memory';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

interface UserAnalysis {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
  location: string | null;
  hasPassword: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  type: 'test_admin' | 'test_user' | 'ai_agent' | 'registered' | 'unknown';
  source: 'database' | 'memory' | 'both';
}

// Тестовые email-адреса
const TEST_EMAILS = [
  'admin.demo@collabverse.test',
  'user.demo@collabverse.test',
  'finance.pm@collabverse.test',
  'designer.demo@collabverse.test'
];

// Тестовые ID
const TEST_IDS = [
  TEST_ADMIN_USER_ID,
  TEST_USER_ID,
  TEST_FINANCE_USER_ID,
  TEST_DESIGNER_USER_ID
];

function isTestUser(user: { id: string; email: string | null }): boolean {
  if (TEST_IDS.includes(user.id)) {
    return true;
  }
  if (user.email && TEST_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }
  if (user.email && user.email.endsWith('@collabverse.test')) {
    return true;
  }
  return false;
}

function isAIAgent(user: { email: string | null }): boolean {
  if (user.email && user.email.endsWith('@collabverse.ai')) {
    return true;
  }
  return false;
}

function determineUserType(user: { id: string; email: string | null }): UserAnalysis['type'] {
  if (user.id === TEST_ADMIN_USER_ID || user.email === 'admin.demo@collabverse.test') {
    return 'test_admin';
  }
  if (isTestUser(user)) {
    return 'test_user';
  }
  if (isAIAgent(user)) {
    return 'ai_agent';
  }
  if (user.email && !user.email.endsWith('@collabverse.test') && !user.email.endsWith('@collabverse.ai')) {
    return 'registered';
  }
  return 'unknown';
}

async function analyzeUsers() {
  console.log('🔍 Анализ всех пользователей в системе...\n');

  // Получаем пользователей из базы данных
  let dbUsers: any[] = [];
  try {
    dbUsers = await db.select().from(users);
    console.log(`📊 Найдено пользователей в базе данных: ${dbUsers.length}`);
  } catch (error) {
    console.warn('⚠️  Не удалось получить пользователей из базы данных:', error);
  }

  // Получаем пользователей из памяти
  const memoryUsers = memory.WORKSPACE_USERS || [];
  console.log(`📊 Найдено пользователей в памяти: ${memoryUsers.length}\n`);

  // Объединяем и анализируем
  const allUsersMap = new Map<string, UserAnalysis>();

  // Добавляем пользователей из базы данных
  for (const dbUser of dbUsers) {
    const analysis: UserAnalysis = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      title: dbUser.title,
      department: dbUser.department,
      location: dbUser.location,
      hasPassword: !!dbUser.passwordHash,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      type: determineUserType({ id: dbUser.id, email: dbUser.email }),
      source: 'database'
    };
    allUsersMap.set(dbUser.id, analysis);
  }

  // Добавляем пользователей из памяти
  for (const memUser of memoryUsers) {
    const existing = allUsersMap.get(memUser.id);
    if (existing) {
      existing.source = 'both';
    } else {
      const analysis: UserAnalysis = {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        title: memUser.title || null,
        department: memUser.department || null,
        location: memUser.location || null,
        hasPassword: !!(memUser as any).passwordHash,
        createdAt: null,
        updatedAt: null,
        type: determineUserType({ id: memUser.id, email: memUser.email }),
        source: 'memory'
      };
      allUsersMap.set(memUser.id, analysis);
    }
  }

  const allUsers = Array.from(allUsersMap.values());

  // Разделяем на категории
  const testAdmins = allUsers.filter(u => u.type === 'test_admin');
  const testUsers = allUsers.filter(u => u.type === 'test_user');
  const aiAgents = allUsers.filter(u => u.type === 'ai_agent');
  const registered = allUsers.filter(u => u.type === 'registered');
  const unknown = allUsers.filter(u => u.type === 'unknown');

  // Выводим результаты
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 РЕЗУЛЬТАТЫ АНАЛИЗА ПОЛЬЗОВАТЕЛЕЙ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📊 Всего пользователей: ${allUsers.length}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 ТЕСТОВЫЕ АДМИНИСТРАТОРЫ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (testAdmins.length === 0) {
    console.log('   Нет тестовых администраторов');
  } else {
    testAdmins.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'Нет email'}`);
      console.log(`   Должность: ${user.title || 'Не указана'}`);
      console.log(`   Отдел: ${user.department || 'Не указан'}`);
      console.log(`   Локация: ${user.location || 'Не указана'}`);
      console.log(`   Пароль: ${user.hasPassword ? '✅ Есть' : '❌ Нет'}`);
      console.log(`   Источник: ${user.source}`);
      if (user.createdAt) {
        console.log(`   Создан: ${user.createdAt.toISOString()}`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (testUsers.length === 0) {
    console.log('   Нет тестовых пользователей');
  } else {
    testUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'Нет email'}`);
      console.log(`   Должность: ${user.title || 'Не указана'}`);
      console.log(`   Отдел: ${user.department || 'Не указан'}`);
      console.log(`   Локация: ${user.location || 'Не указана'}`);
      console.log(`   Пароль: ${user.hasPassword ? '✅ Есть' : '❌ Нет'}`);
      console.log(`   Источник: ${user.source}`);
      if (user.createdAt) {
        console.log(`   Создан: ${user.createdAt.toISOString()}`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 AI-АГЕНТЫ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (aiAgents.length === 0) {
    console.log('   Нет AI-агентов');
  } else {
    aiAgents.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'Нет email'}`);
      console.log(`   Должность: ${user.title || 'Не указана'}`);
      console.log(`   Источник: ${user.source}`);
      if (user.createdAt) {
        console.log(`   Создан: ${user.createdAt.toISOString()}`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 ПОЛЬЗОВАТЕЛИ, ЗАРЕГИСТРИРОВАННЫЕ ЧЕРЕЗ ФОРМУ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (registered.length === 0) {
    console.log('   Нет пользователей, зарегистрированных через форму');
  } else {
    registered.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'Нет email'}`);
      console.log(`   Должность: ${user.title || 'Не указана'}`);
      console.log(`   Отдел: ${user.department || 'Не указан'}`);
      console.log(`   Локация: ${user.location || 'Не указана'}`);
      console.log(`   Пароль: ${user.hasPassword ? '✅ Есть' : '❌ Нет'}`);
      console.log(`   Источник: ${user.source}`);
      if (user.createdAt) {
        console.log(`   Создан: ${user.createdAt.toISOString()}`);
      }
    });
  }

  if (unknown.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❓ НЕОПРЕДЕЛЕННЫЕ ПОЛЬЗОВАТЕЛИ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    unknown.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'Нет email'}`);
      console.log(`   Источник: ${user.source}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 СВОДКА');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Тестовые администраторы: ${testAdmins.length}`);
  console.log(`   Тестовые пользователи: ${testUsers.length}`);
  console.log(`   AI-агенты: ${aiAgents.length}`);
  console.log(`   Зарегистрированные через форму: ${registered.length}`);
  if (unknown.length > 0) {
    console.log(`   Неопределенные: ${unknown.length}`);
  }
  console.log(`   ─────────────────────────────────`);
  console.log(`   Всего: ${allUsers.length}`);

  process.exit(0);
}

analyzeUsers().catch((error) => {
  console.error('❌ Ошибка при анализе пользователей:', error);
  process.exit(1);
});

