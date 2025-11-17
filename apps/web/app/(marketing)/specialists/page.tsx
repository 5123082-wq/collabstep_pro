import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const categories = [
  {
    title: 'UI/UX дизайнеры',
    description: 'Создают прототипы, дизайн-системы и user-flow.',
    href: '/register'
  },
  {
    title: 'Frontend и backend',
    description: 'Работают с web, mobile и интеграциями.',
    href: '/register'
  },
  {
    title: 'Маркетологи',
    description: 'Запускают кампании, управляют контентом и аналитикой.',
    href: '/register'
  },
  {
    title: 'Продюсеры и PM',
    description: 'Координируют команды, бюджет и сроки.',
    href: '/register'
  }
];

export const metadata: Metadata = {
  title: 'Каталог специалистов Collabverse',
  description: 'Каталог специалистов Collabverse: дизайнеры, разработчики, маркетологи и менеджеры.',
  openGraph: {
    title: 'Каталог специалистов Collabverse',
    description: 'Найдите специалистов для проекта в каталоге Collabverse.',
    url: '/specialists',
    type: 'website'
  }
};

export default function SpecialistsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Специалисты</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Каталог экспертов</h1>
        <p className="text-neutral-300">
          Collabverse помогает собрать команду под любую задачу. Выбирайте специалистов по навыкам,
          рейтингу и отзывам.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            Создать профиль
          </Link>
          <Link
            href="/specialists#rating"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
          >
            Как работает рейтинг
          </Link>
        </div>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {categories.map((category) => (
          <ContentBlock key={category.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{category.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{category.description}</p>
            <Link
              href={category.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Присоединиться
            </Link>
          </ContentBlock>
        ))}
      </section>
      <ContentBlock id="rating" className="mt-16" size="sm" variant="muted">
        <ContentBlockTitle as="h2">Как формируется рейтинг</ContentBlockTitle>
        <ul className="mt-4 space-y-2 text-sm text-neutral-400">
          <li>✔ Отзывы заказчиков и команд.</li>
          <li>✔ Успешно завершённые проекты и соблюдение сроков.</li>
          <li>✔ Участие в кейсах и вебинарах Collabverse.</li>
        </ul>
        <Link
          href="/blog"
          className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Читать гайд
        </Link>
      </ContentBlock>
    </main>
  );
}
