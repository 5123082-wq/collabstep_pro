/**
 * AI Planning Service
 * 
 * Сервис для AI-планирования проектов:
 * - Генерация структуры проекта из описания
 * - Рекомендации по назначению задач
 * - Анализ загруженности команды
 */

// Types removed as they were unused
import { parseAIJsonResponse } from './ai-service';

/**
 * Интерфейс для AI клиента
 */
export interface AIClient {
  generateText(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }): Promise<string>;
}

/**
 * Структура проекта, сгенерированная AI
 */
export interface ProjectStructure {
  phases: Array<{
    name: string;
    description: string;
    tasks: Array<{
      title: string;
      description: string;
      estimatedDays: number;
      priority: 'low' | 'med' | 'high' | 'urgent';
      suggestedStartDate?: string;
      dependencies?: string[]; // Названия задач, от которых зависит
    }>;
  }>;
  estimatedTotalDays?: number;
  suggestedTeamSize?: number;
  risks?: string[];
  recommendations?: string[];
}

/**
 * Рекомендация по назначению задачи
 */
export interface AssignmentRecommendation {
  taskId: string;
  taskTitle: string;
  recommendedAssigneeId: string;
  recommendedAssigneeName: string;
  reason: string;
  confidence: number; // 0-1
  alternativeAssignees?: Array<{
    userId: string;
    userName: string;
    reason: string;
    confidence: number;
  }>;
}

/**
 * Анализ загруженности участника
 */
export interface MemberWorkload {
  userId: string;
  userName: string;
  activeTasks: number;
  estimatedHours: number;
  upcomingDeadlines: number;
  overloadLevel: 'low' | 'medium' | 'high' | 'critical';
  capacity: number; // 0-100%
}

/**
 * Анализ загруженности команды
 */
export interface WorkloadAnalysis {
  members: MemberWorkload[];
  overloadedMembers: string[]; // userId[]
  underutilizedMembers: string[]; // userId[]
  recommendations: string[];
  redistributionSuggestions?: Array<{
    taskId: string;
    taskTitle: string;
    fromUserId: string;
    toUserId: string;
    reason: string;
  }>;
}

/**
 * Генерация структуры проекта из описания
 * 
 * @param aiClient - Клиент для работы с AI
 * @param projectDescription - Описание проекта
 * @param options - Дополнительные опции
 * @returns Структура проекта
 */
export async function generateProjectStructure(
  aiClient: AIClient,
  projectDescription: string,
  options?: {
    projectName?: string;
    teamSize?: number;
    deadline?: string;
    preferences?: {
      taskGranularity?: 'high' | 'medium' | 'low'; // Детализация задач
      includeRisks?: boolean;
      includeRecommendations?: boolean;
    };
  }
): Promise<ProjectStructure> {
  const { projectName, teamSize, deadline, preferences } = options || {};
  const granularity = preferences?.taskGranularity || 'medium';

  const prompt = `Ты опытный проект-менеджер. Разбей проект на этапы и задачи на основе следующего описания:

**Описание проекта:**
${projectDescription}

${projectName ? `**Название проекта:** ${projectName}` : ''}
${teamSize ? `**Размер команды:** ${teamSize} человек` : ''}
${deadline ? `**Дедлайн:** ${deadline}` : ''}

**Требования:**
- Разбей проект на логические этапы (phases)
- Каждый этап должен содержать конкретные задачи
- ${granularity === 'high' ? 'Задачи должны быть очень детальными, разбитыми на небольшие части (1-3 дня каждая)' : ''}
- ${granularity === 'medium' ? 'Задачи должны быть среднего размера (3-7 дней каждая)' : ''}
- ${granularity === 'low' ? 'Задачи могут быть крупными (1-2 недели каждая)' : ''}
- Укажи приоритет для каждой задачи: low, med, high, urgent
- Оцени длительность каждой задачи в днях
- Упорядочи задачи логически (сначала базовые, затем зависящие от них)
${preferences?.includeRisks ? '- Определи потенциальные риски проекта' : ''}
${preferences?.includeRecommendations ? '- Дай рекомендации по успешной реализации' : ''}

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста в следующем формате:

{
  "phases": [
    {
      "name": "Название этапа",
      "description": "Описание этапа",
      "tasks": [
        {
          "title": "Название задачи",
          "description": "Подробное описание задачи и критерии готовности",
          "estimatedDays": 5,
          "priority": "high",
          "dependencies": ["Название другой задачи"]
        }
      ]
    }
  ],
  "estimatedTotalDays": 45,
  "suggestedTeamSize": 5,
  ${preferences?.includeRisks ? '"risks": ["Риск 1", "Риск 2"],' : ''}
  ${preferences?.includeRecommendations ? '"recommendations": ["Рекомендация 1", "Рекомендация 2"]' : ''}
}

Ответ должен быть на русском языке.`;

  try {
    const response = await aiClient.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 3000,
      systemPrompt: 'Ты опытный проект-менеджер, специализирующийся на планировании и структурировании проектов. Отвечай только в формате JSON.'
    });

    const structure = parseAIJsonResponse<ProjectStructure>(response);
    
    if (!structure || !structure.phases || structure.phases.length === 0) {
      throw new Error('AI returned invalid project structure');
    }

    // Валидация структуры
    for (const phase of structure.phases) {
      if (!phase.name || !phase.tasks || phase.tasks.length === 0) {
        throw new Error('Invalid phase structure');
      }
      for (const task of phase.tasks) {
        if (!task.title || !task.estimatedDays || !task.priority) {
          throw new Error('Invalid task structure');
        }
      }
    }

    return structure;
  } catch (error) {
    console.error('Error generating project structure:', error);
    throw new Error('Failed to generate project structure');
  }
}

/**
 * Рекомендации по назначению задач участникам
 * 
 * @param aiClient - Клиент для работы с AI
 * @param tasks - Задачи для назначения
 * @param members - Участники проекта
 * @returns Рекомендации по назначению
 */
export async function suggestTaskAssignments(
  aiClient: AIClient,
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority?: string;
    estimatedTime?: number;
  }>,
  members: Array<{
    userId: string;
    userName: string;
    currentTasksCount?: number;
    skills?: string[];
    availability?: number; // 0-100%
  }>
): Promise<AssignmentRecommendation[]> {
  if (tasks.length === 0 || members.length === 0) {
    return [];
  }

  const tasksInfo = tasks.map((t, i) => 
    `${i + 1}. [ID: ${t.id}] ${t.title} (приоритет: ${t.priority || 'med'}, оценка: ${t.estimatedTime || 'не указана'} ч)`
  ).join('\n');

  const membersInfo = members.map((m, i) => 
    `${i + 1}. ${m.userName} [ID: ${m.userId}] - текущих задач: ${m.currentTasksCount || 0}${m.skills ? `, навыки: ${m.skills.join(', ')}` : ''}${m.availability !== undefined ? `, доступность: ${m.availability}%` : ''}`
  ).join('\n');

  const prompt = `Ты опытный проект-менеджер. Порекомендуй назначение задач участникам команды.

**Задачи:**
${tasksInfo}

**Участники:**
${membersInfo}

**Критерии назначения:**
1. Равномерное распределение нагрузки
2. Учёт текущей загруженности
3. Соответствие навыков (если указаны)
4. Приоритет задач
5. Доступность участников

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста:

{
  "recommendations": [
    {
      "taskId": "id_задачи",
      "taskTitle": "Название задачи",
      "recommendedAssigneeId": "id_участника",
      "recommendedAssigneeName": "Имя участника",
      "reason": "Краткая причина назначения",
      "confidence": 0.85,
      "alternativeAssignees": [
        {
          "userId": "id_участника",
          "userName": "Имя участника",
          "reason": "Причина",
          "confidence": 0.65
        }
      ]
    }
  ]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await aiClient.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      systemPrompt: 'Ты опытный проект-менеджер. Отвечай только в формате JSON.'
    });

    const result = parseAIJsonResponse<{ recommendations: AssignmentRecommendation[] }>(response);
    
    if (!result || !result.recommendations) {
      throw new Error('AI returned invalid recommendations');
    }

    return result.recommendations;
  } catch (error) {
    console.error('Error generating task assignments:', error);
    throw new Error('Failed to generate task assignments');
  }
}

/**
 * Анализ загруженности команды
 * 
 * @param aiClient - Клиент для работы с AI
 * @param tasks - Все задачи проекта
 * @param members - Участники проекта
 * @returns Анализ загруженности
 */
export async function analyzeWorkload(
  aiClient: AIClient,
  tasks: Array<{
    id: string;
    title: string;
    assigneeId?: string;
    status: string;
    estimatedTime?: number;
    dueAt?: string;
    priority?: string;
  }>,
  members: Array<{
    userId: string;
    userName: string;
  }>
): Promise<WorkloadAnalysis> {
  // Рассчитываем базовую статистику
  const memberStats = new Map<string, {
    userName: string;
    activeTasks: number;
    estimatedHours: number;
    upcomingDeadlines: number;
    tasks: typeof tasks;
  }>();

  // Инициализация для всех участников
  members.forEach(m => {
    memberStats.set(m.userId, {
      userName: m.userName,
      activeTasks: 0,
      estimatedHours: 0,
      upcomingDeadlines: 0,
      tasks: []
    });
  });

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Подсчет статистики
  tasks.forEach(task => {
    if (!task.assigneeId || task.status === 'done') return;
    
    const stats = memberStats.get(task.assigneeId);
    if (!stats) return;

    stats.activeTasks++;
    stats.estimatedHours += task.estimatedTime || 8; // По умолчанию 8 часов
    stats.tasks.push(task);

    if (task.dueAt) {
      const dueDate = new Date(task.dueAt);
      if (dueDate <= weekFromNow && dueDate >= now) {
        stats.upcomingDeadlines++;
      }
    }
  });

  // Формируем данные для AI анализа
  const workloadData = Array.from(memberStats.entries()).map(([userId, stats]) => ({
    userId,
    userName: stats.userName,
    activeTasks: stats.activeTasks,
    estimatedHours: stats.estimatedHours,
    upcomingDeadlines: stats.upcomingDeadlines
  }));

  const workloadInfo = workloadData.map((w, i) => 
    `${i + 1}. ${w.userName} [ID: ${w.userId}] - активных задач: ${w.activeTasks}, оценка времени: ${w.estimatedHours}ч, дедлайнов на неделю: ${w.upcomingDeadlines}`
  ).join('\n');

  const prompt = `Ты опытный проект-менеджер. Проанализируй загруженность команды и дай рекомендации.

**Загруженность участников:**
${workloadInfo}

**Критерии анализа:**
1. Оптимальная загрузка: 30-50 часов активных задач на человека
2. Перегрузка: более 60 часов или более 3 дедлайнов на неделю
3. Недозагрузка: менее 20 часов или 0-1 активных задач

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста:

{
  "members": [
    {
      "userId": "id_участника",
      "userName": "Имя участника",
      "activeTasks": 5,
      "estimatedHours": 40,
      "upcomingDeadlines": 2,
      "overloadLevel": "medium",
      "capacity": 80
    }
  ],
  "overloadedMembers": ["id1", "id2"],
  "underutilizedMembers": ["id3"],
  "recommendations": [
    "Рекомендация 1",
    "Рекомендация 2"
  ],
  "redistributionSuggestions": [
    {
      "taskId": "task_id",
      "taskTitle": "Название задачи",
      "fromUserId": "перегруженный_участник",
      "toUserId": "недозагруженный_участник",
      "reason": "Причина перераспределения"
    }
  ]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await aiClient.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      systemPrompt: 'Ты опытный проект-менеджер, специализирующийся на анализе загруженности команды. Отвечай только в формате JSON.'
    });

    let analysis = parseAIJsonResponse<WorkloadAnalysis>(response);
    
    if (!analysis || !analysis.members) {
      throw new Error('AI returned invalid workload analysis');
    }

    // Если AI не предложил перераспределение, используем простую эвристику
    if (!analysis.redistributionSuggestions || analysis.redistributionSuggestions.length === 0) {
      const overloaded = analysis.members.filter(m => m.overloadLevel === 'high' || m.overloadLevel === 'critical');
      const underutilized = analysis.members.filter(m => m.overloadLevel === 'low');

      if (overloaded.length > 0 && underutilized.length > 0) {
        const suggestions: WorkloadAnalysis['redistributionSuggestions'] = [];
        
        overloaded.forEach(overloadedMember => {
          const memberTasks = memberStats.get(overloadedMember.userId)?.tasks || [];
          const lowPriorityTask = memberTasks.find(t => t.priority === 'low' || t.priority === 'med');
          
          if (lowPriorityTask && underutilized[0]) {
            suggestions.push({
              taskId: lowPriorityTask.id,
              taskTitle: lowPriorityTask.title,
              fromUserId: overloadedMember.userId,
              toUserId: underutilized[0].userId,
              reason: `Перераспределение для снижения нагрузки на ${overloadedMember.userName}`
            });
          }
        });

        analysis.redistributionSuggestions = suggestions;
      }
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing workload:', error);
    
    // Возвращаем базовый анализ в случае ошибки
    return {
      members: workloadData.map(w => ({
        userId: w.userId,
        userName: w.userName,
        activeTasks: w.activeTasks,
        estimatedHours: w.estimatedHours,
        upcomingDeadlines: w.upcomingDeadlines,
        overloadLevel: w.estimatedHours > 60 ? 'high' : w.estimatedHours > 40 ? 'medium' : 'low',
        capacity: Math.min(100, Math.round((w.estimatedHours / 50) * 100))
      })),
      overloadedMembers: workloadData.filter(w => w.estimatedHours > 60).map(w => w.userId),
      underutilizedMembers: workloadData.filter(w => w.estimatedHours < 20).map(w => w.userId),
      recommendations: ['Не удалось получить детальные рекомендации от AI'],
      redistributionSuggestions: []
    };
  }
}

/**
 * Генерация типовых подзадач для задачи
 * 
 * @param aiClient - Клиент для работы с AI
 * @param taskTitle - Название задачи
 * @param taskDescription - Описание задачи
 * @returns Список подзадач
 */
export async function generateSubtasks(
  aiClient: AIClient,
  taskTitle: string,
  taskDescription?: string
): Promise<Array<{
  title: string;
  description: string;
  estimatedHours: number;
}>> {
  const prompt = `Ты опытный проект-менеджер. Создай список подзадач для выполнения следующей задачи:

**Задача:** ${taskTitle}
${taskDescription ? `\n**Описание:**\n${taskDescription}` : ''}

**Требования:**
- Разбей задачу на конкретные подзадачи (от 3 до 8 штук)
- Каждая подзадача должна быть атомарной и выполнимой
- Подзадачи должны быть упорядочены логически
- Оцени время выполнения каждой подзадачи в часах

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста:

{
  "subtasks": [
    {
      "title": "Название подзадачи",
      "description": "Описание подзадачи и критерии готовности",
      "estimatedHours": 4
    }
  ]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await aiClient.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 1500,
      systemPrompt: 'Ты опытный проект-менеджер. Отвечай только в формате JSON.'
    });

    const result = parseAIJsonResponse<{ subtasks: Array<{ title: string; description: string; estimatedHours: number }> }>(response);
    
    if (!result || !result.subtasks || result.subtasks.length === 0) {
      throw new Error('AI returned invalid subtasks');
    }

    return result.subtasks;
  } catch (error) {
    console.error('Error generating subtasks:', error);
    throw new Error('Failed to generate subtasks');
  }
}

