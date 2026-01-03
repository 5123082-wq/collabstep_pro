/**
 * Script to apply migration 0007_file_manager.sql
 * Run with: node apply-migration-0007.mjs
 */
import { readFileSync } from 'fs';
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
    console.log('📦 Applying migration 0007_file_manager.sql...\n');

    const migrationPath = path.resolve(__dirname, 'src/db/migrations/0007_file_manager.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoint comments
    const statements = migrationContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
        
        try {
            await sql.unsafe(stmt);
            successCount++;
            console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
        } catch (error) {
            // Check if it's a "already exists" error - those are OK
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate key') ||
                error.message.includes('does not exist')) {
                skipCount++;
                console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
            } else {
                errorCount++;
                console.error(`❌ [${i + 1}/${statements.length}] Failed: ${preview}...`);
                console.error(`   Error: ${error.message}`);
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Verify tables exist
    console.log('\n🔍 Verifying tables...\n');
    
    const tables = ['file', 'attachment', 'folder', 'share', 'file_trash', 
                    'subscription_plan', 'organization_subscription', 'organization_storage_usage'];
    
    for (const table of tables) {
        try {
            const result = await sql`SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ${table}
            ) AS exists`;
            
            if (result[0].exists) {
                console.log(`   ✅ Table "${table}" exists`);
            } else {
                console.log(`   ❌ Table "${table}" NOT FOUND`);
            }
        } catch (error) {
            console.log(`   ❌ Error checking "${table}": ${error.message}`);
        }
    }

    await sql.end();
    console.log('\n✅ Migration completed!');
}

applyMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

