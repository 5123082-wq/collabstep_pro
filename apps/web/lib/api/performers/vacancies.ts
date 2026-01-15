import type { DbVacancy } from '@collabverse/api';
import { z } from 'zod';
import { VacancySchema, type Vacancy } from '@/lib/schemas/marketplace-vacancy';

export const VacancyStatusSchema = z.enum(['draft', 'published', 'closed']);

export const VacancyCreateSchema = VacancySchema
  .omit({ id: true, slug: true, createdAt: true, project: true })
  .extend({
    tags: VacancySchema.shape.tags.optional(),
    organizationId: z.string(),
    description: z.string().max(4000).optional(),
    status: VacancyStatusSchema.optional()
  });

export const VacancyPatchSchema = VacancyCreateSchema
  .omit({ organizationId: true, status: true })
  .partial();

const LEVELS = new Set<Vacancy['level']>(['Junior', 'Middle', 'Senior']);
const EMPLOYMENTS = new Set<Vacancy['employment']>(['project', 'part-time', 'full-time']);
const FORMATS = new Set<Vacancy['format'][number]>(['remote', 'office', 'hybrid']);

function normalizeLevel(value: string | null): Vacancy['level'] {
  if (value && LEVELS.has(value as Vacancy['level'])) {
    return value as Vacancy['level'];
  }
  return 'Middle';
}

function normalizeEmployment(value: string | null): Vacancy['employment'] {
  if (value && EMPLOYMENTS.has(value as Vacancy['employment'])) {
    return value as Vacancy['employment'];
  }
  return 'project';
}

function normalizeFormat(value: string[] | null): Vacancy['format'] {
  const formats = (value ?? []).filter((item): item is Vacancy['format'][number] =>
    FORMATS.has(item as Vacancy['format'][number])
  );
  return formats.length > 0 ? formats : ['remote'];
}

function normalizeList(value: string[] | null, fallback: string): string[] {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }
  return [fallback];
}

function normalizeReward(vacancy: DbVacancy): Vacancy['reward'] {
  const rewardCandidate = typeof vacancy.rewardData === 'object' && vacancy.rewardData ? vacancy.rewardData : null;
  if (rewardCandidate) {
    const parsed = VacancySchema.shape.reward.safeParse(rewardCandidate);
    if (parsed.success) {
      return parsed.data;
    }
  }

  if (vacancy.rewardType === 'salary') {
    return {
      type: 'salary',
      currency: 'USD',
      amount: 0
    };
  }

  if (vacancy.rewardType === 'equity') {
    return {
      type: 'equity',
      share: ''
    };
  }

  return {
    type: 'rate',
    currency: 'USD',
    period: 'project',
    min: 0,
    max: 0
  };
}

function toIsoDate(value: Date | null | undefined, fallback: Date): string {
  const date = value ?? fallback;
  return date.toISOString();
}

function slugify(title: string, fallback: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

export function mapVacancyToMarketplace(
  vacancy: DbVacancy,
  options: { organizationName?: string } = {}
): Vacancy {
  const createdAtDate = vacancy.createdAt ?? new Date();
  const requirements = normalizeList(vacancy.requirements, vacancy.title);
  const responsibilities = normalizeList(vacancy.responsibilities, vacancy.title);
  const tags = normalizeList(vacancy.requirements.length > 0 ? vacancy.requirements : vacancy.responsibilities, vacancy.title);

  const mapped = {
    id: vacancy.id,
    slug: slugify(vacancy.title, vacancy.id),
    project: options.organizationName ?? vacancy.organizationId,
    title: vacancy.title,
    summary: vacancy.summary ?? vacancy.description ?? '',
    level: normalizeLevel(vacancy.level),
    employment: normalizeEmployment(vacancy.employmentType),
    format: normalizeFormat(vacancy.workFormat),
    reward: normalizeReward(vacancy),
    language: vacancy.language ?? 'ru',
    timezone: vacancy.timezone ?? 'UTC',
    deadline: toIsoDate(vacancy.deadline ?? createdAtDate, createdAtDate),
    tags,
    requirements,
    responsibilities,
    testTask: vacancy.testTask ?? '',
    paymentNote: vacancy.paymentNote ?? '',
    contact: {
      name: vacancy.contactName ?? '',
      channel: vacancy.contactChannel ?? ''
    },
    createdAt: toIsoDate(createdAtDate, new Date())
  };

  return VacancySchema.parse(mapped);
}
