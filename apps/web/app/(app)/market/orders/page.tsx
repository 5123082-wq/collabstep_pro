export default function MarketOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Мои заказы</h1>
          <p className="text-sm text-neutral-400">
            Здесь появится история покупок, статусы и защищённые ссылки на файлы. После интеграции оплаты раздел
            будет обновлён.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-900/40 p-10 text-sm text-neutral-400">
        У вас пока нет заказов.
      </div>
    </div>
  );
}
