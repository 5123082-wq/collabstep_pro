import type { Task, TaskDependency } from '@collabverse/api';

export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
  duration?: number;
  progress?: number;
  parent?: string;
  type?: string;
  open?: boolean;
  color?: string;
  isCritical?: boolean;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: number; // 0 - finish to start, 1 - start to start, 2 - finish to finish, 3 - start to finish
}

/**
 * Вычисление критического пути проекта
 * Критический путь - это самый длинный путь от начала до конца проекта
 * @param tasks - Массив задач проекта
 * @param dependencies - Массив зависимостей между задачами
 * @returns Массив ID задач, составляющих критический путь
 */
export function calculateCriticalPath(
  tasks: Task[],
  dependencies: TaskDependency[]
): string[] {
  if (tasks.length === 0) {
    return [];
  }

  // Построить граф зависимостей
  const graph = new Map<string, string[]>();
  const reverseGraph = new Map<string, string[]>();
  const taskMap = new Map<string, Task>();

  for (const task of tasks) {
    taskMap.set(task.id, task);
    graph.set(task.id, []);
    reverseGraph.set(task.id, []);
  }

  for (const dep of dependencies) {
    if (dep.type === 'blocks') {
      // blockerTaskId блокирует dependentTaskId
      // Значит dependentTaskId зависит от blockerTaskId
      graph.get(dep.blockerTaskId)!.push(dep.dependentTaskId);
      reverseGraph.get(dep.dependentTaskId)!.push(dep.blockerTaskId);
    }
  }

  // Вычислить ранние сроки начала (Earliest Start Time)
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();

  // Топологическая сортировка для вычисления ранних сроков
  const inDegree = new Map<string, number>();
  for (const taskId of taskMap.keys()) {
    inDegree.set(taskId, reverseGraph.get(taskId)!.length);
  }

  const queue: string[] = [];
  for (const [taskId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const taskId = queue.shift()!;
    const task = taskMap.get(taskId)!;

    // Вычислить длительность задачи в днях
    const duration = calculateTaskDuration(task);

    // Ранний срок начала = максимум из ранних сроков окончания всех предшественников
    let maxPredecessorFinish = 0;
    for (const predecessorId of reverseGraph.get(taskId)!) {
      const predFinish = earliestFinish.get(predecessorId) || 0;
      maxPredecessorFinish = Math.max(maxPredecessorFinish, predFinish);
    }

    earliestStart.set(taskId, maxPredecessorFinish);
    earliestFinish.set(taskId, maxPredecessorFinish + duration);

    // Обновить степени входящих рёбер для зависимых задач
    for (const dependentId of graph.get(taskId)!) {
      const currentDegree = inDegree.get(dependentId)!;
      inDegree.set(dependentId, currentDegree - 1);
      if (inDegree.get(dependentId) === 0) {
        queue.push(dependentId);
      }
    }
  }

  // Найти максимальный ранний срок окончания (длина проекта)
  let maxFinish = 0;
  for (const finish of earliestFinish.values()) {
    maxFinish = Math.max(maxFinish, finish);
  }

  // Вычислить поздние сроки (Latest Start Time и Latest Finish Time)
  const latestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();

  // Инициализировать поздние сроки для задач без зависимых
  for (const taskId of taskMap.keys()) {
    if (graph.get(taskId)!.length === 0) {
      latestFinish.set(taskId, maxFinish);
    }
  }

  // Обратная топологическая сортировка для вычисления поздних сроков
  const outDegree = new Map<string, number>();
  for (const taskId of taskMap.keys()) {
    outDegree.set(taskId, graph.get(taskId)!.length);
  }

  const reverseQueue: string[] = [];
  for (const [taskId, degree] of outDegree.entries()) {
    if (degree === 0) {
      reverseQueue.push(taskId);
    }
  }

  while (reverseQueue.length > 0) {
    const taskId = reverseQueue.shift()!;
    const task = taskMap.get(taskId)!;
    const duration = calculateTaskDuration(task);

    // Поздний срок окончания = минимум из поздних сроков начала всех зависимых задач
    let minSuccessorStart = maxFinish;
    for (const successorId of graph.get(taskId)!) {
      const succStart = latestStart.get(successorId);
      if (succStart !== undefined) {
        minSuccessorStart = Math.min(minSuccessorStart, succStart);
      }
    }
    if (minSuccessorStart === maxFinish && graph.get(taskId)!.length > 0) {
      // Если есть зависимые задачи, но их поздние сроки ещё не вычислены
      continue;
    }

    latestFinish.set(taskId, minSuccessorStart);
    latestStart.set(taskId, minSuccessorStart - duration);

    // Обновить степени исходящих рёбер для предшественников
    for (const predecessorId of reverseGraph.get(taskId)!) {
      const currentDegree = outDegree.get(predecessorId)!;
      outDegree.set(predecessorId, currentDegree - 1);
      if (outDegree.get(predecessorId) === 0) {
        reverseQueue.push(predecessorId);
      }
    }
  }

  // Критический путь состоит из задач, где ранний срок = поздний срок
  const criticalPath: string[] = [];
  for (const taskId of taskMap.keys()) {
    const es = earliestStart.get(taskId) || 0;
    const ls = latestStart.get(taskId) || 0;
    const ef = earliestFinish.get(taskId) || 0;
    const lf = latestFinish.get(taskId) || 0;

    if (es === ls && ef === lf) {
      criticalPath.push(taskId);
    }
  }

  // Сортировать по раннему сроку начала
  criticalPath.sort((a, b) => {
    const esA = earliestStart.get(a) || 0;
    const esB = earliestStart.get(b) || 0;
    return esA - esB;
  });

  return criticalPath;
}

/**
 * Вычислить длительность задачи в днях
 */
function calculateTaskDuration(task: Task): number {
  if (task.startAt && task.dueAt) {
    const start = new Date(task.startAt);
    const end = new Date(task.dueAt);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // Минимум 1 день
  }
  // Если нет дат, используем оценку времени или дефолтное значение
  if (task.estimatedTime) {
    // Предполагаем 8 часов в день
    return Math.max(1, Math.ceil(task.estimatedTime / 8));
  }
  return 1; // Дефолтная длительность 1 день
}

/**
 * Преобразовать задачи в формат для библиотеки Ганта
 * @param tasks - Массив задач проекта
 * @param dependencies - Массив зависимостей между задачами
 * @param criticalPath - Массив ID задач критического пути (опционально)
 * @returns Массив задач в формате Ганта
 */
export function transformTasksForGantt(
  tasks: Task[],
  _dependencies: TaskDependency[],
  criticalPath?: string[]
): GanttTask[] {
  const criticalPathSet = new Set(criticalPath || []);
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  return tasks.map((task) => {
    const startDate = task.startAt ? new Date(task.startAt) : new Date();
    const endDate = task.dueAt ? new Date(task.dueAt) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    
    // Вычислить прогресс на основе статуса
    let progress = 0;
    if (task.status === 'done') {
      progress = 1;
    } else if (task.status === 'in_progress') {
      progress = 0.5;
    } else if (task.status === 'review') {
      progress = 0.75;
    }

    const isCritical = criticalPathSet.has(task.id);

    return {
      id: task.id,
      text: task.title,
      start_date: formatDateForGantt(startDate),
      end_date: formatDateForGantt(endDate),
      duration: calculateTaskDuration(task),
      progress,
      ...(task.parentId ? { parent: task.parentId } : {}),
      type: task.parentId ? 'project' : 'task',
      open: true,
      ...(isCritical ? { color: '#ff6b6b' } : {}),
      isCritical,
    };
  });
}

/**
 * Преобразовать зависимости в формат для библиотеки Ганта
 * @param dependencies - Массив зависимостей
 * @returns Массив связей в формате Ганта
 */
export function transformDependenciesForGantt(
  dependencies: TaskDependency[]
): GanttLink[] {
  return dependencies
    .filter((dep) => dep.type === 'blocks')
    .map((dep) => ({
      id: dep.id,
      source: dep.blockerTaskId, // Задача, которая блокирует
      target: dep.dependentTaskId, // Задача, которая блокируется
      type: 0, // Finish to Start (FS) - стандартный тип зависимости
    }));
}

/**
 * Форматировать дату для библиотеки Ганта (формат: YYYY-MM-DD)
 */
function formatDateForGantt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

