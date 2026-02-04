/**
 * Load env and set POSTGRES_URL before any db usage.
 * Import this first in db scripts so api/db/config sees the correct URL.
 * 
 * NOTE: AI_AGENTS_DATABASE_URL removed - all data now uses main database (DATABASE_URL)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const dir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(dir, 'apps/web/.env.local') });
dotenv.config({ path: path.join(dir, '.env.local') });

// Use main database URL
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (dbUrl) {
  process.env.POSTGRES_URL = dbUrl;
}
