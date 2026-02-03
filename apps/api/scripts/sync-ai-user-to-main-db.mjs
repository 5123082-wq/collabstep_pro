/**
 * Synchronize AI user from AI_AGENTS_DATABASE to DATABASE_URL (main DB)
 *
 * This ensures the Brandbook Agent user exists in both databases.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });

const aiDbUrl = process.env.AI_AGENTS_DATABASE_URL;
const mainDbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!aiDbUrl) {
  console.error('❌ AI_AGENTS_DATABASE_URL not found');
  process.exit(1);
}
if (!mainDbUrl) {
  console.error('❌ DATABASE_URL/POSTGRES_URL not found');
  process.exit(1);
}

console.log(
  '🔄 Syncing AI users from AI_AGENTS_DATABASE to main DATABASE...\n'
);
console.log('AI DB:', aiDbUrl.slice(0, 50) + '...');
console.log('Main DB:', mainDbUrl.slice(0, 50) + '...\n');

const aiSql = postgres(aiDbUrl, { ssl: 'prefer' });
const mainSql = postgres(mainDbUrl, { ssl: 'prefer' });

async function syncAiUsers() {
  try {
    // 1. Get AI users from AI_AGENTS_DATABASE
    const aiUsers = await aiSql`
      SELECT id, name, email, is_ai, title, image, "createdAt", "updatedAt", "emailVerified"
      FROM "user"
      WHERE is_ai = true
    `;

    console.log(`📋 Found ${aiUsers.length} AI users in AI_AGENTS_DATABASE:`);
    aiUsers.forEach((u) =>
      console.log(`   - ${u.name} <${u.email}> (id: ${u.id})`)
    );

    if (aiUsers.length === 0) {
      console.log('✅ No AI users to sync');
      return;
    }

    // 2. For each AI user, check if it exists in main DB and create/update
    for (const user of aiUsers) {
      console.log(`\n🔍 Processing: ${user.name} <${user.email}>`);

      // Check if user exists by email
      const [existingByEmail] = await mainSql`
        SELECT id, name, email, is_ai 
        FROM "user" 
        WHERE email = ${user.email}
      `;

      if (existingByEmail) {
        console.log(`   Found user by email: ${existingByEmail.id}`);

        // Update is_ai flag if needed
        if (!existingByEmail.is_ai) {
          await mainSql`
            UPDATE "user" 
            SET is_ai = true, "updatedAt" = NOW()
            WHERE id = ${existingByEmail.id}
          `;
          console.log(`   ✅ Updated is_ai flag to true`);
        } else {
          console.log(`   ✅ User already has is_ai = true`);
        }

        // If IDs are different, we have a problem
        if (existingByEmail.id !== user.id) {
          console.log(
            `   ⚠️ WARNING: ID mismatch! AI DB has ${user.id}, main DB has ${existingByEmail.id}`
          );
          console.log(
            `   This may cause issues with ai_agent_config.user_id linking`
          );
        }

        continue;
      }

      // Check if user exists by ID
      const [existingById] = await mainSql`
        SELECT id, name, email, is_ai 
        FROM "user" 
        WHERE id = ${user.id}
      `;

      if (existingById) {
        console.log(`   Found user by ID: ${existingById.email}`);

        // Update to match AI user data
        await mainSql`
          UPDATE "user"
          SET 
            name = ${user.name},
            email = ${user.email},
            is_ai = true,
            title = ${user.title},
            image = ${user.image},
            "updatedAt" = NOW()
          WHERE id = ${user.id}
        `;
        console.log(`   ✅ Updated existing user to AI user data`);
        continue;
      }

      // User doesn't exist - create it
      console.log(`   Creating new AI user in main DB...`);

      await mainSql`
        INSERT INTO "user" (
          id, name, email, is_ai, title, image, 
          "createdAt", "updatedAt", "emailVerified"
        ) VALUES (
          ${user.id},
          ${user.name},
          ${user.email},
          true,
          ${user.title},
          ${user.image},
          ${user.createdAt || new Date()},
          ${user.updatedAt || new Date()},
          ${user.emailVerified}
        )
      `;
      console.log(`   ✅ Created AI user in main DB with ID: ${user.id}`);
    }

    // 3. Verify sync
    console.log('\n🔍 Verifying sync...');
    const mainAiUsers = await mainSql`
      SELECT id, name, email, is_ai 
      FROM "user" 
      WHERE is_ai = true
    `;

    console.log(`📋 AI users now in main DATABASE: ${mainAiUsers.length}`);
    mainAiUsers.forEach((u) => console.log(`   - ${u.name} <${u.email}>`));

    console.log('\n✅ Sync completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    throw error;
  } finally {
    await aiSql.end();
    await mainSql.end();
  }
}

syncAiUsers().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
