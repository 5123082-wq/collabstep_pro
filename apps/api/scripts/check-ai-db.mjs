/**
 * Check AI_AGENTS_DATABASE tables
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const dbUrl = process.env.AI_AGENTS_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ AI_AGENTS_DATABASE_URL not found');
  process.exit(1);
}

console.log('🔍 Checking AI_AGENTS_DATABASE...\n');
console.log('URL:', dbUrl.slice(0, 50) + '...\n');

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function check() {
  // List all tables
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log('📋 Tables in AI_AGENTS_DATABASE:');
  tables.forEach((t) => console.log('   -', t.table_name));

  // Check if user table exists
  const userTable = tables.find((t) => t.table_name === 'user');
  console.log('\n✅ User table exists:', !!userTable);

  // Check ai_agent_config
  try {
    const agentConfig =
      await sql`SELECT id, slug, name, allow_direct_messages, user_id FROM ai_agent_config`;
    console.log('\n🤖 AI Agent Configs:');
    agentConfig.forEach((a) => {
      console.log(`   - ${a.slug}: "${a.name}"`);
      console.log(`     allowDirectMessages: ${a.allow_direct_messages}`);
      console.log(`     userId: ${a.user_id || '(not set)'}`);
    });
  } catch (err) {
    console.log('\n❌ Error reading ai_agent_config:', err.message);
  }

  // Check ai_conversation table
  const convTable = tables.find((t) => t.table_name === 'ai_conversation');
  console.log('\n✅ ai_conversation table exists:', !!convTable);

  // Check ai_conversation_message table
  const msgTable = tables.find(
    (t) => t.table_name === 'ai_conversation_message'
  );
  console.log('✅ ai_conversation_message table exists:', !!msgTable);

  await sql.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
