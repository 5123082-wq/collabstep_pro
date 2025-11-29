'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { widgetRegistry } from '@/components/dashboard/widget-registry';
import type { WidgetConfig, WidgetDefinition, WidgetType } from '@/lib/dashboard/types';
import { cn } from '@/lib/utils';

type WidgetCatalogProps = {
  open: boolean;
  activeWidgets: WidgetConfig[];
  onAdd: (type: WidgetType) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

const registryEntries = Object.values(widgetRegistry) as WidgetDefinition[];

export function WidgetCatalog({ open, activeWidgets, onAdd, onRemove, onClose }: WidgetCatalogProps) {
  const [query, setQuery] = useState('');
  const activeByType = useMemo(() => new Map(activeWidgets.map((widget) => [widget.type, widget.id])), [activeWidgets]);

  const filtered = useMemo(
    () =>
      registryEntries.filter((entry) => {
        if (!query.trim()) return true;
        const text = `${entry.title} ${entry.description ?? ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }),
    [query]
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition',
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-neutral-950/95 shadow-2xl ring-1 ring-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Каталог виджетов</p>
            <p className="text-xs text-neutral-400">Добавляйте или убирайте карточки на рабочем столе</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-800 bg-neutral-900/80 p-2 text-neutral-300 transition hover:border-indigo-500/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию или описанию"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />

          <div className="grid grid-cols-1 gap-3">
            {filtered.map((entry) => {
              const addedId = activeByType.get(entry.type);
              return (
                <div
                  key={entry.type}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 transition hover:border-indigo-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{entry.title}</p>
                      {entry.description ? (
                        <p className="text-xs text-neutral-400">{entry.description}</p>
                      ) : null}
                    </div>
                    {addedId ? (
                      <button
                        type="button"
                        onClick={() => onRemove(addedId)}
                        className="rounded-md border border-rose-500/60 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                      >
                        Удалить
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAdd(entry.type)}
                        className="rounded-md border border-indigo-500/60 px-3 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                      >
                        Добавить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 p-3 text-center text-xs text-neutral-400">
                Ничего не найдено. Попробуйте другой запрос.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
