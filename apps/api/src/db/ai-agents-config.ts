import { drizzle as drizzlePostgresJs } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { db } from './config';

const aiAgentsDatabaseUrl = process.env.AI_AGENTS_DATABASE_URL;

export const aiAgentsDb =
  aiAgentsDatabaseUrl && aiAgentsDatabaseUrl.trim()
    ? drizzlePostgresJs(postgres(aiAgentsDatabaseUrl, { ssl: 'prefer' }), { schema })
    : db;

export type AiAgentsDatabase = typeof aiAgentsDb;
