import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { vacanciesRepository, vacancyResponsesRepository } from '@collabverse/api';
import { VacancyResponseStatusSchema } from '@/lib/schemas/performers';

const ListResponsesSchema = z.object({
  status: VacancyResponseStatusSchema.optional(),
  vacancyId: z.string().optional()
});

type ResponseWithVacancy = {
  id: string;
  vacancyId: string;
  performerId: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  vacancy: {
    id: string;
    title: string;
    organizationId: string;
  } | null;
};

function toIsoDate(value?: Date | string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const vacancyIdParam = searchParams.get('vacancyId');
  const parsed = ListResponsesSchema.safeParse({
    ...(statusParam ? { status: statusParam } : {}),
    ...(vacancyIdParam ? { vacancyId: vacancyIdParam } : {})
  });

  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(parsed.error.errors) });
  }

  try {
    const responses = await vacancyResponsesRepository.listByPerformer(user.id);
    const filtered = responses.filter((response) => {
      if (parsed.data.status && response.status !== parsed.data.status) {
        return false;
      }
      if (parsed.data.vacancyId && response.vacancyId !== parsed.data.vacancyId) {
        return false;
      }
      return true;
    });

    const vacancyIds = Array.from(new Set(filtered.map((response) => response.vacancyId)));
    const vacancies = await Promise.all(vacancyIds.map((id) => vacanciesRepository.findById(id)));
    const vacancyMap = new Map(
      vacancyIds
        .map((id, index) => [id, vacancies[index] ?? null] as const)
    );

    const result: ResponseWithVacancy[] = filtered.map((response) => {
      const status =
        response.status === 'accepted' || response.status === 'rejected'
          ? response.status
          : 'pending';
      const vacancy = vacancyMap.get(response.vacancyId) ?? null;
      return {
        id: response.id,
        vacancyId: response.vacancyId,
        performerId: response.performerId,
        message: response.message ?? null,
        status,
        createdAt: toIsoDate(response.createdAt),
        vacancy: vacancy
          ? {
              id: vacancy.id,
              title: vacancy.title,
              organizationId: vacancy.organizationId
            }
          : null
      };
    });

    return jsonOk({ responses: result });
  } catch (error) {
    console.error('[Responses API] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
