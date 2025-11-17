import AppSection from '@/components/app/AppSection';

export default function DocsFilesPage() {
  return (
    <AppSection
      title="Файлы"
      description="Единое файловое хранилище для команды и подрядчиков."
      actions={[
        { label: 'Загрузить файл', message: 'TODO: Загрузить файл' },
        { label: 'Поделиться ссылкой', message: 'TODO: Поделиться ссылкой' }
      ]}
    />
  );
}
