'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import AssistantIcon from './AssistantIcon';
import { cn } from '@/lib/utils';
import { useUI } from '@/stores/ui';
import { Loader2, ExternalLink, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface Suggestion {
  id: string;
  text: string;
}

export default function AssistantDrawer() {
  const drawer = useUI((state) => state.drawer);
  const closeDrawer = useUI((state) => state.closeDrawer);
  const isOpen = drawer === 'assistant';
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Загрузка контекстных подсказок
  useEffect(() => {
    if (isOpen) {
      fetch(`/api/ai-assistant/suggestions?pathname=${encodeURIComponent(pathname || '/')}`)
        .then(res => res.json())
        .then(data => {
          if (data.suggestions) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, pathname]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const placeholder = useMemo(() => 'Например: Как создать новый проект?', []);

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            currentPath: pathname,
          },
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || data.error || 'Не удалось получить ответ',
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, pathname]);

  const handleSuggestion = (message: string) => {
    setPrompt(message);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Обработка Escape для закрытия
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDrawer]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
              <AssistantIcon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">AI-ассистент платформы</h2>
              <p className="text-xs text-neutral-400">Помощь по использованию Collabverse</p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5',
                      message.role === 'user'
                        ? 'bg-indigo-500/20 text-indigo-100'
                        : 'bg-neutral-800 text-neutral-200'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-neutral-700/50">
                        <p className="text-xs text-neutral-500 mb-1">Источники:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((source, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-400"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {source.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-neutral-800 px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span className="text-sm text-neutral-400">Думаю...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-neutral-400">
                  Привет! Я AI-ассистент платформы. Задайте вопрос о том, как использовать Collabverse.
                </p>
              </div>
              
              {/* Контекстные подсказки */}
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-100">Попробуйте спросить</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestion(item.text)}
                        className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10"
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Общие подсказки */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-100">Рекомендуем попробовать</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSuggestion('Как начать работу с платформой?')}
                    className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10"
                  >
                    <span className="font-semibold text-neutral-100">Как начать работу с платформой?</span>
                    <p className="mt-1 text-xs text-neutral-400">Быстрый старт и основные функции</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSuggestion('Где найти документацию?')}
                    className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10"
                  >
                    <span className="font-semibold text-neutral-100">Где найти документацию?</span>
                    <p className="mt-1 text-xs text-neutral-400">Ссылки на руководства и справочники</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="border-t border-neutral-800 p-6">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none disabled:opacity-50 resize-none"
              rows={3}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!prompt.trim() || isLoading}
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Отправка...</span>
                </>
              ) : (
                <span>Отправить</span>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setMessages([]);
              }}
              className="text-xs text-neutral-400 underline-offset-2 transition hover:text-neutral-200 hover:underline"
            >
              Очистить историю
            </button>
            <p className="text-xs text-neutral-500">
              Нажмите Enter для отправки • Esc для закрытия
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
