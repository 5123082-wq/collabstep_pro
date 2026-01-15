import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { organizationsRepository, vacanciesRepository } from '@collabverse/api';
import { mapVacancyToMarketplace, VacancyStatusSchema } from '@/lib/api/performers/vacancies';

const UpdateStatusSchema = z.object({
  status: VacancyStatusSchema
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const vacancy = await vacanciesRepository.findById(params.id);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
    if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can update vacancy status' });
    }

    const body = await request.json();
    const parsed = UpdateStatusSchema.parse(body);

    const updated = await vacanciesRepository.updateStatus(params.id, parsed.status);
    if (!updated) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const organization = await organizationsRepository.findById(updated.organizationId);
    const mapped = mapVacancyToMarketplace(
      updated,
      organization?.name ? { organizationName: organization.name } : {}
    );
    return jsonOk({ vacancy: mapped, status: updated.status, organizationId: updated.organizationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Vacancy Status API] Error updating status:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
