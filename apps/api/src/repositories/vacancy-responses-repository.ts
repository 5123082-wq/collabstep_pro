import { desc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { vacancyResponses } from '../db/schema';

export type DbVacancyResponse = typeof vacancyResponses.$inferSelect;
export type NewVacancyResponse = typeof vacancyResponses.$inferInsert;

export type VacancyResponseStatus = 'pending' | 'accepted' | 'rejected';

export class VacancyResponsesRepository {
  async create(input: NewVacancyResponse): Promise<DbVacancyResponse> {
    const [created] = await db
      .insert(vacancyResponses)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create vacancy response');
    }

    return created;
  }

  async findById(id: string): Promise<DbVacancyResponse | null> {
    const [response] = await db
      .select()
      .from(vacancyResponses)
      .where(eq(vacancyResponses.id, id));

    return response || null;
  }

  async listByVacancy(vacancyId: string): Promise<DbVacancyResponse[]> {
    return await db
      .select()
      .from(vacancyResponses)
      .where(eq(vacancyResponses.vacancyId, vacancyId))
      .orderBy(desc(vacancyResponses.createdAt));
  }

  async listByPerformer(performerId: string): Promise<DbVacancyResponse[]> {
    return await db
      .select()
      .from(vacancyResponses)
      .where(eq(vacancyResponses.performerId, performerId))
      .orderBy(desc(vacancyResponses.createdAt));
  }

  async updateStatus(id: string, status: VacancyResponseStatus): Promise<DbVacancyResponse | null> {
    const [updated] = await db
      .update(vacancyResponses)
      .set({ status, updatedAt: new Date() })
      .where(eq(vacancyResponses.id, id))
      .returning();

    return updated || null;
  }
}

export const vacancyResponsesRepository = new VacancyResponsesRepository();
