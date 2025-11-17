import Link from 'next/link';
import MarketingCard from '@/components/marketing/app/MarketingCard';
import MarketingHeader, {
  type MarketingAction,
  type MarketingMetric
} from '@/components/marketing/app/MarketingHeader';
import { ContentBlock } from '@/components/ui/content-block';
import { PROJECTS_HUB_PATH } from '@/components/app/LeftMenu.config';

const actions: MarketingAction[] = [
  { label: 'Создать кампанию', message: 'TODO: Создать новую кампанию', variant: 'primary' },
  { label: 'Добавить креатив', message: 'TODO: Добавить креатив в кампанию' },
  { label: 'Подключить рекламный аккаунт', href: '/marketing/analytics', variant: 'secondary' }
];

const metrics: MarketingMetric[] = [
  { id: 'ctr', label: 'CTR', value: '3.9%', helper: 'Средний CTR по активным объявлениям', trend: { value: '+0.6 п.п.', direction: 'up' } },
  { id: 'cpc', label: 'CPC', value: '86 ₽', helper: 'По платным каналам', trend: { value: '-7 ₽', direction: 'down' } },
  {
    id: 'cpa',
    label: 'CPA / ROAS',
    value: '3 400 ₽ · 3.1x',
    helper: 'Синхронизировано с Finance и CRM',
    trend: { value: '+0.2x', label: 'эффективность', direction: 'up' }
  },
  {
    id: 'spend',
    label: 'Расход по каналам',
    value: '312 000 ₽',
    helper: 'За последние 14 дней',
    trend: { value: '+8%', label: 'к прошлому периоду', direction: 'up' }
  }
];

const kanbanColumns = [
  {
    id: 'idea',
    title: 'Идеи',
    count: 3,
    items: ['Партнёрская рассылка', 'Натив в подкасте', 'Ретаргет на оплату']
  },
  {
    id: 'launch',
    title: 'Запуск',
    count: 2,
    items: ['Product Launch', 'ABM для Enterprise']
  },
  {
    id: 'optimisation',
    title: 'Оптимизация',
    count: 4,
    items: ['Search Brand', 'LinkedIn ICP', 'Lookalike 2%', 'Performance Max']
  },
  {
    id: 'paused',
    title: 'Пауза',
    count: 1,
    items: ['Influencer-пилот']
  }
];

const campaignDetails = {
  name: 'Product Launch · Финтех',
  project: 'Проект «NeoBank»',
  owner: 'Маркетинг-менеджер',
  kpi: ['35 SQL / мес', 'CPA ≤ 3 800 ₽', 'ROMI ≥ 250%'],
  utm: 'utm_source=google&utm_medium=cpc&utm_campaign=launch_fintech',
  tasks: ['Обновить лендинг к 17 июня', 'Согласовать оффер с продуктом', 'Настроить ретаргет по CRM сегменту']
};

const adAccounts = [
  { id: 'google', name: 'Google Ads', status: 'Подключено', spend: '145 000 ₽', owner: 'agency@collabverse.ru' },
  { id: 'meta', name: 'Meta Business', status: 'Требует подтверждения', spend: '98 000 ₽', owner: 'marketing@collabverse.ru' },
  { id: 'tiktok', name: 'TikTok Ads', status: 'В обработке', spend: '36 000 ₽', owner: 'creator@collabverse.ru' },
  { id: 'linkedin', name: 'LinkedIn Ads', status: 'Подключено', spend: '33 000 ₽', owner: 'b2b@collabverse.ru' }
];

const automationRules = [
  {
    id: 'pause-low-roas',
    name: 'Пауза при ROAS < 1.5',
    scope: 'Кампании → Performance Max',
    action: 'Пометить кампанию и отправить уведомление в Slack',
    status: 'Активно'
  },
  {
    id: 'raise-budget',
    name: 'Увеличить бюджет топ-креативов',
    scope: 'Ad set · LinkedIn ICP',
    action: 'Авто +15% при CTR > 4% и CPA < 3 000 ₽',
    status: 'Черновик'
  }
];

export default function MarketingCampaignsPage() {
  return (
    <div className="space-y-8">
      <MarketingHeader
        title="Кампании & Реклама"
        description="Консолидированный контроль кампаний, креативов и подключённых рекламных кабинетов."
        actions={actions}
        metrics={metrics}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MarketingCard
            title="Панель кампаний"
            description="Канбан синхронизирован с дорожками проекта и задачами команды."
            columns={4}
          >
            {kanbanColumns.map((column) => (
              <ContentBlock key={column.id} size="sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{column.title}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
                    {column.count}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {column.items.map((item) => (
                    <li key={item} className="rounded-xl border border-neutral-900/70 bg-neutral-900/50 px-3 py-2 text-neutral-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Карточка кампании"
            description="Отражает KPI, бюджет и связь с лендингами. Создать кампанию можно прямо из проекта."
          >
            <ContentBlock size="sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{campaignDetails.name}</p>
                <Link
                  href={PROJECTS_HUB_PATH}
                  className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100 transition hover:border-indigo-400 hover:text-white"
                >
                  Связан с проектом
                </Link>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2 text-xs text-neutral-400">
                  <p>Проект: {campaignDetails.project}</p>
                  <p>Ответственный: {campaignDetails.owner}</p>
                  <p>UTM: {campaignDetails.utm}</p>
                </div>
                <div className="space-y-2 text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-200">KPI:</p>
                  <ul className="space-y-1">
                    {campaignDetails.kpi.map((item) => (
                      <li key={item} className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Задачи на этой неделе</p>
                <ul className="space-y-2 text-xs text-neutral-300">
                  {campaignDetails.tasks.map((task) => (
                    <li key={task} className="rounded-xl border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </ContentBlock>
          </MarketingCard>

          <MarketingCard
            title="Креативы и UTM-наборы"
            description="Управление креативами и пакетами ссылок для мультиканальных запусков."
            columns={2}
          >
            <ContentBlock size="sm">
              <p className="text-sm font-semibold text-white">Пакет «Launch_v2»</p>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li className="flex justify-between rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                  <span>Видео · 30 c</span>
                  <span className="text-neutral-500">CTR 4.3%</span>
                </li>
                <li className="flex justify-between rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                  <span>Баннеры · 1080×1080</span>
                  <span className="text-neutral-500">CTR 2.6%</span>
                </li>
                <li className="flex justify-between rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                  <span>Копия для LinkedIn</span>
                  <span className="text-neutral-500">CPC 92 ₽</span>
                </li>
              </ul>
              <Link
                href="/marketing/content-seo"
                className="inline-flex items-center gap-2 text-xs font-medium text-indigo-200 transition hover:text-white"
              >
                Добавить в контент-план ↗
              </Link>
            </ContentBlock>
            <ContentBlock size="sm">
              <p className="text-sm font-semibold text-white">UTM-набор «Retarget_Q3»</p>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li>utm_source=meta</li>
                <li>utm_medium=paid_social</li>
                <li>utm_campaign=retarget_q3</li>
                <li>utm_content=carousel_a</li>
              </ul>
              <p className="text-xs text-neutral-500">
                Обновляется автоматически через Marketing → Аналитика & Интеграции.
              </p>
            </ContentBlock>
          </MarketingCard>
        </div>

        <div className="space-y-4">
          <MarketingCard
            title="Рекламные аккаунты"
            description="Статусы подключений и расходы по каналам."
          >
            {adAccounts.map((account) => (
              <ContentBlock key={account.id} size="sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{account.name}</p>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    {account.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Расход: {account.spend}</p>
                <p className="text-xs text-neutral-500">Владелец: {account.owner}</p>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Правила авто-оптимизации"
            description="Пилотируемые сценарии помогают управлять ставками и пометками."
          >
            {automationRules.map((rule) => (
              <ContentBlock key={rule.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{rule.name}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    {rule.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Диапазон: {rule.scope}</p>
                <p className="text-xs text-neutral-400">Действие: {rule.action}</p>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Связка с проектами и финансами"
            description="Каждая кампания закреплена за проектом и бюджетной статьёй."
            footer={
              <span>
                Финансовые данные подтягиваются из{' '}
                <Link href="/finance/expenses" className="text-indigo-200 hover:text-white">
                  раздела «Расходы»
                </Link>{' '}
                для контроля факта.
              </span>
            }
          >
            <div className="space-y-2 text-xs text-neutral-300">
              <p>
                • Связанные проекты: <Link href={PROJECTS_HUB_PATH} className="text-indigo-200 hover:text-white">NeoBank</Link>,{' '}
                <Link href={PROJECTS_HUB_PATH} className="text-indigo-200 hover:text-white">Retail CRM</Link>
              </p>
              <p>• Финансовая статья: «Маркетинг / Digital»</p>
              <p>• Ответственные: Маркетинг-менеджер, Финансовый контролёр</p>
            </div>
          </MarketingCard>
        </div>
      </div>
    </div>
  );
}
