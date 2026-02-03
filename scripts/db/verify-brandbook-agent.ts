#!/usr/bin/env tsx
/**
 * Скрипт для проверки наличия AI-пользователя Brandbook Agent и связи с конфигурацией.
 */

// Must run first so POSTGRES_URL is set before api/db/config is loaded
import './load-db-env';
import { eq } from 'drizzle-orm';
import { db } from '../../apps/api/src/db/config';
import { users, aiAgentConfigs } from '../../apps/api/src/db/schema';

const BRANDBOOK_AGENT_EMAIL = 'brandbook.agent@collabverse.ai';
const BRANDBOOK_AGENT_SLUG = 'brandbook';

async function verify() {
  console.log('🔍 Verifying Brandbook Agent setup...\n');

  // 1. Check AI user
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isAi: users.isAi,
      title: users.title,
    })
    .from(users)
    .where(eq(users.email, BRANDBOOK_AGENT_EMAIL))
    .limit(1);
  
  if (user) {
    console.log('✅ AI User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   is_ai: ${user.isAi}`);
    console.log(`   Title: ${user.title || 'NULL'}`);
  } else {
    console.log('❌ AI User NOT FOUND');
  }

  // 2. Check agent config
  const [config] = await db
    .select({
      id: aiAgentConfigs.id,
      slug: aiAgentConfigs.slug,
      name: aiAgentConfigs.name,
      userId: aiAgentConfigs.userId,
    })
    .from(aiAgentConfigs)
    .where(eq(aiAgentConfigs.slug, BRANDBOOK_AGENT_SLUG))
    .limit(1);
  
  console.log('');
  if (config) {
    console.log('✅ Agent Config found:');
    console.log(`   ID: ${config.id}`);
    console.log(`   Slug: ${config.slug}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   user_id: ${config.userId || 'NULL'}`);
  } else {
    console.log('❌ Agent Config NOT FOUND');
  }

  // 3. Verify link
  console.log('');
  if (user && config) {
    if (config.userId === user.id) {
      console.log('✅ Link verified: ai_agent_config.user_id matches user.id');
    } else {
      console.log('❌ Link MISMATCH:');
      console.log(`   config.user_id: ${config.userId}`);
      console.log(`   user.id: ${user.id}`);
    }
  }

  console.log('\n✅ Verification complete!');
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
