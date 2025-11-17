import type { TaskDependency } from '@collabverse/api';

/**
 * Проверка наличия циклических зависимостей в графе задач
 * @param taskId - ID задачи, которая будет зависеть
 * @param blockerTaskId - ID задачи, которая будет блокировать
 * @param dependencies - Массив всех зависимостей
 * @returns true, если создание зависимости создаст цикл
 */
export function hasCycle(
  taskId: string,
  blockerTaskId: string,
  dependencies: TaskDependency[]
): boolean {
  // Если blockerTaskId уже блокируется taskId (прямо или косвенно), то будет цикл
  const blockers = getAllBlockers(blockerTaskId, dependencies);
  return blockers.has(taskId);
}

/**
 * Получить все задачи, которые блокируют данную задачу (прямо или косвенно)
 * @param taskId - ID задачи
 * @param dependencies - Массив всех зависимостей
 * @param visited - Множество уже посещённых задач (для предотвращения бесконечных циклов)
 * @returns Множество ID всех блокирующих задач
 */
function getAllBlockers(
  taskId: string,
  dependencies: TaskDependency[],
  visited = new Set<string>()
): Set<string> {
  if (visited.has(taskId)) {
    return visited;
  }
  visited.add(taskId);

  // Найти все прямые блокирующие задачи
  const directBlockers = dependencies
    .filter((dep) => dep.dependentTaskId === taskId)
    .map((dep) => dep.blockerTaskId);

  // Рекурсивно найти все косвенные блокирующие задачи
  for (const blockerId of directBlockers) {
    getAllBlockers(blockerId, dependencies, visited);
  }

  return visited;
}

/**
 * Найти все задачи в цикле (если он существует)
 * @param dependencies - Массив всех зависимостей
 * @returns Массив ID задач, образующих цикл, или null если циклов нет
 */
export function findCycle(dependencies: TaskDependency[]): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Построить граф зависимостей
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!graph.has(dep.dependentTaskId)) {
      graph.set(dep.dependentTaskId, []);
    }
    graph.get(dep.dependentTaskId)!.push(dep.blockerTaskId);
  }

  // DFS для поиска циклов
  function dfs(taskId: string, path: string[]): string[] | null {
    if (recursionStack.has(taskId)) {
      // Найден цикл
      const cycleStart = path.indexOf(taskId);
      return path.slice(cycleStart).concat(taskId);
    }

    if (visited.has(taskId)) {
      return null;
    }

    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    const blockers = graph.get(taskId) || [];
    for (const blockerId of blockers) {
      const cycle = dfs(blockerId, path);
      if (cycle) {
        return cycle;
      }
    }

    recursionStack.delete(taskId);
    path.pop();
    return null;
  }

  // Проверить все задачи
  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      const cycle = dfs(taskId, []);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

