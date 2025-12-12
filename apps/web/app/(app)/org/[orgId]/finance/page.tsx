import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { OrganizationFinanceClient } from './OrganizationFinanceClient';

export default async function OrganizationFinancePage({ params }: { params: { orgId: string } }) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return <div>Please log in</div>;
  }

  const { orgId } = params;
  
  // Verify access and get org
  const member = await organizationsRepository.findMember(orgId, user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return <div>Access Denied. Only Owners and Admins can view finances.</div>;
  }

  const organization = await organizationsRepository.findById(orgId);
  if (!organization) {
    notFound();
  }

  return <OrganizationFinanceClient organization={organization} />;
}

