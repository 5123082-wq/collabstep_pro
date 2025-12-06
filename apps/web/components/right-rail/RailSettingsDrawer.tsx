'use client';

import { useState, type FormEvent } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContentBlock } from '@/components/ui/content-block';
import { defaultRailConfig } from '@/mocks/rail';
import { cn } from '@/lib/utils';
import { useRailPreferencesStore } from '@/stores/railPreferences';
import { useUI } from '@/stores/ui';
import {
  CUSTOM_RAIL_ICON_KEYS,
  CUSTOM_RAIL_ICONS,
  DEFAULT_CUSTOM_RAIL_ICON,
  type CustomRailIconKey
} from '@/config/customRailIcons';

export default function RailSettingsDrawer() {
  const drawer = useUI((state) => state.drawer);
  const closeDrawer = useUI((state) => state.closeDrawer);
  const isOpen = drawer === 'rail-settings';

  const enabledActionIds = useRailPreferencesStore((state) => state.enabledActionIds);
  const customActions = useRailPreferencesStore((state) => state.customActions);
  const toggleAction = useRailPreferencesStore((state) => state.toggleAction);
  const moveAction = useRailPreferencesStore((state) => state.moveAction);
  const reset = useRailPreferencesStore((state) => state.reset);
  const addCustomAction = useRailPreferencesStore((state) => state.addCustomAction);
  const removeCustomAction = useRailPreferencesStore((state) => state.removeCustomAction);

  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState<CustomRailIconKey>(DEFAULT_CUSTOM_RAIL_ICON);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addCustomAction({ label, url, icon });
    setLabel('');
    setUrl('');
    setIcon(DEFAULT_CUSTOM_RAIL_ICON);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? closeDrawer() : undefined)}>
      <SheetContent className="flex h-full flex-col bg-neutral-900/95 p-0 text-neutral-50 shadow-2xl sm:max-w-[440px] md:max-w-[500px] lg:max-w-[560px]" side="right">
        <SheetHeader className="px-6 py-4">
          <SheetTitle>Настройка быстрого доступа</SheetTitle>
          <p className="text-xs text-neutral-400">Выберите действия, которые будут доступны в правом меню.</p>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <ContentBlock size="sm" as="form" onSubmit={handleSubmit}>
            <h3 className="text-sm font-semibold text-neutral-100">Добавить горячую кнопку</h3>
            <p className="mt-1 text-xs text-neutral-400">
              Укажите название, ссылку и иконку. Кнопка появится в правом меню.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-300">
                Название
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  placeholder="Например, Бриф"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-300">
                Ссылка
                <input
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  placeholder="/app/documents"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-300">
                Иконка
                <select
                  value={icon}
                  onChange={(event) => setIcon(event.target.value as CustomRailIconKey)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {CUSTOM_RAIL_ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {CUSTOM_RAIL_ICONS[key]?.label ?? key}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              Добавить кнопку
            </button>
          </ContentBlock>

          <div>
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Быстрые действия</h3>
            <ol className="mt-3 space-y-3">
              {defaultRailConfig.map((action) => {
                const Icon = action.icon;
                const enabled = enabledActionIds.includes(action.id);
                return (
                  <li key={action.id}>
                    <ContentBlock size="sm">
                      <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/80 text-neutral-200">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-neutral-100">{action.label}</p>
                          <p className="text-xs text-neutral-400">{enabled ? 'Показывается в меню' : 'Скрыто'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveAction(action.id, 'up')}
                          className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          aria-label={`Поднять ${action.label}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAction(action.id, 'down')}
                          className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          aria-label={`Опустить ${action.label}`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                            enabled
                              ? 'border border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                              : 'border border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-indigo-500/40 hover:text-white'
                          )}
                          aria-label={enabled ? `Скрыть ${action.label}` : `Показать ${action.label}`}
                        >
                          {enabled ? 'Включено' : 'Выключено'}
                        </button>
                      </div>
                    </div>
                    </ContentBlock>
                  </li>
                );
              })}
              {customActions.map((action) => {
                const Icon = CUSTOM_RAIL_ICONS[action.icon]?.icon;
                const enabled = enabledActionIds.includes(action.id);
                return (
                  <li key={action.id}>
                    <ContentBlock size="sm" variant="primary">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-200">
                          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-neutral-100">{action.label}</p>
                          <p className="text-xs text-neutral-400">{enabled ? 'Показывается в меню' : 'Скрыто'}</p>
                          <p className="text-xs text-neutral-500">{action.url}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveAction(action.id, 'up')}
                          className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          aria-label={`Поднять ${action.label}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAction(action.id, 'down')}
                          className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          aria-label={`Опустить ${action.label}`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                            enabled
                              ? 'border border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                              : 'border border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-indigo-500/40 hover:text-white'
                          )}
                          aria-label={enabled ? `Скрыть ${action.label}` : `Показать ${action.label}`}
                        >
                          {enabled ? 'Включено' : 'Выключено'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomAction(action.id)}
                          className="rounded-full border border-red-900/40 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                          aria-label={`Удалить ${action.label}`}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    </ContentBlock>
                  </li>
                );
              })}
              {customActions.length === 0 ? (
                <li>
                  <ContentBlock size="sm" variant="muted">
                    <p className="text-xs text-neutral-500">
                      Добавьте собственные кнопки, чтобы быстрее переходить к нужным страницам.
                    </p>
                  </ContentBlock>
                </li>
              ) : null}
            </ol>
          </div>
        </div>
        <div className="border-t border-neutral-800 bg-neutral-950/80 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-neutral-400 underline-offset-2 transition hover:text-neutral-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Сбросить по умолчанию
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              Готово
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

