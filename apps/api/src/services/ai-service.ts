/**
 * AI Service для операций с задачами
 * 
 * Этот сервис предоставляет функции для работы с AI в контексте задач:
 * - Генерация описаний задач
 * - Генерация чек-листов
 * - Суммирование комментариев
 * 
 * Примечание: Этот файл находится в apps/api, но использует AI клиент из apps/web.
 * При деплое нужно убедиться, что OPENAI_API_KEY доступен в окружении API.
 */

// Types removed as they were unused

/**
 * Интерфейс для AI клиента
 * Определяет методы, которые должен реализовывать AI клиент
 */
export interface AIClient {
  generateText(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }): Promise<string>;
}

/**
 * Очистка ответа AI от лишних символов и форматирование
 */
function cleanAIResponse(response: string): string {
  return response
    .trim()
    .replace(/^```markdown\n/, '')
    .replace(/\n```$/, '')
    .replace(/^```\n/, '')
    .replace(/\n```$/, '');
}

/**
 * Валидация ответа AI
 * Проверяет, что ответ не пустой и имеет минимальную длину
 */
function validateAIResponse(response: string, minLength = 50): boolean {
  const cleaned = cleanAIResponse(response);
  return cleaned.length >= minLength && cleaned.split(' ').length >= 10;
}

/**
 * Генерация описания задачи
 * 
 * @param aiClient - Клиент для работы с AI
 * @param taskTitle - Название задачи
 * @param context - Контекст проекта
 * @returns Сгенерированное описание
 */
export async function generateTaskDescription(
  aiClient: AIClient,
  taskTitle: string,
  context?: {
    projectName?: string;
    projectDescription?: string;
  }
): Promise<string> {
  const prompt = `Ты помощник по управлению проектами. Сгенерируй подробное описание для задачи "${taskTitle}".

${context?.projectName ? `Проект: ${context.projectName}` : ''}
${context?.projectDescription ? `Описание проекта: ${context.projectDescription}` : ''}

Создай структурированное описание задачи, включающее:
- **Цель задачи:** Что нужно достичь
- **Шаги выполнения:** Пошаговый план действий (3-5 шагов)
- **Ожидаемый результат:** Что получим после выполнения
- **Критерии готовности:** Как определить, что задача завершена

Формат ответа: markdown с заголовками и списками.
Ответ должен быть на русском языке, кратким но информативным (не более 500 слов).`;

  const description = await aiClient.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 800
  });

  if (!validateAIResponse(description)) {
    throw new Error('AI generated invalid response for task description');
  }

  return cleanAIResponse(description);
}

/**
 * Генерация чек-листа для задачи
 * 
 * @param aiClient - Клиент для работы с AI
 * @param taskTitle - Название задачи
 * @param taskDescription - Описание задачи (опционально)
 * @returns Сгенерированный чек-лист
 */
export async function generateTaskChecklist(
  aiClient: AIClient,
  taskTitle: string,
  taskDescription?: string
): Promise<string> {
  const prompt = `Ты помощник по управлению проектами. Создай чек-лист для задачи "${taskTitle}".

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

  const checklist = await aiClient.generateText(prompt, {
    temperature: 0.6,
    maxTokens: 500
  });

  if (!validateAIResponse(checklist, 30)) {
    throw new Error('AI generated invalid response for checklist');
  }

  return cleanAIResponse(checklist);
}

/**
 * Суммирование комментариев задачи
 * 
 * @param aiClient - Клиент для работы с AI
 * @param comments - Массив комментариев
 * @returns Сводка комментариев
 */
export async function summarizeTaskComments(
  aiClient: AIClient,
  comments: Array<{
    id: string;
    authorName: string;
    body: string;
    createdAt: string;
  }>
): Promise<string> {
  if (comments.length === 0) {
    return 'Комментариев пока нет.';
  }

  if (comments.length === 1) {
    const comment = comments[0];
    if (comment) {
      return `Один комментарий от ${comment.authorName}: ${comment.body}`;
    }
  }

  const commentsText = comments
    .map((c, i) => `${i + 1}. ${c.authorName} (${c.createdAt}):\n${c.body}`)
    .join('\n\n');

  const prompt = `Ты помощник по управлению проектами. Проанализируй комментарии к задаче и создай краткую сводку.

Комментарии:
${commentsText}

Создай структурированную сводку, включающую:
- **Основные обсуждаемые вопросы:** Ключевые темы из комментариев
- **Принятые решения:** Если есть решения или договорённости
- **Нерешённые вопросы:** Что требует дальнейшего обсуждения
- **Действия:** Какие действия были предложены или выполнены

Формат ответа: markdown с заголовками и списками.
Ответ должен быть кратким (не более 300 слов) и на русском языке.`;

  const summary = await aiClient.generateText(prompt, {
    temperature: 0.5,
    maxTokens: 600
  });

  if (!validateAIResponse(summary)) {
    throw new Error('AI generated invalid response for summary');
  }

  return cleanAIResponse(summary);
}

/**
 * Генерация персонализированного напоминания о дедлайне
 * 
 * @param aiClient - Клиент для работы с AI
 * @param task - Информация о задаче
 * @returns Текст напоминания
 */
export async function generateDeadlineReminder(
  aiClient: AIClient,
  task: {
    title: string;
    dueAt: string;
    assignee?: string;
    priority?: string;
  }
): Promise<string> {
  const prompt = `Ты AI-помощник по управлению проектами. Создай персонализированное напоминание о дедлайне задачи.

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

  const reminder = await aiClient.generateText(prompt, {
    temperature: 0.8,
    maxTokens: 200
  });

  return cleanAIResponse(reminder);
}

/**
 * Генерация ответа AI для чата проекта
 * 
 * @param aiClient - Клиент для работы с AI
 * @param question - Вопрос пользователя
 * @param projectContext - Контекст проекта
 * @returns Ответ AI
 */
export async function generateChatResponse(
  aiClient: AIClient,
  question: string,
  projectContext: {
    projectId: string;
    projectName: string;
    tasksCount: number;
    membersCount: number;
    recentActivity?: string;
  }
): Promise<string> {
  const prompt = `Ты AI-ассистент проекта "${projectContext.projectName}".

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

  const response = await aiClient.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 500
  });

  return cleanAIResponse(response);
}

/**
 * Парсинг структурированного JSON ответа от AI
 */
export function parseAIJsonResponse<T>(response: string): T | null {
  try {
    // Удаляем markdown code blocks если они есть
    const cleaned = response
      .replace(/^```json\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return parsed as T;
  } catch (error) {
    console.error('Failed to parse AI JSON response:', error);
    return null;
  }
}

