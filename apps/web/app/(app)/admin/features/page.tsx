'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Power, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import type { AdminModuleNodeView } from '@collabverse/api';
import { ContentBlock } from '@/components/ui/content-block';

type FeatureCategory = 'all' | 'platform' | 'section' | 'subsection';
type FeatureStatus = 'all' | 'enabled' | 'disabled';

interface FeatureItem {
  id: string;
  key: string;
  label: string;
  description: string;
  category: string;
  parentId?: string;
  enabled: boolean;
  children?: FeatureItem[];
}

function convertModuleToFeature(module: AdminModuleNodeView, parentId?: string): FeatureItem {
  const category = parentId ? (module.children.length > 0 ? 'section' : 'subsection') : 'platform';
  const result: FeatureItem = {
    id: module.id,
    key: module.code,
    label: module.label,
    description: module.summary || module.label,
    category,
    enabled: module.effectiveStatus === 'enabled',
    children: module.children.map((child) => convertModuleToFeature(child, module.id))
  };
  
  if (parentId) {
    result.parentId = parentId;
  }
  
  return result;
}

function flattenFeatures(features: FeatureItem[]): FeatureItem[] {
  const result: FeatureItem[] = [];
  for (const feature of features) {
    result.push(feature);
    if (feature.children && feature.children.length > 0) {
      result.push(...flattenFeatures(feature.children));
    }
  }
  return result;
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FeatureCategory>('all');
  const [statusFilter, setStatusFilter] = useState<FeatureStatus>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/modules', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Не удалось загрузить модули');
      }
      const data = (await response.json()) as { items: AdminModuleNodeView[] };
      const converted = data.items.map((module) => convertModuleToFeature(module));
      setFeatures(converted);
      // Auto-expand first level by default only on initial load
      setExpandedIds((prev) => {
        if (prev.size === 0 && converted.length > 0) {
          return new Set(converted.slice(0, 3).map((f) => f.id));
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast('Не удалось загрузить модули', 'warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatures();
  }, [loadFeatures]);

  const toggleFeature = useCallback(
    async (featureId: string) => {
      const feature = flattenFeatures(features).find((f) => f.id === featureId);
      if (!feature) return;

      const newStatus = feature.enabled ? 'disabled' : 'enabled';
      setUpdatingIds((prev) => new Set(prev).add(featureId));

      try {
        const response = await fetch(`/api/admin/modules/${featureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Не удалось обновить модуль');
        }

        const data = (await response.json()) as { item: AdminModuleNodeView };
        const updatedFeature = convertModuleToFeature(data.item);

        // Update in tree structure
        const updateInTree = (items: FeatureItem[]): FeatureItem[] => {
          return items.map((item) => {
            if (item.id === featureId) {
              const result: FeatureItem = {
                ...item,
                enabled: updatedFeature.enabled
              };
              if (item.children) {
                result.children = updateInTree(item.children);
              }
              return result;
            }
            if (item.children) {
              return { ...item, children: updateInTree(item.children) };
            }
            return item;
          });
        };

        setFeatures(updateInTree(features));
        toast(
          `Фича "${feature.label}" ${newStatus === 'enabled' ? 'включена' : 'отключена'}`,
          newStatus === 'enabled' ? 'success' : 'info'
        );
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Не удалось обновить модуль', 'warning');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(featureId);
          return next;
        });
      }
    },
    [features]
  );

  const toggleExpand = (featureId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  };

  const filteredFeatures = features.filter((f) => {
    if (!f.parentId && categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (statusFilter === 'enabled' && !f.enabled) return false;
    if (statusFilter === 'disabled' && f.enabled) return false;
    if (searchQuery && !f.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const topLevelFeatures = filteredFeatures.filter((f) => !f.parentId);
  const childFeatures = filteredFeatures.filter((f) => f.parentId);

  const getChildren = (parentId: string) => childFeatures.filter((f) => f.parentId === parentId);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Управление Фичами</h1>
            <p className="text-sm text-neutral-400">
              Включение и отключение разделов платформы. Изменения применяются глобально для всех пользователей.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toast('TODO: Импорт конфигурации', 'info')}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-blue-500/40 hover:bg-blue-500/10"
            >
              Импорт
            </button>
            <button
              onClick={() => {
                const config = JSON.stringify(features, null, 2);
                void navigator.clipboard.writeText(config).then(() => {
                  toast('Конфигурация скопирована в буфер', 'success');
                });
              }}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-green-500/40 hover:bg-green-500/10"
            >
              Экспорт
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <ContentBlock size="sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск фичей..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 py-2 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FeatureCategory)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Все категории</option>
              <option value="platform">Платформа</option>
              <option value="section">Разделы</option>
              <option value="subsection">Подразделы</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeatureStatus)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Все статусы</option>
              <option value="enabled">Включено</option>
              <option value="disabled">Отключено</option>
            </select>
          </div>
        </div>
      </ContentBlock>

      {/* Loading State */}
      {loading && (
        <ContentBlock variant="dashed" className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-neutral-400">Загрузка модулей...</p>
        </ContentBlock>
      )}

      {/* Error State */}
      {error && !loading && (
        <ContentBlock variant="error">
          <p className="text-sm text-rose-100">{error}</p>
          <button
            onClick={() => void loadFeatures()}
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Повторить попытку
          </button>
        </div>
      )}

      {/* Features Tree */}
      {!loading && !error && (
        <div className="space-y-2">
          {topLevelFeatures.map((feature) => {
            const hasChildren = getChildren(feature.id).length > 0;
            const isExpanded = expandedIds.has(feature.id);
            const allChildrenEnabled = getChildren(feature.id).every((c) => c.enabled);
            const someChildrenEnabled = getChildren(feature.id).some((c) => c.enabled);
            const isUpdating = updatingIds.has(feature.id);

            return (
              <ContentBlock
                key={feature.id}
                size="sm"
                interactive
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {hasChildren && (
                      <button
                        onClick={() => toggleExpand(feature.id)}
                        className="rounded p-1 transition hover:bg-neutral-900"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-500" />
                        )}
                      </button>
                    )}
                    {!hasChildren && <div className="w-6" />}

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-50">{feature.label}</h3>
                        <span
                          className={clsx(
                            'rounded px-2 py-0.5 text-xs font-medium',
                            feature.category === 'platform'
                              ? 'bg-blue-500/20 text-blue-100'
                              : feature.category === 'section'
                              ? 'bg-green-500/20 text-green-100'
                              : 'bg-purple-500/20 text-purple-100'
                          )}
                        >
                          {feature.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-400">{feature.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasChildren && (
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        {isExpanded && (
                          <span>
                            {someChildrenEnabled && !allChildrenEnabled
                              ? 'Частично'
                              : allChildrenEnabled
                              ? 'Все вкл.'
                              : 'Все выкл.'}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => toggleFeature(feature.id)}
                      disabled={isUpdating}
                      className={clsx(
                        'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
                        isUpdating
                          ? 'cursor-not-allowed opacity-50'
                          : feature.enabled
                          ? 'border-green-500/40 bg-green-500/10 text-green-100 hover:bg-green-500/20'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                      )}
                    >
                      {isUpdating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                          Обновление...
                        </>
                      ) : feature.enabled ? (
                        <>
                          <Power className="h-5 w-5" />
                          Включено
                        </>
                      ) : (
                        <>
                          <Power className="h-5 w-5" />
                          Отключено
                        </>
                      )}
                    </button>

                    <button className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-500 transition hover:border-indigo-500/40 hover:bg-indigo-500/10">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              {/* Children */}
              {isExpanded && hasChildren && (
                <div className="border-t border-neutral-800 bg-neutral-950/80">
                  {getChildren(feature.id).map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between border-b border-neutral-800 p-4 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 ml-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-50">{child.label}</h4>
                            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-100">
                              {child.category}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-neutral-400">{child.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleFeature(child.id)}
                          disabled={updatingIds.has(child.id)}
                          className={clsx(
                            'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
                            updatingIds.has(child.id)
                              ? 'cursor-not-allowed opacity-50'
                              : child.enabled
                              ? 'border-green-500/40 bg-green-500/10 text-green-100 hover:bg-green-500/20'
                              : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                          )}
                        >
                          {updatingIds.has(child.id) ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                              Обновление...
                            </>
                          ) : child.enabled ? (
                            <>
                              <Power className="h-5 w-5" />
                              Включено
                            </>
                          ) : (
                            <>
                              <Power className="h-5 w-5" />
                              Отключено
                            </>
                          )}
                        </button>

                        <button className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-500 transition hover:border-indigo-500/40 hover:bg-indigo-500/10">
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentBlock>
          );
        })}

        {topLevelFeatures.length === 0 && (
          <ContentBlock variant="dashed" className="text-center">
          <p className="text-sm text-neutral-400">Фичи не найдены</p>
        </ContentBlock>
        )}
      </div>
      )}
    </div>
  );
}

