import { desc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { performerCases } from '../db/schema';

export type DbPerformerCase = typeof performerCases.$inferSelect;
export type NewPerformerCase = typeof performerCases.$inferInsert;

export class PerformerCasesRepository {
  async create(input: NewPerformerCase): Promise<DbPerformerCase> {
    const [created] = await db
      .insert(performerCases)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create performer case');
    }

    return created;
  }

  async findById(id: string): Promise<DbPerformerCase | null> {
    const [item] = await db
      .select()
      .from(performerCases)
      .where(eq(performerCases.id, id));

    return item || null;
  }

  async listByPerformer(performerId: string): Promise<DbPerformerCase[]> {
    return await db
      .select()
      .from(performerCases)
      .where(eq(performerCases.performerId, performerId))
      .orderBy(desc(performerCases.createdAt));
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(performerCases)
      .where(eq(performerCases.id, id))
      .returning();

    return deleted.length > 0;
  }
}

export const performerCasesRepository = new PerformerCasesRepository();
