import { drizzle as drizzlePostgresJs } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleVercel } from 'drizzle-orm/vercel-postgres';
import postgres from 'postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Проверяем POSTGRES_URL при инициализации (только если это явный placeholder)
const postgresUrl = process.env.POSTGRES_URL;
if (postgresUrl) {
  // Проверяем только на явный placeholder паттерн из .env.example
  if (postgresUrl.includes('user:password@host/database') && !postgresUrl.includes('neondb_owner') && !postgresUrl.includes('@ep-')) {
    console.error('[DB Config] ⚠️  POSTGRES_URL appears to be a placeholder!');
    console.error('[DB Config] Current value:', postgresUrl.substring(0, 50) + '...');
    console.error('[DB Config] Please set a real POSTGRES_URL from Vercel/Neon Dashboard');
    throw new Error('POSTGRES_URL is a placeholder. Please set a real database URL.');
  }
} else if (process.env.AUTH_STORAGE === 'db') {
  // Если AUTH_STORAGE=db, но POSTGRES_URL не установлен - это ошибка
  console.error('[DB Config] ⚠️  AUTH_STORAGE=db but POSTGRES_URL is not set!');
  console.error('[DB Config] Please set POSTGRES_URL in apps/web/.env.local');
  throw new Error('AUTH_STORAGE=db requires POSTGRES_URL to be set.');
}

const isLocalPgUrl =
  !!postgresUrl &&
  (() => {
    try {
      const host = new URL(postgresUrl).hostname;
      return host === 'localhost' || host === '127.0.0.1';
    } catch {
      return false;
    }
  })();

const shouldUseLocalPg = process.env.USE_LOCAL_PG === 'true' || isLocalPgUrl;

// Для локального Postgres используем драйвер postgres-js, иначе — vercel-postgres (Neon).
const dbClient = shouldUseLocalPg && postgresUrl
  ? drizzlePostgresJs(postgres(postgresUrl, { ssl: 'prefer' }), { schema })
  : drizzleVercel(sql, { schema });

export const db = dbClient;
export type Database = typeof db;
