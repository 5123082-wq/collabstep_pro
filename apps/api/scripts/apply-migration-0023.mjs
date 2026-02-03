/**
 * Apply migration 0023_agent_identity.sql
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/apply-migration-0023.mjs
 * Or from apps/api: node scripts/apply-migration-0023.mjs
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
  console.log('📦 Applying migration 0023_agent_identity.sql...\n');

  const statements = [
    {
      name: 'Add is_ai column to user table',
      sql: `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_ai" BOOLEAN DEFAULT false`,
    },
    {
      name: 'Add user_id column to ai_agent_config (FK to user)',
      sql: `ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "user_id" TEXT REFERENCES "user"(id)`,
    },
    {
      name: 'Create index ai_agent_config_user_id_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_agent_config_user_id_idx" ON "ai_agent_config"("user_id")`,
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
    const userCol = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'is_ai'
    `;
    if (userCol.length > 0) {
      console.log('   ✅ Column "user"."is_ai" exists');
    } else {
      console.log('   ❌ Column "user"."is_ai" NOT FOUND');
    }

    const configCol = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_agent_config' AND column_name = 'user_id'
    `;
    if (configCol.length > 0) {
      console.log('   ✅ Column "ai_agent_config"."user_id" exists');
    } else {
      console.log('   ❌ Column "ai_agent_config"."user_id" NOT FOUND');
    }

    const idx = await sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'ai_agent_config' AND indexname = 'ai_agent_config_user_id_idx'
    `;
    if (idx.length > 0) {
      console.log('   ✅ Index "ai_agent_config_user_id_idx" exists');
    } else {
      console.log('   ❌ Index "ai_agent_config_user_id_idx" NOT FOUND');
    }
  } catch (err) {
    console.log(`   ❌ Verification error: ${err.message}`);
  }

  await sql.end();
  if (errorCount > 0) {
    process.exit(1);
  }
  console.log('\n✅ Migration 0023 completed!');
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
