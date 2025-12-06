/**
 * AI Assistant Embeddings Module
 * Работа с OpenAI API для embeddings и генерации ответов
 * Использует ОТДЕЛЬНЫЙ ключ AI_ASSISTANT_API_KEY
 */

import OpenAI from 'openai';

let assistantOpenAI: OpenAI | null = null;

/**
 * Получить OpenAI клиент для ассистента
 * Использует отдельный ключ AI_ASSISTANT_API_KEY
 */
function getAssistantOpenAIClient(): OpenAI {
  if (!assistantOpenAI) {
    const apiKey = process.env.AI_ASSISTANT_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AI_ASSISTANT_API_KEY is not set. Please add it to your .env.local file.\n' +
        'Это отдельный ключ от OPENAI_API_KEY, который используется для других AI функций.'
      );
    }
    assistantOpenAI = new OpenAI({ apiKey });
  }
  return assistantOpenAI;
}

/**
 * Создать embedding для текста
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const client = getAssistantOpenAIClient();
  const model = process.env.AI_ASSISTANT_MODEL_EMBED || 'text-embedding-3-small';
  
  const response = await client.embeddings.create({
    model,
    input: text.trim(),
  });
  
  return response.data[0]?.embedding ?? [];
}

/**
 * Генерировать ответ через чат
 */
export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  contextChunks: Array<{ text: string; source: string }>
): Promise<string> {
  const client = getAssistantOpenAIClient();
  const model = process.env.AI_ASSISTANT_MODEL_CHAT || 'gpt-4o-mini';
  
  // Формируем контекст из найденных чанков
  const contextText = contextChunks
    .map((chunk, idx) => `[Источник ${idx + 1}: ${chunk.source}]\n${chunk.text}`)
    .join('\n\n---\n\n');
  
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `Контекст из документации:\n\n${contextText}\n\n---\n\nВопрос пользователя: ${userMessage}\n\nОтветь кратко (2-4 предложения) на основе предоставленной документации. Если ответа нет в документации, честно скажи об этом.`,
    },
  ];
  
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 300, // Ограничение для краткости
  });
  
  return response.choices[0]?.message?.content || 'Извините, не удалось сформировать ответ.';
}

/**
 * Проверить доступность AI Assistant API
 */
export async function checkAssistantAvailability(): Promise<boolean> {
  try {
    const apiKey = process.env.AI_ASSISTANT_API_KEY;
    if (!apiKey) {
      return false;
    }
    
    // Проверяем, что клиент создаётся успешно
    getAssistantOpenAIClient();
    return true;
  } catch {
    return false;
  }
}

/**
 * Получить информацию о конфигурации ассистента
 */
export function getAssistantConfig(): {
  modelChat: string;
  modelEmbed: string;
  available: boolean;
} {
  return {
    modelChat: process.env.AI_ASSISTANT_MODEL_CHAT || 'gpt-4o-mini',
    modelEmbed: process.env.AI_ASSISTANT_MODEL_EMBED || 'text-embedding-3-small',
    available: !!process.env.AI_ASSISTANT_API_KEY,
  };
}

