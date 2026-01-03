import { organizationsRepository } from '@collabverse/api';

export type UserSubscription = {
  planCode: 'free' | 'pro' | 'max';
  maxOrganizations: number; // -1 means unlimited
  expiresAt: string | null;
};

// Default subscription limits per plan
const PLAN_LIMITS: Record<'free' | 'pro' | 'max', { maxOrganizations: number }> = {
  free: { maxOrganizations: 1 },
  pro: { maxOrganizations: -1 }, // unlimited
  max: { maxOrganizations: -1 }, // unlimited
};

/**
 * Get user subscription info
 * Currently returns free plan for all users
 * TODO: Implement actual subscription lookup from user_subscription table
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUserSubscription(_userId: string): Promise<UserSubscription> {
  // TODO: Query user_subscription table when implemented
  // For now, return free plan for all users
  try {
    // Placeholder for future implementation:
    // const db = getDb();
    // const [subscription] = await db
    //   .select()
    //   .from(userSubscriptions)
    //   .where(eq(userSubscriptions.userId, userId));
    // 
    // if (subscription) {
    //   // Check if expired
    //   if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    //     return { planCode: 'free', maxOrganizations: 1, expiresAt: null };
    //   }
    //   return {
    //     planCode: subscription.planCode,
    //     maxOrganizations: subscription.maxOrganizations,
    //     expiresAt: subscription.expiresAt?.toISOString() ?? null,
    //   };
    // }

    // Default to free plan
    return {
      planCode: 'free',
      maxOrganizations: PLAN_LIMITS.free.maxOrganizations,
      expiresAt: null,
    };
  } catch (error) {
    console.error('[getUserSubscription] Error:', error);
    // Fallback to free plan on error
    return {
      planCode: 'free',
      maxOrganizations: PLAN_LIMITS.free.maxOrganizations,
      expiresAt: null,
    };
  }
}

/**
 * Get count of organizations owned by user
 */
export async function getOwnedOrganizationsCount(userId: string): Promise<number> {
  try {
    const memberships = await organizationsRepository.listMembershipsForUser(userId);
    const ownedCount = memberships.filter(m => m.member.role === 'owner').length;
    return ownedCount;
  } catch (error) {
    console.error('[getOwnedOrganizationsCount] Error:', error);
    return 0;
  }
}

/**
 * Check if user can create a new organization based on their subscription
 */
export async function canUserCreateOrganization(userId: string): Promise<{
  canCreate: boolean;
  reason?: string;
  subscription: UserSubscription;
  currentCount: number;
}> {
  const subscription = await getUserSubscription(userId);
  const currentCount = await getOwnedOrganizationsCount(userId);
  
  if (subscription.maxOrganizations === -1) {
    return { canCreate: true, subscription, currentCount };
  }
  
  if (currentCount >= subscription.maxOrganizations) {
    return {
      canCreate: false,
      reason: `You have reached the maximum of ${subscription.maxOrganizations} organization(s) for your ${subscription.planCode} plan.`,
      subscription,
      currentCount,
    };
  }
  
  return { canCreate: true, subscription, currentCount };
}

