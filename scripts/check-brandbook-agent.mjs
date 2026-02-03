#!/usr/bin/env node
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../apps/api/src/db/schema.js';

const databaseUrl =
  process.env.AI_AGENTS_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ No DATABASE_URL or AI_AGENTS_DATABASE_URL found');
  process.exit(1);
}

console.log('🔍 Checking Brandbook Agent in database...\n');

const client = postgres(databaseUrl, { ssl: 'prefer' });
const db = drizzle(client, { schema });

try {
  // Check AI agent config
  const agentConfig = await db
    .select()
    .from(schema.aiAgentConfigs)
    .where(eq(schema.aiAgentConfigs.slug, 'brandbook'))
    .limit(1);

  if (agentConfig.length === 0) {
    console.log('❌ Brandbook Agent config NOT FOUND in ai_agent_config table');
    process.exit(1);
  }

  console.log('✅ Brandbook Agent config found:');
  console.log('   ID:', agentConfig[0].id);
  console.log('   Slug:', agentConfig[0].slug);
  console.log('   Name:', agentConfig[0].name);
  console.log('   Enabled:', agentConfig[0].enabled);
  console.log('   Allow Direct Messages:', agentConfig[0].allowDirectMessages);
  console.log('   User ID:', agentConfig[0].userId || 'NULL');
  console.log();

  // Check if linked user exists
  if (agentConfig[0].userId) {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, agentConfig[0].userId))
      .limit(1);

    if (user.length > 0) {
      console.log('✅ Linked user found:');
      console.log('   ID:', user[0].id);
      console.log('   Email:', user[0].email);
      console.log('   Name:', user[0].name || 'NULL');
      console.log('   is_ai:', user[0].isAi || false);
    } else {
      console.log('⚠️  User ID is set but user NOT FOUND in users table');
    }
  } else {
    console.log('⚠️  No user linked to agent (userId is NULL)');
  }

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.cause) {
    console.error('   Cause:', error.cause);
  }
  await client.end();
  process.exit(1);
}
