import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const projects = [
  {
    title: 'Запуск мобильного приложения',
    description: 'Ищем команду для запуска MVP: UI/UX, разработка и маркетинг.',
    href: '/register'
  },
  {
    title: 'Редизайн бренд-платформы',
    description: 'Нужны дизайнеры и копирайтеры для обновления бренда и рекламных материалов.',
    href: '/register'
  },
  {
    title: 'Go-to-market SaaS',
    description: 'Комплексный запуск продукта: исследования, промо-материалы и платный трафик.',
    href: '/register'
  }
];

export const metadata: Metadata = {
  title: 'Открытые проекты Collabverse',
  description: 'Исследуйте ленту проектов Collabverse и присоединяйтесь к командам.',
  openGraph: {
    title: 'Открытые проекты Collabverse',
    description: 'Исследуйте ленту проектов и откликайтесь на запросы команд.',
    url: '/projects',
    type: 'website'
  }
};

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Проекты</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Лента открытых проектов</h1>
        <p className="text-neutral-300">
          Откликайтесь на запросы команд, формируйте предложения и собирайте кейсы. Лента обновляется в
          реальном времени.
        </p>
        <Link
          href="/register"
          className="inline-flex rounded-full border border-indigo-500 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Создать профиль
        </Link>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <ContentBlock key={project.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{project.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{project.description}</p>
            <Link
              href={project.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Откликнуться
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
