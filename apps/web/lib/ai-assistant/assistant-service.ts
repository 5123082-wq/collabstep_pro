/**
 * AI Assistant Service
 * Основная логика ассистента: поиск по документации и генерация ответов
 */

import { findRelevantChunks, keywordSearch } from './rag-search';
import { generateChatResponse, checkAssistantAvailability } from './embeddings';
import { getStoreStats, storeExists } from './vector-store';
import type { AssistantQuestion, AssistantResponse, StoreStats } from './types';

const SYSTEM_PROMPT = `Ты - полезный AI-ассистент платформы Collabverse. 
Твоя задача - помогать пользователям понимать, как использовать платформу.

Правила:
- Отвечай кратко (2-4 предложения)
- Используй только информацию из предоставленной документации
- Если ответа нет в документации, честно скажи об этом
- Пиши дружелюбно и по-русски
- Предлагай конкретные действия, когда это возможно
- Если вопрос не относится к платформе, вежливо объясни, что можешь помочь только с вопросами о Collabverse`;

/**
 * Ответить на вопрос пользователя
 */
export async function answerQuestion(
  question: AssistantQuestion
): Promise<AssistantResponse> {
  // Проверяем доступность
  if (!storeExists()) {
    return {
      answer: 'База знаний ещё не проиндексирована. Пожалуйста, обратитесь к администратору для запуска индексации документации.',
      sources: [],
    };
  }
  
  const isAvailable = await checkAssistantAvailability();
  if (!isAvailable) {
    return {
      answer: 'AI-ассистент временно недоступен. Пожалуйста, попробуйте позже или обратитесь в поддержку.',
      sources: [],
    };
  }
  
  try {
    // Находим релевантные чанки через RAG
    const relevantChunks = await findRelevantChunks(
      question.message,
      question.context?.section,
      5
    );
    
    if (relevantChunks.length === 0) {
      // Пробуем keyword search как fallback
      const keywordResults = keywordSearch(
        question.message,
        question.context?.section,
        3
      );
      
      if (keywordResults.length === 0) {
        return {
          answer: 'К сожалению, я не нашёл релевантной информации в документации по вашему вопросу. Попробуйте переформулировать вопрос или обратитесь в поддержку.',
          sources: [],
          suggestions: [
            'Как начать работу с платформой?',
            'Где найти документацию?',
            'Как получить помощь?',
          ],
        };
      }
      
      // Используем keyword results
      const contextChunks = keywordResults.map(item => ({
        text: item.chunk.chunkText,
        source: item.chunk.source,
      }));
      
      const answer = await generateChatResponse(
        SYSTEM_PROMPT,
        question.message,
        contextChunks
      );
      
      return {
        answer,
        sources: Array.from(new Set(contextChunks.map(c => c.source))),
      };
    }
    
    // Формируем контекст для LLM
    const contextChunks = relevantChunks.map(item => ({
      text: item.chunk.chunkText,
      source: item.chunk.source,
    }));
    
    // Генерируем ответ
    const answer = await generateChatResponse(
      SYSTEM_PROMPT,
      question.message,
      contextChunks
    );
    
    // Извлекаем уникальные источники
    const sources = Array.from(
      new Set(contextChunks.map(chunk => chunk.source))
    );
    
    return {
      answer,
      sources,
    };
  } catch (error) {
    console.error('AI Assistant error:', error);
    return {
      answer: 'Произошла ошибка при обработке вашего вопроса. Пожалуйста, попробуйте ещё раз.',
      sources: [],
    };
  }
}

/**
 * Получить статус ассистента
 */
export async function getAssistantStatus(): Promise<{
  available: boolean;
  indexed: boolean;
  stats: StoreStats | null;
}> {
  const indexed = storeExists();
  const available = await checkAssistantAvailability();
  const stats = indexed ? getStoreStats() : null;
  
  return {
    available,
    indexed,
    stats,
  };
}

/**
 * Проверить здоровье ассистента
 */
export async function healthCheck(): Promise<{
  status: 'ok' | 'degraded' | 'unavailable';
  details: {
    apiKey: boolean;
    vectorStore: boolean;
    chunksCount: number;
  };
}> {
  const hasApiKey = !!process.env.AI_ASSISTANT_API_KEY;
  const hasStore = storeExists();
  const stats = hasStore ? getStoreStats() : { totalChunks: 0, indexedAt: '' };
  
  let status: 'ok' | 'degraded' | 'unavailable' = 'unavailable';
  
  if (hasApiKey && hasStore && stats.totalChunks > 0) {
    status = 'ok';
  } else if (hasApiKey || (hasStore && stats.totalChunks > 0)) {
    status = 'degraded';
  }
  
  return {
    status,
    details: {
      apiKey: hasApiKey,
      vectorStore: hasStore,
      chunksCount: stats.totalChunks,
    },
  };
}

