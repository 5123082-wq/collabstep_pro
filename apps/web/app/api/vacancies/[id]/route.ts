import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { organizationsRepository, vacanciesRepository } from '@collabverse/api';
import {
  mapVacancyToMarketplace,
  VacancyPatchSchema
} from '@/lib/api/performers/vacancies';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  void _request;
  try {
    const vacancy = await vacanciesRepository.findById(params.id);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    if (vacancy.status !== 'published') {
      const user = await getCurrentUser();
      if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
      }

      const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
      if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
        return jsonError('FORBIDDEN', { status: 403 });
      }
    }

    const organization = await organizationsRepository.findById(vacancy.organizationId);
    const mapped = mapVacancyToMarketplace(
      vacancy,
      organization?.name ? { organizationName: organization.name } : {}
    );
    return jsonOk({ vacancy: mapped, status: vacancy.status, organizationId: vacancy.organizationId });
  } catch (error) {
    console.error('[Vacancy API] Error fetching:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

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
      return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can update vacancies' });
    }

    const body = await request.json();
    const parsed = VacancyPatchSchema.parse(body);
    if (Object.keys(parsed).length === 0) {
      return jsonError('INVALID_REQUEST', { status: 400, details: 'No fields provided for update' });
    }

    const updateData: Parameters<typeof vacanciesRepository.update>[1] = {};

    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.summary !== undefined) updateData.summary = parsed.summary;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.level !== undefined) updateData.level = parsed.level;
    if (parsed.employment !== undefined) updateData.employmentType = parsed.employment;
    if (parsed.format !== undefined) updateData.workFormat = parsed.format;
    if (parsed.reward !== undefined) {
      updateData.rewardType = parsed.reward.type;
      updateData.rewardData = parsed.reward;
    }
    if (parsed.language !== undefined) updateData.language = parsed.language;
    if (parsed.timezone !== undefined) updateData.timezone = parsed.timezone;
    if (parsed.deadline !== undefined) updateData.deadline = new Date(parsed.deadline);
    if (parsed.requirements !== undefined) updateData.requirements = parsed.requirements;
    if (parsed.responsibilities !== undefined) updateData.responsibilities = parsed.responsibilities;
    if (parsed.testTask !== undefined) updateData.testTask = parsed.testTask;
    if (parsed.paymentNote !== undefined) updateData.paymentNote = parsed.paymentNote;
    if (parsed.contact !== undefined) {
      updateData.contactName = parsed.contact.name;
      updateData.contactChannel = parsed.contact.channel;
    }

    if (Object.keys(updateData).length === 0) {
      return jsonError('INVALID_REQUEST', { status: 400, details: 'No supported fields provided for update' });
    }

    const updated = await vacanciesRepository.update(params.id, updateData);
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
    console.error('[Vacancy API] Error updating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
