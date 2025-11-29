import type { WidgetData, WidgetType } from '@/lib/dashboard/types';

type DashboardDataResponse = {
  widgets: Partial<Record<WidgetType, WidgetData>>;
  requested: WidgetType[];
  generatedAt: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

function toQueryParam(widgets: WidgetType[]): string {
  const unique = Array.from(new Set(widgets));
  return unique.join(',');
}

export async function fetchDashboardData(widgets: WidgetType[]): Promise<Partial<Record<WidgetType, WidgetData>>> {
  const query = toQueryParam(widgets);
  const response = await fetch(`/api/dashboard/data?widgets=${encodeURIComponent(query)}`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to load dashboard data');
  }

  const payload = (await response.json()) as ApiResponse<DashboardDataResponse>;
  if (!payload.ok || !payload.data) {
    throw new Error(payload.error ?? 'Invalid dashboard data response');
  }

  return payload.data.widgets ?? {};
}
