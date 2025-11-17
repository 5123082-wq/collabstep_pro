import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const benefits = [
  {
    title: 'Витрина услуг',
    description: 'Создайте карточки проектов, пакеты услуг и подключите расчёт по подписке.',
    href: '/register'
  },
  {
    title: 'Управление командой',
    description: 'Назначайте роли, контролируйте загрузку и сроки.',
    href: '/register'
  },
  {
    title: 'Интеграция с проектами',
    description: 'Подключайтесь к проектам из ленты, отправляйте предложения напрямую.',
    href: '/projects'
  }
];

export const metadata: Metadata = {
  title: 'Каталог подрядчиков Collabverse',
  description: 'Подрядчики и агентства Collabverse подключают услуги, управляют командой и тарифами.',
  openGraph: {
    title: 'Каталог подрядчиков Collabverse',
    description: 'Подрядчики и агентства подключают услуги, управляют командой и тарифами.',
    url: '/contractors',
    type: 'website'
  }
};

export default function ContractorsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Подрядчики</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Каталог поставщиков</h1>
        <p className="text-neutral-300">
          Collabverse помогает агентствам и подрядчикам подключать клиентов, управлять предложениями и
          автоматизировать отчётность.
        </p>
        <Link
          href="/register"
          className="inline-flex rounded-full border border-indigo-500 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Подключить компанию
        </Link>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {benefits.map((benefit) => (
          <ContentBlock key={benefit.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{benefit.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{benefit.description}</p>
            <Link
              href={benefit.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Подробнее
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
