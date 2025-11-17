import AppSection from '@/components/app/AppSection';

export default function DocsBrandRepoPage() {
  return (
    <AppSection
      title="Бренд-репозиторий"
      description="Централизованное хранение бренд-материалов и гайдлайнов."
      actions={[
        { label: 'Добавить ассет', message: 'TODO: Добавить ассет' },
        { label: 'Поделиться гайдлайном', message: 'TODO: Поделиться гайдлайном' }
      ]}
    />
  );
}
