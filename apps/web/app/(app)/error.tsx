'use client';

import ErrorFallback from '@/components/ui/ErrorFallback';

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppShellError({ reset }: RouteErrorProps) {
  return (
    <section className="bg-neutral-950 px-6 py-16 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <ErrorFallback
          title="Не удалось загрузить рабочее пространство"
          description="Обновите страницу — мы попробуем восстановить последний контекст проекта."
          reset={reset}
          links={[
            { href: '/dashboard', label: 'Перейти в дэшборд' },
            { href: '/projects', label: 'К проектам' }
          ]}
        />
      </div>
    </section>
  );
}
