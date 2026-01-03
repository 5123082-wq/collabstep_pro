import { eq, and, or, gt, isNull } from 'drizzle-orm';
import { db } from '../db/config';
import { organizationSubscriptions, subscriptionPlans } from '../db/schema';

export type DbOrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type NewDbOrganizationSubscription = typeof organizationSubscriptions.$inferInsert;

export type OrganizationSubscriptionWithPlan = DbOrganizationSubscription & {
  plan: typeof subscriptionPlans.$inferSelect;
};

/**
 * Repository for organization subscriptions
 */
export class OrganizationSubscriptionsRepository {
  /**
   * Find active subscription for organization
   */
  async findActive(organizationId: string): Promise<OrganizationSubscriptionWithPlan | null> {
    const now = new Date();

    const [result] = await db
      .select({
        subscription: organizationSubscriptions,
        plan: subscriptionPlans,
      })
      .from(organizationSubscriptions)
      .innerJoin(subscriptionPlans, eq(organizationSubscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, 'active'),
          // Subscription is active if:
          // - expiresAt is null (unlimited) OR
          // - expiresAt > now
          or(
            isNull(organizationSubscriptions.expiresAt),
            gt(organizationSubscriptions.expiresAt, now)
          )
        )
      )
      .orderBy(organizationSubscriptions.startsAt)
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      ...result.subscription,
      plan: result.plan,
    };
  }

  /**
   * Get subscription plan for organization with safe fallback
   * Returns the plan from active subscription, or default free plan
   */
  async getPlanForOrganization(organizationId: string): Promise<typeof subscriptionPlans.$inferSelect> {
    const active = await this.findActive(organizationId);
    if (active) {
      return active.plan;
    }

    // Fallback to default free plan
    const { subscriptionPlansRepository } = await import('./subscription-plans-repository');
    return await subscriptionPlansRepository.getDefaultPlan();
  }

  /**
   * Create a new subscription
   */
  async create(input: NewDbOrganizationSubscription): Promise<DbOrganizationSubscription> {
    const [created] = await db
      .insert(organizationSubscriptions)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create organization subscription');
    }

    return created;
  }

  /**
   * Find subscription by ID
   */
  async findById(id: string): Promise<DbOrganizationSubscription | null> {
    const [subscription] = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.id, id));

    return subscription || null;
  }

  /**
   * List all subscriptions for organization
   */
  async listByOrganization(organizationId: string): Promise<DbOrganizationSubscription[]> {
    return await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .orderBy(organizationSubscriptions.startsAt);
  }
}

export const organizationSubscriptionsRepository = new OrganizationSubscriptionsRepository();

