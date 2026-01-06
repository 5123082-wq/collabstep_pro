import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { usersRepository, memory } from '@collabverse/api';
import { sql as vercelSql } from '@vercel/postgres';
import { eq } from 'drizzle-orm';

async function auditUsers() {
  try {
    console.log('👤 АУДИТ ПОЛЬЗОВАТЕЛЕЙ...\n');

    // 1. БД через Drizzle
    const usersFromDrizzle = await db.select().from(users);
    console.log(`   Drizzle (user table): ${usersFromDrizzle.length} пользователей`);

    // 2. БД через прямой SQL
    let usersFromSql: any[] = [];
    try {
      const sqlResult = await vercelSql.query('SELECT * FROM "user"');
      usersFromSql = sqlResult.rows || [];
      console.log(`   SQL (user table): ${usersFromSql.length} пользователей`);
    } catch (error) {
      console.log(`   SQL (user table): ошибка - ${error instanceof Error ? error.message : 'unknown'}`);
    }

    // 3. Память
    const usersFromMemory = memory.WORKSPACE_USERS || [];
    console.log(`   Memory (memory.WORKSPACE_USERS): ${usersFromMemory.length} пользователей`);

    // 4. Репозиторий
    const usersFromRepo = await usersRepository.list();
    console.log(`   Repository (usersRepository.list): ${usersFromRepo.length} пользователей\n`);

    // Собираем все уникальные пользователи
    const allUsersMap = new Map<string, any>();

    usersFromDrizzle.forEach((user) => {
      const key = user.id;
      if (!allUsersMap.has(key)) {
        allUsersMap.set(key, {
          id: user.id,
          email: user.email,
          name: user.name,
          location: 'db',
          dbTable: 'user',
          source: 'Drizzle ORM',
          details: `email: ${user.email}, createdAt: ${user.createdAt}`
        });
      }
    });

    usersFromSql.forEach((user: any) => {
      const key = user.id;
      if (!allUsersMap.has(key)) {
        allUsersMap.set(key, {
          id: user.id,
          email: user.email,
          name: user.name,
          location: 'db',
          dbTable: 'user',
          source: 'Direct SQL',
          details: `email: ${user.email}, createdAt: ${user.createdAt}`
        });
      } else {
        const existing = allUsersMap.get(key)!;
        if (existing.source !== 'Direct SQL') {
          existing.source += ' + Direct SQL';
        }
      }
    });

    usersFromMemory.forEach((user) => {
      const key = user.id;
      if (!allUsersMap.has(key)) {
        allUsersMap.set(key, {
          id: user.id,
          email: user.email,
          name: user.name,
          location: 'memory',
          memoryKey: 'memory.WORKSPACE_USERS',
          source: 'Memory',
          details: `email: ${user.email}`
        });
      } else {
        const existing = allUsersMap.get(key)!;
        existing.location = existing.location === 'db' ? 'both' : 'memory';
        existing.memoryKey = 'memory.WORKSPACE_USERS';
        existing.details += ' | Также в памяти';
      }
    });

    console.log('📊 РЕЗУЛЬТАТЫ АУДИТА ПОЛЬЗОВАТЕЛЕЙ:\n');
    console.log(`Всего найдено: ${allUsersMap.size} уникальных пользователей\n`);

    console.log('ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('-'.repeat(100));
    console.log(
      `${'ID'.padEnd(40)} | ${'Email'.padEnd(35)} | ${'Имя'.padEnd(25)} | ${'Расположение'.padEnd(15)} | ${'Источник'.padEnd(20)}`
    );
    console.log('-'.repeat(100));

    const usersArray = Array.from(allUsersMap.values());
    usersArray.forEach((user) => {
      const location = user.location === 'both' ? 'БД + Память' : user.location === 'db' ? 'БД' : 'Память';
      const email = (user.email || 'N/A').substring(0, 35);
      const name = (user.name || 'N/A').substring(0, 25);
      console.log(
        `${user.id.substring(0, 40).padEnd(40)} | ${email.padEnd(35)} | ${name.padEnd(25)} | ${location.padEnd(15)} | ${user.source.padEnd(20)}`
      );
    });
    console.log('-'.repeat(100) + '\n');

    // Статистика
    const locationStats = {
      db: usersArray.filter((u) => u.location === 'db').length,
      memory: usersArray.filter((u) => u.location === 'memory').length,
      both: usersArray.filter((u) => u.location === 'both').length
    };
    console.log('СТАТИСТИКА:');
    console.log(`  Только в БД: ${locationStats.db}`);
    console.log(`  Только в памяти: ${locationStats.memory}`);
    console.log(`  В БД и памяти: ${locationStats.both}\n`);

    // Детальная информация
    console.log('ДЕТАЛЬНАЯ ИНФОРМАЦИЯ:');
    usersArray.forEach((user) => {
      console.log(`  ${user.name} (${user.email}):`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Расположение: ${user.location}`);
      console.log(`    Таблица БД: ${user.dbTable || 'N/A'}`);
      console.log(`    Ключ памяти: ${user.memoryKey || 'N/A'}`);
      console.log(`    Источник: ${user.source}`);
      console.log(`    Детали: ${user.details}`);
      console.log('');
    });

    return usersArray;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    return [];
  } finally {
    process.exit(0);
  }
}

auditUsers();

