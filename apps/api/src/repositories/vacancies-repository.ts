import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { vacancies } from '../db/schema';

export type DbVacancy = typeof vacancies.$inferSelect;
export type NewVacancy = typeof vacancies.$inferInsert;

export type VacancyStatus = 'draft' | 'published' | 'closed';

export type VacancyUpdateInput = {
  title?: string;
  summary?: string | null;
  description?: string | null;
  level?: string | null;
  employmentType?: string | null;
  workFormat?: string[];
  rewardType?: string | null;
  rewardData?: typeof vacancies.$inferInsert['rewardData'];
  language?: string | null;
  timezone?: string | null;
  deadline?: Date | null;
  requirements?: string[];
  responsibilities?: string[];
  testTask?: string | null;
  paymentNote?: string | null;
  contactName?: string | null;
  contactChannel?: string | null;
};

export class VacanciesRepository {
  async create(input: NewVacancy): Promise<DbVacancy> {
    const [created] = await db
      .insert(vacancies)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create vacancy');
    }

    return created;
  }

  async findById(id: string): Promise<DbVacancy | null> {
    const [vacancy] = await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.id, id));

    return vacancy || null;
  }

  async listPublic(options: { limit?: number; offset?: number } = {}): Promise<DbVacancy[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    return await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.status, 'published'))
      .orderBy(desc(vacancies.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listByOrganization(
    organizationId: string,
    options: { status?: VacancyStatus; limit?: number; offset?: number } = {}
  ): Promise<DbVacancy[]> {
    const conditions = [eq(vacancies.organizationId, organizationId)];

    if (options.status) {
      conditions.push(eq(vacancies.status, options.status));
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    return await db
      .select()
      .from(vacancies)
      .where(and(...conditions))
      .orderBy(desc(vacancies.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async update(id: string, patch: VacancyUpdateInput): Promise<DbVacancy | null> {
    const updateData = {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.level !== undefined ? { level: patch.level } : {}),
      ...(patch.employmentType !== undefined ? { employmentType: patch.employmentType } : {}),
      ...(patch.workFormat !== undefined ? { workFormat: patch.workFormat } : {}),
      ...(patch.rewardType !== undefined ? { rewardType: patch.rewardType } : {}),
      ...(patch.rewardData !== undefined ? { rewardData: patch.rewardData } : {}),
      ...(patch.language !== undefined ? { language: patch.language } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
      ...(patch.requirements !== undefined ? { requirements: patch.requirements } : {}),
      ...(patch.responsibilities !== undefined ? { responsibilities: patch.responsibilities } : {}),
      ...(patch.testTask !== undefined ? { testTask: patch.testTask } : {}),
      ...(patch.paymentNote !== undefined ? { paymentNote: patch.paymentNote } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.contactChannel !== undefined ? { contactChannel: patch.contactChannel } : {}),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(vacancies)
      .set(updateData)
      .where(eq(vacancies.id, id))
      .returning();

    return updated || null;
  }

  async updateStatus(id: string, status: VacancyStatus): Promise<DbVacancy | null> {
    const [updated] = await db
      .update(vacancies)
      .set({ status, updatedAt: new Date() })
      .where(eq(vacancies.id, id))
      .returning();

    return updated || null;
  }
}

export const vacanciesRepository = new VacanciesRepository();
