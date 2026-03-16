import { hydrateMemoryFromPg } from './pm-pg-adapter';

function shouldAutoHydratePmMemory(): boolean {
  return process.env.NODE_ENV !== 'test' && typeof process.env.JEST_WORKER_ID !== 'string';
}

/**
 * Shared promise to hydrate in-memory repositories from Postgres once
 * when USE_DB_STORAGE/DATABASE_URL is provided.
 */
export const pmPgHydration = shouldAutoHydratePmMemory()
  ? hydrateMemoryFromPg()
  : Promise.resolve();
