#!/usr/bin/env tsx
/**
 * Скрипт для удаления старых тестовых AI-агентов и создания нового агента
 * с правильной конфигурацией для работы с OpenAI API
 */

import { aiAgentsRepository } from '../apps/api/src/repositories/ai-agents-repository';
import { usersRepository } from '../apps/api/src/repositories/users-repository';
import { memory } from '../apps/api/src/data/memory';
import type { AIAgentType } from '../apps/api/src/types';

async function resetAgents() {
  console.log('🔄 Начинаем сброс AI-агентов...\n');

  // Шаг 1: Удаляем старых тестовых агентов
  console.log('📋 Шаг 1: Удаление старых тестовых агентов...');
  const deletedCount = await aiAgentsRepository.deleteOldTestAgents();
  console.log(`✅ Удалено старых агентов: ${deletedCount}\n`);

  // Шаг 2: Создаём нового агента с правильной конфигурацией
  console.log('📋 Шаг 2: Создание нового AI-агента...');
  
  const newAgentData = {
    name: 'AI Ассистент',
    email: 'ai.assistant@collabverse.ai',
    title: 'AI-ассистент с OpenAI',
    agentType: 'assistant' as AIAgentType,
    responseTemplates: [
      'Принял к сведению. Продолжаю работу.',
      'Понял задачу. Начинаю выполнение.',
      'Задача в работе. Ожидаю обновления.',
      'Работаю над задачей. Скоро будет готово.',
      'Использую OpenAI для анализа и помощи.'
    ],
    behavior: {
      autoRespond: true,
      responseStyle: 'short' as const
    }
  };

  // Проверяем, существует ли уже агент
  const existing = await usersRepository.findById(newAgentData.email);
  if (existing && (existing as any).isAI) {
    console.log('⚠️  Агент уже существует, обновляем конфигурацию...');
    await aiAgentsRepository.update(newAgentData.email, {
      name: newAgentData.name,
      title: newAgentData.title,
      responseTemplates: newAgentData.responseTemplates,
      behavior: newAgentData.behavior
    });
  } else {
    // Создаём нового агента
    const user = await usersRepository.create({
      id: newAgentData.email,
      name: newAgentData.name,
      email: newAgentData.email,
      title: newAgentData.title
    });

    // Добавляем AI-специфичные поля
    const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === user.id);
    if (userInMemory) {
      (userInMemory as any).isAI = true;
      (userInMemory as any).agentType = newAgentData.agentType;
      (userInMemory as any).responseTemplates = newAgentData.responseTemplates;
      (userInMemory as any).behavior = newAgentData.behavior;
    }
  }

  console.log('✅ Новый агент создан/обновлён\n');

  // Шаг 3: Проверяем результат
  console.log('📋 Шаг 3: Проверка результата...');
  const agents = await aiAgentsRepository.list();
  console.log(`✅ Всего AI-агентов в системе: ${agents.length}`);
  agents.forEach((agent) => {
    console.log(`   - ${agent.name} (${agent.email}) - ${agent.agentType}`);
  });

  console.log('\n✨ Готово! AI-агенты успешно обновлены.');
  console.log('\n💡 Убедитесь, что в .env.local установлен OPENAI_API_KEY');
}

// Запускаем скрипт
resetAgents().catch((error) => {
  console.error('❌ Ошибка при сбросе агентов:', error);
  process.exit(1);
});

