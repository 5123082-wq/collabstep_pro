import { DEFAULT_WIDGETS } from '@/lib/dashboard/layout-store';
import type { WidgetConfig, WidgetSize, DashboardPreset } from '@/lib/dashboard/types';

const SIZE_PRESETS: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 4, h: 3 },
  medium: { w: 6, h: 3 },
  large: { w: 12, h: 4 }
};

function widget(
  type: WidgetConfig['type'],
  coords: { x: number; y: number },
  size: WidgetSize = 'medium',
  title?: string
): WidgetConfig {
  const preset = SIZE_PRESETS[size];
  return {
    id: type,
    type,
    ...(title ? { title } : {}),
    layout: { x: coords.x, y: coords.y, ...preset },
    size,
    settings: {}
  };
}

const now = new Date().toISOString();

export const BUILT_IN_PRESETS: DashboardPreset[] = [
  {
    id: 'default',
    name: 'Базовый',
    layout: DEFAULT_WIDGETS,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'my-day',
    name: 'Мой день',
    layout: [
      widget('projects-tasks', { x: 0, y: 0 }, 'large'),
      widget('quick-actions', { x: 0, y: 4 }, 'small'),
      widget('support', { x: 4, y: 4 }, 'small'),
      widget('documents', { x: 8, y: 4 }, 'small'),
      widget('system-status', { x: 0, y: 7 }, 'small')
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'operational',
    name: 'Операционный',
    layout: [
      widget('projects-tasks', { x: 0, y: 0 }, 'medium'),
      widget('ai-agents', { x: 6, y: 0 }, 'medium'),
      widget('system-status', { x: 0, y: 3 }, 'large'),
      widget('support', { x: 0, y: 7 }, 'small'),
      widget('community', { x: 4, y: 7 }, 'small'),
      widget('quick-actions', { x: 8, y: 7 }, 'small')
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'marketing',
    name: 'Маркетинг',
    layout: [
      widget('marketing', { x: 0, y: 0 }, 'medium'),
      widget('marketplace-reactions', { x: 6, y: 0 }, 'medium'),
      widget('projects-tasks', { x: 0, y: 3 }, 'medium'),
      widget('community', { x: 6, y: 3 }, 'small'),
      widget('quick-actions', { x: 10, y: 3 }, 'small'),
      widget('documents', { x: 0, y: 6 }, 'small'),
      widget('system-status', { x: 4, y: 6 }, 'small')
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'finance',
    name: 'Финансы',
    layout: [
      widget('finance', { x: 0, y: 0 }, 'medium'),
      widget('marketing', { x: 6, y: 0 }, 'medium'),
      widget('projects-tasks', { x: 0, y: 3 }, 'medium'),
      widget('marketplace-reactions', { x: 6, y: 3 }, 'small'),
      widget('support', { x: 10, y: 3 }, 'small'),
      widget('system-status', { x: 0, y: 6 }, 'small'),
      widget('quick-actions', { x: 4, y: 6 }, 'small')
    ],
    createdAt: now,
    updatedAt: now
  }
];

export function findPresetById(id: string | null | undefined): DashboardPreset | null {
  if (!id) return null;
  return BUILT_IN_PRESETS.find((preset) => preset.id === id) ?? null;
}
