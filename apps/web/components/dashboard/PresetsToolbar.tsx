'use client';

import { useMemo, useState } from 'react';
import type { DashboardPreset } from '@/lib/dashboard/types';
import { cn } from '@/lib/utils';

type PresetsToolbarProps = {
  presets: DashboardPreset[];
  activePresetId: string | null;
  onApply: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onSaveCustom: (name: string) => void;
};

export function PresetsToolbar({ presets, activePresetId, onApply, onDelete, onSaveCustom }: PresetsToolbarProps) {
  const [name, setName] = useState('');
  const presetOptions = useMemo(
    () =>
      presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        isCustom: !preset.id.startsWith('default') && !['my-day', 'operational', 'marketing', 'finance'].includes(preset.id)
      })),
    [presets]
  );

  const selected = presetOptions.find((preset) => preset.id === activePresetId);
  const canDelete = selected?.isCustom === true;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="flex items-center gap-2">
        <label htmlFor="preset-select" className="text-xs text-neutral-400">
          Пресет
        </label>
        <select
          id="preset-select"
          value={activePresetId ?? ''}
          onChange={(event) => onApply(event.target.value)}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-white focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        >
          <option value="" disabled>
            Выберите пресет
          </option>
          {presetOptions.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        {canDelete ? (
          <button
            type="button"
            onClick={() => activePresetId && onDelete(activePresetId)}
            className="rounded-md border border-rose-500/60 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            Удалить
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Название пресета"
          className="w-48 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        />
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            onSaveCustom(name.trim());
            setName('');
          }}
          className={cn(
            'rounded-md border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
            name.trim()
              ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20'
              : 'border-neutral-800 bg-neutral-900 text-neutral-500'
          )}
          disabled={!name.trim()}
        >
          Сохранить как пресет
        </button>
      </div>
    </div>
  );
}
