import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { trackEvent } from '@/lib/telemetry';
import {
  marketplaceAuthorPublicationsRepository,
  marketplaceListingsRepository
} from '@collabverse/api';
import { resolveMarketplaceListingManagerContext } from '@/lib/marketplace/pm-listing-authorship';

const PublicationKindSchema = z.enum(['solution', 'template', 'service']);

const UpdatePublicationSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  state: z.enum(['draft', 'published', 'rejected']).optional(),
  showOnAuthorPage: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { kind: string; id: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const parsedKind = PublicationKindSchema.safeParse(params.kind);
  if (!parsedKind.success) {
    return jsonError('INVALID_KIND', { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = UpdatePublicationSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError('INVALID_PAYLOAD', {
        status: 400,
        details: JSON.stringify(parsedBody.error.flatten())
      });
    }

    const kind = parsedKind.data;

    if (kind === 'solution') {
      const listing = marketplaceListingsRepository.findById(params.id);
      if (!listing) {
        return jsonError('NOT_FOUND', { status: 404 });
      }

      const managerContext = await resolveMarketplaceListingManagerContext(listing, user.id);
      if (!managerContext?.canManage) {
        return jsonError('FORBIDDEN', { status: 403 });
      }

      const updated = marketplaceListingsRepository.update(params.id, {
        ...(parsedBody.data.title !== undefined ? { title: parsedBody.data.title } : {}),
        ...(parsedBody.data.description !== undefined ? { description: parsedBody.data.description } : {}),
        ...(parsedBody.data.state !== undefined ? { state: parsedBody.data.state } : {}),
        ...(parsedBody.data.showOnAuthorPage !== undefined
          ? { showOnAuthorPage: parsedBody.data.showOnAuthorPage }
          : {}),
        ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {}),
        lastEditedByUserId: user.id
      });

      if (!updated) {
        return jsonError('NOT_FOUND', { status: 404 });
      }

      trackEvent('catalog_publication_updated', {
        userId: user.id,
        kind,
        publicationId: updated.id,
        state: updated.state,
        authorEntityType: managerContext.authorEntity.type,
        authorEntityId: managerContext.authorEntity.id
      });

      return jsonOk({ item: updated });
    }

    const publication = marketplaceAuthorPublicationsRepository.findById(params.id);
    if (!publication || publication.kind !== kind) {
      return jsonError('NOT_FOUND', { status: 404 });
    }
    if (publication.ownerUserId !== user.id) {
      return jsonError('FORBIDDEN', { status: 403 });
    }

    const updated = marketplaceAuthorPublicationsRepository.update(params.id, user.id, {
      ...(parsedBody.data.title !== undefined ? { title: parsedBody.data.title } : {}),
      ...(parsedBody.data.description !== undefined ? { description: parsedBody.data.description } : {}),
      ...(parsedBody.data.tags !== undefined ? { tags: parsedBody.data.tags } : {}),
      ...(parsedBody.data.state !== undefined ? { state: parsedBody.data.state } : {}),
      ...(parsedBody.data.showOnAuthorPage !== undefined
        ? { showOnAuthorPage: parsedBody.data.showOnAuthorPage }
        : {}),
      ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {})
    });

    if (!updated) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    trackEvent('catalog_publication_updated', {
      userId: user.id,
      kind,
      publicationId: updated.id,
      state: updated.state
    });

    return jsonOk({ item: updated });
  } catch (error) {
    console.error('[catalog author publications] update failed:', error);
    if (error instanceof Error && error.message === 'MARKETPLACE_OVERLAY_RUNTIME_DISABLED') {
      return jsonError('MARKETPLACE_RUNTIME_UNAVAILABLE', {
        status: 503,
        details: 'Author publications are disabled until they are backed by the database.'
      });
    }
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
