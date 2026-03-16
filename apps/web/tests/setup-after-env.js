/* eslint-env node, jest */

afterAll(async () => {
  try {
    if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }

    // Close the per-suite shared Vercel Postgres pool so Neon sockets
    // do not leak into Jest's open-handle detection between files.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sql } = require('@vercel/postgres');
    if (sql && typeof sql.end === 'function') {
      await sql.end();
    }
  } catch (error) {
    console.error('[jest setup-after-env] Failed to close Vercel Postgres pool', error);
  }
});
