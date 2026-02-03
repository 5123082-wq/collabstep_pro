import { eq } from 'drizzle-orm';
import { db } from '../db/config';
import { userSubscriptions } from '../db/schema';

export type UserSubscriptionRecord = typeof userSubscriptions.$inferSelect;
export type UserSubscriptionInsert = typeof userSubscriptions.$inferInsert;

class UserSubscriptionsRepository {
  async findByUserId(userId: string): Promise<UserSubscriptionRecord | null> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    return subscription ?? null;
  }

  async create(data: UserSubscriptionInsert): Promise<UserSubscriptionRecord> {
    const [subscription] = await db
      .insert(userSubscriptions)
      .values(data)
      .returning();
    if (!subscription) {
      throw new Error('Failed to create user subscription');
    }
    return subscription;
  }

  async update(
    userId: string,
    data: Partial<Omit<UserSubscriptionInsert, 'userId' | 'id'>>
  ): Promise<UserSubscriptionRecord | null> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return subscription ?? null;
  }

  async getOrCreate(userId: string): Promise<UserSubscriptionRecord> {
    let subscription = await this.findByUserId(userId);
    if (!subscription) {
      subscription = await this.create({
        userId,
        planCode: 'free',
        maxOrganizations: 1,
      });
    }
    return subscription;
  }

  async delete(userId: string): Promise<boolean> {
    const result = await db
      .delete(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return result.length > 0;
  }
}

export const userSubscriptionsRepository = new UserSubscriptionsRepository();
