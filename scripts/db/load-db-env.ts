/**
 * Load env and set POSTGRES_URL before any db usage.
 * Import this first in db scripts so api/db/config sees the correct URL.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const dir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(dir, 'apps/web/.env.local') });
dotenv.config({ path: path.join(dir, '.env.local') });

// Use same DB as migrations; override POSTGRES_URL so script hits the DB where 0020/0023 were applied
const dbUrl = process.env.AI_AGENTS_DATABASE_URL || process.env.DATABASE_URL;
if (dbUrl) {
  process.env.POSTGRES_URL = dbUrl;
}
