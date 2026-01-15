import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getProjectRole } from '@/lib/api/finance-access';
import { performerRatingsRepository, projectsRepository } from '@collabverse/api';
import { PerformerRatingSchema } from '@/lib/schemas/performers';

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  void _request;
  try {
    const ratings = await performerRatingsRepository.listByPerformer(params.userId);
    return jsonOk({ ratings });
  } catch (error) {
    console.error('[Performer Ratings API] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = PerformerRatingSchema.parse(body);

    if (!parsed.projectId) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: 'projectId is required' });
    }

    const project = await projectsRepository.findById(parsed.projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    if (!['completed', 'archived'].includes(project.status)) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Project must be completed to rate' });
    }

    const members = await projectsRepository.listMembers(parsed.projectId);
    const isRaterParticipant =
      project.ownerId === user.id || members.some((member) => member.userId === user.id);
    const isPerformerParticipant =
      project.ownerId === params.userId || members.some((member) => member.userId === params.userId);

    if (!isRaterParticipant || !isPerformerParticipant) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Both rater and performer must belong to the project' });
    }

    const role = await getProjectRole(parsed.projectId, user.id, user.email ?? undefined);
    if (role === 'viewer') {
      return jsonError('FORBIDDEN', { status: 403, details: 'Access denied for rating this project' });
    }

    const created = await performerRatingsRepository.create({
      performerId: params.userId,
      raterId: user.id,
      projectId: parsed.projectId,
      rating: parsed.rating,
      ...(parsed.review !== undefined ? { review: parsed.review } : {})
    });

    return jsonOk({ rating: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Performer Ratings API] Error creating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
