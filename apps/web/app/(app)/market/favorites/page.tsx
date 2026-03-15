import FavoritesView from '@/components/marketplace/templates/FavoritesView';
import { templates } from '@/lib/marketplace/data';

export default function MarketFavoritesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Сохранённое</h1>
          <p className="text-sm text-neutral-400">
            Ваш shortlist внутри каталога: сюда попадают решения, к которым хочется вернуться, сравнить и потом отправить в проектный контур.
          </p>
        </div>
      </div>
      <FavoritesView templates={templates} />
    </div>
  );
}
