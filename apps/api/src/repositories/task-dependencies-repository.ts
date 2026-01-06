import { memory } from '../data/memory';
import type { TaskDependency } from '../types';
import { tasksRepository } from './tasks-repository';

function cloneDependency(dep: TaskDependency): TaskDependency {
  return { ...dep };
}

export class TaskDependenciesRepository {
  /**
   * List all dependencies, optionally filtered by project
   */
  async list(options: { projectId?: string } = {}): Promise<TaskDependency[]> {
    let items = memory.TASK_DEPENDENCIES;

    if (options.projectId) {
      // Get all tasks for the project to filter dependencies
      const projectTasks = await tasksRepository.list({ projectId: options.projectId });
      const taskIds = new Set(projectTasks.map((task) => task.id));
      
      items = items.filter(
        (dep) => taskIds.has(dep.dependentTaskId) && taskIds.has(dep.blockerTaskId)
      );
    }

    return items.map(cloneDependency);
  }

  /**
   * List all dependencies for a task (as blocker or dependent)
   */
  listByTask(taskId: string): TaskDependency[] {
    return memory.TASK_DEPENDENCIES.filter(
      (dep) => dep.dependentTaskId === taskId || dep.blockerTaskId === taskId
    ).map(cloneDependency);
  }

  /**
   * List all blockers for a task (tasks that block this task)
   */
  listBlockers(taskId: string): TaskDependency[] {
    return memory.TASK_DEPENDENCIES.filter((dep) => dep.dependentTaskId === taskId).map(cloneDependency);
  }

  /**
   * List all tasks blocked by this task
   */
  listBlocked(taskId: string): TaskDependency[] {
    return memory.TASK_DEPENDENCIES.filter((dep) => dep.blockerTaskId === taskId).map(cloneDependency);
  }

  /**
   * Create a dependency between two tasks
   */
  create(input: {
    dependentTaskId: string; // Task that is blocked
    blockerTaskId: string; // Task that blocks
    type?: 'blocks' | 'relates_to';
  }): TaskDependency {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Check if dependency already exists
    const exists = memory.TASK_DEPENDENCIES.some(
      (dep) =>
        dep.dependentTaskId === input.dependentTaskId && dep.blockerTaskId === input.blockerTaskId
    );

    if (exists) {
      throw new Error('Dependency already exists');
    }

    // Prevent circular dependencies
    const wouldCreateCycle = this.wouldCreateCycle(input.dependentTaskId, input.blockerTaskId);
    if (wouldCreateCycle) {
      throw new Error('Creating this dependency would create a circular dependency');
    }

    const dependency: TaskDependency = {
      id,
      dependentTaskId: input.dependentTaskId,
      blockerTaskId: input.blockerTaskId,
      type: input.type ?? 'blocks',
      createdAt: now
    };

    memory.TASK_DEPENDENCIES.push(dependency);
    return cloneDependency(dependency);
  }

  /**
   * Check if creating a dependency would create a cycle
   */
  private wouldCreateCycle(dependentTaskId: string, blockerTaskId: string): boolean {
    // If blockerTaskId is already blocked by dependentTaskId (directly or indirectly), we have a cycle
    const blockers = this.getAllBlockers(blockerTaskId);
    return blockers.has(dependentTaskId);
  }

  /**
   * Get all blockers (direct and indirect) for a task
   */
  private getAllBlockers(taskId: string, visited = new Set<string>()): Set<string> {
    if (visited.has(taskId)) {
      return visited;
    }
    visited.add(taskId);

    const directBlockers = memory.TASK_DEPENDENCIES
      .filter((dep) => dep.dependentTaskId === taskId)
      .map((dep) => dep.blockerTaskId);

    for (const blockerId of directBlockers) {
      this.getAllBlockers(blockerId, visited);
    }

    return visited;
  }

  /**
   * Delete a dependency
   */
  delete(id: string): boolean {
    const idx = memory.TASK_DEPENDENCIES.findIndex((dep) => dep.id === id);
    if (idx === -1) {
      return false;
    }
    memory.TASK_DEPENDENCIES.splice(idx, 1);
    return true;
  }

  /**
   * Delete dependency by task IDs
   */
  deleteByTasks(dependentTaskId: string, blockerTaskId: string): boolean {
    const idx = memory.TASK_DEPENDENCIES.findIndex(
      (dep) => dep.dependentTaskId === dependentTaskId && dep.blockerTaskId === blockerTaskId
    );
    if (idx === -1) {
      return false;
    }
    memory.TASK_DEPENDENCIES.splice(idx, 1);
    return true;
  }
}

export const taskDependenciesRepository = new TaskDependenciesRepository();

