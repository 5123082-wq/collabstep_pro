import Link from 'next/link';
import MarketingCard from '@/components/marketing/app/MarketingCard';
import MarketingHeader, {
  type MarketingAction,
  type MarketingMetric
} from '@/components/marketing/app/MarketingHeader';
import { ContentBlock } from '@/components/ui/content-block';
import { PROJECTS_HUB_PATH } from '@/components/app/LeftMenu.config';

const actions: MarketingAction[] = [
  { label: 'Новая гипотеза', message: 'TODO: Создать гипотезу сегмента', variant: 'primary' },
  { label: 'Запланировать интервью', message: 'TODO: Добавить интервью в календарь' },
  { label: 'Добавить конкурента', message: 'TODO: Создать карточку конкурента', variant: 'secondary' }
];

const metrics: MarketingMetric[] = [
  {
    id: 'hypothesis',
    label: 'Валидированные гипотезы',
    value: '12 / 18',
    helper: 'Обновляются после интервью в CRM-интеграции',
    trend: { value: '+3', label: 'за месяц', direction: 'up' }
  },
  {
    id: 'sentiment',
    label: 'Негатив / Тренды',
    value: '12% негатив / 3 тренда',
    helper: 'Соцсети + мониторинг упоминаний',
    trend: { value: '-4 п.п.', label: 'негатив', direction: 'up' }
  },
  {
    id: 'battlecards',
    label: 'Актуальность battlecards',
    value: '82%',
    helper: 'Последнее обновление 9 июня',
    trend: { value: '+6%', label: 'точность', direction: 'up' }
  },
  {
    id: 'insight-to-action',
    label: 'Инсайты → действия',
    value: '9 связок',
    helper: 'Созданы кампании или контент по инсайтам',
    trend: { value: '+2', label: 'неделя', direction: 'up' }
  }
];

const personas = [
  {
    id: 'persona-founder',
    name: 'Тех-директор fintech-стартапа',
    goals: 'Внедрить модуль KYC за 4 недели',
    pains: 'Сложная интеграция, нужен прозрачный roadmap',
    status: 'В работе'
  },
  {
    id: 'persona-cfo',
    name: 'Финансовый директор банка',
    goals: 'Снизить стоимость обработки транзакций',
    pains: 'Регуляторные риски, высокий CAC',
    status: 'Подтверждено'
  }
];

const segments = [
  { id: 'seg-smb', label: 'SMB Retail', stage: 'Исследуется', size: '40 компаний', lead: 'Маркетинг' },
  { id: 'seg-enterprise', label: 'Enterprise Banking', stage: 'Приоритизован', size: '12 компаний', lead: 'Продажи' }
];

const interviews = [
  { id: 'interview-1', title: 'Интервью с CTO NeoBank', date: '12 июня', status: 'Расшифровка', owner: 'Product marketing' },
  { id: 'interview-2', title: 'JTBD-сессия с CFO RetailBank', date: '17 июня', status: 'Запланировано', owner: 'Исследователь' }
];

const socialMentions = [
  { id: 'mention-1', source: 'X / Twitter', topic: 'Запуск API v2', sentiment: 'Позитив', trend: '+24% упоминаний' },
  { id: 'mention-2', source: 'LinkedIn', topic: 'Обсуждение кейса с NeoBank', sentiment: 'Нейтраль', trend: '+12 лидов' },
  { id: 'mention-3', source: 'Telegram', topic: 'Отзывы о поддержке', sentiment: 'Негатив', trend: '-2 NPS' }
];

const competitorBattlecards = [
  {
    id: 'comp-1',
    name: 'PayFlow',
    focus: 'Сильный продукт в SMB, слабые интеграции',
    lastUpdate: '8 июня',
    resources: ['Battlecard · PDF', 'Скриншоты кабинета']
  },
  {
    id: 'comp-2',
    name: 'FlowX',
    focus: 'Ставка на AI-аналитику, высокая стоимость',
    lastUpdate: '6 июня',
    resources: ['Сравнение фич', 'Галерея креативов']
  }
];

const insightLinks = [
  {
    id: 'insight-campaign',
    title: 'Инсайт: CFO хотят прозрачности ROI',
    action: 'Создать кампанию с финансовым калькулятором',
    link: '/marketing/campaigns'
  },
  {
    id: 'insight-content',
    title: 'Инсайт: Запрос на подробные кейсы интеграции',
    action: 'Добавить серию статей в контент-план',
    link: '/marketing/content-seo'
  }
];

export default function MarketingResearchPage() {
  return (
    <div className="space-y-8">
      <MarketingHeader
        title="Исследования"
        description="Хаб инсайтов по целевой аудитории, соцсетям и конкурентам. Служит источником задач для маркетинга и продукта."
        actions={actions}
        metrics={metrics}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MarketingCard
            title="Целевая аудитория"
            description="Персоны, сегменты и интервью синхронизируются с проектами и продуктовым исследованием."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ContentBlock size="sm">
                <p className="text-sm font-semibold text-white">Персоны</p>
                <ul className="space-y-3 text-xs text-neutral-300">
                  {personas.map((persona) => (
                    <li key={persona.id} className="rounded-xl border border-neutral-900/70 bg-neutral-900/50 p-3">
                      <p className="text-sm font-semibold text-white">{persona.name}</p>
                      <p className="mt-2 text-neutral-400">Цели: {persona.goals}</p>
                      <p className="mt-1 text-neutral-500">Боли: {persona.pains}</p>
                      <span className="mt-2 inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">
                        {persona.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </ContentBlock>
              <ContentBlock size="sm">
                <p className="text-sm font-semibold text-white">Сегменты и интервью</p>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {segments.map((segment) => (
                    <li key={segment.id} className="rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                      <p className="text-sm text-neutral-200">{segment.label}</p>
                      <p>Статус: {segment.stage}</p>
                      <p>Размер: {segment.size}</p>
                      <p>Лид: {segment.lead}</p>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Интервью</p>
                  <ul className="space-y-2 text-xs text-neutral-300">
                    {interviews.map((interview) => (
                      <li key={interview.id} className="rounded-xl border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                        <p className="text-sm text-white">{interview.title}</p>
                        <p className="text-neutral-400">{interview.date} · {interview.status}</p>
                        <p className="text-neutral-500">Ответственный: {interview.owner}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </ContentBlock>
            </div>
          </MarketingCard>

          <MarketingCard
            title="Соцсети и тренды"
            description="Отслеживаем упоминания, тональность и источники для быстрого реагирования."
            columns={1}
          >
            {socialMentions.map((mention) => (
              <ContentBlock key={mention.id} size="sm" className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{mention.topic}</p>
                  <p className="text-xs text-neutral-400">Источник: {mention.source}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">{mention.sentiment}</span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                    {mention.trend}
                  </span>
                </div>
              </ContentBlock>
            ))}
          </MarketingCard>
        </div>

        <div className="space-y-4">
          <MarketingCard
            title="Конкуренты"
            description="Battlecards и журнал активности помогают готовить аргументы в продажах."
          >
            {competitorBattlecards.map((competitor) => (
              <ContentBlock key={competitor.id} size="sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{competitor.name}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    Обновлено {competitor.lastUpdate}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Фокус: {competitor.focus}</p>
                <ul className="space-y-1 text-xs text-neutral-500">
                  {competitor.resources.map((resource) => (
                    <li key={resource} className="rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                      {resource}
                    </li>
                  ))}
                </ul>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Связки инсайт → действие"
            description="Инсайты сразу превращаются в кампании или элементы контент-плана."
            footer={
              <span>
                Связка с{' '}
                <Link href={PROJECTS_HUB_PATH} className="text-indigo-200 hover:text-white">
                  проектами
                </Link>{' '}
                помогает команде видеть влияние исследований на разработку продукта.
              </span>
            }
          >
            {insightLinks.map((insight) => (
              <div key={insight.id} className="space-y-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <p className="text-sm font-semibold text-white">{insight.title}</p>
                <p className="text-xs text-indigo-100/80">{insight.action}</p>
                <Link
                  href={insight.link}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white transition hover:text-neutral-100"
                >
                  Перейти ↗
                </Link>
              </div>
            ))}
          </MarketingCard>
        </div>
      </div>
    </div>
  );
}
