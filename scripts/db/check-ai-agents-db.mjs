import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });

const dbUrl = process.env.AI_AGENTS_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ AI_AGENTS_DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function check() {
  console.log('📦 Checking AI_AGENTS_DATABASE tables...\n');

  const tables =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables:');
  tables.forEach((t) => console.log('  -', t.table_name));

  // Check if user table exists
  const userTable = tables.find((t) => t.table_name === 'user');
  console.log('\n✅ User table exists:', !!userTable);

  // Check ai_agent_config
  const agentConfig =
    await sql`SELECT id, slug, name, allow_direct_messages FROM ai_agent_config`;
  console.log('\nAI Agent Configs:');
  agentConfig.forEach((a) =>
    console.log(
      `  - ${a.slug}: ${a.name} (allowDM: ${a.allow_direct_messages})`
    )
  );

  await sql.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
