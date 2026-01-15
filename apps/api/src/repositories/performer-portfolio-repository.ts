import { asc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { performerPortfolioItems } from '../db/schema';

export type DbPerformerPortfolioItem = typeof performerPortfolioItems.$inferSelect;
export type NewPerformerPortfolioItem = typeof performerPortfolioItems.$inferInsert;

export class PerformerPortfolioRepository {
  async create(input: NewPerformerPortfolioItem): Promise<DbPerformerPortfolioItem> {
    const [created] = await db
      .insert(performerPortfolioItems)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create performer portfolio item');
    }

    return created;
  }

  async findById(id: string): Promise<DbPerformerPortfolioItem | null> {
    const [item] = await db
      .select()
      .from(performerPortfolioItems)
      .where(eq(performerPortfolioItems.id, id));

    return item || null;
  }

  async listByPerformer(performerId: string): Promise<DbPerformerPortfolioItem[]> {
    return await db
      .select()
      .from(performerPortfolioItems)
      .where(eq(performerPortfolioItems.performerId, performerId))
      .orderBy(asc(performerPortfolioItems.order), asc(performerPortfolioItems.createdAt));
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(performerPortfolioItems)
      .where(eq(performerPortfolioItems.id, id))
      .returning();

    return deleted.length > 0;
  }
}

export const performerPortfolioRepository = new PerformerPortfolioRepository();
