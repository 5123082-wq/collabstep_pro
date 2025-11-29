import type { ReactNode } from 'react';

export type WidgetType =
  | 'projects-tasks'
  | 'ai-agents'
  | 'marketplace-reactions'
  | 'finance'
  | 'marketing'
  | 'community'
  | 'documents'
  | 'support'
  | 'system-status'
  | 'quick-actions';

export const DASHBOARD_WIDGET_TYPES: WidgetType[] = [
  'projects-tasks',
  'ai-agents',
  'marketplace-reactions',
  'finance',
  'marketing',
  'community',
  'documents',
  'support',
  'system-status',
  'quick-actions'
];

export type WidgetState = 'content' | 'loading' | 'empty' | 'error';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string | undefined;
  layout: WidgetLayout;
  size?: WidgetSize | undefined;
  settings: Record<string, unknown>;
}

export interface WidgetData<T = unknown> {
  state: WidgetState;
  payload?: T | undefined;
  error?: string | undefined;
  lastUpdated?: string | undefined;
  source?: string | undefined;
}

export interface DashboardPreset {
  id: string;
  name: string;
  layout: WidgetConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface WidgetRendererProps<T = unknown> {
  config: WidgetConfig;
  data: WidgetData<T>;
  onRetry?: () => void;
  onRefresh?: () => void;
  children?: ReactNode;
}

export type WidgetRenderer<T = unknown> = (props: WidgetRendererProps<T>) => ReactNode;

export interface WidgetDefinition<T = unknown> {
  type: WidgetType;
  title: string;
  description?: string;
  defaultLayout: WidgetLayout;
  defaultSettings?: Record<string, unknown>;
  render: WidgetRenderer<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetRegistry = Record<WidgetType, WidgetDefinition<any>>;
