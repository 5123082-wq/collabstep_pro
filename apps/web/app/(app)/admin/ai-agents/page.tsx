'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ContentBlock } from '@/components/ui/content-block';
// @ts-expect-error lucide-react icon types
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Clock, Database, Loader2 } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { flags } from '@/lib/flags';
import SectionHeader from '@/components/common/SectionHeader';
import { getAdminMenuItems } from '@/lib/nav/navigation-utils';

interface AssistantStatus {
  enabled: boolean;
  status: 'ok' | 'degraded' | 'unavailable' | 'disabled' | 'error';
  details: {
    apiKey: boolean;
    vectorStore: boolean;
    chunksCount: number;
    indexed: boolean;
    stats: {
      totalChunks: number;
      indexedAt: string;
    } | null;
  } | null;
}

function StatusBadge({ status }: { status: AssistantStatus['status'] }) {
  const config = {
    ok: { label: 'Работает', color: 'bg-green-500/20 text-green-400 ring-green-500/50', icon: CheckCircle },
    degraded: { label: 'Частично', color: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/50', icon: AlertCircle },
    unavailable: { label: 'Недоступен', color: 'bg-red-500/20 text-red-400 ring-red-500/50', icon: AlertCircle },
    disabled: { label: 'Выключен', color: 'bg-neutral-500/20 text-neutral-400 ring-neutral-500/50', icon: AlertCircle },
    error: { label: 'Ошибка', color: 'bg-red-500/20 text-red-400 ring-red-500/50', icon: AlertCircle },
  };
  
  const { label, color, icon: Icon } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function AdminAIAgentsPage() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-assistant/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch AI Assistant status:', error);
      setStatus({
        enabled: false,
        status: 'error',
        details: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleReindex = async () => {
    setIsIndexing(true);
    toast('Запуск индексации документации...', 'info');
    
    // Индексация выполняется через CLI скрипт
    // Здесь мы просто показываем инструкцию
    toast(
      'Запустите команду: pnpm --filter @collabverse/web index-assistant-docs',
      'info'
    );
    
    setTimeout(() => {
      setIsIndexing(false);
      void fetchStatus();
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const menuItems = getAdminMenuItems(pathname ?? '');

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI-агенты и ассистенты"
        menuItems={menuItems}
        actions={
          <button
            onClick={() => toast('Функционал создания глобальных агентов в разработке', 'info')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Создать глобального агента
          </button>
        }
      />

      {/* AI Assistant Section */}
      <ContentBlock title="AI-ассистент изучения платформы" size="sm">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : status ? (
            <>
              {/* Status Overview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    status.status === 'ok' 
                      ? 'bg-green-500/20 text-green-400' 
                      : status.status === 'degraded'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-neutral-500/20 text-neutral-400'
                  }`}>
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-200">AI-ассистент</p>
                    <p className="text-xs text-neutral-400">
                      RAG-система для ответов на вопросы по платформе
                    </p>
                  </div>
                </div>
                <StatusBadge status={status.status} />
              </div>

              {/* Details */}
              {status.details && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                      <Database className="h-3.5 w-3.5" />
                      API Ключ
                    </div>
                    <p className={`text-sm font-medium ${status.details.apiKey ? 'text-green-400' : 'text-red-400'}`}>
                      {status.details.apiKey ? 'Настроен' : 'Не настроен'}
                    </p>
                  </div>
                  
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                      <Database className="h-3.5 w-3.5" />
                      Чанков в базе
                    </div>
                    <p className="text-sm font-medium text-neutral-200">
                      {status.details.chunksCount}
                    </p>
                  </div>
                  
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      Последняя индексация
                    </div>
                    <p className="text-sm font-medium text-neutral-200">
                      {status.details.stats?.indexedAt 
                        ? formatDate(status.details.stats.indexedAt)
                        : 'Не проводилась'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReindex}
                  disabled={isIndexing || !status.details?.apiKey}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
                  {isIndexing ? 'Индексация...' : 'Переиндексировать'}
                </button>
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Обновить статус
                </button>
              </div>

              {/* Feature Flag Info */}
              {!flags.AI_ASSISTANT && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <p className="text-sm text-yellow-200">
                    <strong>Внимание:</strong> Feature flag AI_ASSISTANT выключен. 
                    Добавьте <code className="bg-neutral-800 px-1 rounded">NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true</code> в .env.local
                  </p>
                </div>
              )}

              {/* Setup Instructions */}
              {!status.details?.apiKey && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
                  <h4 className="text-sm font-medium text-neutral-200 mb-2">Настройка AI-ассистента</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-neutral-400">
                    <li>Добавьте <code className="bg-neutral-800 px-1 rounded">AI_ASSISTANT_API_KEY</code> в apps/web/.env.local</li>
                    <li>Установите <code className="bg-neutral-800 px-1 rounded">NEXT_PUBLIC_FEATURE_AI_ASSISTANT=true</code></li>
                    <li>Запустите индексацию: <code className="bg-neutral-800 px-1 rounded">pnpm --filter @collabverse/web index-assistant-docs</code></li>
                    <li>Перезапустите сервер разработки</li>
                  </ol>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-400">Не удалось загрузить статус</p>
          )}
        </div>
      </ContentBlock>

      {/* Global Agents Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <ContentBlock title="Статус системы" size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-neutral-200">Активные агенты</p>
                <p className="text-xs text-neutral-400">3 глобальных агента работают</p>
              </div>
            </div>
          </div>
        </ContentBlock>

        <ContentBlock title="Конфигурация" size="sm">
          <p className="text-sm text-neutral-400">
            Здесь администраторы могут настраивать поведение глобальных агентов, их доступ к инструментам и квоты использования моделей.
          </p>
        </ContentBlock>
      </div>

      <ContentBlock title="Список глобальных агентов" size="sm">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-neutral-600" />
          <h3 className="mt-2 font-medium text-neutral-300">Список агентов</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Функционал управления глобальными агентами будет доступен в ближайшем обновлении.
          </p>
        </div>
      </ContentBlock>
    </div>
  );
}
