import { desc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { performerRatings } from '../db/schema';

export type DbPerformerRating = typeof performerRatings.$inferSelect;
export type NewPerformerRating = typeof performerRatings.$inferInsert;

export class PerformerRatingsRepository {
  async create(input: NewPerformerRating): Promise<DbPerformerRating> {
    const [created] = await db
      .insert(performerRatings)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create performer rating');
    }

    return created;
  }

  async findById(id: string): Promise<DbPerformerRating | null> {
    const [rating] = await db
      .select()
      .from(performerRatings)
      .where(eq(performerRatings.id, id));

    return rating || null;
  }

  async listByPerformer(performerId: string): Promise<DbPerformerRating[]> {
    return await db
      .select()
      .from(performerRatings)
      .where(eq(performerRatings.performerId, performerId))
      .orderBy(desc(performerRatings.createdAt));
  }
}

export const performerRatingsRepository = new PerformerRatingsRepository();
