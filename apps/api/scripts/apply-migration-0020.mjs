/**
 * Apply migration 0020_ai_agents.sql
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/apply-migration-0020.mjs
 * Or from apps/api: node scripts/apply-migration-0020.mjs
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
  console.log('📦 Applying migration 0020_ai_agents.sql...\n');

  const statements = [
    {
      name: 'Create table ai_agent_config',
      sql: `CREATE TABLE IF NOT EXISTS "ai_agent_config" (
        "id" text PRIMARY KEY NOT NULL,
        "slug" text UNIQUE NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "pipeline_type" text NOT NULL DEFAULT 'generative',
        "enabled" boolean DEFAULT true,
        "icon" text,
        "limits" jsonb,
        "parameters" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )`,
    },
    {
      name: 'Create table ai_agent_prompt_version',
      sql: `CREATE TABLE IF NOT EXISTS "ai_agent_prompt_version" (
        "id" text PRIMARY KEY NOT NULL,
        "agent_id" text NOT NULL,
        "version" integer NOT NULL,
        "status" text DEFAULT 'draft',
        "system_prompt" text,
        "prompts" jsonb,
        "created_by" text,
        "created_at" timestamp DEFAULT now()
      )`,
    },
    {
      name: 'Add FK ai_agent_prompt_version.agent_id -> ai_agent_config.id',
      sql: `DO $$ BEGIN
        ALTER TABLE "ai_agent_prompt_version" ADD CONSTRAINT "ai_agent_prompt_version_agent_id_fk" 
          FOREIGN KEY ("agent_id") REFERENCES "ai_agent_config"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    },
    {
      name: 'Add FK ai_agent_prompt_version.created_by -> user.id',
      sql: `DO $$ BEGIN
        ALTER TABLE "ai_agent_prompt_version" ADD CONSTRAINT "ai_agent_prompt_version_created_by_fk" 
          FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    },
    {
      name: 'Create index ai_agent_config_slug_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_agent_config_slug_idx" ON "ai_agent_config" USING btree ("slug")`,
    },
    {
      name: 'Create index ai_agent_config_enabled_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_agent_config_enabled_idx" ON "ai_agent_config" USING btree ("enabled")`,
    },
    {
      name: 'Create unique index ai_agent_prompt_version_agent_version_idx',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "ai_agent_prompt_version_agent_version_idx" ON "ai_agent_prompt_version" ("agent_id", "version")`,
    },
    {
      name: 'Create index ai_agent_prompt_version_agent_id_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_agent_prompt_version_agent_id_idx" ON "ai_agent_prompt_version" USING btree ("agent_id")`,
    },
    {
      name: 'Create index ai_agent_prompt_version_status_idx',
      sql: `CREATE INDEX IF NOT EXISTS "ai_agent_prompt_version_status_idx" ON "ai_agent_prompt_version" USING btree ("status")`,
    },
    {
      name: 'Seed Brandbook Agent config',
      sql: `INSERT INTO "ai_agent_config" ("id", "slug", "name", "description", "pipeline_type", "enabled", "icon", "limits", "parameters")
        VALUES (
          'brandbook-agent',
          'brandbook',
          'Brandbook Agent',
          'AI-дизайнер для создания брендбуков мерча. Принимает логотип и генерирует одностраничный визуальный макет.',
          'generative',
          true,
          'Palette',
          '{"maxRunsPerDay": 10, "maxConcurrentRuns": 1, "maxFileSizeBytes": 10485760}',
          '{"outputLanguage": "ru", "watermarkText": "сделано в Rubiform", "contactBlock": "contact@rubiform.example | +7 900 000-00-00"}'
        )
        ON CONFLICT ("id") DO NOTHING`,
    },
    {
      name: 'Seed initial Brandbook prompt version',
      sql: `INSERT INTO "ai_agent_prompt_version" ("id", "agent_id", "version", "status", "system_prompt", "prompts")
        VALUES (
          'brandbook-prompt-v1',
          'brandbook-agent',
          1,
          'published',
          'Ты AI-дизайнер, специализирующийся на создании брендбуков для мерча. Ты помогаешь пользователям с логотипами и создаешь визуальные макеты продукции. Отвечай дружелюбно и профессионально. Все ответы на русском языке.',
          '{"intake": "Приветствую! Я помогу создать брендбук для вашего мерча.", "logoCheck": "Проанализируй загруженный логотип.", "generate": "Создай визуальный макет брендбука.", "qa": "Проверь сгенерированный макет.", "followup": "Брендбук готов! Хотите внести изменения?"}'
        )
        ON CONFLICT ("id") DO NOTHING`,
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
    const configTable = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_agent_config'
    `;
    if (configTable.length > 0) {
      console.log('   ✅ Table "ai_agent_config" exists');
    } else {
      console.log('   ❌ Table "ai_agent_config" NOT FOUND');
    }

    const promptTable = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_agent_prompt_version'
    `;
    if (promptTable.length > 0) {
      console.log('   ✅ Table "ai_agent_prompt_version" exists');
    } else {
      console.log('   ❌ Table "ai_agent_prompt_version" NOT FOUND');
    }

    const agentConfig = await sql`
      SELECT id, slug, name FROM ai_agent_config WHERE slug = 'brandbook'
    `;
    if (agentConfig.length > 0) {
      console.log(
        `   ✅ Brandbook Agent config exists (id=${agentConfig[0].id})`
      );
    } else {
      console.log('   ❌ Brandbook Agent config NOT FOUND');
    }

    const promptVersion = await sql`
      SELECT id, version, status FROM ai_agent_prompt_version WHERE agent_id = 'brandbook-agent'
    `;
    if (promptVersion.length > 0) {
      console.log(
        `   ✅ Brandbook prompt version exists (v${promptVersion[0].version}, status=${promptVersion[0].status})`
      );
    } else {
      console.log('   ❌ Brandbook prompt version NOT FOUND');
    }
  } catch (err) {
    console.log(`   ❌ Verification error: ${err.message}`);
  }

  await sql.end();
  if (errorCount > 0) {
    process.exit(1);
  }
  console.log('\n✅ Migration 0020 completed!');
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
