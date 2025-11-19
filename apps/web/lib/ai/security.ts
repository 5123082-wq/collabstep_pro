/**
 * Security and Validation для AI функциональности
 * 
 * Проверки безопасности и валидация AI ответов
 */

/**
 * Список запрещённых слов и фраз
 * В продакшене следует расширить этот список
 */
const FORBIDDEN_PATTERNS = [
  // Пример запрещённых паттернов
  /api[_\s-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /private[_\s-]?key/i,
  /access[_\s-]?token/i,
  /<script[^>]*>/i,
  /<iframe[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i, // event handlers (onclick, onload, etc.)
];

/**
 * Проверка AI ответа на наличие небезопасного контента
 * 
 * @param response - Ответ от AI
 * @returns true если ответ безопасен, false если содержит запрещённый контент
 */
export function validateAIResponse(response: string): {
  valid: boolean;
  reason?: string;
} {
  if (!response || typeof response !== 'string') {
    return { valid: false, reason: 'Empty or invalid response' };
  }

  // Проверка длины ответа
  if (response.length > 10000) {
    return { valid: false, reason: 'Response too long' };
  }

  if (response.length < 5) {
    return { valid: false, reason: 'Response too short' };
  }

  // Проверка на запрещённые паттерны
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'Response contains forbidden content' };
    }
  }

  return { valid: true };
}

/**
 * Очистка AI ответа от потенциально опасного контента
 * 
 * @param response - Ответ от AI
 * @returns Очищенный ответ
 */
export function sanitizeAIResponse(response: string): string {
  let sanitized = response;

  // Удаляем HTML теги
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Удаляем event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Удаляем javascript: протокол
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Trim и удаление лишних пробелов
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Проверка входных данных для AI запроса
 * 
 * @param input - Входные данные
 * @returns true если входные данные валидны
 */
export function validateAIInput(input: string): {
  valid: boolean;
  reason?: string;
} {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Empty or invalid input' };
  }

  // Проверка длины
  if (input.length > 5000) {
    return { valid: false, reason: 'Input too long (max 5000 characters)' };
  }

  if (input.trim().length < 3) {
    return { valid: false, reason: 'Input too short (min 3 characters)' };
  }

  // Проверка на спам (повторяющиеся символы)
  const repeatingPattern = /(.)\1{50,}/;
  if (repeatingPattern.test(input)) {
    return { valid: false, reason: 'Input contains suspicious patterns' };
  }

  return { valid: true };
}

/**
 * Проверка прав доступа пользователя к AI функциональности
 * 
 * @param userId - ID пользователя
 * @param projectId - ID проекта (опционально)
 * @returns true если доступ разрешён
 */
export function checkAIAccess(userId: string, projectId?: string): boolean {
  // Базовая проверка - пользователь должен быть авторизован
  if (!userId) {
    return false;
  }

  // Если указан проект, проверяем доступ к проекту
  // Эта проверка должна быть выполнена через projectsRepository
  // в вызывающем коде, здесь только базовая валидация

  // В будущем можно добавить проверку подписки, квот и т.д.
  
  return true;
}

/**
 * Логирование AI запросов для аудита
 */
export interface AIAuditLog {
  timestamp: Date;
  userId: string;
  endpoint: string;
  input: string;
  output: string;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

/**
 * Логирование AI запроса
 * В продакшене следует сохранять в БД
 */
export function logAIRequest(log: AIAuditLog): void {
  // В консоль для разработки
  if (process.env.NODE_ENV === 'development') {
    console.log('[AI Audit]', {
      timestamp: log.timestamp.toISOString(),
      userId: log.userId,
      endpoint: log.endpoint,
      inputLength: log.input.length,
      outputLength: log.output.length,
      success: log.success,
      error: log.error
    });
  }

  // В продакшене здесь должна быть запись в БД или внешний сервис аудита
}

/**
 * Проверка стоимости запроса (приблизительная)
 * 
 * @param input - Входной текст
 * @param model - Модель OpenAI
 * @returns Приблизительная стоимость в долларах
 */
export function estimateRequestCost(
  input: string,
  model = 'gpt-3.5-turbo'
): number {
  // Приблизительная оценка токенов (1 токен ≈ 4 символа)
  const inputTokens = Math.ceil(input.length / 4);
  const estimatedOutputTokens = 500; // Средний размер ответа
  const totalTokens = inputTokens + estimatedOutputTokens;

  // Цены OpenAI (приблизительные, актуальны на момент написания)
  const pricesPer1kTokens: Record<string, number> = {
    'gpt-3.5-turbo': 0.002,
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01
  };

  const pricePerToken = (pricesPer1kTokens[model] || 0.002) / 1000;
  return totalTokens * pricePerToken;
}

/**
 * Проверка лимита стоимости для пользователя
 * 
 * @param userId - ID пользователя
 * @param estimatedCost - Ожидаемая стоимость запроса
 * @returns true если лимит не превышен
 */
export function checkCostLimit(userId: string, estimatedCost: number): boolean {
  // Максимальная стоимость одного запроса
  const MAX_REQUEST_COST = parseFloat(process.env.AI_MAX_REQUEST_COST || '0.5');
  
  if (estimatedCost > MAX_REQUEST_COST) {
    return false;
  }

  // В продакшене здесь должна быть проверка общих затрат пользователя
  // за период (день/месяц) из БД

  return true;
}

/**
 * Обёртка для безопасного выполнения AI запроса
 */
export async function safeAIRequest<T>(
  userId: string,
  endpoint: string,
  input: string,
  requestFn: () => Promise<T>
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Валидация входных данных
    const inputValidation = validateAIInput(input);
    if (!inputValidation.valid) {
      return {
        success: false,
        ...(inputValidation.reason ? { error: inputValidation.reason } : {})
      };
    }

    // Проверка доступа
    if (!checkAIAccess(userId)) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    // Оценка стоимости
    const estimatedCost = estimateRequestCost(input);
    if (!checkCostLimit(userId, estimatedCost)) {
      return {
        success: false,
        error: 'Request cost limit exceeded'
      };
    }

    // Выполнение запроса
    const result = await requestFn();

    // Логирование
    logAIRequest({
      timestamp: new Date(),
      userId,
      endpoint,
      input: input.substring(0, 100), // Только первые 100 символов
      output: typeof result === 'string' ? result.substring(0, 100) : 'N/A',
      success: true,
      cost: estimatedCost
    });

    return {
      success: true,
      data: result
    };

  } catch (error) {
    // Логирование ошибки
    logAIRequest({
      timestamp: new Date(),
      userId,
      endpoint,
      input: input.substring(0, 100),
      output: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

