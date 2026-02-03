import {
  aiAgentsRepository,
  aiAgentConfigsDbRepository,
  projectChatRepository,
  commentsRepository
} from '@collabverse/api';
import type { AIAgent, DbAIAgentConfig } from '@collabverse/api';

export interface AgentMention {
  agentId: string;
  agentType: string;
  /** True if agent is from ai_agent_config table (new format) */
  isConfigBased?: boolean;
  /** Agent config if available (for config-based agents) */
  config?: DbAIAgentConfig;
}

/**
 * Извлекает упоминания AI-агентов из текста сообщения
 *
 * Поддерживаемые форматы:
 * - Новый формат (ai_agent_config): @{slug}, @{name} (например @brandbook, @Brandbook Agent)
 * - Старый формат (legacy): @ai-{type} (например @ai-assistant, @ai-reviewer)
 *
 * Приоритет: сначала проверяются config-based агенты, затем legacy.
 */
export async function extractAgentMentions(text: string): Promise<AgentMention[]> {
  const mentions: AgentMention[] = [];
  const foundAgentIds = new Set<string>();

  // 1. Сначала проверяем упоминания по ai_agent_config (новый формат)
  // Формат: @slug, @name (case-insensitive)
  const configs = await aiAgentConfigsDbRepository.listAll({ enabledOnly: true });

  for (const config of configs) {
    // Паттерны для поиска:
    // - @slug (например @brandbook)
    // - @name (например @Brandbook Agent)
    // - @email-prefix (например @brandbook.agent)
    const patterns = [
      config.slug.toLowerCase(),
      config.name.toLowerCase(),
    ];

    // Добавляем email prefix если есть userId (agent user email like brandbook.agent@...)
    // Это позволяет использовать @brandbook.agent
    if (config.userId) {
      // Используем slug.agent как дополнительный паттерн
      patterns.push(`${config.slug}.agent`);
    }

    // Ищем все @-упоминания в тексте
    const mentionRegex = /@([\w.-]+(?:\s+[\w.-]+)*)/gi;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (!match[1]) continue;

      const mentionText = match[1].toLowerCase().trim();

      // Проверяем совпадение с одним из паттернов
      const isMatch = patterns.some((pattern) => {
        // Точное совпадение или начинается с паттерна
        return mentionText === pattern || mentionText.startsWith(pattern);
      });

      if (isMatch && config.userId && !foundAgentIds.has(config.userId)) {
        foundAgentIds.add(config.userId);
        mentions.push({
          agentId: config.userId,
          agentType: config.slug,
          isConfigBased: true,
          config,
        });
      }
    }
  }

  // 2. Затем проверяем старый формат @ai-{type} для legacy агентов
  const legacyRegex = /@ai-(\w+)/gi;
  let legacyMatch;

  const legacyAgents = await aiAgentsRepository.list();
  while ((legacyMatch = legacyRegex.exec(text)) !== null) {
    if (!legacyMatch[1]) continue;
    const agentType = legacyMatch[1].toLowerCase();
    const agent = legacyAgents.find((a) => a.agentType === agentType);

    if (agent && !foundAgentIds.has(agent.id)) {
      foundAgentIds.add(agent.id);
      mentions.push({
        agentId: agent.id,
        agentType,
        isConfigBased: false,
      });
    }
  }

  return mentions;
}

/**
 * Выбирает шаблон ответа для агента на основе контекста
 */
export function selectAgentResponse(agent: AIAgent, _context?: string): string {
  void _context;
  if (!agent.responseTemplates || agent.responseTemplates.length === 0) {
    return 'Принял к сведению.';
  }

  // Простой случайный выбор шаблона
  // В будущем можно улучшить логику на основе контекста
  const randomIndex = Math.floor(Math.random() * agent.responseTemplates.length);
  return agent.responseTemplates[randomIndex] ?? 'Принял к сведению.';
}

/**
 * Отправляет ответ агента в чат проекта
 */
export async function sendAgentChatResponse(
  projectId: string,
  agentId: string,
  response: string
): Promise<void> {
  projectChatRepository.create({
    projectId,
    authorId: agentId,
    body: response,
    attachments: []
  });
}

/**
 * Отправляет ответ агента в комментарии задачи
 */
export async function sendAgentTaskComment(
  projectId: string,
  taskId: string,
  agentId: string,
  response: string
): Promise<void> {
  commentsRepository.create({
    projectId,
    taskId,
    authorId: agentId,
    body: response,
    mentions: [],
    attachments: []
  });
}

/**
 * Результат обработки упоминания агента в чате
 */
export interface AgentMentionHandlerResult {
  agentId: string;
  agentType: string;
  handled: boolean;
  /** Для config-based агентов указывает, нужно ли запускать пайплайн */
  requiresPipeline?: boolean;
  /** Конфиг агента для запуска пайплайна */
  config?: DbAIAgentConfig;
}

/**
 * Обрабатывает упоминания агентов в сообщении чата
 *
 * Для legacy агентов (@ai-*): отправляет автоматический ответ по шаблону
 * Для config-based агентов (@brandbook и т.д.): возвращает информацию для запуска пайплайна
 *
 * @returns Массив результатов обработки (для config-based агентов с requiresPipeline=true
 *          вызывающий код должен запустить соответствующий пайплайн)
 */
export async function handleAgentMentionInChat(
  projectId: string,
  messageBody: string,
  _authorId: string
): Promise<AgentMentionHandlerResult[]> {
  void _authorId;
  const agentMentions = await extractAgentMentions(messageBody);
  const results: AgentMentionHandlerResult[] = [];

  for (const mention of agentMentions) {
    // Config-based агенты (например Brandbook Agent)
    // Для них не используем autoRespond, а возвращаем информацию для запуска пайплайна
    if (mention.isConfigBased && mention.config) {
      results.push({
        agentId: mention.agentId,
        agentType: mention.agentType,
        handled: false, // Пайплайн должен быть запущен вызывающим кодом
        requiresPipeline: true,
        config: mention.config,
      });
      continue;
    }

    // Legacy агенты (@ai-*)
    const agent = await aiAgentsRepository.findById(mention.agentId);
    if (!agent || !agent.behavior?.autoRespond) {
      results.push({
        agentId: mention.agentId,
        agentType: mention.agentType,
        handled: false,
      });
      continue;
    }

    // Выбрать шаблон ответа
    const response = selectAgentResponse(agent, messageBody);

    // Отправить ответ в чат
    await sendAgentChatResponse(projectId, agent.id, response);

    results.push({
      agentId: mention.agentId,
      agentType: mention.agentType,
      handled: true,
    });
  }

  return results;
}

/**
 * Обрабатывает упоминания агентов в комментарии задачи
 *
 * Для legacy агентов (@ai-*): отправляет автоматический ответ по шаблону
 * Для config-based агентов (@brandbook и т.д.): возвращает информацию для запуска пайплайна
 *
 * @returns Массив результатов обработки (для config-based агентов с requiresPipeline=true
 *          вызывающий код должен запустить соответствующий пайплайн)
 */
export async function handleAgentMentionInComment(
  projectId: string,
  taskId: string,
  messageBody: string,
  _authorId: string
): Promise<AgentMentionHandlerResult[]> {
  void _authorId;
  const agentMentions = await extractAgentMentions(messageBody);
  const results: AgentMentionHandlerResult[] = [];

  for (const mention of agentMentions) {
    // Config-based агенты (например Brandbook Agent)
    // Для них не используем autoRespond, а возвращаем информацию для запуска пайплайна
    if (mention.isConfigBased && mention.config) {
      results.push({
        agentId: mention.agentId,
        agentType: mention.agentType,
        handled: false, // Пайплайн должен быть запущен вызывающим кодом
        requiresPipeline: true,
        config: mention.config,
      });
      continue;
    }

    // Legacy агенты (@ai-*)
    const agent = await aiAgentsRepository.findById(mention.agentId);
    if (!agent || !agent.behavior?.autoRespond) {
      results.push({
        agentId: mention.agentId,
        agentType: mention.agentType,
        handled: false,
      });
      continue;
    }

    // Выбрать шаблон ответа
    const response = selectAgentResponse(agent, messageBody);

    // Отправить ответ в комментарии задачи
    await sendAgentTaskComment(projectId, taskId, agent.id, response);

    results.push({
      agentId: mention.agentId,
      agentType: mention.agentType,
      handled: true,
    });
  }

  return results;
}
