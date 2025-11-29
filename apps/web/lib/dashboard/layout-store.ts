import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DASHBOARD_WIDGET_TYPES,
  type DashboardPreset,
  type WidgetConfig,
  type WidgetLayout,
  type WidgetType,
  type WidgetSize
} from '@/lib/dashboard/types';

type LayoutStore = {
  widgets: WidgetConfig[];
  currentPresetId: string | null;
  customPresets: DashboardPreset[];
  setLayout: (widgets: WidgetConfig[]) => void;
  updateLayout: (id: string, layout: WidgetLayout) => void;
  updateSettings: (id: string, settings: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  saveCustomPreset: (preset: DashboardPreset) => void;
  deleteCustomPreset: (id: string) => void;
  setCurrentPreset: (id: string | null) => void;
  reset: () => void;
};

const memoryStore: Record<string, string> = {};

const memoryStorage: StateStorage = {
  getItem: (name) => (name in memoryStore ? memoryStore[name]! : null),
  setItem: (name, value) => {
    memoryStore[name] = value;
  },
  removeItem: (name) => {
    delete memoryStore[name];
  }
};

const LAYOUT_STORAGE_KEY = 'cv-dashboard-layout';

const SIZE_PRESETS: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 4, h: 3 },
  medium: { w: 6, h: 3 },
  large: { w: 12, h: 4 }
};

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'projects-tasks',
    type: 'projects-tasks',
    title: 'Проекты и задачи',
    layout: { x: 0, y: 0, ...SIZE_PRESETS.medium },
    size: 'medium',
    settings: {}
  },
  {
    id: 'ai-agents',
    type: 'ai-agents',
    title: 'AI-агенты',
    layout: { x: 6, y: 0, ...SIZE_PRESETS.medium },
    size: 'medium',
    settings: {}
  },
  {
    id: 'finance',
    type: 'finance',
    title: 'Финансы',
    layout: { x: 0, y: 6, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'marketing',
    type: 'marketing',
    title: 'Маркетинг',
    layout: { x: 4, y: 6, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'marketplace-reactions',
    type: 'marketplace-reactions',
    title: 'Реакции маркетплейса',
    layout: { x: 8, y: 6, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'community',
    type: 'community',
    title: 'Комьюнити',
    layout: { x: 0, y: 10, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'support',
    type: 'support',
    title: 'Поддержка',
    layout: { x: 4, y: 10, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'documents',
    type: 'documents',
    title: 'Документы',
    layout: { x: 8, y: 10, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  },
  {
    id: 'system-status',
    type: 'system-status',
    title: 'Системный статус',
    layout: { x: 0, y: 14, ...SIZE_PRESETS.large },
    size: 'large',
    settings: {}
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Быстрые действия',
    layout: { x: 0, y: 18, ...SIZE_PRESETS.small },
    size: 'small',
    settings: {}
  }
];

function clampLayout(layout: WidgetLayout): WidgetLayout {
  const w = Math.max(1, Math.min(layout.w, 12));
  const h = Math.max(1, Math.min(layout.h, 8));
  const x = Math.max(0, Math.min(layout.x, 12 - w));
  const y = Math.max(0, layout.y);
  return { x, y, w, h };
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && (DASHBOARD_WIDGET_TYPES as string[]).includes(value);
}

function isWidgetSize(value: unknown): value is WidgetSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

function sanitizeWidgetConfig(raw: unknown): WidgetConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || !isWidgetType(candidate.type)) {
    return null;
  }

  const layout = candidate.layout as WidgetLayout | undefined;
  if (
    !layout ||
    typeof layout.x !== 'number' ||
    typeof layout.y !== 'number' ||
    typeof layout.w !== 'number' ||
    typeof layout.h !== 'number'
  ) {
    return null;
  }

  const settings = (candidate.settings ?? {}) as Record<string, unknown>;
  const size = isWidgetSize(candidate.size) ? candidate.size : undefined;
  const preset = size ? SIZE_PRESETS[size] : null;
  const normalizedLayout = clampLayout(preset ? { ...layout, ...preset } : layout);

  return {
    id: candidate.id,
    type: candidate.type,
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    layout: normalizedLayout,
    settings,
    size
  };
}

function sanitizeLayout(raw: unknown): WidgetConfig[] {
  if (!Array.isArray(raw)) {
    return defaultWidgets;
  }

  const uniqueIds = new Set<string>();
  const sanitized: WidgetConfig[] = [];

  for (const item of raw) {
    const config = sanitizeWidgetConfig(item);
    if (!config) {
      continue;
    }
    if (uniqueIds.has(config.id)) {
      continue;
    }
    uniqueIds.add(config.id);
    sanitized.push(config);
  }

  return sanitized.length > 0 ? sanitized : defaultWidgets;
}

function sanitizePreset(raw: unknown): DashboardPreset | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
    return null;
  }
  const layout = sanitizeLayout(candidate.layout);
  if (!layout || layout.length === 0) {
    return null;
  }
  return {
    id: candidate.id,
    name: candidate.name,
    layout,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  };
}

function sanitizePresets(raw: unknown): DashboardPreset[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const uniqueIds = new Set<string>();
  const presets: DashboardPreset[] = [];
  for (const item of raw) {
    const preset = sanitizePreset(item);
    if (!preset) continue;
    if (uniqueIds.has(preset.id)) continue;
    uniqueIds.add(preset.id);
    presets.push(preset);
  }
  return presets;
}

export const useDashboardLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      currentPresetId: null,
      customPresets: [],
      setLayout: (widgets) => set({ widgets: sanitizeLayout(widgets) }),
      updateLayout: (id, layout) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, layout: clampLayout(layout) } : widget
          )
        })),
      updateSettings: (id, settings) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, settings: { ...widget.settings, ...settings } } : widget
          )
        })),
      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id)
        })),
      saveCustomPreset: (preset) =>
        set((state) => {
          const sanitized = sanitizePreset(preset);
          if (!sanitized) {
            return state;
          }
          const others = state.customPresets.filter((item) => item.id !== sanitized.id);
          return {
            ...state,
            customPresets: [...others, sanitized],
            currentPresetId: sanitized.id
          };
        }),
      deleteCustomPreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((preset) => preset.id !== id),
          currentPresetId: state.currentPresetId === id ? null : state.currentPresetId
        })),
      setCurrentPreset: (id) => set({ currentPresetId: id }),
      reset: () => set({ widgets: defaultWidgets })
    }),
    {
      name: LAYOUT_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? memoryStorage : (window.localStorage as unknown as StateStorage)
      ),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<LayoutStore>) ?? {};
        const widgets = sanitizeLayout(persisted.widgets);
        return {
          ...currentState,
          ...persisted,
          widgets,
          currentPresetId: persisted.currentPresetId ?? null,
          customPresets: sanitizePresets(persisted.customPresets)
        } satisfies LayoutStore;
      }
    }
  )
);

export const DEFAULT_WIDGETS = defaultWidgets;
