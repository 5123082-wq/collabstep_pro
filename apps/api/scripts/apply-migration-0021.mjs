/**
 * Apply migration 0021_brandbook_agent_artifacts_preview.sql
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/apply-migration-0021.mjs
 * Or from apps/api: node scripts/apply-migration-0021.mjs
 *
 * Uses AI_AGENTS_DATABASE_URL if set, else DATABASE_URL.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/api/scripts -> load from apps/web/.env.local or repo .env.local
dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const dbUrl = process.env.AI_AGENTS_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ AI_AGENTS_DATABASE_URL or DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function applyMigration() {
  console.log('📦 Applying migration 0021_brandbook_agent_artifacts_preview.sql...\n');

  const statements = [
    {
      name: 'Drop NOT NULL on file_id',
      sql: `ALTER TABLE "brandbook_agent_artifact" ALTER COLUMN "file_id" DROP NOT NULL`
    },
    {
      name: 'Add storage_key, storage_url, filename, mime_type, size_bytes',
      sql: `ALTER TABLE "brandbook_agent_artifact"
  ADD COLUMN IF NOT EXISTS "storage_key" text,
  ADD COLUMN IF NOT EXISTS "storage_url" text,
  ADD COLUMN IF NOT EXISTS "filename" text,
  ADD COLUMN IF NOT EXISTS "mime_type" text,
  ADD COLUMN IF NOT EXISTS "size_bytes" bigint`
    }
  ];

  for (let i = 0; i < statements.length; i++) {
    const { name, sql: stmt } = statements[i];
    try {
      await sql.unsafe(stmt);
      console.log(`✅ [${i + 1}/${statements.length}] ${name}`);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('does not exist')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Skipped: ${name} (${error.message})`);
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] ${name}: ${error.message}`);
        await sql.end();
        process.exit(1);
      }
    }
  }

  console.log('\n🔍 Verifying columns on brandbook_agent_artifact...');
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brandbook_agent_artifact'
    ORDER BY ordinal_position
  `;
  const hasStorageKey = cols.some((r) => r.column_name === 'storage_key');
  if (hasStorageKey) {
    console.log('   ✅ Column storage_key exists');
  } else {
    console.log('   ❌ Column storage_key NOT FOUND');
    await sql.end();
    process.exit(1);
  }

  await sql.end();
  console.log('\n✅ Migration 0021 completed!');
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
