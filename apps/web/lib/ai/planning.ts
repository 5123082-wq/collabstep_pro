/**
 * AI Planning Library
 * 
 * Расширенные функции для планирования проектов через AI
 * - Планирование из цели проекта
 * - Генерация вех (milestones)
 * - Оценка сроков и команды
 */

import { generateText } from './client';

/**
 * Веха проекта (milestone)
 */
export interface ProjectMilestone {
  name: string;
  description: string;
  dueDate?: string; // Относительно начала проекта (e.g., "+30 days")
  deliverables: string[]; // Что должно быть готово
  criticalPath: boolean; // Находится ли на критическом пути
}

/**
 * Расширенный план проекта
 */
export interface ProjectPlan {
  goal: string;
  phases: Array<{
    name: string;
    description: string;
    duration: number; // В днях
    milestones: ProjectMilestone[];
    tasks: Array<{
      title: string;
      description: string;
      estimatedDays: number;
      priority: 'low' | 'med' | 'high' | 'urgent';
      skills?: string[]; // Требуемые навыки
    }>;
  }>;
  estimatedTotalDays: number;
  suggestedTeam: Array<{
    role: string;
    count: number;
    skills: string[];
    responsibilities: string[];
  }>;
  risks: string[];
  successCriteria: string[];
  recommendations: string[];
}

/**
 * Генерация полного плана проекта из цели
 * 
 * @param goal - Цель проекта
 * @param context - Дополнительный контекст
 * @returns Полный план проекта
 */
export async function generateProjectPlanFromGoal(
  goal: string,
  context?: {
    budget?: string;
    deadline?: string;
    constraints?: string[];
    existingTeam?: Array<{ role: string; count: number }>;
    industry?: string;
  }
): Promise<ProjectPlan> {
  const { budget, deadline, constraints, existingTeam, industry } = context || {};

  const prompt = `Ты опытный проект-менеджер и бизнес-аналитик. Создай детальный план проекта на основе следующей цели:

**Цель проекта:**
${goal}

${industry ? `**Отрасль:** ${industry}` : ''}
${budget ? `**Бюджет:** ${budget}` : ''}
${deadline ? `**Дедлайн:** ${deadline}` : ''}
${constraints && constraints.length > 0 ? `**Ограничения:** ${constraints.join(', ')}` : ''}
${existingTeam && existingTeam.length > 0 ? `**Существующая команда:** ${existingTeam.map(t => `${t.count}x ${t.role}`).join(', ')}` : ''}

**Требования к плану:**
1. Разбей проект на логические этапы (phases)
2. Определи ключевые вехи (milestones) для каждого этапа
3. Укажи конкретные задачи для каждого этапа
4. Предложи состав команды с ролями и обязанностями
5. Оцени общую длительность проекта
6. Определи потенциальные риски
7. Сформулируй критерии успеха проекта
8. Дай рекомендации по успешной реализации

**Формат ответа:**
Верни ТОЛЬКО валидный JSON без дополнительного текста в следующем формате:

{
  "goal": "Цель проекта",
  "phases": [
    {
      "name": "Название этапа",
      "description": "Описание этапа",
      "duration": 30,
      "milestones": [
        {
          "name": "Название вехи",
          "description": "Описание вехи",
          "dueDate": "+15 days",
          "deliverables": ["Что должно быть готово"],
          "criticalPath": true
        }
      ],
      "tasks": [
        {
          "title": "Название задачи",
          "description": "Описание задачи",
          "estimatedDays": 5,
          "priority": "high",
          "skills": ["React", "TypeScript"]
        }
      ]
    }
  ],
  "estimatedTotalDays": 90,
  "suggestedTeam": [
    {
      "role": "Frontend Developer",
      "count": 2,
      "skills": ["React", "TypeScript", "CSS"],
      "responsibilities": ["Разработка UI", "Интеграция с API"]
    }
  ],
  "risks": ["Риск 1", "Риск 2"],
  "successCriteria": ["Критерий 1", "Критерий 2"],
  "recommendations": ["Рекомендация 1", "Рекомендация 2"]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.3,
      maxTokens: 4000,
      systemPrompt: 'Ты опытный проект-менеджер и бизнес-аналитик. Отвечай только в формате JSON.'
    });

    // Удаляем markdown code blocks если они есть
    const cleaned = response
      .replace(/^```json\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();

    const plan = JSON.parse(cleaned) as ProjectPlan;

    // Валидация структуры
    if (!plan.goal || !plan.phases || plan.phases.length === 0) {
      throw new Error('Invalid plan structure');
    }

    for (const phase of plan.phases) {
      if (!phase.name || !phase.tasks || phase.tasks.length === 0) {
        throw new Error('Invalid phase structure');
      }
    }

    return plan;
  } catch (error) {
    console.error('Error generating project plan from goal:', error);
    throw new Error('Failed to generate project plan from goal');
  }
}

/**
 * Оценка длительности проекта на основе задач
 * 
 * @param tasks - Список задач
 * @param teamSize - Размер команды
 * @param parallelization - Коэффициент параллелизации (0-1)
 * @returns Оценка длительности в днях
 */
export function estimateProjectDuration(
  tasks: Array<{ estimatedDays: number; priority: string }>,
  teamSize: number = 1,
  parallelization: number = 0.7
): number {
  // Сумма всех задач
  const totalDays = tasks.reduce((sum, task) => sum + task.estimatedDays, 0);

  // Учет параллелизации и размера команды
  const effectiveTeamSize = teamSize * parallelization;
  const duration = Math.ceil(totalDays / effectiveTeamSize);

  // Добавляем буфер для непредвиденных задержек (20%)
  return Math.ceil(duration * 1.2);
}

/**
 * Генерация критического пути проекта
 * 
 * @param goal - Цель проекта
 * @param tasks - Список задач с зависимостями
 * @returns Критический путь
 */
export async function generateCriticalPath(
  goal: string,
  tasks: Array<{
    id: string;
    title: string;
    estimatedDays: number;
    dependencies?: string[]; // IDs задач
  }>
): Promise<{
  criticalTasks: string[]; // IDs задач на критическом пути
  totalDuration: number;
  bottlenecks: Array<{
    taskId: string;
    reason: string;
  }>;
}> {
  const tasksInfo = tasks
    .map(
      (t, i) =>
        `${i + 1}. [ID: ${t.id}] ${t.title} (${t.estimatedDays} дней)${
          t.dependencies && t.dependencies.length > 0
            ? ` - зависит от: ${t.dependencies.join(', ')}`
            : ''
        }`
    )
    .join('\n');

  const prompt = `Ты эксперт по управлению проектами. Определи критический путь проекта.

**Цель проекта:**
${goal}

**Задачи:**
${tasksInfo}

**Требования:**
1. Определи критический путь (самую длинную цепочку зависимых задач)
2. Укажи узкие места (bottlenecks)
3. Рассчитай общую длительность по критическому пути

**Формат ответа:**
Верни ТОЛЬКО валидный JSON:

{
  "criticalTasks": ["task_id_1", "task_id_2"],
  "totalDuration": 45,
  "bottlenecks": [
    {
      "taskId": "task_id",
      "reason": "Причина узкого места"
    }
  ]
}

Ответ должен быть на русском языке.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: 'Ты эксперт по управлению проектами. Отвечай только в формате JSON.'
    });

    const cleaned = response
      .replace(/^```json\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Error generating critical path:', error);
    throw new Error('Failed to generate critical path');
  }
}

/**
 * Предложение оптимизаций для ускорения проекта
 * 
 * @param currentPlan - Текущий план проекта
 * @param targetDuration - Желаемая длительность
 * @returns Рекомендации по оптимизации
 */
export async function suggestOptimizations(
  currentPlan: ProjectPlan,
  targetDuration: number
): Promise<{
  feasible: boolean;
  recommendations: string[];
  tradeoffs: string[];
  adjustedPlan?: Partial<ProjectPlan>;
}> {
  const prompt = `Ты эксперт по оптимизации проектов. Предложи способы сократить длительность проекта.

**Текущая длительность:** ${currentPlan.estimatedTotalDays} дней
**Целевая длительность:** ${targetDuration} дней
**Разница:** ${currentPlan.estimatedTotalDays - targetDuration} дней

**Текущая команда:**
${currentPlan.suggestedTeam.map((t) => `${t.count}x ${t.role}`).join(', ')}

**Требования:**
1. Оцени, возможно ли достичь целевой длительности
2. Предложи конкретные способы ускорения
3. Укажи возможные компромиссы (качество, бюджет, риски)
4. Предложи изменения в плане, если необходимо

**Формат ответа:**
Верни ТОЛЬКО валидный JSON:

{
  "feasible": true,
  "recommendations": [
    "Увеличить команду разработчиков до 4 человек",
    "Распараллелить задачи этапа 2 и 3"
  ],
  "tradeoffs": [
    "Увеличение бюджета на 30%",
    "Повышенный риск проблем с интеграцией"
  ],
  "adjustedPlan": {
    "estimatedTotalDays": 60,
    "suggestedTeam": [
      {
        "role": "Frontend Developer",
        "count": 4,
        "skills": ["React"],
        "responsibilities": ["UI Development"]
      }
    ]
  }
}

Ответ должен быть на русском языке.`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      systemPrompt: 'Ты эксперт по оптимизации проектов. Отвечай только в формате JSON.'
    });

    const cleaned = response
      .replace(/^```json\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Error suggesting optimizations:', error);
    throw new Error('Failed to suggest optimizations');
  }
}

