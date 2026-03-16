import type { ID } from '../types';
import { memory } from '../data/memory';

export type MarketplaceListingState = 'draft' | 'published' | 'rejected';
export type MarketplaceListingAuthorEntityType = 'user' | 'organization';

export interface MarketplaceListing {
  id: ID;
  projectId: ID;
  workspaceId: ID;
  authorEntityType: MarketplaceListingAuthorEntityType;
  authorEntityId: ID;
  publishedByUserId: ID;
  lastEditedByUserId: ID;
  title: string;
  description?: string;
  state: MarketplaceListingState;
  showOnAuthorPage: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function cloneListing(listing: MarketplaceListing): MarketplaceListing {
  return {
    ...listing,
    ...(listing.description ? { description: listing.description } : {})
  };
}

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID === 'string';
}

function ensureRuntimeWriteAvailable(): void {
  if (!isTestRuntime()) {
    throw new Error('MARKETPLACE_OVERLAY_RUNTIME_DISABLED');
  }
}

export class MarketplaceListingsRepository {
  list(): MarketplaceListing[] {
    if (!isTestRuntime()) {
      return [];
    }
    return memory.MARKETPLACE_LISTINGS.map(cloneListing);
  }

  findByProjectId(projectId: string): MarketplaceListing | null {
    if (!isTestRuntime()) {
      return null;
    }
    const listing = memory.MARKETPLACE_LISTINGS.find((l) => l.projectId === projectId);
    return listing ? cloneListing(listing) : null;
  }

  findById(id: string): MarketplaceListing | null {
    if (!isTestRuntime()) {
      return null;
    }
    const listing = memory.MARKETPLACE_LISTINGS.find((l) => l.id === id);
    return listing ? cloneListing(listing) : null;
  }

  create(payload: {
    projectId: string;
    workspaceId: string;
    authorEntityType: MarketplaceListingAuthorEntityType;
    authorEntityId: string;
    publishedByUserId: string;
    title: string;
    description?: string;
    state?: MarketplaceListingState;
    showOnAuthorPage?: boolean;
    sortOrder?: number;
  }): MarketplaceListing {
    ensureRuntimeWriteAvailable();
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: crypto.randomUUID(),
      projectId: payload.projectId,
      workspaceId: payload.workspaceId,
      authorEntityType: payload.authorEntityType,
      authorEntityId: payload.authorEntityId,
      publishedByUserId: payload.publishedByUserId,
      lastEditedByUserId: payload.publishedByUserId,
      title: payload.title,
      state: payload.state ?? 'draft',
      showOnAuthorPage: payload.showOnAuthorPage ?? false,
      sortOrder: payload.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now
    };

    if (payload.description) {
      listing.description = payload.description;
    }

    memory.MARKETPLACE_LISTINGS.push(listing);
    return cloneListing(listing);
  }

  listByAuthorEntity(authorEntityType: MarketplaceListingAuthorEntityType, authorEntityId: string): MarketplaceListing[] {
    if (!isTestRuntime()) {
      return [];
    }
    return memory.MARKETPLACE_LISTINGS
      .filter(
        (listing) => listing.authorEntityType === authorEntityType && listing.authorEntityId === authorEntityId
      )
      .map(cloneListing);
  }

  listPublishedByAuthorEntity(
    authorEntityType: MarketplaceListingAuthorEntityType,
    authorEntityId: string
  ): MarketplaceListing[] {
    if (!isTestRuntime()) {
      return [];
    }
    return memory.MARKETPLACE_LISTINGS
      .filter(
        (listing) =>
          listing.authorEntityType === authorEntityType &&
          listing.authorEntityId === authorEntityId &&
          listing.state === 'published'
      )
      .map(cloneListing);
  }

  update(
    id: string,
    patch: Partial<
      Pick<MarketplaceListing, 'title' | 'description' | 'state' | 'showOnAuthorPage' | 'sortOrder' | 'lastEditedByUserId'>
    >
  ): MarketplaceListing | null {
    ensureRuntimeWriteAvailable();
    const idx = memory.MARKETPLACE_LISTINGS.findIndex((l) => l.id === id);
    if (idx === -1) {
      return null;
    }

    const current = memory.MARKETPLACE_LISTINGS[idx];
    if (!current) {
      return null;
    }
    
    const next: MarketplaceListing = {
      id: current.id,
      projectId: current.projectId,
      workspaceId: current.workspaceId,
      authorEntityType: current.authorEntityType,
      authorEntityId: current.authorEntityId,
      publishedByUserId: current.publishedByUserId,
      lastEditedByUserId: current.lastEditedByUserId,
      title: current.title,
      state: current.state,
      showOnAuthorPage: current.showOnAuthorPage,
      sortOrder: current.sortOrder,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      ...(current.description && { description: current.description })
    };

    if (typeof patch.title === 'string' && patch.title.trim()) {
      next.title = patch.title.trim();
    }

    if ('description' in patch) {
      if (typeof patch.description === 'string') {
        next.description = patch.description;
      } else {
        delete next.description;
      }
    }

    if (patch.state && ['draft', 'published', 'rejected'].includes(patch.state)) {
      next.state = patch.state as MarketplaceListingState;
    }

    if (typeof patch.showOnAuthorPage === 'boolean') {
      next.showOnAuthorPage = patch.showOnAuthorPage;
    }

    if (typeof patch.sortOrder === 'number' && Number.isFinite(patch.sortOrder)) {
      next.sortOrder = patch.sortOrder;
    }

    if (typeof patch.lastEditedByUserId === 'string' && patch.lastEditedByUserId.trim()) {
      next.lastEditedByUserId = patch.lastEditedByUserId.trim();
    }

    memory.MARKETPLACE_LISTINGS[idx] = next;
    return cloneListing(next);
  }

  delete(id: string): boolean {
    ensureRuntimeWriteAvailable();
    const idx = memory.MARKETPLACE_LISTINGS.findIndex((l) => l.id === id);
    if (idx === -1) {
      return false;
    }
    memory.MARKETPLACE_LISTINGS.splice(idx, 1);
    return true;
  }
}

export const marketplaceListingsRepository = new MarketplaceListingsRepository();
