#!/usr/bin/env tsx
/**
 * Создаёт demo-пользователя в AI БД.
 * Это необходимо для работы AI Hub, т.к. ai_conversation ссылается на user.
 *
 * Использование:
 *   pnpm tsx scripts/db/sync-demo-user-to-ai-db.ts
 */

import './load-db-env';
import { eq } from 'drizzle-orm';
import { aiAgentsDb } from '../../apps/api/src/db/ai-agents-config';
import { users } from '../../apps/api/src/db/schema';
import { TEST_ADMIN_USER_ID } from '../../apps/api/src/data/memory';

const DEMO_USER_EMAIL = 'admin.demo@collabverse.test';
const DEMO_USER_NAME = 'Алина Админ';

async function syncDemoUser() {
  console.log('🔄 Creating/updating demo user in AI database...\n');

  try {
    // Проверяем есть ли уже в AI БД
    const aiUsers = await aiAgentsDb
      .select()
      .from(users)
      .where(eq(users.id, TEST_ADMIN_USER_ID))
      .limit(1);

    if (aiUsers.length > 0) {
      console.log('ℹ️  Demo user already exists in AI database:');
      console.log('   ID:', aiUsers[0].id);
      console.log('   Email:', aiUsers[0].email);
      console.log('   Name:', aiUsers[0].name || 'NULL');
      console.log('\n✅ No action needed');
    } else {
      console.log('➕ Creating demo user in AI database...');
      await aiAgentsDb.insert(users).values({
        id: TEST_ADMIN_USER_ID,
        email: DEMO_USER_EMAIL,
        name: DEMO_USER_NAME,
        isAi: false,
        createdAt: new Date(),
      });
      console.log('✅ Demo user created:');
      console.log('   ID:', TEST_ADMIN_USER_ID);
      console.log('   Email:', DEMO_USER_EMAIL);
      console.log('   Name:', DEMO_USER_NAME);
    }

    console.log('\n✅ Sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'cause' in error) {
      console.error('   Cause:', error.cause);
    }
    process.exit(1);
  }
}

syncDemoUser();
