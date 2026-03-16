import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { trackEvent } from '@/lib/telemetry';
import { marketplaceAuthorPublicationsRepository, userTemplatesRepository } from '@collabverse/api';

const CreateAuthorPublicationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('template'),
    sourceTemplateId: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('service'),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1200).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(8).optional()
  })
]);

function templateTags(template: Awaited<ReturnType<typeof userTemplatesRepository.findById>>): string[] {
  if (!template) {
    return [];
  }
  const values = [template.kind, template.projectType, template.projectStage];
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    )
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateAuthorPublicationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', {
        status: 400,
        details: JSON.stringify(parsed.error.flatten())
      });
    }

    if (parsed.data.kind === 'template') {
      const template = await userTemplatesRepository.findById(parsed.data.sourceTemplateId, user.id);
      if (!template) {
        return jsonError('TEMPLATE_NOT_FOUND', { status: 404 });
      }

      const publication = marketplaceAuthorPublicationsRepository.createTemplateFromSource({
        ownerUserId: user.id,
        sourceTemplateId: template.id,
        title: template.title,
        description: template.summary ?? '',
        tags: templateTags(template)
      });

      trackEvent('catalog_publication_created', {
        userId: user.id,
        kind: publication.kind,
        publicationId: publication.id,
        sourceTemplateId: template.id
      });

      return jsonOk({ item: publication }, { status: 201 });
    }

    const publication = marketplaceAuthorPublicationsRepository.createService({
      ownerUserId: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? '',
      ...(parsed.data.tags ? { tags: parsed.data.tags } : {})
    });

    trackEvent('catalog_publication_created', {
      userId: user.id,
      kind: publication.kind,
      publicationId: publication.id
    });

    return jsonOk({ item: publication }, { status: 201 });
  } catch (error) {
    console.error('[catalog author publications] create failed:', error);
    if (error instanceof Error && error.message === 'MARKETPLACE_OVERLAY_RUNTIME_DISABLED') {
      return jsonError('MARKETPLACE_RUNTIME_UNAVAILABLE', {
        status: 503,
        details: 'Author publications are disabled until they are backed by the database.'
      });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
