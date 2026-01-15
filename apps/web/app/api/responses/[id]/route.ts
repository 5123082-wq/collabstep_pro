import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  organizationsRepository,
  vacanciesRepository,
  vacancyResponsesRepository
} from '@collabverse/api';
import { VacancyResponseStatusSchema } from '@/lib/schemas/performers';

const UpdateResponseSchema = z.object({
  status: VacancyResponseStatusSchema
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  void _request;
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const response = await vacancyResponsesRepository.findById(params.id);
    if (!response) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    if (response.performerId !== user.id) {
      const vacancy = await vacanciesRepository.findById(response.vacancyId);
      if (!vacancy) {
        return jsonError('NOT_FOUND', { status: 404 });
      }

      const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
      if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
        return jsonError('FORBIDDEN', { status: 403 });
      }
    }

    return jsonOk({ response });
  } catch (error) {
    console.error('[Responses API] Error fetching:', error);
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
    const response = await vacancyResponsesRepository.findById(params.id);
    if (!response) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const vacancy = await vacanciesRepository.findById(response.vacancyId);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
    if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can update response status' });
    }

    const body = await request.json();
    const parsed = UpdateResponseSchema.parse(body);

    const updated = await vacancyResponsesRepository.updateStatus(params.id, parsed.status);
    if (!updated) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    return jsonOk({ response: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Responses API] Error updating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
