import {
  organizationsRepository,
  organizationSubscriptionsRepository,
  subscriptionPlansRepository,
  type DbSubscriptionPlan,
} from '@collabverse/api';
import { getUserSubscription } from '@/lib/api/user-subscription';

const ARCHIVED_STATUSES = new Set(['archived', 'deleted']);

type OrganizationTimestamp = Date | string | null | undefined;

function toTimestamp(value: OrganizationTimestamp): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime();
  return 0;
}

async function resolveUserPlan(userId: string): Promise<DbSubscriptionPlan> {
  const subscription = await getUserSubscription(userId);
  const planCode = subscription.planCode ?? 'free';
  const plan = await subscriptionPlansRepository.findByCode(planCode);
  return plan ?? subscriptionPlansRepository.getDefaultPlan();
}

async function getPrimaryBusinessOrganizationId(ownerId: string): Promise<string | null> {
  const memberships = await organizationsRepository.listMembershipsForUser(ownerId);
  const ownedBusinesses = memberships
    .map((entry) => entry.organization)
    .filter((organization) => organization.ownerId === ownerId)
    .filter((organization) => (organization.kind ?? 'business') === 'business')
    .filter((organization) => !ARCHIVED_STATUSES.has(organization.status ?? 'active'))
    .sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt));

  return ownedBusinesses[0]?.id ?? null;
}

export async function resolveOrganizationPlan(organizationId: string): Promise<DbSubscriptionPlan> {
  const organization = await organizationsRepository.findById(organizationId);
  if (!organization) {
    return subscriptionPlansRepository.getDefaultPlan();
  }

  if ((organization.kind ?? 'business') === 'personal') {
    return resolveUserPlan(organization.ownerId);
  }

  const primaryBusinessId = await getPrimaryBusinessOrganizationId(organization.ownerId);
  if (primaryBusinessId && primaryBusinessId === organizationId) {
    return resolveUserPlan(organization.ownerId);
  }

  return organizationSubscriptionsRepository.getPlanForOrganization(organizationId);
}
