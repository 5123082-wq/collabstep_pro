/**
 * AI Assistant Module
 * Экспорт всех публичных API модуля
 */

// Типы
export type {
  DocumentationChunk,
  AssistantConfig,
  AssistantQuestion,
  AssistantResponse,
  ContextualSuggestion,
  ChunkStore,
  SearchResult,
  StoreStats,
} from './types';

// Основной сервис
export {
  answerQuestion,
  getAssistantStatus,
  healthCheck,
} from './assistant-service';

// Поиск
export {
  findRelevantChunks,
  keywordSearch,
} from './rag-search';

// Embeddings
export {
  createEmbedding,
  generateChatResponse,
  checkAssistantAvailability,
  getAssistantConfig,
} from './embeddings';

// Vector Store
export {
  getAllChunks,
  getChunksBySection,
  getStoreStats,
  storeExists,
  clearAllChunks,
} from './vector-store';

