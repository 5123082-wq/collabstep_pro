import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { OrganizationSettingsClient } from './OrganizationSettingsClient';

export default async function OrganizationSettingsPage({ params }: { params: { orgId: string } }) {
  const user = await getCurrentUser();
  if (!user?.id) {
    // Should redirect to login ideally
    return <div>Please log in</div>;
  }

  const { orgId } = params;
  
  // Verify access and get org
  const member = await organizationsRepository.findMember(orgId, user.id);
  if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
    // Or return forbidden UI
    return <div>Access Denied</div>;
  }

  const organization = await organizationsRepository.findById(orgId);
  if (!organization) {
    notFound();
  }

  return <OrganizationSettingsClient organization={organization} />;
}

