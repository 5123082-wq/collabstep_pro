import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const categories = [
  {
    title: 'Дизайн и бренд',
    description: 'UX/UI, графика, моушен и бренд-стратегия.',
    cta: { label: 'Найти дизайнера', href: '/specialists' }
  },
  {
    title: 'Разработка',
    description: 'Frontend, backend, no-code и интеграции.',
    cta: { label: 'Подобрать разработчика', href: '/specialists' }
  },
  {
    title: 'Маркетинг и контент',
    description: 'Запуск кампаний, контент-маркетинг и аналитика.',
    cta: { label: 'Посмотреть маркетологов', href: '/specialists' }
  },
  {
    title: 'Подрядчики и агентства',
    description: 'Команды полного цикла с готовыми пакетами услуг.',
    cta: { label: 'Перейти к подрядчикам', href: '/contractors' }
  }
];

export const metadata: Metadata = {
  title: 'Маркетплейс услуг Collabverse',
  description: 'Находите специалистов и подрядчиков в маркетплейсе Collabverse для быстрого старта проектов.',
  openGraph: {
    title: 'Маркетплейс услуг Collabverse',
    description: 'Найдите специалистов и подрядчиков в маркетплейсе Collabverse.',
    url: '/product/marketplace',
    type: 'website'
  }
};

export default function ProductMarketplacePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Маркетплейс</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Каталог услуг и специалистов</h1>
        <p className="text-neutral-300">
          Collabverse объединяет экспертов и агентства. Публикуйте проекты, сравнивайте предложения и
          подключайте команды без лишних переговоров.
        </p>
        <Link
          href="/product/marketplace"
          className="inline-flex rounded-full border border-indigo-500 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Открыть каталог
        </Link>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {categories.map((category) => (
          <ContentBlock key={category.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{category.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{category.description}</p>
            <Link
              href={category.cta.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {category.cta.label}
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
