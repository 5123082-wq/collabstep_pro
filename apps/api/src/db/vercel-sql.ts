import { sql } from '@vercel/postgres';

const postgresUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID === 'string';
}

if (!process.env.POSTGRES_URL && postgresUrl) {
  process.env.POSTGRES_URL = postgresUrl;
}

if (postgresUrl && isTestEnv()) {
  const testSql = sql as typeof sql & {
    options?: {
      allowExitOnIdle?: boolean;
    };
  };

  if (testSql.options) {
    testSql.options.allowExitOnIdle = true;
  }
}

export const vercelSql = sql;
