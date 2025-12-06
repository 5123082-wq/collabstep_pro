'use client';

import { useMemo } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getExpensePermissions } from '@/lib/finance/permissions';
import { cn } from '@/lib/utils';
import {
  STATUS_LABELS,
  STATUS_NEXT,
  type DrawerState,
  type FinanceRole,
  type ExpenseStatus
} from '@/domain/finance/expenses';

export type ExpenseProjectOption = {
  id: string;
  name: string;
};

export type ExpenseDrawerProps = {
  state: DrawerState;
  role: FinanceRole;
  onClose: () => void;
  onDraftChange: (patch: Partial<DrawerState['draft']>) => void;
  onSave: () => void;
  onStatusChange: (status: ExpenseStatus) => void;
  onTabChange: (tab: DrawerState['tab']) => void;
  projectOptions?: ExpenseProjectOption[];
  projectSelectionDisabled?: boolean;
};

export default function ExpenseDrawer({
  state,
  role,
  onClose,
  onDraftChange,
  onSave,
  onStatusChange,
  onTabChange,
  projectOptions,
  projectSelectionDisabled = false
}: ExpenseDrawerProps) {
  const permissions = useMemo(() => getExpensePermissions(role), [role]);
  const nextStatus = state.draft.status ? STATUS_NEXT[state.draft.status] : null;
  const canTransition = permissions.canChangeStatus && nextStatus;

  const handleProjectSelection = (value: string) => {
    const patch: Partial<DrawerState['draft']> = {};
    if (value) {
      patch.projectId = value;
    } else {
      patch.projectId = null;
    }
    onDraftChange(patch);
  };

  return (
    <Sheet open={state.open} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="flex h-full flex-col bg-neutral-950/95 sm:max-w-[440px] md:max-w-[500px] lg:max-w-[560px]">
        <SheetHeader className="space-y-2">
          <SheetTitle>{state.expense ? 'Карточка траты' : 'Новая трата'}</SheetTitle>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white"
          >
            ×
          </button>
        </SheetHeader>
        <div className="mt-4 flex gap-2 text-sm text-neutral-400">
          {(['details', 'attachments', 'history'] as DrawerState['tab'][]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition',
                state.tab === tab ? 'bg-indigo-500 text-white' : 'hover:text-white'
              )}
            >
              {tab === 'details' ? 'Детали' : tab === 'attachments' ? 'Вложения' : 'История'}
            </button>
          ))}
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-3 text-sm text-neutral-200">
          {state.tab === 'details' ? (
            <div className="space-y-3">
              {projectOptions?.length ? (
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  Проект
                  <select
                    value={state.draft.projectId ?? ''}
                    onChange={(event) => handleProjectSelection(event.target.value)}
                    disabled={projectSelectionDisabled || !permissions.canEdit}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 disabled:opacity-60"
                  >
                    <option value="">Выберите проект</option>
                    {projectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Дата
                <input
                  type="date"
                  value={state.draft.date ?? ''}
                  onChange={(event) => onDraftChange({ date: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Сумма
                <input
                  type="number"
                  step="0.01"
                  value={state.draft.amount ?? '0'}
                  onChange={(event) => onDraftChange({ amount: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Валюта
                <input
                  type="text"
                  value={state.draft.currency ?? 'RUB'}
                  onChange={(event) => onDraftChange({ currency: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Категория
                <input
                  type="text"
                  value={state.draft.category ?? ''}
                  onChange={(event) => onDraftChange({ category: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Описание
                <textarea
                  value={state.draft.description ?? ''}
                  onChange={(event) => onDraftChange({ description: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="min-h-[72px] rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Поставщик
                <input
                  type="text"
                  value={state.draft.vendor ?? ''}
                  onChange={(event) => onDraftChange({ vendor: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Метод оплаты
                <input
                  type="text"
                  value={state.draft.paymentMethod ?? ''}
                  onChange={(event) => onDraftChange({ paymentMethod: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Налоги
                <input
                  type="number"
                  step="0.01"
                  value={state.draft.taxAmount ?? ''}
                  onChange={(event) => onDraftChange({ taxAmount: event.target.value })}
                  disabled={!permissions.canEdit}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
                />
              </label>
            </div>
          ) : null}
          {state.tab === 'attachments' ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">
                Перетащите файлы в область ниже или добавьте ссылку вручную. Хранение файлов реализуется на этапе F2.
              </p>
              {permissions.canManageAttachments ? (
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt('Название файла');
                    if (!name) return;
                    const url = window.prompt('Ссылка на файл (URL)');
                    if (!url) return;
                    const next = [...(state.draft.attachments ?? []), { filename: name, url }];
                    onDraftChange({ attachments: next });
                  }}
                  className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-100"
                >
                  Добавить ссылку
                </button>
              ) : null}
              <div className="space-y-2">
                {(state.draft.attachments ?? []).map((file, index) => (
                  <div
                    key={`${file.filename}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2"
                  >
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-neutral-100 hover:text-indigo-300">
                      {file.filename}
                    </a>
                    {permissions.canManageAttachments ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(state.draft.attachments ?? [])];
                          next.splice(index, 1);
                          onDraftChange({ attachments: next });
                        }}
                        className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white"
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {state.tab === 'history' ? (
            <div className="space-y-3 text-sm text-neutral-300">
              {state.loadingHistory ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
              ) : state.history.length ? (
                state.history.map((event) => (
                  <div key={event.id} className="rounded-xl border border-neutral-900 bg-neutral-900/50 px-3 py-2">
                    <p className="text-xs text-neutral-500">
                      {new Date(event.createdAt).toLocaleString('ru-RU')} — {event.actorId}
                    </p>
                    <p className="mt-1 text-sm text-neutral-100">{event.action}</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500">История событий появится после действий с тратой.</p>
              )}
            </div>
          ) : null}
        </div>
        {state.error ? <p className="mt-2 text-sm text-rose-400">{state.error}</p> : null}
        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-900 pt-4">
          {permissions.canEdit ? (
            <button
              type="button"
              onClick={onSave}
              disabled={state.saving}
              className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              {state.saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          ) : null}
          {canTransition ? (
            <button
              type="button"
              onClick={() => onStatusChange(nextStatus!)}
              disabled={state.saving}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-indigo-400/60 hover:text-white"
            >
              Перевести в «{STATUS_LABELS[nextStatus!]}»
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
