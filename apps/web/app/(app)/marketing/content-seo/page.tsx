import Link from 'next/link';
import MarketingCard from '@/components/marketing/app/MarketingCard';
import MarketingHeader, {
  type MarketingAction,
  type MarketingMetric
} from '@/components/marketing/app/MarketingHeader';
import { ContentBlock } from '@/components/ui/content-block';
import { PROJECTS_HUB_PATH } from '@/components/app/LeftMenu.config';

const actions: MarketingAction[] = [
  { label: 'Добавить черновик', message: 'TODO: Создать запись контент-плана', variant: 'primary' },
  { label: 'Импортировать позиции', message: 'TODO: Импорт позиций из поисковой системы' },
  { label: 'Создать SEO-кластер', message: 'TODO: Создать новый кластер', variant: 'secondary' }
];

const metrics: MarketingMetric[] = [
  {
    id: 'publish-rate',
    label: 'Выпуск по плану',
    value: '78%',
    helper: '9 из 12 публикаций в срок',
    trend: { value: '+6 п.п.', label: 'к прошлому спринту', direction: 'up' }
  },
  {
    id: 'visibility',
    label: 'Видимость / Кластеры',
    value: '42% · 18 кластеров',
    helper: 'По данным поисковой аналитики',
    trend: { value: '+9%', label: 'месяц', direction: 'up' }
  },
  {
    id: 'top-pages',
    label: 'Топ-страницы',
    value: '5 URL',
    helper: 'Генерируют 63% органического трафика',
    trend: { value: '+2', label: 'новые страницы', direction: 'up' }
  },
  {
    id: 'tech-debt',
    label: 'Тех-чек-лист',
    value: '3 задачи',
    helper: 'Требуют согласования с разработкой',
    trend: { value: '-1', label: 'за неделю', direction: 'down' }
  }
];

const calendarItems = [
  { id: 'cal-1', title: 'Кейс NeoBank', date: '12 июня', status: 'Готово', owner: 'Контент-лид' },
  { id: 'cal-2', title: 'Webinar recap', date: '14 июня', status: 'В редактировании', owner: 'Редактор' },
  { id: 'cal-3', title: 'SEO-статья: KYC API', date: '18 июня', status: 'Черновик', owner: 'Копирайтер' },
  { id: 'cal-4', title: 'Email nurture серия', date: '20 июня', status: 'План', owner: 'CRM-маркетолог' }
];

const workflow = [
  { id: 'draft', title: 'Черновики', items: ['SEO-статья: KYC API', 'Гайд по интеграции SDK'] },
  { id: 'review', title: 'На ревью', items: ['Webinar recap', 'Пост для LinkedIn'] },
  { id: 'ready', title: 'Готово', items: ['Кейс NeoBank', 'Product update · июнь'] }
];

const seoClusters = [
  {
    id: 'cluster-api',
    name: 'API и интеграции',
    pages: 6,
    priority: 'Высокий',
    status: 'В работе',
    nextAction: 'Добавить страницу с примерами SDK'
  },
  {
    id: 'cluster-security',
    name: 'Безопасность и KYC',
    pages: 4,
    priority: 'Средний',
    status: 'Исследование',
    nextAction: 'Собрать отзывы клиентов для кейсов'
  },
  {
    id: 'cluster-pricing',
    name: 'Тарифы и расчёт стоимости',
    pages: 3,
    priority: 'Высокий',
    status: 'Черновик',
    nextAction: 'Согласовать калькулятор с финансами'
  }
];

const techChecklist = [
  { id: 'tech-1', item: 'Оптимизировать скорость лендинга', status: 'В процессе', owner: 'Front-end', related: PROJECTS_HUB_PATH },
  { id: 'tech-2', item: 'Исправить дубли метатегов', status: 'Запланировано', owner: 'SEO-специалист', related: '/marketing/analytics' },
  { id: 'tech-3', item: 'Добавить схему FAQ', status: 'Готово', owner: 'Контент-команда', related: '/marketing/content-seo' }
];

export default function MarketingContentSeoPage() {
  return (
    <div className="space-y-8">
      <MarketingHeader
        title="Контент & SEO"
        description="Управление контент-календарём, редакционным процессом и поисковой семантикой."
        actions={actions}
        metrics={metrics}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MarketingCard
            title="Календарь публикаций"
            description="Синхронизирован с проектными релизами и маркетинговыми кампаниями."
          >
            {calendarItems.map((item) => (
              <ContentBlock key={item.id} size="sm" className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-neutral-400">{item.date}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">{item.status}</span>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">{item.owner}</span>
                </div>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Процесс производства контента"
            description="Карточки двигаются по этапам: Черновик → Ревью → Готово."
            columns={3}
          >
            {workflow.map((column) => (
              <ContentBlock key={column.id} size="sm">
                <p className="text-sm font-semibold text-white">{column.title}</p>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {column.items.map((item) => (
                    <li key={item} className="rounded-lg border border-neutral-900/60 bg-neutral-900/40 px-3 py-2 text-neutral-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="SEO-кластеры"
            description="Приоритезация страниц и задач для повышения органического трафика."
          >
            {seoClusters.map((cluster) => (
              <ContentBlock key={cluster.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{cluster.name}</p>
                  <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">
                    {cluster.priority}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Страниц: {cluster.pages}</p>
                <p className="text-xs text-neutral-400">Статус: {cluster.status}</p>
                <p className="text-xs text-neutral-500">Следующее действие: {cluster.nextAction}</p>
              </ContentBlock>
            ))}
          </MarketingCard>
        </div>

        <div className="space-y-4">
          <MarketingCard
            title="Технический чек-лист"
            description="Связан с задачами разработки и аналитикой."
          >
            {techChecklist.map((item) => (
              <ContentBlock key={item.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.item}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Ответственный: {item.owner}</p>
                <Link
                  href={item.related}
                  className="inline-flex items-center gap-2 text-xs font-medium text-indigo-200 transition hover:text-white"
                >
                  Открыть контекст ↗
                </Link>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Связка с проектами"
            description="Контент поддерживает ключевые релизы и маркетинговые задачи."
            footer={
              <span>
                Карточки контента можно создавать прямо из{' '}
                <Link href={PROJECTS_HUB_PATH} className="text-indigo-200 hover:text-white">
                  проекта
                </Link>{' '}
                или из кампаний.
              </span>
            }
          >
            <div className="space-y-2 text-xs text-neutral-300">
              <p>• Проект «NeoBank» — релиз версии 2.0 (план 20 июня)</p>
              <p>• Кампания «Product Launch» — серия статей и лендинг</p>
              <p>• Финансы — бюджет на производство контента согласован</p>
            </div>
          </MarketingCard>
        </div>
      </div>
    </div>
  );
}
