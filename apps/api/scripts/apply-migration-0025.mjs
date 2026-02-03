/**
 * Apply migration 0025_ai_hub_conversations.sql
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/apply-migration-0025.mjs
 * Or from apps/api: node scripts/apply-migration-0025.mjs
 *
 * Uses AI_AGENTS_DATABASE_URL if set, else DATABASE_URL.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const dbUrl = process.env.AI_AGENTS_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    '❌ AI_AGENTS_DATABASE_URL or DATABASE_URL not found in environment'
  );
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function applyMigration() {
  console.log('📦 Applying migration 0025_ai_hub_conversations.sql...\n');

  const statements = [
    {
      name: 'Add allow_direct_messages column to ai_agent_config',
      sql: `ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "allow_direct_messages" BOOLEAN DEFAULT true`,
    },
    {
      name: 'Create ai_conversation table',
      sql: `CREATE TABLE IF NOT EXISTS "ai_conversation" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "agent_config_id" TEXT NOT NULL REFERENCES "ai_agent_config"(id) ON DELETE CASCADE,
        "title" TEXT,
        "last_message_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      name: 'Create ai_conversation_message table',
      sql: `CREATE TABLE IF NOT EXISTS "ai_conversation_message" (
        "id" TEXT PRIMARY KEY,
        "conversation_id" TEXT NOT NULL REFERENCES "ai_conversation"(id) ON DELETE CASCADE,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      name: 'Create index ai_conversation_user_id_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_conversation_user_id_idx" ON "ai_conversation"("user_id")`,
    },
    {
      name: 'Create index ai_conversation_agent_config_id_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_conversation_agent_config_id_idx" ON "ai_conversation"("agent_config_id")`,
    },
    {
      name: 'Create index ai_conversation_last_message_at_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_conversation_last_message_at_idx" ON "ai_conversation"("last_message_at" DESC)`,
    },
    {
      name: 'Create index ai_conversation_message_conversation_id_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_conversation_message_conversation_id_idx" ON "ai_conversation_message"("conversation_id")`,
    },
    {
      name: 'Create index ai_conversation_message_created_at_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_conversation_message_created_at_idx" ON "ai_conversation_message"("created_at")`,
    },
    {
      name: 'Update Brandbook Agent to allow direct messages',
      sql: `UPDATE "ai_agent_config" SET "allow_direct_messages" = true WHERE "slug" = 'brandbook'`,
    },
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const { name, sql: stmt } = statements[i];
    try {
      await sql.unsafe(stmt);
      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] ${name}`);
    } catch (error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate key') ||
        error.message.includes('duplicate column')
      ) {
        skipCount++;
        console.log(
          `⏭️  [${i + 1}/${statements.length}] Skipped (already applied): ${name}`
        );
      } else {
        errorCount++;
        console.error(
          `❌ [${i + 1}/${statements.length}] ${name}: ${error.message}`
        );
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  console.log('\n🔍 Verifying...');
  try {
    // Check allow_direct_messages column
    const configCol = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_agent_config' AND column_name = 'allow_direct_messages'
    `;
    if (configCol.length > 0) {
      console.log(
        '   ✅ Column "ai_agent_config"."allow_direct_messages" exists'
      );
    } else {
      console.log(
        '   ❌ Column "ai_agent_config"."allow_direct_messages" NOT FOUND'
      );
    }

    // Check ai_conversation table
    const convTable = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_conversation'
    `;
    if (convTable.length > 0) {
      console.log('   ✅ Table "ai_conversation" exists');
    } else {
      console.log('   ❌ Table "ai_conversation" NOT FOUND');
    }

    // Check ai_conversation_message table
    const msgTable = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_conversation_message'
    `;
    if (msgTable.length > 0) {
      console.log('   ✅ Table "ai_conversation_message" exists');
    } else {
      console.log('   ❌ Table "ai_conversation_message" NOT FOUND');
    }

    // Check indexes
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE 'ai_conversation%'
    `;
    console.log(`   ✅ Found ${indexes.length} ai_conversation indexes`);

    // Check Brandbook agent setting
    const agent = await sql`
      SELECT slug, allow_direct_messages FROM ai_agent_config WHERE slug = 'brandbook'
    `;
    if (agent.length > 0) {
      console.log(
        `   ✅ Brandbook agent: allow_direct_messages = ${agent[0].allow_direct_messages}`
      );
    }
  } catch (err) {
    console.log(`   ❌ Verification error: ${err.message}`);
  }

  await sql.end();
  if (errorCount > 0) {
    process.exit(1);
  }
  console.log('\n✅ Migration 0025 completed!');
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
