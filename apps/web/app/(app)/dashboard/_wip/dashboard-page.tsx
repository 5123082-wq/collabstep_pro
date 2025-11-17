'use client';

import AppSection from '@/components/app/AppSection';

export default function DashboardPage() {
  return (
    <AppSection
      title="Рабочий стол"
      description="Сводка по проектам, задачам и метрикам команды."
      actions={[
        { label: 'Обновить виджеты', message: 'TODO: Обновить виджеты' },
        { label: 'Запланировать синк', message: 'TODO: Запланировать синк' }
      ]}
    />
  );
}
