import Link from 'next/link';
import MarketingCard from '@/components/marketing/app/MarketingCard';
import MarketingHeader, {
  type MarketingAction,
  type MarketingMetric
} from '@/components/marketing/app/MarketingHeader';
import { ContentBlock } from '@/components/ui/content-block';

const actions: MarketingAction[] = [
  { label: 'Подключить источник данных', message: 'TODO: Подключить новый источник', variant: 'primary' },
  { label: 'Настроить атрибуцию', message: 'TODO: Выбрать модель атрибуции' },
  { label: 'Собрать UTM-шаблон', message: 'TODO: Создать UTM-шаблон', variant: 'secondary' }
];

const metrics: MarketingMetric[] = [
  {
    id: 'attributed',
    label: 'Атрибутированные лиды',
    value: '86%',
    helper: 'Из CRM + веб-форм за 30 дней',
    trend: { value: '+5 п.п.', label: 'точность', direction: 'up' }
  },
  {
    id: 'sync',
    label: 'Свежесть синка',
    value: '2 ч',
    helper: 'Последний импорт данных',
    trend: { value: '-1 ч', label: 'ускорение', direction: 'up' }
  },
  {
    id: 'channel-share',
    label: 'Вклад каналов',
    value: 'Paid 54% · Organic 31% · Direct 15%',
    helper: 'На основе модели «Взвешенная»'
  },
  {
    id: 'connectors',
    label: 'Коннекторы',
    value: '6 активных',
    helper: 'CRM, GA4, Ads, соцсети, email, финансы',
    trend: { value: '+1', label: 'за месяц', direction: 'up' }
  }
];

const integrations = [
  { id: 'crm', name: 'CRM (HubSpot)', status: 'Активно', lastSync: '2 ч назад', owner: 'sales@collabverse.ru' },
  { id: 'ga4', name: 'Google Analytics 4', status: 'Активно', lastSync: '45 мин назад', owner: 'analytics@collabverse.ru' },
  { id: 'ads', name: 'Google Ads', status: 'Активно', lastSync: '30 мин назад', owner: 'agency@collabverse.ru' },
  { id: 'meta', name: 'Meta Ads', status: 'Ошибка', lastSync: '12 ч назад', owner: 'marketing@collabverse.ru' },
  { id: 'email', name: 'Email-платформа', status: 'Ожидает подключение', lastSync: '—', owner: 'crm@collabverse.ru' }
];

const channelSummary = [
  { id: 'paid', channel: 'Платные', spend: '312 000 ₽', leads: 238, cpa: '1 310 ₽', roas: '3.1x' },
  { id: 'organic', channel: 'Органика', spend: '—', leads: 146, cpa: '0 ₽', roas: '—' },
  { id: 'referral', channel: 'Партнёрства', spend: '46 000 ₽', leads: 58, cpa: '793 ₽', roas: '4.2x' }
];

const attributionModels = [
  {
    id: 'first-click',
    name: 'Первый клик',
    description: 'Используется для верхней воронки и анализа узнаваемости.',
    usage: 'Основной для PR-кампаний'
  },
  {
    id: 'last-click',
    name: 'Последний клик',
    description: 'Определяет финальный канал перед конверсией.',
    usage: 'Сверка с Finance → Расходы'
  },
  {
    id: 'weighted',
    name: 'Взвешенная',
    description: 'Распределяет вклад между точками контакта.',
    usage: 'Применяется к квартальной отчётности'
  }
];

const utmTemplates = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    params: ['utm_source={{channel}}', 'utm_medium={{medium}}', 'utm_campaign=launch_q3', 'utm_content={{creative}}'],
    owner: 'Маркетинг-менеджер'
  },
  {
    id: 'retarget',
    name: 'Retargeting',
    params: ['utm_source={{platform}}', 'utm_medium=retarget', 'utm_campaign=retarget_sql', 'utm_term={{audience}}'],
    owner: 'Performance'
  }
];

export default function MarketingAnalyticsPage() {
  return (
    <div className="space-y-8">
      <MarketingHeader
        title="Аналитика & Интеграции"
        description="Подключайте источники данных, управляйте атрибуцией и следите за вкладом каналов."
        actions={actions}
        metrics={metrics}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MarketingCard
            title="Интеграции"
            description="Подключенные коннекторы и их статус синхронизации."
          >
            {integrations.map((integration) => (
              <ContentBlock key={integration.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{integration.name}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    {integration.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Последняя синхронизация: {integration.lastSync}</p>
                <p className="text-xs text-neutral-500">Ответственный: {integration.owner}</p>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Свод каналов"
            description="Расходы, лиды и эффективность по каждому каналу."
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-900/70">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900/60 text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Канал</th>
                    <th className="px-4 py-3 font-medium">Расход</th>
                    <th className="px-4 py-3 font-medium">Лиды</th>
                    <th className="px-4 py-3 font-medium">CPA</th>
                    <th className="px-4 py-3 font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {channelSummary.map((row) => (
                    <tr key={row.id} className="border-t border-neutral-900/60">
                      <td className="px-4 py-3 text-sm text-white">{row.channel}</td>
                      <td className="px-4 py-3">{row.spend}</td>
                      <td className="px-4 py-3">{row.leads}</td>
                      <td className="px-4 py-3">{row.cpa}</td>
                      <td className="px-4 py-3">{row.roas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MarketingCard>

          <MarketingCard
            title="Модели атрибуции"
            description="Выберите модель, чтобы корректно распределять вклад каналов."
          >
            {attributionModels.map((model) => (
              <ContentBlock key={model.id} size="sm">
                <p className="text-sm font-semibold text-white">{model.name}</p>
                <p className="text-xs text-neutral-400">{model.description}</p>
                <p className="text-xs text-neutral-500">Использование: {model.usage}</p>
              </ContentBlock>
            ))}
          </MarketingCard>
        </div>

        <div className="space-y-4">
          <MarketingCard
            title="UTM-шаблоны"
            description="Шаблоны для быстрого запуска кампаний и унификации аналитики."
          >
            {utmTemplates.map((template) => (
              <ContentBlock key={template.id} size="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{template.name}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300">
                    {template.owner}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-neutral-400">
                  {template.params.map((param) => (
                    <li key={param} className="rounded-lg border border-neutral-900/70 bg-neutral-900/40 px-3 py-2">
                      {param}
                    </li>
                  ))}
                </ul>
              </ContentBlock>
            ))}
          </MarketingCard>

          <MarketingCard
            title="Связка с финансами"
            description="Расходы подтягиваются автоматически и сравниваются с бюджетом."
            footer={
              <span>
                Для детального анализа перейдите в{' '}
                <Link href="/finance/expenses" className="text-indigo-200 hover:text-white">
                  раздел «Финансы»
                </Link>
                .
              </span>
            }
          >
            <div className="space-y-2 text-xs text-neutral-300">
              <p>• Плановые бюджеты импортируются из Finance</p>
              <p>• Фактические расходы сверяются ежедневно</p>
              <p>• Данные передаются в кампании для расчёта ROAS</p>
            </div>
          </MarketingCard>
        </div>
      </div>
    </div>
  );
}
