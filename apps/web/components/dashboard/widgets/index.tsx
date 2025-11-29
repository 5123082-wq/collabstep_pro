'use client';

import { cn } from '@/lib/utils';
import type { WidgetRendererProps } from '@/lib/dashboard/types';

type Tone = 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'violet';

const toneMap: Record<Tone, string> = {
  emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-500/50 bg-amber-500/10 text-amber-100',
  sky: 'border-sky-500/50 bg-sky-500/10 text-sky-100',
  rose: 'border-rose-500/50 bg-rose-500/10 text-rose-50',
  slate: 'border-neutral-800 bg-neutral-900/70 text-neutral-200',
  violet: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-100'
};

function MetricCard({
  label,
  value,
  hint,
  tone = 'slate'
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn('rounded-xl border px-3 py-2 text-left text-[13px] leading-tight', toneMap[tone])}>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
      {hint ? <p className="text-[10px] text-neutral-400">{hint}</p> : null}
    </div>
  );
}

function Pill({
  children,
  tone = 'slate'
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={cn('rounded-full border px-2 py-1 text-[10px] leading-tight', toneMap[tone])}>
      {children}
    </span>
  );
}

export type ProjectsTasksPayload = {
  summary: {
    overdue: number;
    dueSoon: number;
    blockers: number;
    activeSprints: number;
  };
  spotlight: { title: string; due: string; risk: 'overdue' | 'warning' | 'ok' }[];
};

export function ProjectsTasksWidget({ data }: WidgetRendererProps<ProjectsTasksPayload>) {
  const payload: ProjectsTasksPayload = data.payload ?? {
    summary: { overdue: 3, dueSoon: 6, blockers: 2, activeSprints: 2 },
    spotlight: [
      { title: 'Запуск лендинга', due: 'Сегодня', risk: 'warning' },
      { title: 'Финализация ТЗ по AI-боту', due: 'Завтра', risk: 'ok' },
      { title: 'Согласование бюджета', due: 'Просрочено', risk: 'overdue' }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Просрочено" value={`${payload.summary.overdue}`} hint="Требуют внимания" tone="rose" />
        <MetricCard label="Дедлайн скоро" value={`${payload.summary.dueSoon}`} hint="На этой неделе" tone="amber" />
        <MetricCard label="Блокеры" value={`${payload.summary.blockers}`} hint="Ожидают разблокировки" tone="violet" />
        <MetricCard label="Активные спринты" value={`${payload.summary.activeSprints}`} hint="Фокусные" tone="emerald" />
      </div>
      <div className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
        <p className="text-[13px] font-semibold text-neutral-300">Внимание</p>
        {payload.spotlight.map((item) => (
          <div key={item.title} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900/60 px-3 py-2">
            <div className="flex flex-col gap-1">
              <p className="text-[13px] text-white">{item.title}</p>
              <p className="text-[10px] text-neutral-400">Дедлайн: {item.due}</p>
            </div>
            {item.risk === 'overdue' && <Pill tone="rose">Просрочено</Pill>}
            {item.risk === 'warning' && <Pill tone="amber">Риск</Pill>}
            {item.risk === 'ok' && <Pill tone="emerald">В графике</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

export type AiAgentsPayload = {
  active: number;
  paused: number;
  failed: number;
  incidents: { id: string; name: string; status: 'error' | 'degraded' | 'ok'; updatedAt: string }[];
};

export function AiAgentsWidget({ data }: WidgetRendererProps<AiAgentsPayload>) {
  const payload: AiAgentsPayload = data.payload ?? {
    active: 5,
    paused: 2,
    failed: 1,
    incidents: [
      { id: 'incident-1', name: 'Обработка лидов', status: 'degraded', updatedAt: '5 мин назад' },
      { id: 'incident-2', name: 'Подбор исполнителей', status: 'ok', updatedAt: '10 мин назад' },
      { id: 'incident-3', name: 'Email-рассылки', status: 'error', updatedAt: 'только что' }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Активно" value={`${payload.active}`} hint="Запущено сейчас" tone="emerald" />
        <MetricCard label="Поставлено на паузу" value={`${payload.paused}`} hint="Ожидают рестарта" tone="amber" />
        <MetricCard label="С ошибками" value={`${payload.failed}`} hint="Требуют внимания" tone="rose" />
      </div>
      <div className="space-y-1.5">
        {payload.incidents.map((incident) => (
          <div
            key={incident.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2"
          >
            <div className="flex flex-col">
              <p className="text-[13px] text-white">{incident.name}</p>
              <p className="text-[10px] text-neutral-400">Обновлено {incident.updatedAt}</p>
            </div>
            {incident.status === 'ok' && <Pill tone="emerald">OK</Pill>}
            {incident.status === 'degraded' && <Pill tone="amber">Degraded</Pill>}
            {incident.status === 'error' && <Pill tone="rose">Ошибка</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

export type MarketplaceReactionsPayload = {
  rating: number;
  unread: number;
  recent: { id: string; author: string; rating: number; text: string; createdAt: string }[];
};

export function MarketplaceReactionsWidget({ data }: WidgetRendererProps<MarketplaceReactionsPayload>) {
  const payload: MarketplaceReactionsPayload = data.payload ?? {
    rating: 4.8,
    unread: 6,
    recent: [
      { id: 'rev-1', author: 'Анна К.', rating: 5, text: 'Быстрая доставка и отличное качество!', createdAt: '1ч назад' },
      { id: 'rev-2', author: 'Максим', rating: 4, text: 'Нужно больше примеров в шаблонах.', createdAt: '3ч назад' }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Средний рейтинг" value={payload.rating.toFixed(1)} hint="По последним отзывам" tone="emerald" />
        <MetricCard label="Непрочитанные" value={`${payload.unread}`} hint="Требуют ответа" tone="amber" />
      </div>
      <div className="space-y-1.5">
        {payload.recent.map((review) => (
          <div key={review.id} className="flex flex-col gap-1 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-white">{review.author}</p>
              <Pill tone="emerald">{review.rating.toFixed(1)}</Pill>
            </div>
            <p className="text-[12px] text-neutral-300">{review.text}</p>
            <p className="text-[10px] text-neutral-500">{review.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export type FinancePayload = {
  mrr: number;
  arr: number;
  cash: number;
  burn: number;
  runwayMonths: number;
  trend: number;
};

export function FinanceWidget({ data }: WidgetRendererProps<FinancePayload>) {
  const payload: FinancePayload = data.payload ?? {
    mrr: 58000,
    arr: 696000,
    cash: 185000,
    burn: 42000,
    runwayMonths: 4.4,
    trend: 12
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="MRR" value={`$${payload.mrr.toLocaleString('en-US')}`} hint="+12% к прошлому месяцу" tone="emerald" />
        <MetricCard label="ARR" value={`$${payload.arr.toLocaleString('en-US')}`} hint="Цель: $750k" tone="violet" />
        <MetricCard label="Cash" value={`$${payload.cash.toLocaleString('en-US')}`} hint={`Runway: ${payload.runwayMonths} мес`} tone="sky" />
        <MetricCard label="Burn" value={`$${payload.burn.toLocaleString('en-US')}`} hint="в месяц" tone="amber" />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2">
        <div className="flex flex-col">
          <p className="text-[13px] text-white">Тренд</p>
          <p className="text-[10px] text-neutral-400">Динамика по выручке</p>
        </div>
        <Pill tone={payload.trend >= 0 ? 'emerald' : 'rose'}>
          {payload.trend >= 0 ? '+' : ''}
          {payload.trend}% MoM
        </Pill>
      </div>
    </div>
  );
}

export type MarketingPayload = {
  campaignsActive: number;
  roas: number;
  cac: number;
  ctr: number;
  anomalies: string[];
};

export function MarketingWidget({ data }: WidgetRendererProps<MarketingPayload>) {
  const payload: MarketingPayload = data.payload ?? {
    campaignsActive: 8,
    roas: 3.4,
    cac: 42,
    ctr: 3.2,
    anomalies: ['Рост CPC на Meta Ads', 'Снижение конверсии в signup']
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Активные кампании" value={`${payload.campaignsActive}`} tone="emerald" />
        <MetricCard label="ROAS" value={`${payload.roas.toFixed(1)}x`} hint="Последние 7 дней" tone="violet" />
        <MetricCard label="CAC" value={`$${payload.cac}`} hint="Сейчас" tone="sky" />
        <MetricCard label="CTR" value={`${payload.ctr}%`} hint="Среднее по объявлениям" tone="amber" />
      </div>
      <div className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
        <p className="text-[13px] font-semibold text-neutral-300">Аномалии</p>
        {payload.anomalies.map((item) => (
          <div key={item} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900/60 px-3 py-2">
            <p className="text-[13px] text-white">{item}</p>
            <Pill tone="amber">Проверить</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

export type CommunityPayload = {
  newThreads: number;
  pendingReviews: number;
  topRooms: { name: string; members: number; trend: number }[];
};

export function CommunityWidget({ data }: WidgetRendererProps<CommunityPayload>) {
  const payload: CommunityPayload = data.payload ?? {
    newThreads: 12,
    pendingReviews: 4,
    topRooms: [
      { name: 'Product Hub', members: 38, trend: 12 },
      { name: 'Growth', members: 22, trend: 5 },
      { name: 'Design', members: 19, trend: -3 }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Новые темы" value={`${payload.newThreads}`} hint="за 24 часа" tone="emerald" />
        <MetricCard label="Ожидают модерации" value={`${payload.pendingReviews}`} hint="к публикации" tone="amber" />
      </div>
      <div className="space-y-2">
        {payload.topRooms.map((room) => (
          <div key={room.name} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
            <div className="flex flex-col">
              <p className="text-sm text-white">{room.name}</p>
              <p className="text-[11px] text-neutral-400">{room.members} участников</p>
            </div>
            <Pill tone={room.trend >= 0 ? 'emerald' : 'rose'}>
              {room.trend >= 0 ? '+' : ''}
              {room.trend}% вовлеченность
            </Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

export type DocumentsPayload = {
  pendingApprovals: number;
  expiring: number;
  drafts: number;
  highlights: string[];
};

export function DocumentsWidget({ data }: WidgetRendererProps<DocumentsPayload>) {
  const payload: DocumentsPayload = data.payload ?? {
    pendingApprovals: 3,
    expiring: 2,
    drafts: 5,
    highlights: ['Договор с подрядчиком', 'NDA с партнером', 'Счёт за инфраструктуру']
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="На согласовании" value={`${payload.pendingApprovals}`} tone="amber" />
        <MetricCard label="Срок истекает" value={`${payload.expiring}`} tone="rose" />
        <MetricCard label="Черновики" value={`${payload.drafts}`} tone="slate" />
      </div>
      <div className="space-y-2">
        {payload.highlights.map((doc) => (
          <div key={doc} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
            <p className="text-sm text-white">{doc}</p>
            <Pill tone="sky">Открыть</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

export type SupportPayload = {
  open: number;
  waiting: number;
  sla: number;
  recentTickets: { id: string; title: string; severity: 'high' | 'medium' | 'low'; eta: string }[];
};

export function SupportWidget({ data }: WidgetRendererProps<SupportPayload>) {
  const payload: SupportPayload = data.payload ?? {
    open: 14,
    waiting: 5,
    sla: 92,
    recentTickets: [
      { id: 'sup-1', title: 'Ошибка оплаты на тарифе Pro', severity: 'high', eta: '30м' },
      { id: 'sup-2', title: 'Нужно изменить домен', severity: 'medium', eta: '2ч' },
      { id: 'sup-3', title: 'Вопрос по интеграции', severity: 'low', eta: '6ч' }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Открыто" value={`${payload.open}`} tone="violet" />
        <MetricCard label="Ожидают ответа" value={`${payload.waiting}`} tone="amber" />
        <MetricCard label="SLA, %" value={`${payload.sla}`} tone="emerald" />
      </div>
      <div className="space-y-2">
        {payload.recentTickets.map((ticket) => (
          <div key={ticket.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
            <div className="flex flex-col">
              <p className="text-sm text-white">{ticket.title}</p>
              <p className="text-[11px] text-neutral-400">ETA: {ticket.eta}</p>
            </div>
            {ticket.severity === 'high' && <Pill tone="rose">High</Pill>}
            {ticket.severity === 'medium' && <Pill tone="amber">Medium</Pill>}
            {ticket.severity === 'low' && <Pill tone="emerald">Low</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

export type SystemStatusPayload = {
  nextSync: string;
  services: { name: string; status: 'ok' | 'warning' | 'error'; lastSync: string }[];
  queue: { pending: number; failing: number };
};

export function SystemStatusWidget({ data }: WidgetRendererProps<SystemStatusPayload>) {
  const payload: SystemStatusPayload = data.payload ?? {
    nextSync: 'через 5 минут',
    queue: { pending: 8, failing: 1 },
    services: [
      { name: 'Projects API', status: 'ok', lastSync: '2 мин назад' },
      { name: 'Marketing Ads', status: 'warning', lastSync: '12 мин назад' },
      { name: 'Finance Sync', status: 'error', lastSync: '40 мин назад' }
    ]
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Очередь" value={`${payload.queue.pending}`} hint="на синк" tone="violet" />
        <MetricCard label="Ошибок" value={`${payload.queue.failing}`} hint="последний час" tone="rose" />
        <MetricCard label="След. синк" value={payload.nextSync} tone="sky" />
      </div>
      <div className="space-y-2">
        {payload.services.map((service) => (
          <div key={service.name} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
            <div className="flex flex-col">
              <p className="text-sm text-white">{service.name}</p>
              <p className="text-[11px] text-neutral-400">Последний синк: {service.lastSync}</p>
            </div>
            {service.status === 'ok' && <Pill tone="emerald">OK</Pill>}
            {service.status === 'warning' && <Pill tone="amber">Предупреждение</Pill>}
            {service.status === 'error' && <Pill tone="rose">Ошибка</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

export type QuickActionsPayload = {
  actions: { id: string; label: string; hint: string }[];
};

export function QuickActionsWidget({ data }: WidgetRendererProps<QuickActionsPayload>) {
  const payload: QuickActionsPayload = data.payload ?? {
    actions: [
      { id: 'create-task', label: 'Создать задачу', hint: 'Для проекта или кампании' },
      { id: 'new-campaign', label: 'Запустить кампанию', hint: 'Meta / Google Ads' },
      { id: 'open-ticket', label: 'Открыть тикет', hint: 'В поддержку или саппорт партнёров' },
      { id: 'restart-agent', label: 'Перезапустить агента', hint: 'Устранить сбой пайплайна' }
    ]
  };

  return (
    <div className="flex flex-wrap gap-2">
      {payload.actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="flex-1 min-w-[140px] rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-3 py-2 text-left text-sm text-white transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          <p className="font-semibold">{action.label}</p>
          <p className="text-[11px] text-indigo-100/80">{action.hint}</p>
        </button>
      ))}
    </div>
  );
}
