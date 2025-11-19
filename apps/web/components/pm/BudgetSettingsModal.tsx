'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/telemetry';

type BudgetCategory = {
  name: string;
  limit?: number;
};

type BudgetSettings = {
  currency: string;
  total?: number;
  warnThreshold?: number;
  categories?: BudgetCategory[];
};

type BudgetSettingsModalProps = {
  projectId: string;
  workspaceId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'CNY'];

export default function BudgetSettingsModal({
  projectId,
  workspaceId,
  currentUserId,
  isOpen,
  onClose,
  onSaved
}: BudgetSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BudgetSettings>({
    currency: 'RUB',
    total: undefined,
    warnThreshold: undefined,
    categories: []
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');

  useEffect(() => {
    if (isOpen && projectId) {
      void loadBudgetSettings();
    }
  }, [isOpen, projectId, loadBudgetSettings]);

  async function loadBudgetSettings() {
    try {
      setLoading(true);
      const response = await fetch(`/api/pm/projects/${projectId}/budget-settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.budget) {
          setSettings({
            currency: data.budget.currency || 'RUB',
            total: data.budget.total ? parseFloat(data.budget.total) : undefined,
            warnThreshold: data.budget.warnThreshold !== undefined ? Math.round(data.budget.warnThreshold * 100) : undefined,
            categories: data.budget.categories?.map((cat: { name: string; limit?: string }) => ({
              name: cat.name,
              limit: cat.limit ? parseFloat(cat.limit) : undefined
            })) || []
          });
        }
      }
    } catch (err) {
      console.error('Failed to load budget settings', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) {
      toast('Введите название категории', 'warning');
      return;
    }

    const limit = newCategoryLimit.trim() ? parseFloat(newCategoryLimit) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 0)) {
      toast('Некорректный лимит категории', 'warning');
      return;
    }

    setSettings({
      ...settings,
      categories: [
        ...(settings.categories || []),
        {
          name: newCategoryName.trim(),
          limit
        }
      ]
    });

    setNewCategoryName('');
    setNewCategoryLimit('');
  }

  function handleRemoveCategory(index: number) {
    setSettings({
      ...settings,
      categories: settings.categories?.filter((_, i) => i !== index) || []
    });
  }

  function handleUpdateCategory(index: number, field: 'name' | 'limit', value: string | number) {
    const updated = [...(settings.categories || [])];
    updated[index] = {
      ...updated[index],
      [field]: field === 'limit' ? (value === '' ? undefined : typeof value === 'number' ? value : parseFloat(value as string)) : value
    };
    setSettings({
      ...settings,
      categories: updated
    });
  }

  async function handleSave() {
    try {
      setSaving(true);

      const response = await fetch(`/api/pm/projects/${projectId}/budget-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: settings.currency,
          total: settings.total,
          warnThreshold: settings.warnThreshold,
          categories: settings.categories?.map((cat) => ({
            name: cat.name,
            limit: cat.limit
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save budget settings' }));
        throw new Error(error.error || 'Failed to save budget settings');
      }

      trackEvent('pm_budget_limit_updated', {
        workspaceId,
        projectId,
        userId: currentUserId,
        currency: settings.currency,
        total: settings.total,
        warnThreshold: settings.warnThreshold,
        categoriesCount: settings.categories?.length || 0,
        source: 'ui'
      });

      toast('Настройки бюджета успешно сохранены', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Не удалось сохранить настройки бюджета', 'warning');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div style={{ maxWidth: '70vw', width: 'auto' }}>
        <ContentBlock 
          as="div" 
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Настройки бюджета проекта</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Валюта */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Валюта проекта
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                disabled={saving}
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* Общий лимит бюджета */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Общий лимит бюджета
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.total ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    total: e.target.value === '' ? undefined : parseFloat(e.target.value)
                  })
                }
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                placeholder="Введите лимит бюджета"
                disabled={saving}
              />
            </div>

            {/* Порог предупреждения */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Порог предупреждения (%)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={settings.warnThreshold ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    warnThreshold: e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                  })
                }
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                placeholder="0-100"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-neutral-400">
                Баннер предупреждения появится при достижении этого процента использования бюджета
              </p>
            </div>

            {/* Лимиты по категориям */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-300">
                  Лимиты по категориям расходов
                </label>
              </div>

              {/* Список категорий */}
              {settings.categories && settings.categories.length > 0 && (
                <div className="mb-3 space-y-2">
                  {settings.categories.map((category, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleUpdateCategory(index, 'name', e.target.value)}
                        className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                        placeholder="Название категории"
                        disabled={saving}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={category.limit ?? ''}
                        onChange={(e) =>
                          handleUpdateCategory(
                            index,
                            'limit',
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                          )
                        }
                        className="w-32 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                        placeholder="Лимит"
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(index)}
                        disabled={saving}
                        className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-rose-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Добавление новой категории */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                  placeholder="Название категории"
                  disabled={saving}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCategoryLimit}
                  onChange={(e) => setNewCategoryLimit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="w-32 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                  placeholder="Лимит"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={saving}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-indigo-400 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !settings.currency}
                className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
        </ContentBlock>
      </div>
    </div>
  );
}

