import AppSection from '@/components/app/AppSection';

export default function AiGenerationsPage() {
  return (
    <AppSection
      title="AI-генерации"
      description="Следите за статусом генераций и делитесь результатами с командой."
      actions={[
        { label: 'Запустить генерацию', message: 'TODO: Запустить генерацию' },
        { label: 'Настроить модель', message: 'TODO: Настроить модель' }
      ]}
    />
  );
}
