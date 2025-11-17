/**
 * AI Bulk Operations
 * 
 * Модуль для массовых операций с задачами через AI команды
 */

import { generateText } from './client';

/**
 * Типы массовых операций
 */
export type BulkOperationType = 
  | 'update_status'
  | 'update_deadline'
  | 'update_priority'
  | 'assign'
  | 'add_labels'
  | 'remove_labels'
  | 'update_estimatedTime';

/**
 * Операция массового изменения
 */
export interface BulkOperation {
  type: BulkOperationType;
  filter: {
    status?: string;
    assigneeId?: string;
    priority?: string;
    labels?: string[];
    hasDeadline?: boolean;
  };
  updates: {
    status?: string;
    deadline?: string;
    priority?: string;
    assigneeId?: string;
    labels?: string[];
    estimatedTime?: number;
  };
  affectedCount?: number; // Количество задач, которые будут изменены
}

/**
 * Результат парсинга команды
 */
export interface ParsedCommand {
  operation: BulkOperation | null;
  confidence: number; // 0-1
  interpretation: string; // Как AI понял команду
  warnings?: string[]; // Предупреждения о потенциальных проблемах
}

/**
 * Парсинг команды пользователя в структурированную операцию
 * 
 * @param command - Команда пользователя на естественном языке
 * @param availableStatuses - Доступные статусы задач
 * @param availableMembers - Доступные участники проекта
 * @returns Структурированная операция
 */
export async function parseBulkCommand(
  command: string,
  context?: {
    availableStatuses?: string[];
    availableMembers?: Array<{ id: string; name: string }>;
    availablePriorities?: string[];
  }
): Promise<ParsedCommand> {
  const { availableStatuses, availableMembers, availablePriorities } = context || {};

  const prompt = `Ты помощник по управлению задачами. Разбери команду пользователя и преобразуй её в структурированную операцию.

**Команда пользователя:**
${command}

**Доступные статусы:**
${availableStatuses ? availableStatuses.join(', ') : 'new, in_progress, review, done, blocked'}

**Доступные приоритеты:**
${availablePriorities ? availablePriorities.join(', ') : 'low, med, high, urgent'}

${availableMembers ? `**Доступные участники:**\n${availableMembers.map(m => `${m.name} (ID: ${m.id})`).join('\n')}` : ''}

**Возможные типы операций:**
- update_status: изменить статус задач
- update_deadline: изменить дедлайн задач
- update_priority: изменить приоритет задач
- assign: назначить задачи на участника
- add_labels: добавить метки к задачам
- remove_labels: удалить метки у задач
- update_estimatedTime: обновить оценку времени

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста:

{
  "operation": {
    "type": "update_status",
    "filter": {
      "status": "in_progress",
      "assigneeId": "user_id"
    },
    "updates": {
      "status": "done"
    }
  },
  "confidence": 0.95,
  "interpretation": "Изменить статус всех задач в статусе 'в работе' у пользователя X на 'готово'",
  "warnings": ["Будет изменено много задач", "Проверьте, что все задачи действительно завершены"]
}

Если команду невозможно распарсить, верни:
{
  "operation": null,
  "confidence": 0,
  "interpretation": "Не удалось понять команду",
  "warnings": ["Уточните, что именно нужно сделать"]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt: 'Ты помощник по парсингу команд для управления задачами. Отвечай только в формате JSON.'
    });

    // Удаляем markdown code blocks если они есть
    const cleaned = response
      .replace(/^```json\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as ParsedCommand;

    // Валидация результата
    if (parsed.operation) {
      if (!parsed.operation.type || !parsed.operation.filter || !parsed.operation.updates) {
        throw new Error('Invalid operation structure');
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing bulk command:', error);
    return {
      operation: null,
      confidence: 0,
      interpretation: 'Не удалось распарсить команду. Попробуйте переформулировать.',
      warnings: ['Произошла ошибка при обработке команды']
    };
  }
}

/**
 * Подсчет количества задач, которые будут затронуты операцией
 * 
 * @param operation - Операция
 * @param tasks - Все задачи проекта
 * @returns Количество задач
 */
export function countAffectedTasks(
  operation: BulkOperation,
  tasks: Array<{
    id: string;
    status: string;
    assigneeId?: string;
    priority?: string;
    labels?: string[];
    dueAt?: string;
  }>
): number {
  return tasks.filter(task => {
    const filter = operation.filter;

    if (filter.status && task.status !== filter.status) {
      return false;
    }

    if (filter.assigneeId && task.assigneeId !== filter.assigneeId) {
      return false;
    }

    if (filter.priority && task.priority !== filter.priority) {
      return false;
    }

    if (filter.labels && filter.labels.length > 0) {
      const taskLabels = task.labels || [];
      const hasAllLabels = filter.labels.every(label => taskLabels.includes(label));
      if (!hasAllLabels) {
        return false;
      }
    }

    if (filter.hasDeadline !== undefined) {
      const hasDeadline = !!task.dueAt;
      if (hasDeadline !== filter.hasDeadline) {
        return false;
      }
    }

    return true;
  }).length;
}

/**
 * Применение массовой операции к задачам
 * 
 * @param operation - Операция
 * @param projectId - ID проекта
 * @returns Результат выполнения
 */
export async function executeBulkOperation(
  operation: BulkOperation,
  projectId: string
): Promise<{
  success: boolean;
  updatedCount: number;
  errors?: string[];
}> {
  try {
    const response = await fetch('/api/pm/tasks/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        operation
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to execute bulk operation');
    }

    const data = await response.json();
    return {
      success: true,
      updatedCount: data.data?.updatedCount || 0
    };
  } catch (error) {
    console.error('Error executing bulk operation:', error);
    return {
      success: false,
      updatedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Генерация примеров команд для пользователя
 */
export const BULK_COMMAND_EXAMPLES = [
  'Измени статус всех задач в колонке "В работе" на "Готово"',
  'Назначь все задачи с приоритетом "Срочно" на меня',
  'Добавь метку "Backend" ко всем задачам без метки',
  'Установи дедлайн на завтра для всех задач без дедлайна',
  'Измени приоритет всех просроченных задач на "Высокий"',
  'Удали метку "WIP" у всех завершённых задач',
  'Установи оценку 8 часов для всех задач без оценки'
];

/**
 * Получение описания типа операции
 */
export function getOperationTypeDescription(type: BulkOperationType): string {
  const descriptions: Record<BulkOperationType, string> = {
    update_status: 'Изменение статуса задач',
    update_deadline: 'Изменение дедлайна задач',
    update_priority: 'Изменение приоритета задач',
    assign: 'Назначение задач на участника',
    add_labels: 'Добавление меток к задачам',
    remove_labels: 'Удаление меток у задач',
    update_estimatedTime: 'Обновление оценки времени'
  };

  return descriptions[type] || 'Неизвестная операция';
}

