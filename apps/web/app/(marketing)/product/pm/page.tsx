import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const templates = [
  {
    title: 'Запуск продукта',
    description: 'Шаблон для быстрых MVP, включает бэклог, roadmap и чек-листы QA.',
    href: '/register'
  },
  {
    title: 'Маркетинговая кампания',
    description: 'Готовый набор задач для запуска рекламной кампании с аналитикой.',
    href: '/register'
  },
  {
    title: 'Агентский проект',
    description: 'Структура для агентств: договоры, этапы согласования и отчётность.',
    href: '/register'
  }
];

export const metadata: Metadata = {
  title: 'Управление проектами в Collabverse',
  description: 'Используйте шаблоны Collabverse для планирования проектов и совместной работы команд.',
  openGraph: {
    title: 'Управление проектами в Collabverse',
    description: 'Шаблоны Collabverse помогают планировать проекты и синхронизировать команду.',
    url: '/product/pm',
    type: 'website'
  }
};

export default function ProductPMPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Управление проектами</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Шаблоны и процессы</h1>
        <p className="text-neutral-300">
          Collabverse предлагает готовые сценарии работы команд: от запуска продукта до масштабирования
          агентских проектов.
        </p>
        <Link
          href="/product/pm"
          className="inline-flex rounded-full border border-indigo-500 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Смотреть шаблоны проектов
        </Link>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {templates.map((template) => (
          <ContentBlock key={template.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{template.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{template.description}</p>
            <Link
              href={template.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Использовать шаблон
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
