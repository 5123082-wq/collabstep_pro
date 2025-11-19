import { notFound } from 'next/navigation';
import AppSection from '@/components/app/AppSection';
import SpecialistsCatalog from '@/components/marketplace/SpecialistsCatalog';
import VacanciesCatalog from '@/components/marketplace/VacanciesCatalog';

export const dynamic = 'force-dynamic';

const SECTION_CONFIG = {
  specialists: {
    render: () => {
      // TODO: Подключить к реальному API специалистов
      const items: any[] = [];
      const error: string | null = null;
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold text-neutral-50">Специалисты</h1>
            <p className="text-sm text-neutral-400">
              Каталог экспертов с фильтрами и карточками компетенций.
            </p>
          </header>
          <SpecialistsCatalog data={items} error={error} />
        </div>
      );
    }
  },
  teams: {
    render: () => (
      <AppSection
        title="Команды и подрядчики"
        description="Проверенные команды для комплексных проектов и аутсорса."
        actions={[
          { label: 'Запросить предложение', message: 'TODO: Запросить предложение команды' },
          { label: 'Сравнить подрядчиков', message: 'TODO: Сравнить подрядчиков' }
        ]}
      />
    )
  },
  vacancies: {
    render: () => {
      // TODO: Подключить к реальному API вакансий
      const items: any[] = [];
      const error: string | null = null;
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold text-neutral-50">Вакансии и задачи</h1>
            <p className="text-sm text-neutral-400">
              Актуальные запросы на специалистов и консультантов.
            </p>
          </header>
          <VacanciesCatalog data={items} error={error} />
        </div>
      );
    }
  },
  'my-vacancies': {
    render: () => (
      <AppSection
        title="Мои вакансии"
        description="Управляйте опубликованными вакансиями и отслеживайте статус откликов."
        actions={[
          { label: 'Создать вакансию', message: 'TODO: Создать вакансию' },
          { label: 'Посмотреть статистику', message: 'TODO: Открыть статистику вакансий' }
        ]}
      />
    )
  },
  responses: {
    render: () => (
      <AppSection
        title="Отклики и приглашения"
        description="Здесь отображаются отклики специалистов и отправленные приглашения."
        actions={[
          { label: 'Ответить на отклик', message: 'TODO: Ответить на отклик' },
          { label: 'Настроить уведомления', message: 'TODO: Настроить уведомления об откликах' }
        ]}
      />
    )
  }
} as const;

const SECTION_KEYS = Object.keys(SECTION_CONFIG) as Array<keyof typeof SECTION_CONFIG>;

type PerformersSectionPageProps = {
  params: { section: string };
};

export default function PerformersSectionPage({ params }: PerformersSectionPageProps) {
  const key = params.section as keyof typeof SECTION_CONFIG;

  if (!SECTION_KEYS.includes(key)) {
    notFound();
  }

  return SECTION_CONFIG[key].render();
}

export function generateStaticParams() {
  return SECTION_KEYS.map((section) => ({ section }));
}
