'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { WidgetGrid } from '@/components/dashboard/WidgetGrid';
import { WidgetCatalog } from '@/components/dashboard/WidgetCatalog';
import { PresetsToolbar } from '@/components/dashboard/PresetsToolbar';
import { buildInitialWidgetData, widgetRegistry } from '@/components/dashboard/widget-registry';
import { DEFAULT_WIDGETS, useDashboardLayoutStore } from '@/lib/dashboard/layout-store';
import { BUILT_IN_PRESETS } from '@/lib/dashboard/presets';
import { fetchDashboardData } from '@/lib/dashboard/api';
import type { WidgetConfig, WidgetData, WidgetState, WidgetType } from '@/lib/dashboard/types';

export function DashboardShell() {
  const {
    widgets,
    setLayout,
    reset,
    removeWidget,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    currentPresetId,
    setCurrentPreset
  } = useDashboardLayoutStore();
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>(() =>
    buildInitialWidgetData(widgets)
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const initialDataForWidget = useCallback(
    (widget: WidgetConfig): WidgetData =>
      buildInitialWidgetData([widget])[widget.id] ?? { state: 'loading', source: 'dashboard' },
    []
  );
  const getBaseData = useCallback(
    (id: string, prev: Record<string, WidgetData>): WidgetData => {
      if (prev[id]) {
        return prev[id];
      }
      const target = widgets.find((widget) => widget.id === id);
      if (target) {
        return initialDataForWidget(target);
      }
      return { state: 'loading', source: 'dashboard' };
    },
    [initialDataForWidget, widgets]
  );

  const applyApiData = useCallback(
    (apiData: Partial<Record<WidgetType, WidgetData>>, targetIds?: string[]) => {
      const targetSet = targetIds ? new Set(targetIds) : null;
      setWidgetData((prev) => {
        const next = { ...prev };
        widgets.forEach((widget) => {
          if (targetSet && !targetSet.has(widget.id)) {
            return;
          }
          const incoming = apiData[widget.type];
          const base = getBaseData(widget.id, prev);
          if (incoming) {
            next[widget.id] = { ...incoming };
          } else if (next[widget.id]?.state === 'loading') {
            next[widget.id] = {
              ...base,
              state: 'empty',
              lastUpdated: new Date().toISOString(),
              source: base.source ?? 'dashboard'
            };
          }
        });
        return next;
      });
    },
    [getBaseData, widgets]
  );

  const markLoading = useCallback(
    (targetWidgets: WidgetConfig[]) => {
      setWidgetData((prev) => {
        const next = { ...prev };
        targetWidgets.forEach((widget) => {
          next[widget.id] = { ...getBaseData(widget.id, prev), state: 'loading' };
        });
        return next;
      });
    },
    [getBaseData]
  );

  const loadWidgetsData = useCallback(
    async (targetIds?: string[], { silent } = { silent: false }) => {
      const targetWidgets = targetIds ? widgets.filter((widget) => targetIds.includes(widget.id)) : widgets;
      if (targetWidgets.length === 0) {
        return;
      }
      const types = Array.from(new Set(targetWidgets.map((widget) => widget.type))) as WidgetType[];
      markLoading(targetWidgets);

      try {
        const dataByType = await fetchDashboardData(types);
        applyApiData(dataByType, targetIds);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить данные';
        if (!silent) {
          toast.error('Не удалось загрузить данные дашборда');
        }
        setWidgetData((prev) => {
          const next = { ...prev };
          const fallbackTimestamp = new Date().toISOString();
          targetWidgets.forEach((widget) => {
            next[widget.id] = {
              ...getBaseData(widget.id, prev),
              state: 'error',
              error: message,
              lastUpdated: fallbackTimestamp
            };
          });
          return next;
        });
      }
    },
    [applyApiData, getBaseData, markLoading, widgets]
  );

  useEffect(() => {
    // Добавляем данные для новых виджетов, не трогаем существующие стейты
    setWidgetData((prev) => {
      let changed = false;
      const next = { ...prev };
      widgets.forEach((widget) => {
        if (!next[widget.id]) {
          next[widget.id] = initialDataForWidget(widget);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [widgets, initialDataForWidget]);

  useEffect(() => {
    void loadWidgetsData(undefined, { silent: true });
  }, [loadWidgetsData]);

  useEffect(() => {
    async function loadServerLayout() {
      try {
        const response = await fetch('/api/dashboard/layout', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.ok === false) return;
        const layout = (payload?.layout ?? payload?.data?.layout) as WidgetConfig[] | undefined;
        const presetId = (payload?.presetId ?? payload?.data?.presetId) as string | null | undefined;
        if (layout && Array.isArray(layout)) {
          setLayout(layout);
          setWidgetData(buildInitialWidgetData(layout));
          setCurrentPreset(presetId ?? null);
          await loadWidgetsData(layout.map((item) => item.id), { silent: true });
        }
      } catch (error) {
        console.warn('[dashboard] fallback to local layout', error);
      }
    }

    void loadServerLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWidgetState = (id: string, state: WidgetState) => {
    setWidgetData((prev) => {
      const base = getBaseData(id, prev);
      const next: WidgetData = { ...base, state };
      if (state === 'error') {
        next.error = 'Демо-ошибка загрузки виджета';
      } else {
        delete next.error;
      }
      return {
        ...prev,
        [id]: next
      };
    });
  };

  const persistLayout = useCallback(
    async (nextLayout: WidgetConfig[], presetId: string | null = null) => {
      try {
        await fetch('/api/dashboard/layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout: nextLayout, presetId })
        });
      } catch (error) {
        console.warn('[dashboard] failed to persist layout', error);
      }
    },
    []
  );

  const handleLayoutChange = (nextLayout: WidgetConfig[]) => {
    setLayout(nextLayout);
    setCurrentPreset(null);
    void persistLayout(nextLayout, null);
  };

  const handleRetry = (id: string) => {
    void loadWidgetsData([id], { silent: true });
  };

  const handleRefresh = (id: string) => {
    void loadWidgetsData([id], { silent: true });
  };

  const handleRefreshAll = () => {
    void loadWidgetsData();
    toast.success('Виджеты обновляются');
  };

  const handleResetLayout = () => {
    reset();
    setWidgetData(buildInitialWidgetData(DEFAULT_WIDGETS));
    toast('Лейаут сброшен к дефолту');
    void loadWidgetsData(undefined, { silent: true });
    setCurrentPreset('default');
    void persistLayout(DEFAULT_WIDGETS, 'default');
  };

  const handleAddWidget = (type: WidgetType) => {
    if (widgets.some((widget) => widget.type === type)) {
      toast.info('Виджет уже добавлен');
      return;
    }

    const definition = widgetRegistry[type];
    if (!definition) return;
    const maxY = widgets.reduce((acc, widget) => Math.max(acc, widget.layout.y + widget.layout.h), 0);
    const layout: WidgetConfig = {
      id: type,
      type,
      title: definition.title,
      layout: { ...definition.defaultLayout, x: 0, y: maxY },
      settings: {},
      size: (definition.defaultLayout.w === 12 ? 'large' : definition.defaultLayout.w === 6 ? 'medium' : 'small')
    };
    const next = [...widgets, layout];
    setLayout(next);
    setWidgetData((prev) => ({ ...prev, [layout.id]: initialDataForWidget(layout) }));
    setCurrentPreset(null);
    setIsCatalogOpen(false);
    void persistLayout(next, null);
    void loadWidgetsData([layout.id], { silent: true });
  };

  const handleRemoveWidget = (id: string) => {
    removeWidget(id);
    setCurrentPreset(null);
    setWidgetData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void persistLayout(
      widgets.filter((widget) => widget.id !== id),
      null
    );
  };

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const applyPreset = (presetId: string) => {
    const preset = allPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setLayout(preset.layout);
    setWidgetData(buildInitialWidgetData(preset.layout));
    setCurrentPreset(preset.id);
    void persistLayout(preset.layout, preset.id);
    void loadWidgetsData(preset.layout.map((item) => item.id), { silent: true });
  };

  const handleSavePreset = (name: string) => {
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 32) || Date.now()}`;
    const now = new Date().toISOString();
    saveCustomPreset({
      id,
      name,
      layout: widgets,
      createdAt: now,
      updatedAt: now
    });
    setCurrentPreset(id);
    void persistLayout(widgets, id);
  };

  const handleDeletePreset = (presetId: string) => {
    deleteCustomPreset(presetId);
    if (currentPresetId === presetId) {
      setCurrentPreset(null);
    }
  };

  return (
    <section className="dashboard-shell">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xl font-semibold text-white">Рабочий стол</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="rounded-lg border border-indigo-500/60 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Обновить виджеты
          </button>
          <button
            type="button"
            onClick={handleResetLayout}
            className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-indigo-500/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Сбросить layout
          </button>
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-indigo-500/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Добавить виджет
          </button>
        </div>
      </header>

      <PresetsToolbar
        presets={allPresets}
        activePresetId={currentPresetId}
        onApply={applyPreset}
        onDelete={handleDeletePreset}
        onSaveCustom={handleSavePreset}
      />

      <WidgetGrid
        widgets={widgets}
        data={widgetData}
        registry={widgetRegistry}
        onLayoutChange={handleLayoutChange}
        onWidgetStateChange={updateWidgetState}
        onRetry={handleRetry}
        onRefresh={handleRefresh}
      />

      <WidgetCatalog
        open={isCatalogOpen}
        activeWidgets={widgets}
        onAdd={handleAddWidget}
        onRemove={handleRemoveWidget}
        onClose={() => setIsCatalogOpen(false)}
      />
    </section>
  );
}
