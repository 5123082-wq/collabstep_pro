/**
 * Script to apply migration 0008_multi_org_feature.sql
 * Run with: node apply-migration-0008.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from web app
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function applyMigration() {
    console.log('📦 Applying migration 0008_multi_org_feature.sql...\n');

    const statements = [
        {
            name: 'Add is_primary column to organization_member',
            sql: `ALTER TABLE "organization_member" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false NOT NULL`
        },
        {
            name: 'Create index for primary organization lookup',
            sql: `CREATE INDEX IF NOT EXISTS "organization_member_primary_user_idx" ON "organization_member" ("user_id", "is_primary")`
        },
        {
            name: 'Set isPrimary for first organization of each owner',
            sql: `UPDATE "organization_member" om
SET "is_primary" = true
WHERE om."role" = 'owner'
AND om."created_at" = (
  SELECT MIN("created_at") 
  FROM "organization_member" 
  WHERE "user_id" = om."user_id" AND "role" = 'owner'
)`
        },
        {
            name: 'Create user_subscription table',
            sql: `CREATE TABLE IF NOT EXISTS "user_subscription" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "plan_code" "subscription_plan_code" DEFAULT 'free' NOT NULL,
    "max_organizations" INTEGER DEFAULT 1 NOT NULL,
    "expires_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now()
)`
        },
        {
            name: 'Create user_subscription user_id index',
            sql: `CREATE UNIQUE INDEX IF NOT EXISTS "user_subscription_user_id_idx" ON "user_subscription" ("user_id")`
        },
        {
            name: 'Create user_subscription plan_code index',
            sql: `CREATE INDEX IF NOT EXISTS "user_subscription_plan_code_idx" ON "user_subscription" ("plan_code")`
        },
        {
            name: 'Create user_subscription expires_at index',
            sql: `CREATE INDEX IF NOT EXISTS "user_subscription_expires_at_idx" ON "user_subscription" ("expires_at")`
        },
        {
            name: 'Create default free subscription for all existing users',
            sql: `INSERT INTO "user_subscription" ("id", "user_id", "plan_code", "max_organizations")
SELECT 
    gen_random_uuid()::text,
    u."id",
    'free',
    1
FROM "user" u
WHERE NOT EXISTS (
    SELECT 1 FROM "user_subscription" us WHERE us."user_id" = u."id"
)`
        }
    ];

    console.log(`Found ${statements.length} statements to execute\n`);

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
            // Check if it's a "already exists" error - those are OK
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate key') ||
                error.message.includes('duplicate column')) {
                skipCount++;
                console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already applied): ${name}`);
            } else {
                errorCount++;
                console.error(`❌ [${i + 1}/${statements.length}] Failed: ${name}`);
                console.error(`   Error: ${error.message}`);
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Verify changes
    console.log('\n🔍 Verifying changes...\n');
    
    // Check is_primary column exists
    try {
        const result = await sql`SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'organization_member' AND column_name = 'is_primary'`;
        if (result.length > 0) {
            console.log('   ✅ Column "is_primary" exists in organization_member');
        } else {
            console.log('   ❌ Column "is_primary" NOT FOUND');
        }
    } catch (error) {
        console.log(`   ❌ Error checking column: ${error.message}`);
    }

    // Check user_subscription table
    try {
        const result = await sql`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_subscription'
        ) AS exists`;
        
        if (result[0].exists) {
            console.log('   ✅ Table "user_subscription" exists');
            
            // Count records
            const count = await sql`SELECT COUNT(*) as count FROM user_subscription`;
            console.log(`   📊 User subscriptions: ${count[0].count} records`);
        } else {
            console.log('   ❌ Table "user_subscription" NOT FOUND');
        }
    } catch (error) {
        console.log(`   ❌ Error checking table: ${error.message}`);
    }

    // Check primary organizations
    try {
        const result = await sql`SELECT COUNT(*) as count FROM organization_member WHERE is_primary = true`;
        console.log(`   📊 Primary organizations set: ${result[0].count}`);
    } catch (error) {
        console.log(`   ❌ Error checking primary orgs: ${error.message}`);
    }

    await sql.end();
    console.log('\n✅ Migration 0008 completed!');
}

applyMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
