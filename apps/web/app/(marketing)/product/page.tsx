import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const productHighlights = [
  {
    title: 'Единая панель управления',
    description: 'Создавайте проекты, отслеживайте метрики и управляйте задачами с одной страницы.',
    cta: { label: 'Открыть панель', href: '/register' }
  },
  {
    title: 'Интеграция AI-агентов',
    description: 'Подключайте AI для генерации креативов, анализа трендов и подготовки отчётов.',
    cta: { label: 'Посмотреть демо', href: '/product/ai' }
  },
  {
    title: 'Маркетплейс внутри платформы',
    description: 'Находите специалистов и подрядчиков, не покидая рабочее пространство.',
    cta: { label: 'Перейти в каталог', href: '/product/marketplace' }
  }
];

export const metadata: Metadata = {
  title: 'Обзор платформы Collabverse',
  description: 'Узнайте, как Collabverse объединяет управление проектами, AI и маркетплейс услуг.',
  openGraph: {
    title: 'Обзор платформы Collabverse',
    description: 'Collabverse объединяет управление проектами, AI и маркетплейс услуг.',
    url: '/product',
    type: 'website'
  }
};

export default function ProductPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Продукт</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Обзор платформы</h1>
        <p className="text-neutral-300">
          Collabverse — это рабочая среда для запуска продуктов: AI-ассистенты, управление проектами и
          каталоги специалистов собраны в одном месте.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            Попробовать бесплатно
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
          >
            Выбрать тариф
          </Link>
        </div>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {productHighlights.map((item) => (
          <ContentBlock key={item.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{item.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{item.description}</p>
            <Link
              href={item.cta.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {item.cta.label}
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
