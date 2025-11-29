/**
 * AI Chat Integration для чата проектов
 * 
 * Обработка AI запросов в чате проектов
 */

import { projectsRepository, tasksRepository, projectChatRepository } from '@collabverse/api';
import { generateText } from './client';
import { generateChatResponse } from '@collabverse/api/services/ai-service';

/**
 * Проверка, адресовано ли сообщение AI
 * Форматы: "@ai вопрос" или "/ai вопрос" или начинается с "AI,"
 */
export function isAICommand(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    trimmed.startsWith('@ai ') ||
    trimmed.startsWith('/ai ') ||
    trimmed.startsWith('ai,') ||
    trimmed.startsWith('ai ')
  );
}

/**
 * Извлечение вопроса из AI команды
 */
export function extractAIQuestion(message: string): string {
  const trimmed = message.trim();
  
  // Удаляем префиксы
  const patterns = [
    /^@ai\s+/i,
    /^\/ai\s+/i,
    /^ai,\s*/i,
    /^ai\s+/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, '').trim();
    }
  }

  return trimmed;
}

/**
 * Генерация ответа AI на вопрос в чате проекта
 * 
 * @param projectId - ID проекта
 * @param question - Вопрос пользователя
 * @returns Ответ AI
 */
export async function generateProjectChatAIResponse(
  projectId: string,
  question: string
): Promise<string> {
  // Получение контекста проекта
  const project = projectsRepository.findById(projectId);
  if (!project) {
    return 'Извините, проект не найден.';
  }

  // Получение задач проекта для контекста
  const tasks = tasksRepository.list().filter(t => t.projectId === projectId);
  const members = await projectsRepository.listMembers(projectId);

  // Получение недавних сообщений чата для контекста (последние 5)
  const recentMessagesResult = projectChatRepository.listByProject(projectId, { pageSize: 5 });
  const recentActivity = recentMessagesResult.messages
    .map(m => m.body)
    .slice(0, 3)
    .join('; ');

  const projectContext = {
    projectId,
    projectName: project.title,
    tasksCount: tasks.length,
    membersCount: members.length,
    ...(recentActivity ? { recentActivity } : {})
  };

  // Создаём адаптер для AI клиента
  const aiClient = {
    generateText: async (prompt: string, options?: Parameters<typeof generateText>[1]) => {
      return await generateText(prompt, options);
    }
  };

  try {
    const response = await generateChatResponse(aiClient, question, projectContext);
    return response;
  } catch (error) {
    console.error('AI chat response error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return 'Извините, AI сервис не настроен. Обратитесь к администратору.';
      }
      if (error.message.includes('rate limit')) {
        return 'Извините, превышен лимит запросов AI. Попробуйте позже.';
      }
    }
    
    return 'Извините, произошла ошибка при обработке вашего запроса.';
  }
}

/**
 * Обработка AI команды в чате проекта
 * 
 * @param projectId - ID проекта
 * @param message - Сообщение пользователя
 * @param authorId - ID автора сообщения
 * @returns Ответ AI или null если не AI команда
 */
export async function handleAIChatCommand(
  projectId: string,
  message: string,
  _authorId: string
): Promise<string | null> {
  void _authorId;
  if (!isAICommand(message)) {
    return null;
  }

  const question = extractAIQuestion(message);
  
  if (!question) {
    return 'Пожалуйста, задайте вопрос после команды AI.';
  }

  const response = await generateProjectChatAIResponse(projectId, question);
  return response;
}

/**
 * Предустановленные AI команды для быстрого доступа
 */
export const AI_QUICK_COMMANDS = [
  {
    command: '/ai статус',
    description: 'Получить статус проекта',
    example: '/ai расскажи о статусе проекта'
  },
  {
    command: '/ai задачи',
    description: 'Информация о задачах',
    example: '/ai сколько задач в проекте?'
  },
  {
    command: '/ai помощь',
    description: 'Получить помощь от AI',
    example: '/ai как лучше организовать работу?'
  },
  {
    command: '/ai анализ',
    description: 'Анализ проекта',
    example: '/ai проанализируй прогресс проекта'
  }
] as const;

/**
 * Получение подсказок для AI команд
 */
export function getAICommandSuggestions(input: string): typeof AI_QUICK_COMMANDS[number][] {
  const normalized = input.toLowerCase().trim();
  
  if (!normalized.startsWith('/ai') && !normalized.startsWith('@ai')) {
    return [];
  }

  return AI_QUICK_COMMANDS.filter(cmd => 
    cmd.command.toLowerCase().includes(normalized) ||
    cmd.description.toLowerCase().includes(normalized)
  );
}

/**
 * Проверка доступности AI для проекта
 */
export function isAIAvailableForProject(_projectId: string): boolean {
  void _projectId;
  // Проверяем наличие API ключа
  if (typeof process !== 'undefined' && process.env) {
    return !!process.env.OPENAI_API_KEY;
  }
  return false;
}

/**
 * Форматирование AI ответа для отображения в чате
 */
export function formatAIResponse(response: string): string {
  // Добавляем префикс AI для визуального отличия
  return response;
}
