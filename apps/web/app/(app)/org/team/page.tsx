import AppSection from '@/components/app/AppSection';

export default function OrgTeamPage() {
  return (
    <AppSection
      title="Команда"
      description="Управляйте ролями, доступами и графиком участников."
      actions={[
        { label: 'Добавить участника', message: 'TODO: Добавить участника' },
        { label: 'Назначить роль', message: 'TODO: Назначить роль' }
      ]}
    />
  );
}
