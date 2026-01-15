import { ResponsesList } from '@/components/performers/ResponsesList';

export default function PerformersResponsesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-neutral-50">Отклики и приглашения</h1>
        <p className="text-sm text-neutral-400">
          Управляйте входящими откликами и обновляйте их статус.
        </p>
      </header>
      <ResponsesList />
    </div>
  );
}
