import OpenAI from 'openai';

/**
 * OpenAI client instance
 * Используется для всех запросов к OpenAI API
 */
let openaiClient: OpenAI | null = null;

/**
 * Инициализация OpenAI клиента
 * Создаёт клиент один раз и переиспользует его
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please add it to your .env.local file.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Опции для генерации текста
 */
export interface GenerateTextOptions {
  /** Максимальное количество токенов в ответе (default: 1000) */
  maxTokens?: number;
  /** Temperature для контроля случайности (0-2, default: 0.7) */
  temperature?: number;
  /** Модель OpenAI для использования (default: gpt-3.5-turbo) */
  model?: string;
  /** System prompt для задания контекста */
  systemPrompt?: string;
}

/**
 * Генерация текста через OpenAI API
 * 
 * @param prompt - Промпт для генерации
 * @param options - Опции генерации
 * @returns Сгенерированный текст
 * 
 * @example
 * ```typescript
 * const description = await generateText(
 *   'Опиши задачу: Создать API endpoint',
 *   { temperature: 0.5 }
 * );
 * ```
 */
export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const {
    maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    systemPrompt
  } = options;

  try {
    const client = getOpenAIClient();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content ?? '';
    
    if (!content) {
      throw new Error('AI returned empty response');
    }

    return content.trim();
  } catch (error) {
    console.error('AI API error:', error);
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    
    throw new Error('Failed to generate text with AI');
  }
}

/**
 * Генерация текста с повторными попытками при ошибках
 * 
 * @param prompt - Промпт для генерации
 * @param options - Опции генерации
 * @param maxRetries - Максимальное количество повторных попыток (default: 3)
 * @returns Сгенерированный текст
 */
export async function generateTextWithRetry(
  prompt: string,
  options: GenerateTextOptions = {},
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateText(prompt, options);
    } catch (error) {
      lastError = error as Error;
      
      // Не повторяем попытки для ошибок аутентификации
      if (error instanceof Error && error.message.includes('Invalid OpenAI API key')) {
        throw error;
      }
      
      // Ждём перед следующей попыткой (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to generate text after retries');
}

/**
 * Проверка доступности AI сервиса
 * 
 * @returns true если API доступен, false если нет
 */
export async function checkAIAvailability(): Promise<boolean> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return false;
    }
    
    await generateText('Test', { maxTokens: 10 });
    return true;
  } catch (error) {
    console.error('AI availability check failed:', error);
    return false;
  }
}

/**
 * Получение информации о модели
 */
export function getModelInfo(): {
  model: string;
  maxTokens: number;
  temperature: number;
  available: boolean;
} {
  return {
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    available: !!process.env.OPENAI_API_KEY
  };
}

