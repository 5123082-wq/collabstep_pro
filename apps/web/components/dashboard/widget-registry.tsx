import type {
  WidgetConfig,
  WidgetData,
  WidgetDefinition,
  WidgetRegistry,
  WidgetType
} from '@/lib/dashboard/types';
import { DEFAULT_WIDGETS } from '@/lib/dashboard/layout-store';
import {
  AiAgentsWidget,
  CommunityWidget,
  DocumentsWidget,
  FinanceWidget,
  MarketingWidget,
  MarketplaceReactionsWidget,
  ProjectsTasksWidget,
  QuickActionsWidget,
  SupportWidget,
  SystemStatusWidget,
  type AiAgentsPayload,
  type CommunityPayload,
  type DocumentsPayload,
  type FinancePayload,
  type MarketingPayload,
  type MarketplaceReactionsPayload,
  type ProjectsTasksPayload,
  type QuickActionsPayload,
  type SupportPayload,
  type SystemStatusPayload
} from '@/components/dashboard/widgets';

const layoutByType = DEFAULT_WIDGETS.reduce<Record<WidgetType, WidgetConfig['layout']>>((acc, widget) => {
  acc[widget.type] = widget.layout;
  return acc;
}, {} as Record<WidgetType, WidgetConfig['layout']>);

export const widgetRegistry: WidgetRegistry = {
  'projects-tasks': {
    type: 'projects-tasks',
    title: 'Проекты и задачи',
    description: 'Просрочка, дедлайны и блокеры по проектам.',
    defaultLayout: layoutByType['projects-tasks'],
    render: (props) => <ProjectsTasksWidget {...props} />
  } satisfies WidgetDefinition<ProjectsTasksPayload>,
  'ai-agents': {
    type: 'ai-agents',
    title: 'AI-агенты',
    description: 'Статусы агентов и пайплайнов.',
    defaultLayout: layoutByType['ai-agents'],
    render: (props) => <AiAgentsWidget {...props} />
  } satisfies WidgetDefinition<AiAgentsPayload>,
  'marketplace-reactions': {
    type: 'marketplace-reactions',
    title: 'Маркетплейс реакции',
    description: 'Отзывы, рейтинг и непрочитанные обращения.',
    defaultLayout: layoutByType['marketplace-reactions'],
    render: (props) => <MarketplaceReactionsWidget {...props} />
  } satisfies WidgetDefinition<MarketplaceReactionsPayload>,
  finance: {
    type: 'finance',
    title: 'Финансы',
    description: 'Доходы, burn-rate и runway.',
    defaultLayout: layoutByType.finance,
    render: (props) => <FinanceWidget {...props} />
  } satisfies WidgetDefinition<FinancePayload>,
  marketing: {
    type: 'marketing',
    title: 'Маркетинг',
    description: 'Кампании, ROAS, CAC и CTR.',
    defaultLayout: layoutByType.marketing,
    render: (props) => <MarketingWidget {...props} />
  } satisfies WidgetDefinition<MarketingPayload>,
  community: {
    type: 'community',
    title: 'Комьюнити',
    description: 'Активность комнат и модерация.',
    defaultLayout: layoutByType.community,
    render: (props) => <CommunityWidget {...props} />
  } satisfies WidgetDefinition<CommunityPayload>,
  documents: {
    type: 'documents',
    title: 'Документы',
    description: 'Согласования и дедлайны документов.',
    defaultLayout: layoutByType.documents,
    render: (props) => <DocumentsWidget {...props} />
  } satisfies WidgetDefinition<DocumentsPayload>,
  support: {
    type: 'support',
    title: 'Поддержка',
    description: 'Тикеты, SLA и очередь.',
    defaultLayout: layoutByType.support,
    render: (props) => <SupportWidget {...props} />
  } satisfies WidgetDefinition<SupportPayload>,
  'system-status': {
    type: 'system-status',
    title: 'Системный статус',
    description: 'Интеграции, очередь синков, ошибки.',
    defaultLayout: layoutByType['system-status'],
    render: (props) => <SystemStatusWidget {...props} />
  } satisfies WidgetDefinition<SystemStatusPayload>,
  'quick-actions': {
    type: 'quick-actions',
    title: 'Быстрые действия',
    description: 'Быстрый доступ к частым шагам.',
    defaultLayout: layoutByType['quick-actions'],
    render: (props) => <QuickActionsWidget {...props} />
  } satisfies WidgetDefinition<QuickActionsPayload>
};

const defaultDataByType: Record<WidgetType, WidgetData> = {
  'projects-tasks': {
    state: 'content',
    source: 'projects-core',
    lastUpdated: new Date().toISOString()
  },
  'ai-agents': {
    state: 'content',
    source: 'ai-hub',
    lastUpdated: new Date().toISOString()
  },
  'marketplace-reactions': {
    state: 'content',
    source: 'marketplace',
    lastUpdated: new Date().toISOString()
  },
  finance: {
    state: 'content',
    source: 'finance',
    lastUpdated: new Date().toISOString()
  },
  marketing: {
    state: 'content',
    source: 'marketing',
    lastUpdated: new Date().toISOString()
  },
  community: {
    state: 'content',
    source: 'community',
    lastUpdated: new Date().toISOString()
  },
  documents: {
    state: 'content',
    source: 'docs',
    lastUpdated: new Date().toISOString()
  },
  support: {
    state: 'content',
    source: 'support',
    lastUpdated: new Date().toISOString()
  },
  'system-status': {
    state: 'content',
    source: 'observability',
    lastUpdated: new Date().toISOString()
  },
  'quick-actions': {
    state: 'content',
    source: 'actions',
    lastUpdated: new Date().toISOString()
  }
};

export function buildInitialWidgetData(widgets: WidgetConfig[]): Record<string, WidgetData> {
  return widgets.reduce<Record<string, WidgetData>>((acc, widget) => {
    const base = defaultDataByType[widget.type];
    acc[widget.id] = {
      ...(base ?? { state: 'loading', source: 'dashboard', lastUpdated: new Date().toISOString() })
    };
    return acc;
  }, {});
}

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return widgetRegistry[type];
}
