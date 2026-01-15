import {
  applyVacancyFilters,
  buildVacancySearchParams,
  parseVacancyFilters,
  type VacancyFilters
} from '@/lib/marketplace/vacancies';
import { VacanciesSchema, type Vacancy } from '@/lib/schemas/marketplace-vacancy';

describe('marketplace vacancies helpers', () => {
  const vacancies: Vacancy[] = [
    {
      id: 'vac-a',
      slug: 'design-lead',
      project: 'Nova App',
      title: 'Product Designer',
      summary: 'Развитие дизайна мобильного приложения.',
      level: 'Middle',
      employment: 'project',
      format: ['remote'],
      reward: { type: 'rate', currency: 'RUB', period: 'hour', min: 1800, max: 2400 },
      language: 'ru',
      timezone: 'Europe/Moscow',
      deadline: '2024-07-15',
      tags: ['Дизайн', 'Mobile'],
      requirements: ['Figma', 'Портфолио'],
      responsibilities: ['Разработка UI', 'Поддержка дизайн-системы'],
      testTask: 'Собрать экран онбординга.',
      paymentNote: 'Оплата дважды в месяц.',
      contact: { name: 'Анна', channel: '@nova-hr' },
      createdAt: '2024-06-01'
    },
    {
      id: 'vac-b',
      slug: 'backend-go',
      project: 'CloudPay',
      title: 'Go Developer',
      summary: 'API и интеграции для платёжного сервиса.',
      level: 'Senior',
      employment: 'full-time',
      format: ['office', 'remote'],
      reward: { type: 'salary', currency: 'RUB', amount: 350000 },
      language: 'en',
      timezone: 'Europe/London',
      deadline: '2024-07-01',
      tags: ['Go', 'Fintech'],
      requirements: ['Go', 'Kubernetes'],
      responsibilities: ['Проектирование микросервисов'],
      testTask: 'Описать архитектуру платежного сервиса.',
      paymentNote: 'Оформление через ИП.',
      contact: { name: 'Игорь', channel: 'igor@cloudpay.io' },
      createdAt: '2024-05-20'
    }
  ];

  it('парсит фильтры из query-параметров', () => {
    const params = new URLSearchParams({
      q: 'designer',
      role: 'Product Designer',
      level: 'Junior',
      employment: 'project',
      format: 'remote',
      reward: 'rate',
      lang: 'ru',
      page: '2'
    });

    const parsed = parseVacancyFilters(params);
    expect(parsed).toEqual({
      query: 'designer',
      role: 'Product Designer',
      level: 'Junior',
      employment: 'project',
      format: 'remote',
      rewardType: 'rate',
      language: 'ru',
      page: 2
    });
  });

  it('сбрасывает некорректные значения фильтров', () => {
    const params = new URLSearchParams({
      level: 'lead',
      employment: 'gig',
      format: 'any',
      reward: 'bonus',
      page: '-1'
    });

    const parsed = parseVacancyFilters(params);
    expect(parsed.level).toBeNull();
    expect(parsed.employment).toBeNull();
    expect(parsed.format).toBeNull();
    expect(parsed.rewardType).toBeNull();
    expect(parsed.page).toBe(1);
  });

  it('сериализует фильтры в query-параметры', () => {
    const filters: VacancyFilters = {
      query: 'Go',
      role: 'Go Developer',
      level: 'Senior',
      employment: 'full-time',
      format: 'office',
      rewardType: 'salary',
      language: 'en',
      page: 3
    };

    const params = buildVacancySearchParams(filters);
    expect(Object.fromEntries(params.entries())).toEqual({
      q: 'Go',
      role: 'Go Developer',
      level: 'Senior',
      employment: 'full-time',
      format: 'office',
      reward: 'salary',
      lang: 'en',
      page: '3'
    });
  });

  it('применяет фильтры к вакансиям', () => {
    const filters: VacancyFilters = {
      query: 'дизайн',
      role: 'Product Designer',
      level: 'Middle',
      employment: 'project',
      format: 'remote',
      rewardType: 'rate',
      language: 'ru',
      page: 1
    };

    const result = applyVacancyFilters(vacancies, filters);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('vac-a');
  });

  it('сортирует вакансии по дате публикации', () => {
    const filters: VacancyFilters = {
      query: null,
      role: null,
      level: null,
      employment: null,
      format: null,
      rewardType: null,
      language: null,
      page: 1
    };

    const result = applyVacancyFilters(vacancies, filters);
    expect(result[0]?.id).toBe('vac-a');
  });

  it('валидирует корректные данные каталога', () => {
    const parsed = VacanciesSchema.safeParse(vacancies);
    expect(parsed.success).toBe(true);
  });

  it('отклоняет данные с некорректным дедлайном', () => {
    const base = vacancies[0]!;
    const invalid: Vacancy[] = [
      {
        ...base,
        deadline: 'not-a-date'
      }
    ];

    const parsed = VacanciesSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
