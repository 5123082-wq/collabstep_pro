/**
 * Check AI user and agent configs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });

const dbUrl = process.env.AI_AGENTS_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ AI_AGENTS_DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'prefer' });

async function check() {
  console.log('🔍 Checking AI User and Agent Config...\n');

  // Check AI user
  const aiUsers = await sql`
    SELECT id, name, email, is_ai, title, image, "createdAt" 
    FROM "user" 
    WHERE is_ai = true
  `;

  console.log('🤖 AI Users in database:');
  if (aiUsers.length === 0) {
    console.log('   ❌ No AI users found!');
  } else {
    aiUsers.forEach((u) => {
      console.log(`   - ${u.name} <${u.email}>`);
      console.log(`     ID: ${u.id}`);
      console.log(`     is_ai: ${u.is_ai}`);
      console.log(`     title: ${u.title || '(none)'}`);
      console.log(`     image: ${u.image || '(none)'}`);
    });
  }

  // Check agent config
  console.log('\n📋 AI Agent Configs:');
  const configs = await sql`
    SELECT id, slug, name, enabled, user_id, allow_direct_messages, icon
    FROM ai_agent_config
  `;

  configs.forEach((c) => {
    console.log(`   - ${c.slug}: "${c.name}"`);
    console.log(`     ID: ${c.id}`);
    console.log(`     enabled: ${c.enabled}`);
    console.log(`     userId: ${c.user_id || '(not set)'}`);
    console.log(`     allowDirectMessages: ${c.allow_direct_messages}`);
    console.log(`     icon: ${c.icon || '(none)'}`);
  });

  // Check if user_id matches any AI user
  console.log('\n🔗 Linking check:');
  for (const config of configs) {
    if (config.user_id) {
      const [user] =
        await sql`SELECT id, name, email, is_ai FROM "user" WHERE id = ${config.user_id}`;
      if (user) {
        console.log(
          `   ✅ ${config.slug} → ${user.name} <${user.email}> (is_ai: ${user.is_ai})`
        );
      } else {
        console.log(
          `   ❌ ${config.slug} → user_id ${config.user_id} NOT FOUND in users table!`
        );
      }
    } else {
      console.log(`   ⚠️ ${config.slug} → No user_id linked`);
    }
  }

  await sql.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
