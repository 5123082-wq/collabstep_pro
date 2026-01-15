import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  organizationsRepository,
  performerProfilesRepository,
  vacanciesRepository,
  vacancyResponsesRepository
} from '@collabverse/api';
import { VacancyResponseSchema } from '@/lib/schemas/performers';

const CreateResponseSchema = VacancyResponseSchema.pick({ message: true });

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
    const vacancy = await vacanciesRepository.findById(params.id);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
    const isOwnerAdmin = !!member && member.status === 'active' && ['owner', 'admin'].includes(member.role);

    const responses = await vacancyResponsesRepository.listByVacancy(params.id);
    const visible = isOwnerAdmin
      ? responses
      : responses.filter((response) => response.performerId === user.id);

    return jsonOk({ responses: visible });
  } catch (error) {
    console.error('[Vacancy Responses API] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
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

    if (vacancy.status !== 'published') {
      return jsonError('FORBIDDEN', { status: 403, details: 'Vacancy is not published' });
    }

    const performerProfile = await performerProfilesRepository.findByUserId(user.id);
    if (!performerProfile) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Performer profile required to respond' });
    }

    const body = await request.json();
    const parsed = CreateResponseSchema.parse(body);

    const created = await vacancyResponsesRepository.create({
      vacancyId: params.id,
      performerId: user.id,
      ...(parsed.message !== undefined ? { message: parsed.message } : {}),
      status: 'pending'
    });

    return jsonOk({ response: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Vacancy Responses API] Error creating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
