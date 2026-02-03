#!/usr/bin/env tsx
/**
 * Скрипт для создания AI-пользователя Brandbook Agent и связывания с конфигурацией.
 *
 * Скрипт идемпотентный — можно запускать повторно без побочных эффектов.
 *
 * Использование:
 *   pnpm tsx scripts/db/create-brandbook-agent-user.ts
 */

// Must run first so POSTGRES_URL is set before api/db/config is loaded
import './load-db-env';
import { eq } from 'drizzle-orm';
import { db } from '../../apps/api/src/db/config';
import { users, aiAgentConfigs } from '../../apps/api/src/db/schema';

// Brandbook Agent user data
const BRANDBOOK_AGENT_EMAIL = 'brandbook.agent@collabverse.ai';
const BRANDBOOK_AGENT_NAME = 'Brandbook Agent';
const BRANDBOOK_AGENT_TITLE = 'AI-агент для генерации брендбуков';
const BRANDBOOK_AGENT_SLUG = 'brandbook';

async function createBrandbookAgentUser(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🤖 СОЗДАНИЕ AI-ПОЛЬЗОВАТЕЛЯ BRANDBOOK AGENT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 1: Check if user already exists
    console.log('📋 Шаг 1: Проверка существования пользователя...');
    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, BRANDBOOK_AGENT_EMAIL))
        .limit(1);

    let userId: string;

    if (existingUser) {
        userId = existingUser.id;
        console.log(`   ✅ Пользователь уже существует: ${existingUser.id}`);
        console.log(`      Email: ${existingUser.email}`);
        console.log(`      Name: ${existingUser.name}`);
        console.log(`      is_ai: ${existingUser.isAi}`);

        // Ensure is_ai is set to true
        if (!existingUser.isAi) {
            console.log('\n   ⚠️  Поле is_ai = false, обновляю...');
            await db
                .update(users)
                .set({ isAi: true, updatedAt: new Date() })
                .where(eq(users.id, existingUser.id));
            console.log('   ✅ Поле is_ai обновлено на true');
        }
    } else {
        // Create new AI user
        console.log('   ➕ Пользователь не найден, создаю нового...\n');

        const [newUser] = await db
            .insert(users)
            .values({
                id: crypto.randomUUID(),
                name: BRANDBOOK_AGENT_NAME,
                email: BRANDBOOK_AGENT_EMAIL,
                title: BRANDBOOK_AGENT_TITLE,
                isAi: true,
                emailVerified: null,
                image: null,
                passwordHash: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (!newUser) {
            throw new Error('Не удалось создать пользователя');
        }

        userId = newUser.id;
        console.log(`   ✅ Пользователь создан: ${newUser.id}`);
        console.log(`      Email: ${newUser.email}`);
        console.log(`      Name: ${newUser.name}`);
        console.log(`      is_ai: ${newUser.isAi}`);
    }

    // Step 2: Find brandbook agent config
    console.log('\n📋 Шаг 2: Поиск конфигурации Brandbook Agent...');
    const [agentConfig] = await db
        .select()
        .from(aiAgentConfigs)
        .where(eq(aiAgentConfigs.slug, BRANDBOOK_AGENT_SLUG))
        .limit(1);

    if (!agentConfig) {
        console.log('   ⚠️  Конфигурация с slug="brandbook" не найдена');
        console.log('   ℹ️  Создайте конфигурацию через админку или запустите seed скрипт');
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТ: Пользователь создан, но конфиг отсутствует');
        console.log('═══════════════════════════════════════════════════════════');
        return;
    }

    console.log(`   ✅ Конфигурация найдена: ${agentConfig.id}`);
    console.log(`      Slug: ${agentConfig.slug}`);
    console.log(`      Name: ${agentConfig.name}`);
    console.log(`      user_id: ${agentConfig.userId || '(не установлен)'}`);

    // Step 3: Link user to config
    if (agentConfig.userId === userId) {
        console.log('\n📋 Шаг 3: Связь пользователя с конфигурацией...');
        console.log('   ✅ Пользователь уже связан с конфигурацией');
    } else if (agentConfig.userId) {
        console.log('\n📋 Шаг 3: Связь пользователя с конфигурацией...');
        console.log(`   ⚠️  Конфигурация уже связана с другим пользователем: ${agentConfig.userId}`);
        console.log('   ℹ️  Если нужно переназначить, используйте флаг --force');

        // Could add --force flag handling here if needed
    } else {
        console.log('\n📋 Шаг 3: Связь пользователя с конфигурацией...');

        await db
            .update(aiAgentConfigs)
            .set({ userId, updatedAt: new Date() })
            .where(eq(aiAgentConfigs.id, agentConfig.id));

        console.log(`   ✅ user_id обновлён на: ${userId}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 РЕЗУЛЬТАТ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${BRANDBOOK_AGENT_EMAIL}`);
    console.log(`   Name: ${BRANDBOOK_AGENT_NAME}`);
    console.log(`   is_ai: true`);
    console.log(`   Agent Config ID: ${agentConfig.id}`);
    console.log(`   Agent Config Slug: ${agentConfig.slug}`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

// Run script
createBrandbookAgentUser()
    .then(() => {
        console.log('✅ Скрипт завершён успешно');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Ошибка:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.cause) {
            console.error('   Причина:', error.cause instanceof Error ? error.cause.message : String(error.cause));
        }
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    });
