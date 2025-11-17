'use client';

import ErrorFallback from '@/components/ui/ErrorFallback';

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MarketingError({ reset }: RouteErrorProps) {
  return (
    <section className="bg-neutral-950 px-6 py-20 text-neutral-100">
      <div className="mx-auto max-w-4xl">
        <ErrorFallback
          title="Не удалось загрузить маркетинговый раздел"
          description="Перезагрузите страницу или вернитесь на главную, чтобы продолжить знакомство с Collabverse."
          reset={reset}
          links={[
            { href: '/', label: 'На главную' },
            { href: '/projects', label: 'Проекты' }
          ]}
        />
      </div>
    </section>
  );
}
