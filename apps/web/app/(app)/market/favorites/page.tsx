import FavoritesView from '@/components/marketplace/templates/FavoritesView';
import { templates } from '@/lib/marketplace/data';

export default function MarketFavoritesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Избранное</h1>
          <p className="text-sm text-neutral-400">
            Сохраняйте шаблоны и проекты, чтобы быстро возвращаться к ним и собирать подборки для команды.
          </p>
        </div>
      </div>
      <FavoritesView templates={templates} />
    </div>
  );
}
