import Link from 'next/link';
import { catalogCollections } from '@/lib/marketplace/data';

export default function MarketCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold text-neutral-50">Подборки</h1>
          <p className="text-sm text-neutral-400">
            Curated-навигация для случаев, когда пользователь мыслит не категориями магазина, а сценариями запуска, ролями авторов и
            типом проектной базы.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {catalogCollections.map((collection, index) => (
          <Link
            key={collection.id}
            href={collection.href}
            className="group relative overflow-hidden rounded-[28px] border border-neutral-800/80 bg-neutral-950/80 p-6 transition hover:border-neutral-700"
          >
            <div
              className="absolute inset-0 opacity-75 transition group-hover:opacity-100"
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
                <h2 className="text-xl font-semibold text-neutral-50">{collection.title}</h2>
                <p className="text-sm leading-6 text-neutral-400">{collection.description}</p>
              </div>
              <span className="inline-flex text-sm font-semibold text-indigo-300 transition group-hover:text-indigo-200">
                Открыть подборку
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
