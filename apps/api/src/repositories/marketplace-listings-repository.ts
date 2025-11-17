import type { ID } from '../types';
import { memory } from '../data/memory';

export type MarketplaceListingState = 'draft' | 'published' | 'rejected';

export interface MarketplaceListing {
  id: ID;
  projectId: ID;
  workspaceId: ID;
  title: string;
  description?: string;
  state: MarketplaceListingState;
  createdAt: string;
  updatedAt: string;
}

function cloneListing(listing: MarketplaceListing): MarketplaceListing {
  return {
    ...listing,
    ...(listing.description ? { description: listing.description } : {})
  };
}

export class MarketplaceListingsRepository {
  list(): MarketplaceListing[] {
    return memory.MARKETPLACE_LISTINGS.map(cloneListing);
  }

  findByProjectId(projectId: string): MarketplaceListing | null {
    const listing = memory.MARKETPLACE_LISTINGS.find((l) => l.projectId === projectId);
    return listing ? cloneListing(listing) : null;
  }

  findById(id: string): MarketplaceListing | null {
    const listing = memory.MARKETPLACE_LISTINGS.find((l) => l.id === id);
    return listing ? cloneListing(listing) : null;
  }

  create(payload: {
    projectId: string;
    workspaceId: string;
    title: string;
    description?: string;
    state?: MarketplaceListingState;
  }): MarketplaceListing {
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: crypto.randomUUID(),
      projectId: payload.projectId,
      workspaceId: payload.workspaceId,
      title: payload.title,
      state: payload.state ?? 'draft',
      createdAt: now,
      updatedAt: now
    };

    if (payload.description) {
      listing.description = payload.description;
    }

    memory.MARKETPLACE_LISTINGS.push(listing);
    return cloneListing(listing);
  }

  update(id: string, patch: Partial<Pick<MarketplaceListing, 'title' | 'description' | 'state'>>): MarketplaceListing | null {
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
      title: current.title,
      state: current.state,
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

    memory.MARKETPLACE_LISTINGS[idx] = next;
    return cloneListing(next);
  }

  delete(id: string): boolean {
    const idx = memory.MARKETPLACE_LISTINGS.findIndex((l) => l.id === id);
    if (idx === -1) {
      return false;
    }
    memory.MARKETPLACE_LISTINGS.splice(idx, 1);
    return true;
  }
}

export const marketplaceListingsRepository = new MarketplaceListingsRepository();

