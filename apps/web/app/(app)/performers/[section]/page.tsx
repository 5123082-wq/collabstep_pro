import { notFound } from 'next/navigation';
import AppSection from '@/components/app/AppSection';
import SpecialistsCatalog from '@/components/marketplace/SpecialistsCatalog';
import VacanciesCatalog from '@/components/marketplace/VacanciesCatalog';
import { organizationsRepository, performerProfilesRepository, performerRatingsRepository, vacanciesRepository } from '@collabverse/api';
import { mapVacancyToMarketplace } from '@/lib/api/performers/vacancies';
import type { Specialist } from '@/lib/schemas/marketplace-specialist';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';

export const dynamic = 'force-dynamic';

type WorkFormat = 'remote' | 'office' | 'hybrid';

const WORK_FORMATS: WorkFormat[] = ['remote', 'office', 'hybrid'];

function isWorkFormat(value: string): value is WorkFormat {
  return WORK_FORMATS.includes(value as WorkFormat);
}

async function getSpecialists(): Promise<Specialist[]> {
  try {
    const profiles = await performerProfilesRepository.listPublic({ limit: 50 });
    const ratings = await Promise.all(
      profiles.map(async (profile) => {
        const entries = await performerRatingsRepository.listByPerformer(profile.userId);
        const count = entries.length;
        const total = entries.reduce((sum, rating) => sum + rating.rating, 0);
        return { count, average: count > 0 ? total / count : 0 };
      })
    );

    return profiles.map<Specialist>((profile, index) => {
      const skills = Array.isArray(profile.skills)
        ? profile.skills.filter((item): item is string => typeof item === 'string')
        : [];
      const languages = Array.isArray(profile.languages) && profile.languages.length > 0
        ? profile.languages
        : ['ru'];
      const formats = Array.isArray(profile.workFormats)
        ? profile.workFormats.filter((item): item is WorkFormat => isWorkFormat(item))
        : [];
      const rating = ratings[index];
      const employment = profile.employmentType ?? 'contract';
      const engagement =
        employment === 'fulltime'
          ? 'Полная занятость'
          : employment === 'parttime'
            ? 'Частичная занятость'
            : 'Проектная работа';

      return {
        id: profile.userId,
        handle: profile.handle ?? profile.userId,
        name: profile.user.name ?? 'Unknown',
        role: profile.specialization || 'Специализация не указана',
        description: profile.bio || '',
        skills: skills.length > 0 ? skills : ['Навыки не указаны'],
        rate: { min: profile.rate || 0, max: profile.rate || 0, currency: 'USD', period: 'hour' },
        rating: rating?.average ?? 0,
        reviews: rating?.count ?? 0,
        languages,
        workFormats: formats.length > 0 ? formats : ['remote'],
        experienceYears: 0,
        timezone: profile.timezone || 'UTC',
        availability: ['Доступен к сотрудничеству'],
        engagement: [engagement],
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('Failed to fetch specialists', error);
    return [];
  }
}

async function getVacancies(): Promise<Vacancy[]> {
  try {
    const vacancies = await vacanciesRepository.listPublic({ limit: 50 });
    const orgIds = Array.from(new Set(vacancies.map((vacancy) => vacancy.organizationId)));
    const organizations = await Promise.all(orgIds.map((id) => organizationsRepository.findById(id)));
    const orgMap = new Map(orgIds.map((id, index) => [id, organizations[index]?.name ?? id]));

    return vacancies.map((vacancy) => {
      const organizationName = orgMap.get(vacancy.organizationId);
      return mapVacancyToMarketplace(vacancy, organizationName ? { organizationName } : {});
    });
  } catch (error) {
    console.error('Failed to fetch vacancies', error);
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
      const items = await getVacancies();
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
