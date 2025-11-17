'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/ui/toast';
import MarketingCard from '@/components/marketing/app/MarketingCard';
import MarketingHeader, {
  type MarketingAction,
  type MarketingMetric
} from '@/components/marketing/app/MarketingHeader';
import { ContentBlock } from '@/components/ui/content-block';
import { PROJECTS_HUB_PATH } from '@/components/app/LeftMenu.config';

const actions: MarketingAction[] = [
  { label: 'Создать кампанию', message: 'TODO: Мастер создания кампании', variant: 'primary' },
  { label: 'Добавить пост в контент-план', href: '/marketing/content-seo' },
  { label: 'Подключить источник данных', href: '/marketing/analytics', variant: 'secondary' }
];

const metrics: MarketingMetric[] = [
  {
    id: 'cpl',
    label: 'CPL / CPA',
    value: '1 250 ₽ / 3 400 ₽',
    helper: 'Средняя стоимость лида и привлечения за 7 дней',
    trend: { value: '-6%', label: 'неделя', direction: 'down' }
  },
  {
    id: 'roas',
    label: 'ROAS',
    value: '3.4x',
    helper: 'С учётом данных из Finance → Расходы',
    trend: { value: '+0.4x', label: 'vs 30 дней', direction: 'up' }
  },
  {
    id: 'leads7',
    label: 'Лиды · 7 дней',
    value: '128',
    helper: 'Новые конверсии из всех каналов',
    trend: { value: '+18%', label: 'к прошлой неделе', direction: 'up' }
  },
  {
    id: 'leads30',
    label: 'Лиды · 30 дней',
    value: '463',
    helper: 'План выполнен на 92% (Projects → OKR)',
    trend: { value: '+12%', label: 'к прошлому месяцу', direction: 'up' }
  }
];

const connectedWorkspaces = [
  {
    id: 'projects',
    title: 'Проекты',
    description: 'Создавайте кампании и исследования напрямую из дорожек проекта и отслеживайте их как deliverables.',
    link: PROJECTS_HUB_PATH,
    linkLabel: 'Открыть проекты'
  },
  {
    id: 'finance',
    title: 'Финансы',
    description: 'Сверяйте бюджеты и факт расходов, чтобы считать ROI кампаний и планировать закупки.',
    link: '/finance/expenses',
    linkLabel: 'БЮДЖЕТ'
  }
];

const hubSignals = [
  {
    id: 'okr',
    label: 'OKR & цели',
    value: '4 активных',
    helper: '2 цели ждут апдейта этой недели'
  },
  {
    id: 'integrations',
    label: 'Интеграции',
    value: '8 источников',
    helper: 'CRM синхронизирована 2 часа назад'
  },
  {
    id: 'pipeline',
    label: 'Лид-стрим',
    value: '64 SQL',
    helper: 'в работе у команды продаж'
  }
];

const okrGoals = [
  {
    id: 'okr-awareness',
    title: 'Узнаваемость бренда',
    progress: '78%',
    owner: 'Маркетинг / Бренд',
    next: 'Готовится лендинг релиза v2'
  },
  {
    id: 'okr-leads',
    title: '100 SQL по ICP за квартал',
    progress: '62%',
    owner: 'Продажи + Маркетинг',
    next: 'Связаться с продуктовой командой для нового оффера'
  }
];

const activeCampaigns = [
  {
    id: 'cmp-launch',
    name: 'Запуск продукта в финтех-сегменте',
    status: 'В работе',
    kpi: '35 SQL / мес',
    budget: '450 000 ₽ из 600 000 ₽',
    link: '/marketing/campaigns'
  },
  {
    id: 'cmp-brand',
    name: 'Осведомлённость · Digital PR',
    status: 'Активация',
    kpi: 'SOV 15%',
    budget: 'Использовано 40%',
    link: PROJECTS_HUB_PATH
  }
];

const budgetHighlights = [
  { id: 'planned', label: 'План', value: '1 200 000 ₽', note: 'Бюджет квартала в Finance → Расходы' },
  { id: 'actual', label: 'Факт', value: '980 000 ₽', note: 'Оплачено 68% счетов' },
  { id: 'forecast', label: 'Прогноз', value: '1 150 000 ₽', note: 'С учётом заказанных кампаний' }
];

const leadWindows = [
  { id: 'seven', label: '7 дней', value: '128 лидов', quality: '42 MQL → 18 SQL' },
  { id: 'thirty', label: '30 дней', value: '463 лида', quality: '148 MQL → 64 SQL' }
];

const topChannels = [
  { id: 'google', label: 'Google Ads', leads: 143, cpl: '1 120 ₽', trend: '+9%' },
  { id: 'meta', label: 'Meta Ads', leads: 96, cpl: '1 430 ₽', trend: '+4%' },
  { id: 'events', label: 'Партнёрские вебинары', leads: 58, cpl: '0 ₽', trend: '+12%' }
];

const alerts = [
  {
    id: 'alert-budget',
    title: 'Перерасход по кампании «Product Launch»',
    description: 'Факт превысил план на 12%. Проверьте сделки и корректировки бюджета.',
    link: '/marketing/campaigns'
  },
  {
    id: 'alert-integrations',
    title: 'CRM-синк устарел на 26 часов',
    description: 'Обновите интеграцию в разделе «Аналитика & Интеграции».',
    link: '/marketing/analytics'
  }
];

const upcomingTasks = [
  {
    id: 'task-brief',
    title: 'Подготовить бриф для контента релиза',
    due: '14 июня',
    owner: 'Контент-лид',
    related: PROJECTS_HUB_PATH
  },
  {
    id: 'task-finance',
    title: 'Согласовать продление бюджета с финансовой командой',
    due: '18 июня',
    owner: 'Маркетинг-менеджер',
    related: '/finance/expenses'
  }
];

export default function MarketingOverviewPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      // Загружаем информацию о проекте для отображения контекста
      fetch(`/api/pm/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.project) {
            setProjectName(data.project.name);
          }
        })
        .catch(() => {
          // Игнорируем ошибки загрузки проекта
        });
    }
  }, [projectId]);

  return (
    <div className="space-y-8">
      {projectId && projectName && (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-200/60 uppercase tracking-wide">Контекст проекта</p>
              <p className="mt-1 text-sm font-semibold text-indigo-100">{projectName}</p>
            </div>
            <Link
              href={`/pm/projects/${projectId}`}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-xs font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/30"
            >
              Открыть проект →
            </Link>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Маркетинг</h1>
          <p className="text-sm text-neutral-400">
            Управляйте кампаниями, контентом и аналитикой. Создавайте кампании, планируйте контент и отслеживайте метрики.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toast('TODO: Мастер создания кампании')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Создать кампанию
          </button>
          <Link
            href="/marketing/content-seo"
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Добавить пост
          </Link>
        </div>
      </div>
      <ContentBlock>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Маркетинговый хаб</p>
            <h1 className="text-xl font-semibold text-neutral-50">Обзор маркетинга проекта</h1>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-300">
            {hubSignals.map((signal) => (
              <div key={signal.id} className="content-block-sm">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-neutral-500">{signal.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{signal.value}</p>
                <p className="mt-1 text-xs text-neutral-400">{signal.helper}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="cs-auto-grid gap-4">
          {connectedWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="content-block-sm flex flex-col justify-between sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{workspace.title}</p>
                <p className="text-xs text-neutral-400">{workspace.description}</p>
              </div>
              <Link
                href={workspace.link}
                className="inline-flex items-center justify-center rounded-2xl border border-indigo-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {workspace.linkLabel}
              </Link>
            </div>
          ))}
        </div>
      </ContentBlock>

      <MarketingHeader
        title="Маркетинговый обзор"
        description="Единый дашборд целей, кампаний и лидов проекта. Позволяет сверять маркетинг со стадиями проекта и бюджетом."
        actions={actions}
        metrics={metrics}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MarketingCard
            title="Цели и OKR"
            description="Связаны с прогрессом проекта и общими OKR из Project Hub."
          >
            {okrGoals.map((goal) => (
              <ContentBlock key={goal.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{goal.title}</p>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">
                    {goal.progress}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-400">Ответственный: {goal.owner}</p>
                <p className="mt-3 text-sm text-neutral-300">Следующий шаг: {goal.next}</p>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Активные кампании"
            description="Канбан и карточки кампаний синхронизированы с проектными дорожками."
          >
            {activeCampaigns.map((campaign) => (
              <ContentBlock key={campaign.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{campaign.name}</p>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    {campaign.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
                  <span>KPI: {campaign.kpi}</span>
                  <span>Бюджет: {campaign.budget}</span>
                </div>
                <Link
                  href={campaign.link}
                  className="inline-flex items-center gap-2 text-xs font-medium text-indigo-200 transition hover:text-white"
                >
                  Открыть кампанию ↗
                </Link>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Бюджет vs Факт"
            description="Сверка с финансовым учётом ведётся автоматически через Finance."
            columns={3}
          >
            {budgetHighlights.map((item) => (
              <ContentBlock key={item.id} size="sm">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-xs text-neutral-400">{item.note}</p>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Лиды за 7 / 30 дней"
            description="Потоки лидов приходят из CRM и веб-форм. Маркетинг передаёт SQL в продажи."
            columns={2}
          >
            {leadWindows.map((window) => (
              <ContentBlock key={window.id} size="sm">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{window.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{window.value}</p>
                <p className="mt-3 text-xs text-neutral-400">{window.quality}</p>
              </ContentBlock>
            ))}
          </MarketingCard>
        </div>

        <div className="space-y-4">
          <MarketingCard
            title="Топ-каналы"
            description="По данным атрибуции и расходам."
          >
            {topChannels.map((channel) => (
              <ContentBlock key={channel.id} size="sm" className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{channel.label}</p>
                  <p className="text-xs text-neutral-400">{channel.leads} лидов · CPL {channel.cpl}</p>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                  {channel.trend}
                </span>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Алерты"
            description="Уведомления по кампаниям и интеграциям."
          >
            {alerts.map((alert) => (
              <ContentBlock key={alert.id} variant="error" size="sm">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-xs">{alert.description}</p>
                <Link
                  href={alert.link}
                  className="inline-flex items-center gap-2 text-xs font-semibold transition hover:text-white"
                >
                  Перейти ↗
                </Link>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Ближайшие задачи"
            description="Синхронизируются с проектным бэклогом."
          >
            {upcomingTasks.map((task) => (
              <ContentBlock key={task.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{task.title}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    до {task.due}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Ответственный: {task.owner}</p>
                <Link
                  href={task.related}
                  className="inline-flex items-center gap-2 text-xs font-medium text-indigo-200 transition hover:text-white"
                >
                  Открыть контекст ↗
                </Link>
              </ContentBlock>
            ))}
          </MarketingCard>
        </div>
      </div>
    </div>
  );
}
