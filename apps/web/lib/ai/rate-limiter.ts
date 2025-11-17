/**
 * Rate Limiter для AI запросов
 * 
 * Ограничивает количество запросов к AI API для предотвращения
 * злоупотреблений и контроля затрат
 */

/**
 * Интерфейс записи о запросе
 */
interface RateLimitEntry {
  userId: string;
  timestamp: number;
  endpoint: string;
}

/**
 * Хранилище запросов (в памяти)
 * В продакшене следует использовать Redis или другую БД
 */
const rateLimitStore = new Map<string, RateLimitEntry[]>();

/**
 * Конфигурация лимитов
 */
export const RATE_LIMITS = {
  // Лимит запросов на пользователя в час
  PER_USER_PER_HOUR: parseInt(process.env.AI_RATE_LIMIT_PER_USER_HOUR || '20'),
  
  // Лимит запросов на endpoint в час для пользователя
  PER_ENDPOINT_PER_USER_HOUR: parseInt(process.env.AI_RATE_LIMIT_PER_ENDPOINT_HOUR || '10'),
  
  // Глобальный лимит запросов в час
  GLOBAL_PER_HOUR: parseInt(process.env.AI_RATE_LIMIT_GLOBAL_HOUR || '100'),
  
  // Минимальный интервал между запросами (мс)
  MIN_INTERVAL_MS: parseInt(process.env.AI_RATE_LIMIT_MIN_INTERVAL || '3000'), // 3 секунды
} as const;

/**
 * Проверка лимита запросов для пользователя
 * 
 * @param userId - ID пользователя
 * @param endpoint - Endpoint API (опционально)
 * @returns true если лимит не превышен, false если превышен
 */
export function checkRateLimit(userId: string, endpoint?: string): {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // секунды до следующей возможной попытки
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Получаем записи пользователя
  const userKey = `user:${userId}`;
  let userEntries = rateLimitStore.get(userKey) || [];

  // Удаляем записи старше часа
  userEntries = userEntries.filter(entry => entry.timestamp > oneHourAgo);
  rateLimitStore.set(userKey, userEntries);

  // Проверка глобального лимита
  const allEntries = Array.from(rateLimitStore.values()).flat();
  const recentGlobalEntries = allEntries.filter(entry => entry.timestamp > oneHourAgo);
  
  if (recentGlobalEntries.length >= RATE_LIMITS.GLOBAL_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Global rate limit exceeded',
      retryAfter: 3600 // 1 час
    };
  }

  // Проверка минимального интервала между запросами
  if (userEntries.length > 0) {
    const lastRequest = userEntries[userEntries.length - 1];
    const timeSinceLastRequest = now - lastRequest.timestamp;
    
    if (timeSinceLastRequest < RATE_LIMITS.MIN_INTERVAL_MS) {
      const retryAfter = Math.ceil((RATE_LIMITS.MIN_INTERVAL_MS - timeSinceLastRequest) / 1000);
      return {
        allowed: false,
        reason: 'Too many requests. Please wait before trying again.',
        retryAfter
      };
    }
  }

  // Проверка лимита запросов на пользователя в час
  if (userEntries.length >= RATE_LIMITS.PER_USER_PER_HOUR) {
    // Находим самую старую запись, чтобы определить когда лимит обновится
    const oldestEntry = userEntries[0];
    const retryAfter = Math.ceil((oldestEntry.timestamp + 60 * 60 * 1000 - now) / 1000);
    
    return {
      allowed: false,
      reason: `User rate limit exceeded (${RATE_LIMITS.PER_USER_PER_HOUR} requests per hour)`,
      retryAfter
    };
  }

  // Проверка лимита на конкретный endpoint
  if (endpoint) {
    const endpointEntries = userEntries.filter(entry => entry.endpoint === endpoint);
    
    if (endpointEntries.length >= RATE_LIMITS.PER_ENDPOINT_PER_USER_HOUR) {
      const oldestEndpointEntry = endpointEntries[0];
      const retryAfter = Math.ceil((oldestEndpointEntry.timestamp + 60 * 60 * 1000 - now) / 1000);
      
      return {
        allowed: false,
        reason: `Endpoint rate limit exceeded (${RATE_LIMITS.PER_ENDPOINT_PER_USER_HOUR} requests per hour)`,
        retryAfter
      };
    }
  }

  return { allowed: true };
}

/**
 * Записать запрос в хранилище
 * 
 * @param userId - ID пользователя
 * @param endpoint - Endpoint API
 */
export function recordRequest(userId: string, endpoint: string): void {
  const now = Date.now();
  const userKey = `user:${userId}`;
  
  let userEntries = rateLimitStore.get(userKey) || [];
  
  userEntries.push({
    userId,
    timestamp: now,
    endpoint
  });
  
  rateLimitStore.set(userKey, userEntries);
}

/**
 * Очистка старых записей (должна вызываться периодически)
 */
export function cleanupOldEntries(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [key, entries] of rateLimitStore.entries()) {
    const filteredEntries = entries.filter(entry => entry.timestamp > oneHourAgo);
    
    if (filteredEntries.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filteredEntries);
    }
  }
}

/**
 * Получение статистики использования для пользователя
 */
export function getUserUsageStats(userId: string): {
  requestsLastHour: number;
  requestsToday: number;
  remainingThisHour: number;
  nextResetAt: Date;
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const userKey = `user:${userId}`;
  const userEntries = rateLimitStore.get(userKey) || [];
  
  const requestsLastHour = userEntries.filter(entry => entry.timestamp > oneHourAgo).length;
  const requestsToday = userEntries.filter(entry => entry.timestamp > oneDayAgo).length;
  
  const remaining = Math.max(0, RATE_LIMITS.PER_USER_PER_HOUR - requestsLastHour);
  
  // Определяем время следующего сброса (начало следующего часа)
  const oldestRecentEntry = userEntries.find(entry => entry.timestamp > oneHourAgo);
  const nextResetAt = oldestRecentEntry 
    ? new Date(oldestRecentEntry.timestamp + 60 * 60 * 1000)
    : new Date(now + 60 * 60 * 1000);
  
  return {
    requestsLastHour,
    requestsToday,
    remainingThisHour: remaining,
    nextResetAt
  };
}

// Периодическая очистка старых записей (каждые 10 минут)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldEntries, 10 * 60 * 1000);
}

