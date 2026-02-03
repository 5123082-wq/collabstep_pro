/**
 * Check if is_ai column exists in user table
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function check() {
  try {
    console.log('🔍 Checking is_ai column in user table...\n');
    
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user' AND column_name = 'is_ai'
    `;
    console.log('Column info:', result);
    
    if (result.length === 0) {
      console.log('\n❌ Column is_ai does NOT exist in user table!');
    } else {
      console.log('\n✅ Column is_ai exists');
      
      // Try a simple query
      const users = await sql`SELECT id, email, is_ai FROM "user" LIMIT 3`;
      console.log('\nSample users:', users);
    }
    
    await sql.end();
  } catch (e) {
    console.error('Error:', e);
    await sql.end();
    process.exit(1);
  }
}

check();
