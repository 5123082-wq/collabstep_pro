import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const personas = [
  {
    id: 'founder',
    title: 'Бизнес / Основатель',
    description: 'Управляйте дорожной картой, бюджетом и подрядчиками из одной панели.',
    actions: [
      { label: 'Создать проект', href: '/register' },
      { label: 'Посмотреть тарифы', href: '/pricing' }
    ]
  },
  {
    id: 'designers',
    title: 'Дизайнеры',
    description: 'Получайте брифы, собирайте портфолио и подключайте AI-ассистентов.',
    actions: [
      { label: 'Создать профиль дизайнера', href: '/register' },
      { label: 'Посмотреть проекты', href: '/projects' }
    ]
  },
  {
    id: 'developers',
    title: 'Разработчики',
    description: 'Планируйте спринты, синхронизируйтесь с дизайном и маркетингом.',
    actions: [
      { label: 'Создать профиль разработчика', href: '/register' },
      { label: 'Изучить тарифы для команд', href: '/pricing#business' }
    ]
  },
  {
    id: 'marketers',
    title: 'Маркетологи / Копирайтеры',
    description: 'Готовые шаблоны кампаний, генерация контента и аналитика эффективности.',
    actions: [
      { label: 'Создать профиль специалиста', href: '/register' },
      { label: 'Присоединиться к проектам', href: '/projects' }
    ]
  },
  {
    id: 'contractors',
    title: 'Подрядчики',
    description: 'Подключайте команду, управляйте тарифами и предложениями.',
    actions: [
      { label: 'Подключить компанию', href: '/register' },
      { label: 'Посмотреть каталог', href: '/contractors' }
    ]
  }
];

export const metadata: Metadata = {
  title: 'Для кого подходит Collabverse',
  description: 'Collabverse объединяет бизнес, дизайнеров, разработчиков, маркетологов и подрядчиков.',
  openGraph: {
    title: 'Для кого подходит Collabverse',
    description: 'Collabverse объединяет роли в одной платформе: бизнес, креатив и подрядчиков.',
    url: '/audience',
    type: 'website'
  }
};

export default function AudiencePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Для кого</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Команда Collabverse</h1>
        <p className="text-neutral-300">
          Платформа создана для кросс-функциональных команд. Независимо от роли, вы получите доступ к
          AI-помощникам, шаблонам и маркетплейсу.
        </p>
      </header>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {personas.map((persona) => (
          <ContentBlock
            key={persona.id}
            id={persona.id}
            as="article"
            size="sm"
          >
            <ContentBlockTitle as="h2">{persona.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{persona.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {persona.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
