import AppSection from '@/components/app/AppSection';

export default function OrgProcessTemplatesPage() {
  return (
    <AppSection
      title="Процесс-шаблоны"
      description="Настраивайте операционные процессы и автоматизируйте рутины."
      actions={[
        { label: 'Создать процесс', message: 'TODO: Создать процесс-шаблон' },
        { label: 'Синхронизировать с проектом', message: 'TODO: Синхронизировать процесс' }
      ]}
    />
  );
}
