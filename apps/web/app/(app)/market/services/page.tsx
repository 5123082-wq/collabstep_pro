export default function MarketServicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Пакеты услуг</h1>
          <p className="text-sm text-neutral-400">
            Здесь будут пакетные предложения студий и команд с фиксированными сроками и стоимостью. Раздел получит
            листинг и лид-форму на следующих итерациях.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-900/40 p-10 text-sm text-neutral-400">
        Листинг услуг в разработке.
      </div>
    </div>
  );
}
