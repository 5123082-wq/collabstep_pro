import { hydrateMemoryFromPg } from './pm-pg-adapter';

/**
 * Shared promise to hydrate in-memory repositories from Postgres once
 * when USE_DB_STORAGE/DATABASE_URL is provided.
 */
export const pmPgHydration = hydrateMemoryFromPg();
