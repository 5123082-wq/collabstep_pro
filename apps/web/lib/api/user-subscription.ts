import { organizationsRepository, userSubscriptionsRepository } from '@collabverse/api';

export type UserSubscription = {
  planCode: 'free' | 'pro' | 'max';
  maxOrganizations: number; // -1 means unlimited (business orgs)
  expiresAt: string | null;
};

// Default subscription limits per plan
const PLAN_LIMITS: Record<'free' | 'pro' | 'max', { maxOrganizations: number }> = {
  free: { maxOrganizations: 1 },
  pro: { maxOrganizations: -1 }, // unlimited
  max: { maxOrganizations: -1 }, // unlimited
};

/**
 * Get user subscription info from database
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  try {
    const subscription = await userSubscriptionsRepository.getOrCreate(userId);

    // Check if subscription expired
    if (
      subscription.expiresAt &&
      new Date(subscription.expiresAt) < new Date()
    ) {
      return {
        planCode: 'free',
        maxOrganizations: PLAN_LIMITS.free.maxOrganizations,
        expiresAt: null,
      };
    }

    return {
      planCode: subscription.planCode,
      maxOrganizations: subscription.maxOrganizations,
      expiresAt: subscription.expiresAt?.toISOString() ?? null,
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
 * Get count of organizations owned by user (optionally filtered by kind)
 */
export async function getOwnedOrganizationsCount(
  userId: string,
  kind?: 'personal' | 'business'
): Promise<number> {
  try {
    const memberships = await organizationsRepository.listMembershipsForUser(userId);
    const ownedOrganizations = memberships
      .filter((membership) => membership.member.role === 'owner')
      .map((membership) => membership.organization)
      .filter((organization) => !['archived', 'deleted'].includes(organization.status ?? 'active'));

    if (!kind) {
      return ownedOrganizations.length;
    }

    return ownedOrganizations.filter((organization) => (organization.kind ?? 'business') === kind).length;
  } catch (error) {
    console.error('[getOwnedOrganizationsCount] Error:', error);
    return 0;
  }
}

/**
 * Check if user can create a new organization based on their subscription
 */
export async function canUserCreateOrganization(
  userId: string,
  kind: 'personal' | 'business' = 'business'
): Promise<{
  canCreate: boolean;
  reason?: string;
  subscription: UserSubscription;
  currentCount: number;
}> {
  const subscription = await getUserSubscription(userId);
  const currentCount = await getOwnedOrganizationsCount(userId, kind);

  if (kind === 'personal') {
    if (currentCount >= 1) {
      return {
        canCreate: false,
        reason: 'Personal organization limit reached.',
        subscription,
        currentCount,
      };
    }
    return { canCreate: true, subscription, currentCount };
  }

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
