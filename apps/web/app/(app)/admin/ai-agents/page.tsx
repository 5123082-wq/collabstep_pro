'use client';

import { ContentBlock } from '@/components/ui/content-block';
import { Sparkles } from 'lucide-react';

export default function AdminAIAgentsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Глобальные AI-агенты</h1>
            <p className="text-sm text-neutral-400">
              Управление системными агентами, доступными для всей платформы
            </p>
          </div>
          <button
            onClick={() => alert('Функционал создания глобальных агентов в разработке')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Создать глобального агента
          </button>
        </div>
      </header>

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

