/**
 * AI Assistant RAG Search
 * Поиск по векторной базе документации
 */

import { getAllChunks, getChunksBySection } from './vector-store';
import { createEmbedding } from './embeddings';
import type { SearchResult } from './types';

/**
 * Вычислить косинусное сходство между двумя векторами
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Найти наиболее релевантные чанки для вопроса
 * 
 * @param question - Вопрос пользователя
 * @param section - Опциональный раздел для фильтрации
 * @param topK - Количество результатов (по умолчанию 5)
 * @returns Массив результатов с чанками и их релевантностью
 */
export async function findRelevantChunks(
  question: string,
  section?: string,
  topK: number = 5
): Promise<SearchResult[]> {
  // Создаём embedding для вопроса
  const questionEmbedding = await createEmbedding(question);
  
  // Получаем чанки: либо из конкретного раздела, либо все
  const allChunks = section
    ? getChunksBySection(section)
    : getAllChunks();
  
  if (allChunks.length === 0) {
    return [];
  }
  
  // Вычисляем схожесть для каждого чанка
  const withSimilarity: SearchResult[] = allChunks.map(chunk => ({
    chunk,
    similarity: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));
  
  // Сортируем по убыванию схожести и берем топ-K
  return withSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(item => item.similarity > 0.3); // Минимальный порог схожести
}

/**
 * Быстрый поиск без embeddings (по ключевым словам)
 * Используется как fallback если embeddings недоступны
 */
export function keywordSearch(
  query: string,
  section?: string,
  topK: number = 5
): SearchResult[] {
  const allChunks = section
    ? getChunksBySection(section)
    : getAllChunks();
  
  if (allChunks.length === 0) {
    return [];
  }
  
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const withScore: SearchResult[] = allChunks.map(chunk => {
    const text = chunk.chunkText.toLowerCase();
    let matches = 0;
    
    for (const word of queryWords) {
      if (text.includes(word)) {
        matches++;
      }
    }
    
    return {
      chunk,
      similarity: queryWords.length > 0 ? matches / queryWords.length : 0,
    };
  });
  
  return withScore
    .filter(item => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

