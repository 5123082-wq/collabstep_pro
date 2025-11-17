import {
  tasksRepository,
  commentsRepository,
  aiAgentsRepository
} from '@collabverse/api';
import { selectAgentResponse } from './agent-responses';

/**
 * Обрабатывает назначение AI-агента на задачу
 */
export async function handleAgentTaskAssignment(
  taskId: string,
  agentId: string
): Promise<void> {
  const agent = aiAgentsRepository.findById(agentId);
  if (!agent) {
    return;
  }

  const task = tasksRepository.findById(taskId);
  if (!task) {
    return;
  }

  // Выбрать подходящий ответ на основе типа агента
  let response: string;
  switch (agent.agentType) {
    case 'assistant':
      response = selectAgentResponse(agent, `Задача "${task.title}" назначена мне.`);
      break;
    case 'reviewer':
      response = selectAgentResponse(agent, `Задача "${task.title}" назначена на проверку.`);
      break;
    case 'reminder':
      response = selectAgentResponse(agent, `Взял в работу задачу "${task.title}".`);
      break;
    default:
      response = `Принял задачу "${task.title}" к выполнению.`;
  }

  // Отправить комментарий от имени агента
  commentsRepository.create({
    projectId: task.projectId,
    taskId,
    authorId: agentId,
    body: response,
    mentions: [],
    attachments: []
  });
}

/**
 * Обрабатывает изменение статуса задачи агентом
 */
export async function handleAgentTaskStatusChange(
  taskId: string,
  agentId: string,
  newStatus: string
): Promise<void> {
  const agent = aiAgentsRepository.findById(agentId);
  if (!agent) {
    return;
  }

  const task = tasksRepository.findById(taskId);
  if (!task) {
    return;
  }

  // Генерировать ответ на основе нового статуса
  let response: string;
  switch (newStatus) {
    case 'in_progress':
      response = selectAgentResponse(agent, 'Начинаю работу над задачей.');
      break;
    case 'review':
      response = selectAgentResponse(agent, 'Задача готова к проверке.');
      break;
    case 'done':
      response = selectAgentResponse(agent, 'Задача завершена.');
      break;
    case 'blocked':
      response = selectAgentResponse(agent, 'Задача заблокирована. Требуется помощь.');
      break;
    default:
      response = `Статус задачи изменён на "${newStatus}".`;
  }

  // Отправить комментарий от имени агента
  commentsRepository.create({
    projectId: task.projectId,
    taskId,
    authorId: agentId,
    body: response,
    mentions: [],
    attachments: []
  });
}

/**
 * Отправляет напоминание о дедлайне от агента-напоминателя
 */
export async function sendDeadlineReminder(
  taskId: string,
  daysUntilDeadline: number
): Promise<void> {
  const reminderAgent = aiAgentsRepository.findByType('reminder');
  if (!reminderAgent) {
    return;
  }

  const task = tasksRepository.findById(taskId);
  if (!task || !task.dueAt) {
    return;
  }

  // Выбрать подходящее сообщение на основе оставшихся дней
  let response: string;
  if (daysUntilDeadline === 0) {
    response = selectAgentResponse(reminderAgent, 'Дедлайн сегодня!');
  } else if (daysUntilDeadline === 1) {
    response = selectAgentResponse(reminderAgent, 'Дедлайн завтра!');
  } else if (daysUntilDeadline <= 3) {
    response = selectAgentResponse(reminderAgent, `Дедлайн через ${daysUntilDeadline} дня.`);
  } else {
    response = selectAgentResponse(reminderAgent, `Дедлайн через ${daysUntilDeadline} дней.`);
  }

  // Отправить комментарий от имени агента-напоминателя
  commentsRepository.create({
    projectId: task.projectId,
    taskId,
    authorId: reminderAgent.id,
    body: response,
    mentions: task.assigneeId ? [task.assigneeId] : [],
    attachments: []
  });
}

