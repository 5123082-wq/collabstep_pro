import { PerformerProfileForm } from '@/components/performers/PerformerProfileForm';
import { getCurrentUser } from '@/lib/auth/session';

export default async function PerformerSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
          Профиль Исполнителя
        </h1>
        <p className="mt-2 text-[color:var(--text-secondary)]">
          Заполните информацию о себе, чтобы заказчики могли найти вас в каталоге.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-6 shadow-sm">
        <PerformerProfileForm />
      </div>
    </div>
  );
}

