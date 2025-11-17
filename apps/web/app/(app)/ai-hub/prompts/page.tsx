import AppSection from '@/components/app/AppSection';

export default function AiPromptsPage() {
  return (
    <AppSection
      title="Библиотека промптов"
      description="Сохраняйте лучшие промпты и делитесь ими внутри команды."
      actions={[
        { label: 'Создать промпт', message: 'TODO: Создать промпт' },
        { label: 'Опубликовать в каталоге', message: 'TODO: Опубликовать промпт' }
      ]}
    />
  );
}
