/**
 * Cache Manager - управление кэшем с TTL для репозиториев
 * 
 * Реализует cache-aside паттерн:
 * - Чтение: проверка кэша → промах → БД → запись в кэш
 * - Запись: БД → инвалидация кэша
 */

import type { Project, Task, Organization } from '../types';

type CacheEntry<T> = {
  data: T;
  expiresAt: number; // timestamp
};

// TTL значения (в миллисекундах)
export const CACHE_TTL = {
  ORGANIZATIONS: 10 * 60 * 1000, // 10 минут
  PROJECTS: 5 * 60 * 1000, // 5 минут
  TASKS: 2 * 60 * 1000, // 2 минуты
  COMMENTS: 1 * 60 * 1000, // 1 минута
  CHAT_MESSAGES: 1 * 60 * 1000, // 1 минута
} as const;

class CacheManager {
  private projectsCache = new Map<string, CacheEntry<Project[]>>();
  private tasksCache = new Map<string, CacheEntry<Task[]>>();
  private organizationsCache = new Map<string, CacheEntry<Organization[]>>();

  /**
   * Получить данные из кэша проектов
   */
  getProjects(key: string): Project[] | null {
    const entry = this.projectsCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.projectsCache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Сохранить данные проектов в кэш
   */
  setProjects(key: string, data: Project[], ttl: number = CACHE_TTL.PROJECTS): void {
    this.projectsCache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Инвалидировать кэш проектов
   */
  invalidateProjects(workspaceId?: string): void {
    if (workspaceId) {
      this.projectsCache.delete(`projects:workspace:${workspaceId}`);
    }
    // Инвалидируем все ключи, начинающиеся с "projects:"
    const keysToDelete: string[] = [];
    for (const key of this.projectsCache.keys()) {
      if (key.startsWith('projects:')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.projectsCache.delete(key);
    }
  }

  /**
   * Получить данные из кэша задач
   */
  getTasks(key: string): Task[] | null {
    const entry = this.tasksCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.tasksCache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Сохранить данные задач в кэш
   */
  setTasks(key: string, data: Task[], ttl: number = CACHE_TTL.TASKS): void {
    this.tasksCache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Инвалидировать кэш задач
   */
  invalidateTasks(projectId?: string): void {
    if (projectId) {
      this.tasksCache.delete(`tasks:project:${projectId}`);
    }
    // Инвалидируем все ключи, начинающиеся с "tasks:"
    const keysToDelete: string[] = [];
    for (const key of this.tasksCache.keys()) {
      if (key.startsWith('tasks:')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.tasksCache.delete(key);
    }
  }

  /**
   * Получить данные из кэша организаций
   */
  getOrganizations(key: string): Organization[] | null {
    const entry = this.organizationsCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.organizationsCache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Сохранить данные организаций в кэш
   */
  setOrganizations(key: string, data: Organization[], ttl: number = CACHE_TTL.ORGANIZATIONS): void {
    this.organizationsCache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Инвалидировать кэш организаций
   */
  invalidateOrganizations(): void {
    this.organizationsCache.clear();
  }

  /**
   * Очистить все истекшие записи из всех кэшей
   */
  cleanupExpired(): void {
    const now = Date.now();
    
    // Очистка кэша проектов
    for (const [key, entry] of this.projectsCache.entries()) {
      if (entry.expiresAt <= now) {
        this.projectsCache.delete(key);
      }
    }

    // Очистка кэша задач
    for (const [key, entry] of this.tasksCache.entries()) {
      if (entry.expiresAt <= now) {
        this.tasksCache.delete(key);
      }
    }

    // Очистка кэша организаций
    for (const [key, entry] of this.organizationsCache.entries()) {
      if (entry.expiresAt <= now) {
        this.organizationsCache.delete(key);
      }
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats(): {
    projects: number;
    tasks: number;
    organizations: number;
  } {
    return {
      projects: this.projectsCache.size,
      tasks: this.tasksCache.size,
      organizations: this.organizationsCache.size
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Периодическая очистка истекших записей (каждые 5 минут)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanupExpired();
  }, 5 * 60 * 1000);
}

