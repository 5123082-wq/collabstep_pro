#!/usr/bin/env tsx
/**
 * Database Consolidation Script
 * 
 * This script consolidates two Neon databases into one:
 * - neon-collabverse (main database) - target
 * - neon-AI-agen (AI agents database) - source
 * 
 * Steps:
 * 1. Apply missing migrations to main database (0025_ai_hub_conversations.sql)
 * 2. Migrate unique data from AI database to main database
 * 3. Verify data integrity
 * 
 * Usage:
 *   pnpm tsx scripts/db/consolidate-databases.ts --check     # Check data in both databases
 *   pnpm tsx scripts/db/consolidate-databases.ts --migrate   # Migrate data
 *   pnpm tsx scripts/db/consolidate-databases.ts --apply-migrations  # Apply missing migrations
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';

// Load environment variables
const dir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(dir, 'apps/web/.env.local') });
dotenv.config({ path: path.join(dir, '.env.local') });

const MAIN_DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const AI_DB_URL = process.env.AI_AGENTS_DATABASE_URL;

if (!MAIN_DB_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not found');
  process.exit(1);
}

// Create database connections
const mainDb = postgres(MAIN_DB_URL, { ssl: 'prefer' });
const aiDb = AI_DB_URL ? postgres(AI_DB_URL, { ssl: 'prefer' }) : null;

async function checkDatabases() {
  console.log('🔍 Checking database contents...\n');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 MAIN DATABASE (neon-collabverse)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Check main database tables
  const mainTables = await mainDb`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log('Tables:', mainTables.map(t => t.table_name).join(', '));
  
  // Check AI-related data in main database
  const mainAiConfigs = await mainDb`SELECT COUNT(*) as count FROM ai_agent_config`;
  const mainPromptVersions = await mainDb`SELECT COUNT(*) as count FROM ai_agent_prompt_version`;
  const mainBrandbookRuns = await mainDb`SELECT COUNT(*) as count FROM brandbook_agent_run`;
  const mainBrandbookMessages = await mainDb`SELECT COUNT(*) as count FROM brandbook_agent_message`;
  const mainBrandbookArtifacts = await mainDb`SELECT COUNT(*) as count FROM brandbook_agent_artifact`;
  
  // Check if ai_conversation table exists
  const hasAiConversation = mainTables.some(t => t.table_name === 'ai_conversation');
  let mainConversations = { count: 0 };
  let mainConversationMessages = { count: 0 };
  
  if (hasAiConversation) {
    mainConversations = (await mainDb`SELECT COUNT(*) as count FROM ai_conversation`)[0];
    mainConversationMessages = (await mainDb`SELECT COUNT(*) as count FROM ai_conversation_message`)[0];
  }
  
  // Check if allow_direct_messages column exists
  const hasAllowDirectMessages = await mainDb`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'ai_agent_config' AND column_name = 'allow_direct_messages'
  `;
  
  console.log('\nAI Agent Data:');
  console.log(`  ai_agent_config: ${mainAiConfigs[0].count} records`);
  console.log(`  ai_agent_prompt_version: ${mainPromptVersions[0].count} records`);
  console.log(`  brandbook_agent_run: ${mainBrandbookRuns[0].count} records`);
  console.log(`  brandbook_agent_message: ${mainBrandbookMessages[0].count} records`);
  console.log(`  brandbook_agent_artifact: ${mainBrandbookArtifacts[0].count} records`);
  console.log(`  ai_conversation: ${hasAiConversation ? mainConversations.count : '⚠️ TABLE MISSING'} records`);
  console.log(`  ai_conversation_message: ${hasAiConversation ? mainConversationMessages.count : '⚠️ TABLE MISSING'} records`);
  console.log(`  allow_direct_messages column: ${hasAllowDirectMessages.length > 0 ? '✅ EXISTS' : '⚠️ MISSING'}`);
  
  if (!aiDb) {
    console.log('\n⚠️  AI_AGENTS_DATABASE_URL not set - cannot check AI database');
    return { mainHasConversations: hasAiConversation, hasAllowDirectMessages: hasAllowDirectMessages.length > 0 };
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 AI DATABASE (neon-AI-agen)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Check AI database tables
  const aiTables = await aiDb`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log('Tables:', aiTables.map(t => t.table_name).join(', '));
  
  // Check AI-related data in AI database
  const aiAiConfigs = await aiDb`SELECT COUNT(*) as count FROM ai_agent_config`;
  const aiPromptVersions = await aiDb`SELECT COUNT(*) as count FROM ai_agent_prompt_version`;
  const aiBrandbookRuns = await aiDb`SELECT COUNT(*) as count FROM brandbook_agent_run`;
  const aiBrandbookMessages = await aiDb`SELECT COUNT(*) as count FROM brandbook_agent_message`;
  const aiBrandbookArtifacts = await aiDb`SELECT COUNT(*) as count FROM brandbook_agent_artifact`;
  
  // Check conversations
  const aiHasConversation = aiTables.some(t => t.table_name === 'ai_conversation');
  let aiConversations = { count: 0 };
  let aiConversationMessages = { count: 0 };
  
  if (aiHasConversation) {
    aiConversations = (await aiDb`SELECT COUNT(*) as count FROM ai_conversation`)[0];
    aiConversationMessages = (await aiDb`SELECT COUNT(*) as count FROM ai_conversation_message`)[0];
  }
  
  // Check users
  const aiUsers = await aiDb`SELECT COUNT(*) as count FROM "user"`;
  
  console.log('\nAI Agent Data:');
  console.log(`  ai_agent_config: ${aiAiConfigs[0].count} records`);
  console.log(`  ai_agent_prompt_version: ${aiPromptVersions[0].count} records`);
  console.log(`  brandbook_agent_run: ${aiBrandbookRuns[0].count} records`);
  console.log(`  brandbook_agent_message: ${aiBrandbookMessages[0].count} records`);
  console.log(`  brandbook_agent_artifact: ${aiBrandbookArtifacts[0].count} records`);
  console.log(`  ai_conversation: ${aiHasConversation ? aiConversations.count : 'N/A'} records`);
  console.log(`  ai_conversation_message: ${aiHasConversation ? aiConversationMessages.count : 'N/A'} records`);
  console.log(`  users: ${aiUsers[0].count} records`);
  
  // Show actual records
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 DETAILED DATA COMPARISON');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // AI Agent Configs
  const mainConfigs = await mainDb`SELECT id, slug, name, enabled FROM ai_agent_config ORDER BY slug`;
  const aiConfigs = await aiDb`SELECT id, slug, name, enabled FROM ai_agent_config ORDER BY slug`;
  
  console.log('AI Agent Configs:');
  console.log('  Main DB:', mainConfigs.map(c => `${c.slug} (${c.id})`).join(', ') || 'none');
  console.log('  AI DB:', aiConfigs.map(c => `${c.slug} (${c.id})`).join(', ') || 'none');
  
  // Prompt Versions
  const mainVersions = await mainDb`SELECT id, agent_id, version, status FROM ai_agent_prompt_version ORDER BY agent_id, version`;
  const aiVersions = await aiDb`SELECT id, agent_id, version, status FROM ai_agent_prompt_version ORDER BY agent_id, version`;
  
  console.log('\nPrompt Versions:');
  console.log('  Main DB:', mainVersions.map(v => `v${v.version}:${v.status}`).join(', ') || 'none');
  console.log('  AI DB:', aiVersions.map(v => `v${v.version}:${v.status}`).join(', ') || 'none');
  
  // Brandbook Runs
  const mainRuns = await mainDb`SELECT id, status, created_at FROM brandbook_agent_run ORDER BY created_at DESC LIMIT 5`;
  const aiRuns = await aiDb`SELECT id, status, created_at FROM brandbook_agent_run ORDER BY created_at DESC LIMIT 5`;
  
  console.log('\nBrandbook Runs (last 5):');
  console.log('  Main DB:', mainRuns.length > 0 ? mainRuns.map(r => `${r.id.slice(0,8)}...:${r.status}`).join(', ') : 'none');
  console.log('  AI DB:', aiRuns.length > 0 ? aiRuns.map(r => `${r.id.slice(0,8)}...:${r.status}`).join(', ') : 'none');
  
  // Conversations
  if (aiHasConversation) {
    const aiConvs = await aiDb`SELECT id, user_id, agent_config_id, title FROM ai_conversation ORDER BY created_at DESC LIMIT 5`;
    console.log('\nAI Conversations (last 5):');
    console.log('  AI DB:', aiConvs.length > 0 ? aiConvs.map(c => `${c.id.slice(0,8)}...:${c.title || 'untitled'}`).join(', ') : 'none');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 MIGRATION REQUIREMENTS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const needsConversationTables = !hasAiConversation;
  const needsAllowDirectMessages = hasAllowDirectMessages.length === 0;
  const hasDataToMigrate = 
    Number(aiAiConfigs[0].count) > 0 ||
    Number(aiPromptVersions[0].count) > 0 ||
    Number(aiBrandbookRuns[0].count) > 0 ||
    (aiHasConversation && Number(aiConversations.count) > 0);
  
  if (needsConversationTables) {
    console.log('⚠️  Migration 0025 needs to be applied to main database:');
    console.log('   - ai_conversation table');
    console.log('   - ai_conversation_message table');
    console.log('   - allow_direct_messages column');
    console.log('   Run: pnpm tsx scripts/db/consolidate-databases.ts --apply-migrations\n');
  } else if (needsAllowDirectMessages) {
    console.log('⚠️  allow_direct_messages column needs to be added to ai_agent_config');
    console.log('   Run: pnpm tsx scripts/db/consolidate-databases.ts --apply-migrations\n');
  } else {
    console.log('✅ Main database schema is up to date\n');
  }
  
  if (hasDataToMigrate) {
    console.log('📦 Data to migrate from AI database:');
    if (Number(aiAiConfigs[0].count) > Number(mainAiConfigs[0].count)) {
      console.log(`   - ai_agent_config: ${Number(aiAiConfigs[0].count) - Number(mainAiConfigs[0].count)} new records`);
    }
    if (Number(aiPromptVersions[0].count) > Number(mainPromptVersions[0].count)) {
      console.log(`   - ai_agent_prompt_version: ${Number(aiPromptVersions[0].count) - Number(mainPromptVersions[0].count)} new records`);
    }
    if (Number(aiBrandbookRuns[0].count) > 0) {
      console.log(`   - brandbook_agent_run: ${aiBrandbookRuns[0].count} records`);
    }
    if (aiHasConversation && Number(aiConversations.count) > 0) {
      console.log(`   - ai_conversation: ${aiConversations.count} records`);
      console.log(`   - ai_conversation_message: ${aiConversationMessages.count} records`);
    }
    console.log('   Run: pnpm tsx scripts/db/consolidate-databases.ts --migrate\n');
  } else {
    console.log('✅ No unique data to migrate from AI database\n');
  }
  
  return { 
    mainHasConversations: hasAiConversation, 
    hasAllowDirectMessages: hasAllowDirectMessages.length > 0,
    hasDataToMigrate
  };
}

async function applyMigrations() {
  console.log('🔄 Applying missing migrations to main database...\n');
  
  // Check current state
  const hasAiConversation = await mainDb`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ai_conversation'
  `;
  
  const hasAllowDirectMessages = await mainDb`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'ai_agent_config' AND column_name = 'allow_direct_messages'
  `;
  
  if (hasAiConversation.length > 0 && hasAllowDirectMessages.length > 0) {
    console.log('✅ All migrations already applied\n');
    return;
  }
  
  console.log('Applying migration 0025_ai_hub_conversations...\n');
  
  // Add allow_direct_messages if missing
  if (hasAllowDirectMessages.length === 0) {
    console.log('  Adding allow_direct_messages column...');
    await mainDb`
      ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "allow_direct_messages" BOOLEAN DEFAULT true
    `;
    console.log('  ✅ allow_direct_messages column added');
  }
  
  // Create ai_conversation table if missing
  if (hasAiConversation.length === 0) {
    console.log('  Creating ai_conversation table...');
    await mainDb`
      CREATE TABLE IF NOT EXISTS "ai_conversation" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "agent_config_id" TEXT NOT NULL REFERENCES "ai_agent_config"(id) ON DELETE CASCADE,
        "title" TEXT,
        "last_message_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('  ✅ ai_conversation table created');
    
    console.log('  Creating ai_conversation_message table...');
    await mainDb`
      CREATE TABLE IF NOT EXISTS "ai_conversation_message" (
        "id" TEXT PRIMARY KEY,
        "conversation_id" TEXT NOT NULL REFERENCES "ai_conversation"(id) ON DELETE CASCADE,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('  ✅ ai_conversation_message table created');
    
    // Create indexes
    console.log('  Creating indexes...');
    await mainDb`CREATE INDEX IF NOT EXISTS "ai_conversation_user_id_idx" ON "ai_conversation"("user_id")`;
    await mainDb`CREATE INDEX IF NOT EXISTS "ai_conversation_agent_config_id_idx" ON "ai_conversation"("agent_config_id")`;
    await mainDb`CREATE INDEX IF NOT EXISTS "ai_conversation_last_message_at_idx" ON "ai_conversation"("last_message_at" DESC)`;
    await mainDb`CREATE INDEX IF NOT EXISTS "ai_conversation_message_conversation_id_idx" ON "ai_conversation_message"("conversation_id")`;
    await mainDb`CREATE INDEX IF NOT EXISTS "ai_conversation_message_created_at_idx" ON "ai_conversation_message"("created_at")`;
    console.log('  ✅ Indexes created');
  }
  
  // Update Brandbook Agent
  console.log('  Updating Brandbook Agent...');
  await mainDb`UPDATE "ai_agent_config" SET "allow_direct_messages" = true WHERE "slug" = 'brandbook'`;
  console.log('  ✅ Brandbook Agent updated');
  
  console.log('\n✅ All migrations applied successfully\n');
}

async function migrateData() {
  if (!aiDb) {
    console.error('❌ AI_AGENTS_DATABASE_URL not set - cannot migrate data');
    process.exit(1);
  }
  
  console.log('🔄 Migrating data from AI database to main database...\n');
  
  // First, ensure migrations are applied
  await applyMigrations();
  
  // Migrate ai_agent_config (if different)
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating ai_agent_config...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const aiConfigs = await aiDb`SELECT * FROM ai_agent_config`;
  for (const config of aiConfigs) {
    const exists = await mainDb`SELECT id FROM ai_agent_config WHERE id = ${config.id}`;
    if (exists.length === 0) {
      console.log(`  Adding config: ${config.slug}`);
      await mainDb`
        INSERT INTO ai_agent_config (id, slug, name, description, pipeline_type, enabled, icon, limits, parameters, user_id, allow_direct_messages, created_at, updated_at)
        VALUES (${config.id}, ${config.slug}, ${config.name}, ${config.description}, ${config.pipeline_type}, ${config.enabled}, ${config.icon}, ${config.limits}, ${config.parameters}, ${config.user_id}, ${config.allow_direct_messages}, ${config.created_at}, ${config.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          enabled = EXCLUDED.enabled,
          limits = EXCLUDED.limits,
          parameters = EXCLUDED.parameters,
          user_id = EXCLUDED.user_id,
          allow_direct_messages = EXCLUDED.allow_direct_messages,
          updated_at = EXCLUDED.updated_at
      `;
    } else {
      console.log(`  Config exists, updating: ${config.slug}`);
      await mainDb`
        UPDATE ai_agent_config SET
          name = ${config.name},
          description = ${config.description},
          enabled = ${config.enabled},
          limits = ${config.limits},
          parameters = ${config.parameters},
          user_id = ${config.user_id},
          allow_direct_messages = ${config.allow_direct_messages},
          updated_at = ${config.updated_at}
        WHERE id = ${config.id}
      `;
    }
  }
  console.log('  ✅ ai_agent_config migrated\n');
  
  // Migrate ai_agent_prompt_version
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating ai_agent_prompt_version...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const aiVersions = await aiDb`SELECT * FROM ai_agent_prompt_version`;
  for (const version of aiVersions) {
    const exists = await mainDb`SELECT id FROM ai_agent_prompt_version WHERE id = ${version.id}`;
    if (exists.length === 0) {
      console.log(`  Adding version: ${version.id} (v${version.version})`);
      await mainDb`
        INSERT INTO ai_agent_prompt_version (id, agent_id, version, status, system_prompt, prompts, blocks, created_by, created_at)
        VALUES (${version.id}, ${version.agent_id}, ${version.version}, ${version.status}, ${version.system_prompt}, ${version.prompts}, ${version.blocks}, ${version.created_by}, ${version.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    } else {
      console.log(`  Version exists: ${version.id}`);
    }
  }
  console.log('  ✅ ai_agent_prompt_version migrated\n');
  
  // Migrate brandbook_agent_run
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating brandbook_agent_run...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const aiRuns = await aiDb`SELECT * FROM brandbook_agent_run`;
  let runsAdded = 0;
  for (const run of aiRuns) {
    const exists = await mainDb`SELECT id FROM brandbook_agent_run WHERE id = ${run.id}`;
    if (exists.length === 0) {
      await mainDb`
        INSERT INTO brandbook_agent_run (id, organization_id, project_id, task_id, created_by, status, product_bundle, preferences, output_language, watermark_text, contact_block, logo_file_id, pipeline_type, output_format, preview_format, created_at, updated_at)
        VALUES (${run.id}, ${run.organization_id}, ${run.project_id}, ${run.task_id}, ${run.created_by}, ${run.status}, ${run.product_bundle}, ${run.preferences}, ${run.output_language}, ${run.watermark_text}, ${run.contact_block}, ${run.logo_file_id}, ${run.pipeline_type}, ${run.output_format}, ${run.preview_format}, ${run.created_at}, ${run.updated_at})
        ON CONFLICT (id) DO NOTHING
      `;
      runsAdded++;
    }
  }
  console.log(`  ✅ brandbook_agent_run migrated (${runsAdded} new records)\n`);
  
  // Migrate brandbook_agent_message
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating brandbook_agent_message...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const aiMessages = await aiDb`SELECT * FROM brandbook_agent_message`;
  let messagesAdded = 0;
  for (const msg of aiMessages) {
    const exists = await mainDb`SELECT id FROM brandbook_agent_message WHERE id = ${msg.id}`;
    if (exists.length === 0) {
      // Check if run exists in main DB
      const runExists = await mainDb`SELECT id FROM brandbook_agent_run WHERE id = ${msg.run_id}`;
      if (runExists.length > 0) {
        await mainDb`
          INSERT INTO brandbook_agent_message (id, run_id, created_by, role, content, created_at)
          VALUES (${msg.id}, ${msg.run_id}, ${msg.created_by}, ${msg.role}, ${msg.content}, ${msg.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
        messagesAdded++;
      } else {
        console.log(`  ⚠️ Skipping message ${msg.id} - run ${msg.run_id} not found`);
      }
    }
  }
  console.log(`  ✅ brandbook_agent_message migrated (${messagesAdded} new records)\n`);
  
  // Migrate brandbook_agent_artifact
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating brandbook_agent_artifact...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const aiArtifacts = await aiDb`SELECT * FROM brandbook_agent_artifact`;
  let artifactsAdded = 0;
  for (const artifact of aiArtifacts) {
    const exists = await mainDb`SELECT id FROM brandbook_agent_artifact WHERE id = ${artifact.id}`;
    if (exists.length === 0) {
      // Check if run exists in main DB
      const runExists = await mainDb`SELECT id FROM brandbook_agent_run WHERE id = ${artifact.run_id}`;
      if (runExists.length > 0) {
        await mainDb`
          INSERT INTO brandbook_agent_artifact (id, run_id, file_id, storage_key, storage_url, filename, mime_type, size_bytes, kind, created_at)
          VALUES (${artifact.id}, ${artifact.run_id}, ${artifact.file_id}, ${artifact.storage_key}, ${artifact.storage_url}, ${artifact.filename}, ${artifact.mime_type}, ${artifact.size_bytes}, ${artifact.kind}, ${artifact.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
        artifactsAdded++;
      } else {
        console.log(`  ⚠️ Skipping artifact ${artifact.id} - run ${artifact.run_id} not found`);
      }
    }
  }
  console.log(`  ✅ brandbook_agent_artifact migrated (${artifactsAdded} new records)\n`);
  
  // Migrate ai_conversation
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 Migrating ai_conversation...');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const hasAiConvTable = await aiDb`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ai_conversation'
  `;
  
  if (hasAiConvTable.length > 0) {
    const aiConvs = await aiDb`SELECT * FROM ai_conversation`;
    let convsAdded = 0;
    for (const conv of aiConvs) {
      const exists = await mainDb`SELECT id FROM ai_conversation WHERE id = ${conv.id}`;
      if (exists.length === 0) {
        // Check if user exists in main DB
        const userExists = await mainDb`SELECT id FROM "user" WHERE id = ${conv.user_id}`;
        const agentExists = await mainDb`SELECT id FROM ai_agent_config WHERE id = ${conv.agent_config_id}`;
        
        if (userExists.length > 0 && agentExists.length > 0) {
          await mainDb`
            INSERT INTO ai_conversation (id, user_id, agent_config_id, title, last_message_at, created_at, updated_at)
            VALUES (${conv.id}, ${conv.user_id}, ${conv.agent_config_id}, ${conv.title}, ${conv.last_message_at}, ${conv.created_at}, ${conv.updated_at})
            ON CONFLICT (id) DO NOTHING
          `;
          convsAdded++;
        } else {
          console.log(`  ⚠️ Skipping conversation ${conv.id} - user or agent not found in main DB`);
        }
      }
    }
    console.log(`  ✅ ai_conversation migrated (${convsAdded} new records)\n`);
    
    // Migrate ai_conversation_message
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📦 Migrating ai_conversation_message...');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const aiConvMsgs = await aiDb`SELECT * FROM ai_conversation_message`;
    let convMsgsAdded = 0;
    for (const msg of aiConvMsgs) {
      const exists = await mainDb`SELECT id FROM ai_conversation_message WHERE id = ${msg.id}`;
      if (exists.length === 0) {
        // Check if conversation exists in main DB
        const convExists = await mainDb`SELECT id FROM ai_conversation WHERE id = ${msg.conversation_id}`;
        if (convExists.length > 0) {
          await mainDb`
            INSERT INTO ai_conversation_message (id, conversation_id, role, content, metadata, created_at)
            VALUES (${msg.id}, ${msg.conversation_id}, ${msg.role}, ${msg.content}, ${msg.metadata}, ${msg.created_at})
            ON CONFLICT (id) DO NOTHING
          `;
          convMsgsAdded++;
        } else {
          console.log(`  ⚠️ Skipping message ${msg.id} - conversation ${msg.conversation_id} not found`);
        }
      }
    }
    console.log(`  ✅ ai_conversation_message migrated (${convMsgsAdded} new records)\n`);
  } else {
    console.log('  ℹ️ No ai_conversation table in AI database\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ DATA MIGRATION COMPLETED');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--check') || args.length === 0) {
      await checkDatabases();
    } else if (args.includes('--apply-migrations')) {
      await applyMigrations();
    } else if (args.includes('--migrate')) {
      await migrateData();
    } else {
      console.log('Usage:');
      console.log('  pnpm tsx scripts/db/consolidate-databases.ts --check          # Check data in both databases');
      console.log('  pnpm tsx scripts/db/consolidate-databases.ts --apply-migrations  # Apply missing migrations');
      console.log('  pnpm tsx scripts/db/consolidate-databases.ts --migrate        # Migrate data from AI DB');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mainDb.end();
    if (aiDb) await aiDb.end();
  }
}

main();
