import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Приоритет: DATABASE_URL > POSTGRES_URL > .env.local
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Используем POSTGRES_URL как fallback
  databaseUrl = process.env.POSTGRES_URL;
}

if (!databaseUrl) {
  // Последний fallback: загружаем из .env.local
  dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });
  databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL must be set');
}

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: databaseUrl,
    },
});
