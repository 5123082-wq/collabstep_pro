import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const demos = [
  {
    title: 'Генерация айдентики',
    description: 'AI создаёт логотипы, цветовые схемы и гайды по применению бренда.',
    href: '/register'
  },
  {
    title: 'Автоподбор креативов',
    description: 'Подготовьте рекламные макеты и тексты с учётом целевой аудитории.',
    href: '/register'
  },
  {
    title: 'Сценарии онбординга',
    description: 'AI составит интерактивный туториал и рассылку для новых пользователей.',
    href: '/register'
  }
];

export const metadata: Metadata = {
  title: 'AI-агенты Collabverse',
  description: 'Автоматизируйте подготовку бренда, контента и процессов с помощью AI-агентов Collabverse.',
  openGraph: {
    title: 'AI-агенты Collabverse',
    description: 'Автоматизируйте подготовку бренда, контента и процессов с помощью AI-агентов Collabverse.',
    url: '/product/ai',
    type: 'website'
  }
};

export default function ProductAIPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">AI-агенты</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Ускорьте запуск с помощью AI</h1>
        <p className="text-neutral-300">
          Collabverse предлагает набор готовых AI-агентов: от генерации визуалов до автоматизации
          коммуникаций. Попробуйте демо и соберите свою команду.
        </p>
        <Link
          href="/product/ai"
          className="inline-flex rounded-full border border-indigo-500 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Сгенерировать логотип (демо)
        </Link>
      </header>
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {demos.map((demo) => (
          <ContentBlock key={demo.title} as="article" size="sm">
            <ContentBlockTitle as="h2">{demo.title}</ContentBlockTitle>
            <p className="mt-3 text-sm text-neutral-400">{demo.description}</p>
            <Link
              href={demo.href}
              className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Попробовать
            </Link>
          </ContentBlock>
        ))}
      </section>
    </main>
  );
}
