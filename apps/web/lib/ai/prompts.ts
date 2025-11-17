/**
 * Шаблоны промптов для AI-ассистента
 * Содержит функции для генерации промптов для различных задач
 */

export interface ProjectContext {
  projectName?: string;
  projectDescription?: string;
  projectGoals?: string;
}

export interface TaskContext extends ProjectContext {
  taskTitle: string;
  taskDescription?: string;
}

/**
 * Генерирует промпт для создания описания задачи
 */
export function generateTaskDescriptionPrompt(
  taskTitle: string,
  context?: ProjectContext
): string {
  return `Ты помощник по управлению проектами. Сгенерируй подробное описание для задачи "${taskTitle}".

${context?.projectName ? `Проект: ${context.projectName}` : ''}
${context?.projectDescription ? `Описание проекта: ${context.projectDescription}` : ''}

Создай структурированное описание задачи, включающее:
- **Цель задачи:** Что нужно достичь
- **Шаги выполнения:** Пошаговый план действий (3-5 шагов)
- **Ожидаемый результат:** Что получим после выполнения
- **Критерии готовности:** Как определить, что задача завершена

Формат ответа: markdown с заголовками и списками.
Ответ должен быть на русском языке, кратким но информативным (не более 500 слов).`;
}

/**
 * Генерирует промпт для создания чек-листа задачи
 */
export function generateChecklistPrompt(
  taskTitle: string,
  taskDescription?: string
): string {
  return `Ты помощник по управлению проектами. Создай чек-лист для задачи "${taskTitle}".

${taskDescription ? `Описание задачи:\n${taskDescription}` : ''}

Создай список конкретных подзадач (чек-лист) для выполнения этой задачи.

Требования:
- От 3 до 8 пунктов
- Каждый пункт должен быть конкретным и проверяемым
- Пункты должны быть упорядочены логически
- Формулировки должны начинаться с глаголов действия

Формат ответа: список в формате markdown, каждый пункт на новой строке, начиная с "- [ ]".
Ответ должен быть на русском языке.

Пример:
- [ ] Создать структуру базы данных
- [ ] Написать API endpoints
- [ ] Добавить валидацию данных`;
}

/**
 * Генерирует промпт для суммирования комментариев
 */
export function summarizeCommentsPrompt(
  comments: Array<{ author: string; body: string; createdAt: string }>
): string {
  const commentsText = comments
    .map((c, i) => `${i + 1}. ${c.author} (${c.createdAt}):\n${c.body}`)
    .join('\n\n');

  return `Ты помощник по управлению проектами. Проанализируй комментарии к задаче и создай краткую сводку.

Комментарии:
${commentsText}

Создай структурированную сводку, включающую:
- **Основные обсуждаемые вопросы:** Ключевые темы из комментариев
- **Принятые решения:** Если есть решения или договорённости
- **Нерешённые вопросы:** Что требует дальнейшего обсуждения
- **Действия:** Какие действия были предложены или выполнены

Формат ответа: markdown с заголовками и списками.
Ответ должен быть кратким (не более 300 слов) и на русском языке.`;
}

/**
 * Генерирует промпт для чата с AI в проекте
 */
export function chatPrompt(
  question: string,
  projectContext: {
    projectId: string;
    projectName: string;
    tasksCount: number;
    membersCount: number;
    recentActivity?: string;
  }
): string {
  return `Ты AI-ассистент проекта "${projectContext.projectName}".

Контекст проекта:
- ID проекта: ${projectContext.projectId}
- Количество задач: ${projectContext.tasksCount}
- Количество участников: ${projectContext.membersCount}
${projectContext.recentActivity ? `- Последняя активность: ${projectContext.recentActivity}` : ''}

Вопрос пользователя: ${question}

Ответь на вопрос, используя контекст проекта. 
Будь полезным, кратким и конкретным.
Если нужна дополнительная информация для ответа, попроси пользователя уточнить.
Ответ должен быть на русском языке.`;
}

/**
 * Генерирует промпт для напоминания о дедлайне
 */
export function deadlineReminderPrompt(
  task: {
    title: string;
    dueAt: string;
    assignee?: string;
    priority?: string;
  }
): string {
  return `Ты AI-помощник по управлению проектами. Создай персонализированное напоминание о дедлайне задачи.

Информация о задаче:
- Название: ${task.title}
- Дедлайн: ${task.dueAt}
${task.assignee ? `- Исполнитель: ${task.assignee}` : ''}
${task.priority ? `- Приоритет: ${task.priority}` : ''}

Создай дружелюбное но настойчивое напоминание о приближающемся дедлайне.
Сообщение должно:
- Быть коротким (1-2 предложения)
- Мотивировать к действию
- Быть вежливым и профессиональным
- Быть на русском языке

Не используй эмодзи. Не добавляй подпись или заголовок.`;
}

/**
 * Генерирует промпт для анализа загруженности команды
 */
export function analyzeWorkloadPrompt(
  members: Array<{
    name: string;
    tasksCount: number;
    completedTasks: number;
    overdueTasks: number;
  }>
): string {
  const membersText = members
    .map(
      (m) =>
        `- ${m.name}: ${m.tasksCount} задач (${m.completedTasks} завершено, ${m.overdueTasks} просрочено)`
    )
    .join('\n');

  return `Ты AI-аналитик по управлению проектами. Проанализируй загруженность команды.

Участники и их задачи:
${membersText}

Создай анализ загруженности, включающий:
- **Общая оценка:** Как распределена нагрузка в команде
- **Перегруженные участники:** Кто имеет слишком много задач
- **Недогруженные участники:** Кто может взять больше задач
- **Рекомендации:** Как оптимизировать распределение задач

Формат ответа: markdown с заголовками и списками.
Будь конкретным и практичным. Ответ на русском языке, не более 400 слов.`;
}

/**
 * Генерирует промпт для рекомендаций по назначению задач
 */
export function taskAssignmentRecommendationPrompt(
  task: { title: string; description?: string; priority?: string },
  members: Array<{
    name: string;
    role?: string;
    skills?: string[];
    currentTasksCount: number;
  }>
): string {
  const membersText = members
    .map(
      (m) =>
        `- ${m.name}${m.role ? ` (${m.role})` : ''}${m.skills ? `, навыки: ${m.skills.join(', ')}` : ''}, активных задач: ${m.currentTasksCount}`
    )
    .join('\n');

  return `Ты AI-помощник по управлению проектами. Порекомендуй участника для назначения на задачу.

Задача:
- Название: ${task.title}
${task.description ? `- Описание: ${task.description}` : ''}
${task.priority ? `- Приоритет: ${task.priority}` : ''}

Доступные участники:
${membersText}

Проанализируй задачу и участников, порекомендуй наиболее подходящего исполнителя.

Формат ответа (строго JSON):
{
  "recommendedMember": "Имя участника",
  "reason": "Краткое объяснение причины выбора (1-2 предложения)",
  "confidence": 0.8
}

confidence - уровень уверенности в рекомендации от 0 до 1.
Ответ только в формате JSON, без дополнительного текста.`;
}

/**
 * Генерирует промпт для парсинга массовой команды
 */
export function parseBulkCommandPrompt(command: string): string {
  return `Ты AI-помощник по управлению проектами. Распарси команду пользователя для массовой операции с задачами.

Команда пользователя: "${command}"

Определи тип операции и параметры.

Поддерживаемые операции:
- update_status: Изменить статус задач
- update_deadline: Изменить дедлайн задач
- assign: Назначить задачи на участника
- add_labels: Добавить метки к задачам

Формат ответа (строго JSON):
{
  "type": "update_status",
  "filter": {
    "status": "текущий статус (опционально)",
    "assigneeId": "ID исполнителя (опционально)"
  },
  "updates": {
    "status": "новый статус (для update_status)",
    "deadline": "новый дедлайн (для update_deadline)",
    "assigneeId": "ID исполнителя (для assign)",
    "labels": ["метка1", "метка2"] (для add_labels)
  }
}

Если команду невозможно распарсить, верни null.
Ответ только в формате JSON, без дополнительного текста.`;
}

/**
 * Генерирует промпт для создания структуры проекта
 */
export function generateProjectStructurePrompt(
  projectDescription: string
): string {
  return `Ты эксперт по управлению проектами. Разбей проект на этапы и задачи на основе описания.

Описание проекта:
${projectDescription}

Создай структуру проекта с этапами и задачами.

Формат ответа (строго JSON):
{
  "phases": [
    {
      "name": "Название этапа",
      "description": "Описание этапа",
      "tasks": [
        {
          "title": "Название задачи",
          "description": "Описание задачи",
          "estimatedDays": 5,
          "priority": "high"
        }
      ]
    }
  ]
}

Требования:
- 2-5 этапов
- 3-8 задач в каждом этапе
- estimatedDays: реалистичная оценка в днях (1-20)
- priority: "low", "med", "high", "urgent"
- Все тексты на русском языке

Ответ только в формате JSON, без дополнительного текста.`;
}

