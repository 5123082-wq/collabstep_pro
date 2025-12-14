import { notFound } from 'next/navigation';
import AppSection from '@/components/app/AppSection';
import SpecialistsCatalog from '@/components/marketplace/SpecialistsCatalog';
import VacanciesCatalog from '@/components/marketplace/VacanciesCatalog';
import { performerProfilesRepository } from '@collabverse/api';
import type { Specialist } from '@/lib/schemas/marketplace-specialist';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';

export const dynamic = 'force-dynamic';

async function getSpecialists(): Promise<Specialist[]> {
  try {
    const profiles = await performerProfilesRepository.listPublic({ limit: 50 });
    return profiles.map<Specialist>((p) => ({
        id: p.userId,
        handle: p.userId,
        name: p.user.name ?? 'Unknown',
        role: p.specialization || 'Специализация не указана',
        description: p.bio || '',
        skills: Array.isArray(p.skills) && p.skills.length ? p.skills : ['Навыки не указаны'],
        rate: { min: p.rate || 0, max: p.rate || 0, currency: 'USD', period: 'hour' },
        rating: 0,
        reviews: 0,
        languages: ['ru'],
        workFormats: ['remote'], // Default
        experienceYears: 0,
        timezone: p.timezone || 'UTC',
        availability: ['Доступен к сотрудничеству'],
        engagement: ['Проектная работа'],
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error('Failed to fetch specialists', error);
    return [];
  }
}

const SECTION_CONFIG = {
  specialists: {
    render: async () => {
      const items = await getSpecialists();
      const error: string | null = null;
      
      // Force cast to match strict Zod schema types in SpecialistsCatalog if needed, 
      // or ensure getSpecialists returns compatible type
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold text-neutral-50">Специалисты</h1>
            <p className="text-sm text-neutral-400">
              Каталог экспертов с фильтрами и карточками компетенций.
            </p>
          </header>
          <SpecialistsCatalog data={items} error={error} basePath="/performers/specialists" />
        </div>
      );
    }
  },
  teams: {
    render: async () => (
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
    render: async () => {
      // TODO: Подключить к реальному API вакансий
      const items: Vacancy[] = [];
      const error: string | null = null;
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold text-neutral-50">Вакансии и задачи</h1>
            <p className="text-sm text-neutral-400">
              Актуальные запросы на специалистов и консультантов.
            </p>
          </header>
          <VacanciesCatalog data={items} error={error} basePath="/performers/vacancies" />
        </div>
      );
    }
  },
  'my-vacancies': {
    render: async () => (
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
    render: async () => (
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

export default async function PerformersSectionPage({ params }: PerformersSectionPageProps) {
  const key = params.section as keyof typeof SECTION_CONFIG;

  if (!SECTION_KEYS.includes(key)) {
    notFound();
  }

  return SECTION_CONFIG[key].render();
}

export function generateStaticParams() {
  return SECTION_KEYS.map((section) => ({ section }));
}
