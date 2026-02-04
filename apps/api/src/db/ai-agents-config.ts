/**
 * AI Agents Database Connection
 * 
 * Previously supported a separate AI_AGENTS_DATABASE_URL for AI agent data.
 * Now consolidated to use the main database (DATABASE_URL/POSTGRES_URL).
 * 
 * Migration completed: 2026-02-04
 * See: scripts/db/consolidate-databases.ts for migration script
 */
import { db } from './config';

// Use the main database for all AI agent operations
export const aiAgentsDb = db;

export type AiAgentsDatabase = typeof aiAgentsDb;
