/**
 * AI Assistant Types
 * Типы для системы AI-ассистента изучения платформы
 */

export interface DocumentationChunk {
  id: string;
  source: string; // Путь к файлу
  chunkText: string;
  embedding: number[];
  section?: string; // Раздел из пути (например, 'getting-started')
  metadata?: {
    title?: string;
    lastModified?: string;
  };
}

export interface AssistantConfig {
  id: string;
  name: string;
  description: string;
  apiKey: string; // Отдельный ключ для ассистента
  modelChat: string;
  modelEmbed: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantQuestion {
  message: string;
  context?: {
    currentPath?: string;
    section?: string;
    userId?: string;
  };
  sessionId?: string;
}

export interface AssistantResponse {
  answer: string;
  sources?: string[]; // Источники документации
  suggestions?: string[]; // Следующие вопросы
}

export interface ContextualSuggestion {
  id: string;
  text: string;
  description?: string;
  icon?: string;
}

export interface ChunkStore {
  chunks: DocumentationChunk[];
  indexedAt: string;
  version: number;
}

export interface SearchResult {
  chunk: DocumentationChunk;
  similarity: number;
}

export interface StoreStats {
  totalChunks: number;
  indexedAt: string;
}

