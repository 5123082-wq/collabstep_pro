'use client';

// TODO: Подключить к реальному API когда backend будет готов
// - Создать API endpoints для segments (GET /api/admin/segments, POST /api/admin/segments, PATCH /api/admin/segments/[id])
// - Заменить mockSegments на реальные API вызовы
// - Добавить loading/error states
// - Использовать типы из @collabverse/api

import { useState } from 'react';
import { Plus, Users, Filter, Shield } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { ContentBlock } from '@/components/ui/content-block';

interface Segment {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  criteria: {
    roles: string[];
    tags: string[];
  };
}

const mockSegments: Segment[] = [
  {
    id: 'beta-testers',
    name: 'Бета-тестировщики',
    description: 'Пользователи с доступом к новым фичам',
    memberCount: 45,
    criteria: {
      roles: ['SPECIALIST', 'FOUNDER'],
      tags: ['beta', 'early-access']
    }
  },
  {
    id: 'marketing-users',
    name: 'Маркетологи',
    description: 'Доступ к разделу маркетинга',
    memberCount: 23,
    criteria: {
      roles: ['PM'],
      tags: ['marketing']
    }
  },
  {
    id: 'finance-team',
    name: 'Финансовая команда',
    description: 'Полный доступ к финансовым функциям',
    memberCount: 8,
    criteria: {
      roles: ['FOUNDER', 'PM'],
      tags: ['finance']
    }
  }
];

export default function AdminSegmentsPage() {
  const [segments] = useState<Segment[]>(mockSegments);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Сегменты пользователей</h1>
            <p className="text-sm text-neutral-400">
              Группы тестировщиков и управление сегментами пользователей
            </p>
          </div>
          <button
            onClick={() => toast('TODO: Создать сегмент', 'info')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Создать сегмент
          </button>
        </div>
      </header>

      {/* Segments List */}
      <div className="space-y-4">
        {segments.map((segment) => (
          <ContentBlock
            key={segment.id}
            size="sm"
            interactive
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-500/20 p-2">
                    <Users className="h-5 w-5 text-orange-100" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-50">{segment.name}</h3>
                    <p className="mt-1 text-sm text-neutral-400">{segment.description}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500">Критерии:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {segment.criteria.roles.length > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Shield className="h-3 w-3 text-neutral-500" />
                          <span className="text-neutral-300">Роли: {segment.criteria.roles.join(', ')}</span>
                        </div>
                      )}
                      {segment.criteria.tags.length > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Filter className="h-3 w-3 text-neutral-500" />
                          <span className="text-neutral-300">Теги: {segment.criteria.tags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-neutral-500">Участников:</p>
                    <p className="mt-2 text-xl font-bold text-neutral-50">{segment.memberCount}</p>
                  </div>
                </div>
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => toast('TODO: Редактировать', 'info')}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                >
                  Редактировать
                </button>
              </div>
            </div>
          </ContentBlock>
        ))}
      </div>

      {segments.length === 0 && (
        <ContentBlock variant="dashed" className="text-center">
          <Users className="mx-auto h-12 w-12 text-neutral-700" />
          <p className="mt-4 text-sm text-neutral-400">Создайте первый сегмент</p>
        </ContentBlock>
      )}
    </div>
  );
}

