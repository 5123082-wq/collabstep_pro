import type { ID } from '../types';
import { memory } from '../data/memory';

export type MarketplaceAuthorPublicationKind = 'template' | 'service';
export type MarketplaceAuthorPublicationState = 'draft' | 'published' | 'rejected';

export interface MarketplaceAuthorPublication {
  id: ID;
  ownerUserId: ID;
  kind: MarketplaceAuthorPublicationKind;
  sourceTemplateId?: ID;
  title: string;
  description: string;
  tags: string[];
  state: MarketplaceAuthorPublicationState;
  showOnAuthorPage: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function normalizeTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 8);
}

function clonePublication(publication: MarketplaceAuthorPublication): MarketplaceAuthorPublication {
  return {
    ...publication,
    ...(publication.sourceTemplateId ? { sourceTemplateId: publication.sourceTemplateId } : {}),
    tags: [...publication.tags]
  };
}

export class MarketplaceAuthorPublicationsRepository {
  listByOwnerUserId(ownerUserId: string): MarketplaceAuthorPublication[] {
    return memory.MARKETPLACE_AUTHOR_PUBLICATIONS
      .filter((publication) => publication.ownerUserId === ownerUserId)
      .map(clonePublication);
  }

  listPublishedByOwnerUserId(ownerUserId: string): MarketplaceAuthorPublication[] {
    return memory.MARKETPLACE_AUTHOR_PUBLICATIONS
      .filter((publication) => publication.ownerUserId === ownerUserId && publication.state === 'published')
      .map(clonePublication);
  }

  findById(id: string): MarketplaceAuthorPublication | null {
    const publication = memory.MARKETPLACE_AUTHOR_PUBLICATIONS.find((item) => item.id === id);
    return publication ? clonePublication(publication) : null;
  }

  findBySourceTemplateId(sourceTemplateId: string, ownerUserId: string): MarketplaceAuthorPublication | null {
    const publication = memory.MARKETPLACE_AUTHOR_PUBLICATIONS.find(
      (item) => item.kind === 'template' && item.ownerUserId === ownerUserId && item.sourceTemplateId === sourceTemplateId
    );
    return publication ? clonePublication(publication) : null;
  }

  createTemplateFromSource(payload: {
    ownerUserId: string;
    sourceTemplateId: string;
    title: string;
    description: string;
    tags?: string[];
  }): MarketplaceAuthorPublication {
    const existing = this.findBySourceTemplateId(payload.sourceTemplateId, payload.ownerUserId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const publication: MarketplaceAuthorPublication = {
      id: crypto.randomUUID(),
      ownerUserId: payload.ownerUserId,
      kind: 'template',
      sourceTemplateId: payload.sourceTemplateId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      tags: normalizeTags(payload.tags ?? []),
      state: 'draft',
      showOnAuthorPage: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };

    memory.MARKETPLACE_AUTHOR_PUBLICATIONS.push(publication);
    return clonePublication(publication);
  }

  createService(payload: {
    ownerUserId: string;
    title: string;
    description: string;
    tags?: string[];
  }): MarketplaceAuthorPublication {
    const now = new Date().toISOString();
    const publication: MarketplaceAuthorPublication = {
      id: crypto.randomUUID(),
      ownerUserId: payload.ownerUserId,
      kind: 'service',
      title: payload.title.trim(),
      description: payload.description.trim(),
      tags: normalizeTags(payload.tags ?? []),
      state: 'draft',
      showOnAuthorPage: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };

    memory.MARKETPLACE_AUTHOR_PUBLICATIONS.push(publication);
    return clonePublication(publication);
  }

  update(
    id: string,
    ownerUserId: string,
    patch: Partial<
      Pick<MarketplaceAuthorPublication, 'title' | 'description' | 'tags' | 'state' | 'showOnAuthorPage' | 'sortOrder'>
    >
  ): MarketplaceAuthorPublication | null {
    const index = memory.MARKETPLACE_AUTHOR_PUBLICATIONS.findIndex(
      (item) => item.id === id && item.ownerUserId === ownerUserId
    );
    if (index === -1) {
      return null;
    }

    const current = memory.MARKETPLACE_AUTHOR_PUBLICATIONS[index];
    if (!current) {
      return null;
    }

    const next: MarketplaceAuthorPublication = {
      id: current.id,
      ownerUserId: current.ownerUserId,
      kind: current.kind,
      title: current.title,
      description: current.description,
      tags: [...current.tags],
      state: current.state,
      showOnAuthorPage: current.showOnAuthorPage,
      sortOrder: current.sortOrder,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      ...(current.sourceTemplateId ? { sourceTemplateId: current.sourceTemplateId } : {})
    };

    if (typeof patch.title === 'string' && patch.title.trim()) {
      next.title = patch.title.trim();
    }

    if (typeof patch.description === 'string') {
      next.description = patch.description.trim();
    }

    if (Array.isArray(patch.tags)) {
      next.tags = normalizeTags(patch.tags);
    }

    if (patch.state && ['draft', 'published', 'rejected'].includes(patch.state)) {
      next.state = patch.state as MarketplaceAuthorPublicationState;
    }

    if (typeof patch.showOnAuthorPage === 'boolean') {
      next.showOnAuthorPage = patch.showOnAuthorPage;
    }

    if (typeof patch.sortOrder === 'number' && Number.isFinite(patch.sortOrder)) {
      next.sortOrder = patch.sortOrder;
    }

    memory.MARKETPLACE_AUTHOR_PUBLICATIONS[index] = next;
    return clonePublication(next);
  }
}

export const marketplaceAuthorPublicationsRepository = new MarketplaceAuthorPublicationsRepository();
