/**
 * Apply migration 0020: Add AI limits to subscription_plan and seed plans
 * Run with: npx tsx scripts/db/apply-migration-0020.ts
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { sql } from '@vercel/postgres';

async function applyMigration() {
    console.log('📦 Applying migration 0020_subscription_ai_limits...\n');

    const statements = [
        {
            name: 'Add ai_agent_runs_per_day column',
            sql: `ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_runs_per_day" INTEGER`
        },
        {
            name: 'Add ai_agent_concurrent_runs column',
            sql: `ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_concurrent_runs" INTEGER`
        },
        {
            name: 'Upsert Free plan',
            sql: `INSERT INTO "subscription_plan" (
                "id", "code", "name", 
                "storage_limit_bytes", "file_size_limit_bytes", "trash_retention_days",
                "ai_agent_runs_per_day", "ai_agent_concurrent_runs",
                "created_at", "updated_at"
            ) VALUES (
                gen_random_uuid(), 'free', 'Free',
                104857600, 10485760, 7,
                3, 1,
                NOW(), NOW()
            )
            ON CONFLICT (code) DO UPDATE SET
                "name" = EXCLUDED."name",
                "storage_limit_bytes" = EXCLUDED."storage_limit_bytes",
                "file_size_limit_bytes" = EXCLUDED."file_size_limit_bytes",
                "trash_retention_days" = EXCLUDED."trash_retention_days",
                "ai_agent_runs_per_day" = EXCLUDED."ai_agent_runs_per_day",
                "ai_agent_concurrent_runs" = EXCLUDED."ai_agent_concurrent_runs",
                "updated_at" = NOW()`
        },
        {
            name: 'Upsert Pro plan',
            sql: `INSERT INTO "subscription_plan" (
                "id", "code", "name", 
                "storage_limit_bytes", "file_size_limit_bytes", "trash_retention_days",
                "ai_agent_runs_per_day", "ai_agent_concurrent_runs",
                "created_at", "updated_at"
            ) VALUES (
                gen_random_uuid(), 'pro', 'Pro',
                10737418240, 104857600, 30,
                50, 3,
                NOW(), NOW()
            )
            ON CONFLICT (code) DO UPDATE SET
                "name" = EXCLUDED."name",
                "storage_limit_bytes" = EXCLUDED."storage_limit_bytes",
                "file_size_limit_bytes" = EXCLUDED."file_size_limit_bytes",
                "trash_retention_days" = EXCLUDED."trash_retention_days",
                "ai_agent_runs_per_day" = EXCLUDED."ai_agent_runs_per_day",
                "ai_agent_concurrent_runs" = EXCLUDED."ai_agent_concurrent_runs",
                "updated_at" = NOW()`
        },
        {
            name: 'Upsert Max plan',
            sql: `INSERT INTO "subscription_plan" (
                "id", "code", "name", 
                "storage_limit_bytes", "file_size_limit_bytes", "trash_retention_days",
                "ai_agent_runs_per_day", "ai_agent_concurrent_runs",
                "created_at", "updated_at"
            ) VALUES (
                gen_random_uuid(), 'max', 'Max',
                NULL, 524288000, NULL,
                -1, 10,
                NOW(), NOW()
            )
            ON CONFLICT (code) DO UPDATE SET
                "name" = EXCLUDED."name",
                "storage_limit_bytes" = EXCLUDED."storage_limit_bytes",
                "file_size_limit_bytes" = EXCLUDED."file_size_limit_bytes",
                "trash_retention_days" = EXCLUDED."trash_retention_days",
                "ai_agent_runs_per_day" = EXCLUDED."ai_agent_runs_per_day",
                "ai_agent_concurrent_runs" = EXCLUDED."ai_agent_concurrent_runs",
                "updated_at" = NOW()`
        }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const { name, sql: stmt } = statements[i];
        
        try {
            await sql.query(stmt);
            successCount++;
            console.log(`✅ [${i + 1}/${statements.length}] ${name}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('already exists') || 
                errorMessage.includes('duplicate key') ||
                errorMessage.includes('duplicate column')) {
                skipCount++;
                console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already applied): ${name}`);
            } else {
                errorCount++;
                console.error(`❌ [${i + 1}/${statements.length}] Failed: ${name}`);
                console.error(`   Error: ${errorMessage}`);
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Verify changes
    console.log('\n🔍 Verifying...\n');
    
    try {
        const result = await sql.query(`
            SELECT code, name, ai_agent_runs_per_day, ai_agent_concurrent_runs 
            FROM subscription_plan 
            ORDER BY code
        `);
        
        console.log('📋 Subscription Plans:');
        console.log('┌───────┬──────┬────────────────┬────────────────┐');
        console.log('│ Code  │ Name │ AI Runs/Day    │ AI Concurrent  │');
        console.log('├───────┼──────┼────────────────┼────────────────┤');
        
        for (const plan of result.rows) {
            const runsPerDay = plan.ai_agent_runs_per_day === -1 ? 'unlimited' : String(plan.ai_agent_runs_per_day ?? 'N/A');
            console.log(`│ ${String(plan.code).padEnd(5)} │ ${String(plan.name).padEnd(4)} │ ${runsPerDay.padEnd(14)} │ ${String(plan.ai_agent_concurrent_runs ?? 'N/A').padEnd(14)} │`);
        }
        
        console.log('└───────┴──────┴────────────────┴────────────────┘');
    } catch (error) {
        console.error('Error verifying:', error);
    }

    console.log('\n✅ Migration 0020 completed!');
    process.exit(0);
}

applyMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
