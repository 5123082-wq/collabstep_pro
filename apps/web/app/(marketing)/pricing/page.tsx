import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const plans = [
  {
    id: 'pro',
    name: 'Pro для специалистов',
    price: 'от 990 ₽/мес',
    features: ['Витрина проектов', 'AI-помощник портфолио', 'Участие в вебинарах'],
    href: '/pricing#pro'
  },
  {
    id: 'boost',
    name: 'Boost для команд',
    price: 'от 4 900 ₽/мес',
    features: ['Рабочие пространства', 'Совместное редактирование', 'Доступ к маркетплейсу'],
    href: '/pricing#business'
  }
];

export const metadata: Metadata = {
  title: 'Тарифы Collabverse',
  description: 'Выберите тариф Collabverse для специалистов и команд. Доступ к AI и маркетплейсу.',
  openGraph: {
    title: 'Тарифы Collabverse',
    description: 'Тарифы для специалистов, команд и агентств с доступом к AI и маркетплейсу.',
    url: '/pricing',
    type: 'website'
  }
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Тарифы</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Выберите подходящий план</h1>
        <p className="text-neutral-300">
          Collabverse предлагает гибкие тарифы для специалистов, команд и агентств. Оплачивайте по
          подписке или подключайте проекты по требованию.
        </p>
      </header>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <ContentBlock key={plan.id} id={plan.id} as="article" size="sm">
            <p className="text-sm uppercase text-indigo-400">{plan.name}</p>
            <h2 className="mt-2 text-2xl font-semibold">{plan.price}</h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              {plan.features.map((feature) => (
                <li key={feature}>✔ {feature}</li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Подключить план
            </Link>
          </ContentBlock>
        ))}
      </section>
      <ContentBlock className="mt-16 space-y-4" size="sm" variant="muted">
        <ContentBlockTitle as="h2">Нужен индивидуальный тариф?</ContentBlockTitle>
        <p className="text-sm text-neutral-400">
          Мы подберём решение для крупных команд и enterprise-заказчиков. Расскажите о задачах — и мы
          подготовим предложение.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            Связаться с нами
          </Link>
          <Link
            href="/blog#webinars"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
          >
            Посмотреть вебинары
          </Link>
        </div>
      </ContentBlock>
    </main>
  );
}
