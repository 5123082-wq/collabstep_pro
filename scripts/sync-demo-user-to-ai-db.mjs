#!/usr/bin/env node
/**
 * Синхронизирует demo-пользователя из основной БД в AI БД
 * Это нужно для работы AI Hub, т.к. ai_conversation ссылается на user
 */
import 'dotenv/config';
import postgres from 'postgres';

const mainDbUrl = process.env.DATABASE_URL;
const aiDbUrl = process.env.AI_AGENTS_DATABASE_URL || mainDbUrl;

if (!mainDbUrl || !aiDbUrl) {
  console.error('❌ DATABASE_URL or AI_AGENTS_DATABASE_URL not found');
  process.exit(1);
}

console.log('🔄 Syncing demo user to AI database...\n');

const mainSql = postgres(mainDbUrl, { ssl: 'prefer' });
const aiSql = postgres(aiDbUrl, { ssl: 'prefer' });

try {
  // Получаем demo-пользователя из основной БД
  const demoUsers = await mainSql`
    SELECT id, email, name, "isAi", "createdAt"
    FROM "user"
    WHERE id = '00000000-0000-0000-0000-000000000001'
    LIMIT 1
  `;

  if (demoUsers.length === 0) {
    console.log('⚠️  Demo user not found in main database');
    await mainSql.end();
    await aiSql.end();
    process.exit(1);
  }

  const user = demoUsers[0];
  console.log('✅ Found demo user in main DB:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name || 'NULL');
  console.log();

  // Проверяем есть ли уже в AI БД
  const existing = await aiSql`
    SELECT id FROM "user" WHERE id = ${user.id}
  `;

  if (existing.length > 0) {
    console.log('ℹ️  Demo user already exists in AI database, updating...');
    await aiSql`
      UPDATE "user"
      SET email = ${user.email},
          name = ${user.name},
          "isAi" = ${user.isAi || false}
      WHERE id = ${user.id}
    `;
    console.log('✅ Demo user updated in AI database');
  } else {
    console.log('➕ Creating demo user in AI database...');
    await aiSql`
      INSERT INTO "user" (id, email, name, "isAi", "createdAt")
      VALUES (
        ${user.id},
        ${user.email},
        ${user.name},
        ${user.isAi || false},
        ${user.createdAt || new Date()}
      )
    `;
    console.log('✅ Demo user created in AI database');
  }

  await mainSql.end();
  await aiSql.end();
  console.log('\n✅ Sync completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.cause) {
    console.error('   Cause:', error.cause);
  }
  await mainSql.end();
  await aiSql.end();
  process.exit(1);
}
