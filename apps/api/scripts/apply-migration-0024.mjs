/**
 * Apply migration 0024_subscription_ai_limits.sql
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/apply-migration-0024.mjs
 * Or from apps/api: node scripts/apply-migration-0024.mjs
 *
 * Uses DATABASE_URL (main app database, not AI_AGENTS_DATABASE_URL).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function applyMigration() {
  console.log('📦 Applying migration 0024_subscription_ai_limits.sql...\n');

  const statements = [
    {
      name: 'Add ai_agent_runs_per_day column to subscription_plan',
      sql: `ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_runs_per_day" INTEGER`,
    },
    {
      name: 'Add ai_agent_concurrent_runs column to subscription_plan',
      sql: `ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_concurrent_runs" INTEGER`,
    },
    {
      name: 'Update free plan with AI limits',
      sql: `UPDATE "subscription_plan" SET "ai_agent_runs_per_day" = 3, "ai_agent_concurrent_runs" = 1 WHERE "code" = 'free'`,
    },
    {
      name: 'Update pro plan with AI limits',
      sql: `UPDATE "subscription_plan" SET "ai_agent_runs_per_day" = 50, "ai_agent_concurrent_runs" = 3 WHERE "code" = 'pro'`,
    },
    {
      name: 'Update max plan with AI limits',
      sql: `UPDATE "subscription_plan" SET "ai_agent_runs_per_day" = -1, "ai_agent_concurrent_runs" = 10 WHERE "code" = 'max'`,
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
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_plan'
      AND column_name IN ('ai_agent_runs_per_day', 'ai_agent_concurrent_runs')
    `;
    if (cols.length >= 2) {
      console.log('   ✅ AI limit columns exist in subscription_plan');
    } else {
      console.log(`   ⚠️  Found ${cols.length}/2 AI limit columns`);
    }

    const plans = await sql`
      SELECT code, ai_agent_runs_per_day, ai_agent_concurrent_runs 
      FROM subscription_plan 
      ORDER BY code
    `;
    console.log('\n📋 Current plan limits:');
    plans.forEach((p) => {
      console.log(
        `   ${p.code}: runs/day=${p.ai_agent_runs_per_day ?? 'null'}, concurrent=${p.ai_agent_concurrent_runs ?? 'null'}`
      );
    });
  } catch (err) {
    console.log(`   ❌ Verification error: ${err.message}`);
  }

  await sql.end();
  if (errorCount > 0) {
    process.exit(1);
  }
  console.log('\n✅ Migration 0024 completed!');
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
