import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load from web app .env.local if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });
}

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
