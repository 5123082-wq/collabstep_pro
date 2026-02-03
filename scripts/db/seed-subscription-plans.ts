/**
 * Seed subscription plans with AI limits
 * Run: pnpm tsx scripts/db/seed-subscription-plans.ts
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

const plans = [
  {
    id: 'plan-free',
    code: 'free',
    name: 'Free',
    storage_limit_bytes: 100 * 1024 * 1024, // 100 MB
    file_size_limit_bytes: 10 * 1024 * 1024, // 10 MB
    trash_retention_days: 7,
    ai_agent_runs_per_day: 3,
    ai_agent_concurrent_runs: 1,
  },
  {
    id: 'plan-pro',
    code: 'pro',
    name: 'Pro',
    storage_limit_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
    file_size_limit_bytes: 100 * 1024 * 1024, // 100 MB
    trash_retention_days: 30,
    ai_agent_runs_per_day: 50,
    ai_agent_concurrent_runs: 3,
  },
  {
    id: 'plan-max',
    code: 'max',
    name: 'Max',
    storage_limit_bytes: null, // unlimited
    file_size_limit_bytes: 500 * 1024 * 1024, // 500 MB
    trash_retention_days: null, // unlimited
    ai_agent_runs_per_day: -1, // unlimited
    ai_agent_concurrent_runs: 10,
  },
];

async function seedPlans() {
  console.log('🌱 Seeding subscription plans...\n');

  for (const plan of plans) {
    try {
      await sql`
        INSERT INTO subscription_plan (
          id, code, name, storage_limit_bytes, file_size_limit_bytes,
          trash_retention_days, ai_agent_runs_per_day, ai_agent_concurrent_runs
        ) VALUES (
          ${plan.id}, ${plan.code}, ${plan.name}, ${plan.storage_limit_bytes},
          ${plan.file_size_limit_bytes}, ${plan.trash_retention_days},
          ${plan.ai_agent_runs_per_day}, ${plan.ai_agent_concurrent_runs}
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          storage_limit_bytes = EXCLUDED.storage_limit_bytes,
          file_size_limit_bytes = EXCLUDED.file_size_limit_bytes,
          trash_retention_days = EXCLUDED.trash_retention_days,
          ai_agent_runs_per_day = EXCLUDED.ai_agent_runs_per_day,
          ai_agent_concurrent_runs = EXCLUDED.ai_agent_concurrent_runs,
          updated_at = NOW()
      `;
      console.log(`✅ Plan "${plan.code}" upserted`);
    } catch (error) {
      console.error(`❌ Error with plan "${plan.code}":`, error);
    }
  }

  // Verify
  console.log('\n🔍 Verifying plans...');
  const result =
    await sql`SELECT code, name, ai_agent_runs_per_day, ai_agent_concurrent_runs FROM subscription_plan ORDER BY code`;
  console.table(result);

  await sql.end();
  console.log('\n✅ Seed complete!');
}

seedPlans().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
