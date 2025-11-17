import AppSection from '@/components/app/AppSection';

export default function SupportHelpPage() {
  return (
    <AppSection
      title="Центр помощи"
      description="База знаний, гайды и подборки решений для команды."
      actions={[
        { label: 'Открыть статью', message: 'TODO: Открыть статью' },
        { label: 'Задать вопрос', message: 'TODO: Задать вопрос поддержке' }
      ]}
    />
  );
}
