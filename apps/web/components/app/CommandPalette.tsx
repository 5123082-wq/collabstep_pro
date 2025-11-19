'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBlock } from '@/components/ui/content-block';
import { search, type SearchItem } from '@/lib/search/deepSearch';
import { toast } from '@/lib/ui/toast';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type PaletteResult = ReturnType<typeof search>;

const COMMAND_ITEMS: SearchItem[] = [
  {
    type: 'command',
    title: 'Открыть Маркетплейс',
    subtitle: 'Переход в общий каталог',
    tags: ['marketplace'],
    ref: '/app/marketplace/categories'
  },
  {
    type: 'command',
    title: 'Открыть каталог шаблонов',
    subtitle: 'Готовые решения для старта проекта',
    tags: ['marketplace', 'templates'],
    ref: '/app/marketplace/templates'
  },
  {
    type: 'command',
    title: 'Открыть пакеты услуг',
    subtitle: 'Форматные предложения команд и студий',
    tags: ['marketplace', 'services'],
    ref: '/app/marketplace/services'
  },
  {
    type: 'command',
    title: 'Открыть раздел исполнителей',
    subtitle: 'Каталог специалистов и команд',
    tags: ['performers', 'specialists'],
    ref: '/performers/specialists'
  },
  {
    type: 'command',
    title: 'Посмотреть вакансии исполнителей',
    subtitle: 'Актуальные запросы на специалистов',
    tags: ['performers', 'vacancies'],
    ref: '/performers/vacancies'
  },
  {
    type: 'command',
    title: 'Открыть маркетинговый обзор',
    subtitle: 'Цели, кампании и лиды',
    tags: ['marketing', 'overview'],
    ref: '/marketing/overview'
  },
  {
    type: 'command',
    title: 'Управление кампаниями',
    subtitle: 'Перейти к разделу «Кампании & Реклама»',
    tags: ['marketing', 'campaigns'],
    ref: '/marketing/campaigns'
  },
  {
    type: 'command',
    title: 'Контент и SEO',
    subtitle: 'Открыть контент-план и SEO-кластеры',
    tags: ['marketing', 'content'],
    ref: '/marketing/content-seo'
  }
];

function getTypeLabel(type: SearchItem['type']): string {
  if (type === 'command') {
    return 'команда';
  }
  return type;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const dataset = useMemo<SearchItem[]>(() => [...COMMAND_ITEMS], []);

  const results: PaletteResult = useMemo(() => {
    return search(query, dataset);
  }, [dataset, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const target = results[activeIndex]?.item;
        if (target) {
          if (target.type === 'command') {
            router.push(target.ref);
            onClose();
            return;
          }
          toast(`TODO: открыть ${target.type} ${target.title}`);
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeIndex, onClose, open, results, router]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const input = document.getElementById('command-input') as HTMLInputElement | null;
    input?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-[color:var(--surface-overlay)] pt-24 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Командная палитра"
    >
      <div style={{ maxWidth: '70vw', width: 'auto' }}>
        <ContentBlock 
          as="div" 
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Командная палитра</h2>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Маски: @ — участники и подрядчики, # — задачи, $ — счета.
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--surface-border-subtle)] px-3 py-1 text-xs text-[color:var(--text-tertiary)]">Esc</span>
        </div>
        <div className="mt-4">
          <label htmlFor="command-input" className="sr-only">
            Поле поиска по платформе
          </label>
          <input
            id="command-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Например: #12 или @demo"
            className="w-full rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-3 text-sm text-[color:var(--text-primary)] focus:border-indigo-500 focus:outline-none"
            autoComplete="off"
          />
        </div>
        <ul className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)]">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[color:var(--text-tertiary)]">Ничего не найдено</li>
          )}
          {results.map((result, index) => {
            const item = result.item;
            const isActive = index === activeIndex;
            return (
              <li key={`${item.ref}-${index}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    router.push(item.ref);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                    isActive ? 'bg-indigo-500/10' : 'bg-transparent'
                  }`}
                >
                  <div>
                    <p className="font-medium text-[color:var(--text-primary)]">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-[color:var(--text-tertiary)]">{item.subtitle}</p>}
                  </div>
                  <span className="text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">{getTypeLabel(item.type)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        </ContentBlock>
      </div>
    </div>
  );
}
