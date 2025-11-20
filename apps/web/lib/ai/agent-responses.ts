import {
  aiAgentsRepository,
  projectChatRepository,
  commentsRepository
} from '@collabverse/api';
import type { AIAgent } from '@collabverse/api';

export interface AgentMention {
  agentId: string;
  agentType: string;
}

/**
 * Извлекает упоминания AI-агентов из текста сообщения
 * Формат: @ai-assistant, @ai-reviewer, @ai-reminder, @ai-summarizer
 */
export async function extractAgentMentions(text: string): Promise<AgentMention[]> {
  const mentions: AgentMention[] = [];
  const regex = /@ai-(\w+)/gi;
  let match;

  const agents = await aiAgentsRepository.list();
  while ((match = regex.exec(text)) !== null) {
    if (!match[1]) continue;
    const agentType = match[1].toLowerCase();
    const agent = agents.find((a) => a.agentType === agentType);
    if (agent) {
      mentions.push({ agentId: agent.id, agentType });
    }
  }

  return mentions;
}

/**
 * Выбирает шаблон ответа для агента на основе контекста
 */
export function selectAgentResponse(agent: AIAgent, context?: string): string {
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
 * Обрабатывает упоминания агентов в сообщении чата
 */
export async function handleAgentMentionInChat(
  projectId: string,
  messageBody: string,
  authorId: string
): Promise<void> {
  const agentMentions = await extractAgentMentions(messageBody);

  for (const mention of agentMentions) {
    const agent = await aiAgentsRepository.findById(mention.agentId);
    if (!agent || !agent.behavior?.autoRespond) {
      continue;
    }

    // Выбрать шаблон ответа
    const response = selectAgentResponse(agent, messageBody);

    // Отправить ответ в чат
    await sendAgentChatResponse(projectId, agent.id, response);
  }
}

/**
 * Обрабатывает упоминания агентов в комментарии задачи
 */
export async function handleAgentMentionInComment(
  projectId: string,
  taskId: string,
  messageBody: string,
  authorId: string
): Promise<void> {
  const agentMentions = await extractAgentMentions(messageBody);

  for (const mention of agentMentions) {
    const agent = await aiAgentsRepository.findById(mention.agentId);
    if (!agent || !agent.behavior?.autoRespond) {
      continue;
    }

    // Выбрать шаблон ответа
    const response = selectAgentResponse(agent, messageBody);

    // Отправить ответ в комментарии задачи
    await sendAgentTaskComment(projectId, taskId, agent.id, response);
  }
}

