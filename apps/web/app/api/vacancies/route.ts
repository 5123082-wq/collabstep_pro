import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { organizationsRepository, vacanciesRepository } from '@collabverse/api';
import {
  mapVacancyToMarketplace,
  VacancyCreateSchema,
  VacancyStatusSchema
} from '@/lib/api/performers/vacancies';

const ListVacanciesSchema = z.object({
  organizationId: z.string().optional(),
  status: VacancyStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = ListVacanciesSchema.safeParse({
    organizationId: searchParams.get('organizationId') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined
  });

  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(parsed.error.errors) });
  }

  const { organizationId, status, limit = 20, offset = 0 } = parsed.data;

  try {
    if (organizationId) {
      const user = await getCurrentUser();
      if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
      }

      const member = await organizationsRepository.findMember(organizationId, user.id);
      if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
        return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can view organization vacancies' });
      }

      const organization = await organizationsRepository.findById(organizationId);
      if (!organization) {
        return jsonError('NOT_FOUND', { status: 404, details: 'Organization not found' });
      }

      const vacancies = await vacanciesRepository.listByOrganization(
        organizationId,
        {
          ...(status ? { status } : {}),
          limit,
          offset
        }
      );

      const mapped = vacancies.map((vacancy) =>
        mapVacancyToMarketplace(
          vacancy,
          organization.name ? { organizationName: organization.name } : {}
        )
      );
      return jsonOk({ vacancies: mapped });
    }

    const vacancies = await vacanciesRepository.listPublic({ limit, offset });
    const orgIds = Array.from(new Set(vacancies.map((vacancy) => vacancy.organizationId)));
    const organizations = await Promise.all(
      orgIds.map(async (id) => [id, await organizationsRepository.findById(id)] as const)
    );
    const orgNameMap = new Map(
      organizations.map(([id, org]) => [id, org?.name ?? id])
    );

    const mapped = vacancies.map((vacancy) => {
      const organizationName = orgNameMap.get(vacancy.organizationId);
      return mapVacancyToMarketplace(
        vacancy,
        organizationName ? { organizationName } : {}
      );
    });
    return jsonOk({ vacancies: mapped });
  } catch (error) {
    console.error('[Vacancies API] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = VacancyCreateSchema.parse(body);

    const member = await organizationsRepository.findMember(parsed.organizationId, user.id);
    if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can create vacancies' });
    }

    const organization = await organizationsRepository.findById(parsed.organizationId);
    if (!organization) {
      return jsonError('NOT_FOUND', { status: 404, details: 'Organization not found' });
    }

    const created = await vacanciesRepository.create({
      organizationId: parsed.organizationId,
      createdBy: user.id,
      title: parsed.title,
      summary: parsed.summary,
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      level: parsed.level,
      employmentType: parsed.employment,
      workFormat: parsed.format,
      rewardType: parsed.reward.type,
      rewardData: parsed.reward,
      language: parsed.language,
      timezone: parsed.timezone,
      deadline: new Date(parsed.deadline),
      requirements: parsed.requirements,
      responsibilities: parsed.responsibilities,
      testTask: parsed.testTask,
      paymentNote: parsed.paymentNote,
      contactName: parsed.contact.name,
      contactChannel: parsed.contact.channel,
      status: parsed.status ?? 'draft'
    });

    const vacancy = mapVacancyToMarketplace(created, { organizationName: organization.name });
    return jsonOk({ vacancy, status: created.status, organizationId: created.organizationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Vacancies API] Error creating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
