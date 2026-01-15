import { notFound } from 'next/navigation';
import VacancyDetail from '@/components/marketplace/VacancyDetail';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, vacanciesRepository } from '@collabverse/api';
import { mapVacancyToMarketplace } from '@/lib/api/performers/vacancies';
import { VacancyEditor } from '@/components/performers/VacancyEditor';

type VacancyDetailPageProps = {
  params: { id: string };
};

export const dynamic = 'force-dynamic';

export default async function PerformersVacancyDetailPage({ params }: VacancyDetailPageProps) {
  const vacancy = await vacanciesRepository.findById(params.id);

  if (!vacancy) {
    notFound();
  }

  let isOwnerAdmin = false;

  if (vacancy.status !== 'published') {
    const user = await getCurrentUser();
    if (!user?.id) {
      notFound();
    }

    const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
    if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      notFound();
    }
    isOwnerAdmin = true;
  } else {
    const user = await getCurrentUser();
    if (user?.id) {
      const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
      if (member && member.status === 'active' && ['owner', 'admin'].includes(member.role)) {
        isOwnerAdmin = true;
      }
    }
  }

  const organization = await organizationsRepository.findById(vacancy.organizationId);
  const mapped = mapVacancyToMarketplace(
    vacancy,
    organization?.name ? { organizationName: organization.name } : {}
  );
  const vacancyStatus =
    vacancy.status === 'published' || vacancy.status === 'closed' ? vacancy.status : 'draft';

  return (
    <div className="space-y-6">
      <VacancyDetail vacancy={mapped} />
      <VacancyEditor vacancy={mapped} status={vacancyStatus} canEdit={isOwnerAdmin} />
    </div>
  );
}
