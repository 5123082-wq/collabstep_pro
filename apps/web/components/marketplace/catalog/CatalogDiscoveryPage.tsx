import Link from 'next/link';
import { catalogCollections, readySolutions, serviceOffers, templates } from '@/lib/marketplace/data';
import { ContentBlock } from '@/components/ui/content-block';
import TemplateCard from '@/components/marketplace/templates/TemplateCard';
import CatalogSpotlightCard from './CatalogSpotlightCard';

const primaryNav = [
  { label: 'Шаблоны', href: '/market/templates' },
  { label: 'Готовые решения', href: '/market/projects' },
  { label: 'Услуги', href: '/market/services' },
  { label: 'Подборки', href: '/market/categories' },
  { label: 'Сохранённое', href: '/market/favorites' },
  { label: 'Опубликовать', href: '/market/publish' }
];

const secondarySurfaces = [
  {
    title: 'Корзина и оформление',
    description: 'Коммерческий слой остаётся доступным, но больше не управляет первым впечатлением о модуле.',
    href: '/market/cart'
  },
  {
    title: 'Сделки и доступ',
    description: 'История оформлений, доступы к материалам и protected delivery живут отдельно от discovery-ленты.',
    href: '/market/orders'
  },
  {
    title: 'Мои публикации',
    description: 'Управление public layer автора и статусами публикаций остаётся отдельной surface, не смешанной с PM-проектами.',
    href: '/market/seller'
  }
];

export default function CatalogDiscoveryPage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-neutral-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(140deg,_rgba(10,10,15,0.96),_rgba(15,23,42,0.94))] px-6 py-8 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.92)] sm:px-8 lg:px-10 lg:py-10">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-70" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.32em] text-indigo-200/80">Каталог решений</p>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Discovery-first лента для шаблонов, решений и услуг</h1>
                <p className="text-base leading-7 text-neutral-300 sm:text-lg">
                  Здесь ищут не товар, а рабочую базу: что можно взять как основу проекта, кого выбрать автором и куда двигаться дальше
                  — в сохранённое, в проект или в запрос на адаптацию.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/20"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">В ленте</p>
                <p className="mt-2 text-2xl font-semibold text-white">{templates.length + readySolutions.length + serviceOffers.length}</p>
                <p className="mt-1 text-sm text-neutral-400">объектов discovery-первого слоя</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Фокус</p>
                <p className="mt-2 text-2xl font-semibold text-white">Reuse</p>
                <p className="mt-1 text-sm text-neutral-400">`В проект` важнее checkout</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Доверие</p>
                <p className="mt-2 text-2xl font-semibold text-white">Автор</p>
                <p className="mt-1 text-sm text-neutral-400">виден на каждой ключевой карточке</p>
              </div>
            </div>
          </div>

          <ContentBlock size="sm" className="border-white/10 bg-black/20 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Новая IA</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-4">
                <p className="text-sm font-semibold text-neutral-100">Первый слой</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Каталог, шаблоны, готовые решения, услуги, подборки, сохранённое, публикация и мои публикации.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-4">
                <p className="text-sm font-semibold text-neutral-100">Второй слой</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Корзина, оформление, сделки и доступ остаются в модуле, но больше не определяют вход в раздел.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-4">
                <p className="text-sm font-semibold text-neutral-100">Нельзя путать</p>
                <p className="mt-1 text-sm text-neutral-400">
                  PM-проект остаётся рабочим контуром, а публикация в каталоге живёт как отдельный public layer.
                </p>
              </div>
            </div>
          </ContentBlock>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CatalogSpotlightCard item={readySolutions[0]!} />
        <CatalogSpotlightCard item={serviceOffers[0]!} />
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Главная лента</p>
            <h2 className="text-2xl font-semibold text-neutral-50">Что можно взять как основу прямо сейчас</h2>
            <p className="mt-1 max-w-3xl text-sm text-neutral-400">
              Упрощённые discovery-плитки показывают только суть решения: автора, краткое описание, хэштеги и demo-метрики. Действия вынесены в detail surface.
            </p>
          </div>
          <Link href="/market/templates" className="text-sm font-semibold text-indigo-300 transition hover:text-indigo-200">
            Смотреть все шаблоны
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {templates.slice(0, 4).map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Подборки</p>
          <h2 className="text-2xl font-semibold text-neutral-50">Curated блоки для discovery-навигации</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {catalogCollections.map((collection, index) => (
            <Link
              key={collection.id}
              href={collection.href}
              className="group relative overflow-hidden rounded-[28px] border border-neutral-800/80 bg-neutral-950/80 p-6 transition hover:border-neutral-700"
            >
              <div
                className="absolute inset-0 opacity-70 transition group-hover:opacity-100"
                style={{
                  background:
                    index === 0
                      ? 'radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 48%)'
                      : index === 1
                        ? 'radial-gradient(circle at top left, rgba(99,102,241,0.22), transparent 48%)'
                        : 'radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 48%)'
                }}
              />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">{collection.eyebrow}</p>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300">
                    {collection.stat}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-neutral-50">{collection.title}</h3>
                  <p className="text-sm leading-6 text-neutral-400">{collection.description}</p>
                </div>
                <span className="inline-flex text-sm font-semibold text-indigo-300 transition group-hover:text-indigo-200">
                  Открыть подборку
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">Второй слой</p>
          <h2 className="text-2xl font-semibold text-neutral-50">Коммерческие и управляющие поверхности</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {secondarySurfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="rounded-[28px] border border-neutral-800/80 bg-neutral-950/70 p-6 transition hover:border-neutral-700"
            >
              <p className="text-lg font-semibold text-neutral-100">{surface.title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{surface.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
