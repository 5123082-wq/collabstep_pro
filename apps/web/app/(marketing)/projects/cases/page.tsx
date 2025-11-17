import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const cases = [
  {
    title: 'AI-редизайн e-commerce',
    result: 'Рост конверсии на 34% за 6 недель',
    description: 'Команда Collabverse обновила UX и контент интернет-магазина с помощью AI-агента.',
    href: '/blog'
  },
  {
    title: 'Запуск маркетплейса услуг',
    result: '150 подрядчиков подключены за 3 месяца',
    description: 'Использование шаблонов Collabverse помогло сократить цикл онбординга вдвое.',
    href: '/blog'
  },
  {
    title: 'Выход SaaS-продукта на новый рынок',
    result: '20+ пилотных команд за первый квартал',
    description: 'Кросс-функциональная команда планировала GTM в одной панели и использовала AI-аналитику.',
    href: '/blog'
  }
];

export const metadata: Metadata = {
  title: 'Кейсы клиентов Collabverse',
  description: 'Истории запуска продуктов и кампаний, созданных с помощью Collabverse.',
  openGraph: {
    title: 'Кейсы клиентов Collabverse',
    description: 'Истории запуска продуктов и кампаний, созданных с помощью Collabverse.',
    url: '/projects/cases',
    type: 'website'
  }
};

export default function ProjectsCasesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Кейсы</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Истории команд</h1>
        <p className="text-neutral-300">
          Узнайте, как компании используют Collabverse для запуска продуктов, оптимизации процессов и
          роста бизнеса.
        </p>
      </header>
      <section className="mt-12 space-y-6">
        {cases.map((item) => (
          <ContentBlock key={item.title} as="article" size="sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <ContentBlockTitle as="h2">{item.title}</ContentBlockTitle>
              <span className="text-sm font-semibold text-indigo-300">{item.result}</span>
            </div>
            <p className="mt-3 text-sm text-neutral-400">{item.description}</p>
            <Link
              href={item.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Читать подробнее
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
