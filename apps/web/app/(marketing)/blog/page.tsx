import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const articles = [
  {
    title: 'Гайд по запуску AI-агента',
    description: 'Шаги по настройке AI-ассистента для проекта дизайна и маркетинга.',
    href: '/blog'
  },
  {
    title: 'Как собрать команду мечты',
    description: 'Подбор специалистов, подрядчиков и шаблонов работы в Collabverse.',
    href: '/blog'
  },
  {
    title: 'Playbook по запуску кампании',
    description: 'Готовый сценарий кампании с KPI, контентом и чек-листами.',
    href: '/blog'
  }
];

const webinars = [
  {
    title: 'AI + дизайн',
    description: 'Совместная работа дизайнеров и AI-агентов.',
    href: '/blog#webinars'
  },
  {
    title: 'Запуск маркетплейса услуг',
    description: 'Как Collabverse помогает агентствам масштабироваться.',
    href: '/blog#webinars'
  }
];

export const metadata: Metadata = {
  title: 'Блог и гайды Collabverse',
  description: 'Гайды, статьи и вебинары по запуску продуктов в Collabverse.',
  openGraph: {
    title: 'Блог и гайды Collabverse',
    description: 'Гайды, статьи и вебинары по запуску продуктов в Collabverse.',
    url: '/blog',
    type: 'website'
  }
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Блог</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Гайды и плейбуки</h1>
        <p className="text-neutral-300">
          Изучайте лучшие практики Collabverse. Подборки статей и вебинаров помогут ускорить запуск и
          улучшить процессы.
        </p>
      </header>
      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Статьи</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <ContentBlock key={article.title} as="article" size="sm">
              <ContentBlockTitle as="h3">{article.title}</ContentBlockTitle>
              <p className="mt-3 text-sm text-neutral-400">{article.description}</p>
              <Link
                href={article.href}
                className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Читать
              </Link>
            </ContentBlock>
          ))}
        </div>
      </section>
      <section id="webinars" className="mt-16 space-y-6">
        <h2 className="text-2xl font-semibold">Вебинары</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {webinars.map((webinar) => (
            <ContentBlock key={webinar.title} as="article" size="sm">
              <ContentBlockTitle as="h3">{webinar.title}</ContentBlockTitle>
              <p className="mt-3 text-sm text-neutral-400">{webinar.description}</p>
              <Link
                href={webinar.href}
                className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Смотреть расписание
              </Link>
            </ContentBlock>
          ))}
        </div>
      </section>
    </main>
  );
}
