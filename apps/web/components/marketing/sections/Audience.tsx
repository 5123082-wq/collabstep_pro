import Link from 'next/link';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const roles = [
  {
    id: 'founder',
    title: 'Бизнес / Основатель',
    description: 'Запускайте инициативы, выбирайте подрядчиков и отслеживайте ROI.',
    cta: { label: 'Создать проект', href: '/register' }
  },
  {
    id: 'designers',
    title: 'Дизайнеры',
    description: 'Получайте брифы, подключайте AI-помощников и собирайте портфолио.',
    cta: { label: 'Создать профиль', href: '/register' }
  },
  {
    id: 'developers',
    title: 'Разработчики',
    description: 'Планируйте спринты и интеграции, работайте в связке с продуктовой командой.',
    cta: { label: 'Начать сотрудничество', href: '/register' }
  },
  {
    id: 'marketers',
    title: 'Маркетологи / Копирайтеры',
    description: 'Используйте готовые шаблоны кампаний и получайте рекомендации AI.',
    cta: { label: 'Подключить профиль', href: '/register' }
  },
  {
    id: 'contractors',
    title: 'Подрядчики',
    description: 'Управляйте командой, тарифами и предложениями в одном месте.',
    cta: { label: 'Подключить компанию', href: '/register' }
  }
];

export default function Audience() {
  return (
    <section className="border-t border-neutral-900 bg-neutral-950" id="audience">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:px-12">
        <header className="mb-12 max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">Для кого Collabverse</h2>
          <p className="mt-4 text-neutral-400">
            Маркетинговая платформа объединяет роли — от основателей до подрядчиков. Каждый получает
            персонализированные инструменты и рекомендации.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <ContentBlock
              key={role.id}
              id={role.id}
              as="article"
              size="sm"
              variant="muted"
            >
              <ContentBlockTitle as="h3">{role.title}</ContentBlockTitle>
              <p className="mt-3 text-sm text-neutral-400">{role.description}</p>
              <Link
                href={role.cta.href}
                className="mt-4 inline-flex rounded-full border border-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {role.cta.label}
              </Link>
            </ContentBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
