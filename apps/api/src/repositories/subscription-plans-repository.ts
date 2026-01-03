import { eq } from 'drizzle-orm';
import { db } from '../db/config';
import { subscriptionPlans } from '../db/schema';

export type DbSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewDbSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * Repository for subscription plans
 */
export class SubscriptionPlansRepository {
  /**
   * Find plan by code (free, pro, max)
   */
  async findByCode(code: 'free' | 'pro' | 'max'): Promise<DbSubscriptionPlan | null> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, code));

    return plan || null;
  }

  /**
   * Find plan by ID
   */
  async findById(id: string): Promise<DbSubscriptionPlan | null> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));

    return plan || null;
  }

  /**
   * List all plans
   */
  async list(): Promise<DbSubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.code);
  }

  /**
   * Create a new plan
   */
  async create(input: NewDbSubscriptionPlan): Promise<DbSubscriptionPlan> {
    const [created] = await db
      .insert(subscriptionPlans)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create subscription plan');
    }

    return created;
  }

  /**
   * Get default plan (free) with safe fallback
   */
  async getDefaultPlan(): Promise<DbSubscriptionPlan> {
    const freePlan = await this.findByCode('free');
    if (freePlan) {
      return freePlan;
    }

    // Fallback: return a default plan structure if free plan doesn't exist
    // This should not happen in production, but provides safety
    return {
      id: 'default-free',
      code: 'free',
      name: 'Free',
      storageLimitBytes: 1024 * 1024 * 1024, // 1 GB
      fileSizeLimitBytes: 10 * 1024 * 1024, // 10 MB
      trashRetentionDays: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DbSubscriptionPlan;
  }
}

export const subscriptionPlansRepository = new SubscriptionPlansRepository();

