import AppSection from '@/components/app/AppSection';

export default function DocsContractsPage() {
  return (
    <AppSection
      title="Контракты"
      description="Храните и согласовывайте юридические документы онлайн."
      actions={[
        { label: 'Согласовать контракт', message: 'TODO: Согласовать контракт' },
        { label: 'Отправить на подпись', message: 'TODO: Отправить на подпись' }
      ]}
    />
  );
}
