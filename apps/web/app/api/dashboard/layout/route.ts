import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { DEFAULT_WIDGETS } from '@/lib/dashboard/layout-store';
import { DASHBOARD_WIDGET_TYPES, type WidgetConfig, type WidgetLayout, type WidgetType } from '@/lib/dashboard/types';
import { flags } from '@/lib/flags';

type PersistedLayout = {
  layout: WidgetConfig[];
  presetId: string | null;
  updatedAt: string;
};

const inMemoryLayouts = new Map<string, PersistedLayout>();

const SIZE_PRESETS: Record<string, { w: number; h: number }> = {
  small: { w: 4, h: 3 },
  medium: { w: 6, h: 3 },
  large: { w: 12, h: 4 }
};

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

function isWidgetSize(value: unknown): value is 'small' | 'medium' | 'large' {
  return value === 'small' || value === 'medium' || value === 'large';
}

function sanitizeWidget(raw: unknown): WidgetConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (!isWidgetType(candidate.type) || typeof candidate.id !== 'string') {
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
  const size = isWidgetSize(candidate.size) ? candidate.size : undefined;
  const preset = size ? SIZE_PRESETS[size] : null;
  const normalized = clampLayout(preset ? { ...layout, ...preset } : layout);

  return {
    id: candidate.id,
    type: candidate.type,
    ...(typeof candidate.title === 'string' ? { title: candidate.title } : {}),
    layout: normalized,
    ...(size ? { size } : {}),
    settings: (candidate.settings as Record<string, unknown>) ?? {}
  };
}

function sanitizeLayout(raw: unknown): WidgetConfig[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_WIDGETS;
  }
  const unique = new Set<string>();
  const widgets: WidgetConfig[] = [];
  for (const item of raw) {
    const widget = sanitizeWidget(item);
    if (!widget) continue;
    if (unique.has(widget.id)) continue;
    unique.add(widget.id);
    widgets.push(widget);
  }
  return widgets.length > 0 ? widgets : DEFAULT_WIDGETS;
}

export async function GET(request: NextRequest) {
  if (!flags.WORKSPACE_DASHBOARD) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const record = inMemoryLayouts.get(auth.userId);
  if (!record) {
    return jsonOk({
      layout: DEFAULT_WIDGETS,
      presetId: null,
      updatedAt: new Date().toISOString()
    });
  }

  return jsonOk(record);
}

export async function POST(request: NextRequest) {
  if (!flags.WORKSPACE_DASHBOARD) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return jsonError('INVALID_BODY', { status: 400, details: (error as Error).message });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const layout = sanitizeLayout(payload.layout);
  const presetId = typeof payload.presetId === 'string' ? payload.presetId : null;
  const updatedAt = new Date().toISOString();

  const record: PersistedLayout = {
    layout,
    presetId,
    updatedAt
  };

  inMemoryLayouts.set(auth.userId, record);
  return jsonOk(record);
}
