import type { CatalogAuthorPublication } from '@/lib/marketplace/types';
import {
  marketplaceAuthorPublicationsRepository,
  marketplaceListingsRepository,
  projectsRepository,
  userTemplatesRepository,
  type MarketplaceAuthorPublication,
  type MarketplaceListing,
  type Project,
  type UserProjectTemplate
} from '@collabverse/api';
import {
  resolveMarketplaceListingManagerContext,
  resolveProjectListingManagerContext,
  type MarketplaceListingAuthorEntityType,
  type MarketplaceListingManagerRole,
  type MarketplaceListingManagerContext,
  type ProjectListingAuthorContext
} from '@/lib/marketplace/pm-listing-authorship';

export type ManagedAuthorPublicationKind = 'solution' | 'template' | 'service';
export type ManagedAuthorPublicationStatus = 'draft' | 'published' | 'rejected';

export type ManagedAuthorPublication = {
  id: string;
  kind: ManagedAuthorPublicationKind;
  title: string;
  description: string;
  tags: string[];
  status: ManagedAuthorPublicationStatus;
  showOnAuthorPage: boolean;
  sortOrder: number;
  href: string;
  sourceLabel: string;
  sourceMeta: string;
  updatedAt: string;
  authorEntityType: MarketplaceListingAuthorEntityType;
  authorEntityLabel: string;
  supportsAuthorPage: boolean;
  authorPageHint: string;
};

export type PublishableProjectSource = {
  id: string;
  title: string;
  description: string;
  listingId: string | null;
  listingStatus: ManagedAuthorPublicationStatus | null;
  authorEntityType: MarketplaceListingAuthorEntityType;
  authorEntityLabel: string;
  managerRole: MarketplaceListingManagerRole;
  managerRoleLabel: string;
  supportsAuthorPage: boolean;
  authorPageHint: string;
};

export type PublishableTemplateSource = {
  id: string;
  title: string;
  description: string;
  publicationId: string | null;
  publicationStatus: ManagedAuthorPublicationStatus | null;
};

type SortableAuthorPublication = {
  item: CatalogAuthorPublication;
  sortOrder: number;
  updatedAt: string;
};

function sanitizeText(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function uniqueTags(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    )
  );
}

function projectTags(project: Project | null): string[] {
  if (!project) {
    return [];
  }
  return uniqueTags([project.type, project.stage, project.visibility === 'public' ? 'public' : null]);
}

function publicationSortValue(item: { sortOrder: number; updatedAt: string }): number {
  const timestamp = new Date(item.updatedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareManagedPublications(
  left: { sortOrder: number; updatedAt: string },
  right: { sortOrder: number; updatedAt: string }
): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }
  return publicationSortValue(right) - publicationSortValue(left);
}

function managerRoleLabel(role: MarketplaceListingManagerRole): string {
  if (role === 'owner') {
    return 'Владелец проекта';
  }
  if (role === 'admin') {
    return 'Admin проекта';
  }
  if (role === 'member') {
    return 'Участник проекта';
  }
  return 'Нет прав на управление';
}

function authorPageHint(authorContext: Pick<ProjectListingAuthorContext, 'supportsPersonRoute' | 'authorEntity'>): string {
  if (authorContext.supportsPersonRoute) {
    return 'Публикация может попасть на `/p/:handle` автора при `published + showOnAuthorPage`.';
  }
  return 'Временное правило C3: публикация команды не выводится на `/p/:handle` человека, пока отдельный team-route не внедрён.';
}

function toManagedOverlayPublication(publication: MarketplaceAuthorPublication): ManagedAuthorPublication {
  return {
    id: publication.id,
    kind: publication.kind,
    title: sanitizeText(publication.title, publication.kind === 'service' ? 'Новая услуга' : 'Шаблон без названия'),
    description: sanitizeText(publication.description, 'Описание публикации пока не заполнено.'),
    tags: [...publication.tags],
    status: publication.state,
    showOnAuthorPage: publication.showOnAuthorPage,
    sortOrder: publication.sortOrder,
    href: publication.kind === 'service' ? '/market/services' : '/market/templates',
    sourceLabel: publication.kind === 'service' ? 'Услуга каталога' : 'Шаблон каталога',
    sourceMeta: publication.sourceTemplateId ? `Источник: ${publication.sourceTemplateId}` : 'Отдельная публикация каталога',
    updatedAt: publication.updatedAt,
    authorEntityType: 'user',
    authorEntityLabel: 'Личный профиль',
    supportsAuthorPage: true,
    authorPageHint: 'Публикация может попасть на `/p/:handle` автора при `published + showOnAuthorPage`.'
  };
}

async function toManagedListing(
  listing: MarketplaceListing,
  managerContext: MarketplaceListingManagerContext
): Promise<ManagedAuthorPublication> {
  const project = managerContext.project;
  return {
    id: listing.id,
    kind: 'solution',
    title: sanitizeText(listing.title, 'Публикация без названия'),
    description: sanitizeText(listing.description ?? project.description, 'Описание публикации пока не заполнено.'),
    tags: projectTags(project),
    status: listing.state,
    showOnAuthorPage: listing.showOnAuthorPage,
    sortOrder: listing.sortOrder,
    href: '/market/projects',
    sourceLabel: managerContext.authorEntity.type === 'organization' ? 'PM-публикация команды' : 'PM-публикация автора',
    sourceMeta: `Проект: ${project.title} · Автор публикации: ${managerContext.authorEntity.label} · ${managerRoleLabel(managerContext.actorRole)}`,
    updatedAt: listing.updatedAt,
    authorEntityType: managerContext.authorEntity.type,
    authorEntityLabel: managerContext.authorEntity.label,
    supportsAuthorPage: managerContext.supportsPersonRoute,
    authorPageHint: authorPageHint(managerContext)
  };
}

function toAuthorOverlayPublication(publication: MarketplaceAuthorPublication): SortableAuthorPublication {
  return {
    sortOrder: publication.sortOrder,
    updatedAt: publication.updatedAt,
    item: {
      id: `${publication.kind}:${publication.id}`,
      sourceId: publication.id,
      kind: publication.kind,
      title: sanitizeText(publication.title, publication.kind === 'service' ? 'Услуга без названия' : 'Шаблон без названия'),
      description: sanitizeText(publication.description, 'Описание публикации пока не заполнено.'),
      href: publication.kind === 'service' ? '/market/services' : '/market/templates',
      tags: [...publication.tags],
      meta: publication.kind === 'service' ? 'Услуга автора каталога' : 'Публичный шаблон автора'
    }
  };
}

function toAuthorListing(listing: MarketplaceListing, project: Project | null): SortableAuthorPublication {
  return {
    sortOrder: listing.sortOrder,
    updatedAt: listing.updatedAt,
    item: {
      id: `solution:${listing.id}`,
      sourceId: listing.id,
      kind: 'solution',
      title: sanitizeText(listing.title, 'Публикация без названия'),
      description: sanitizeText(listing.description ?? project?.description, 'Описание публикации пока не заполнено.'),
      href: '/market/projects',
      tags: projectTags(project),
      meta: project ? `Публикация PM · ${project.title}` : 'Публикация PM'
    }
  };
}

export async function listPublishableProjectSources(userId: string): Promise<PublishableProjectSource[]> {
  const projects = await projectsRepository.list({ archived: false });

  const sourceEntries = await Promise.all(
    projects.map(async (project) => {
      const listing = marketplaceListingsRepository.findByProjectId(project.id);
      if (listing) {
        const listingManagerContext = await resolveMarketplaceListingManagerContext(listing, userId);
        if (!listingManagerContext?.canManage) {
          return null;
        }

        return {
          project,
          managerContext: listingManagerContext,
          listing
        };
      }

      const managerContext = await resolveProjectListingManagerContext(project, userId);
      if (!managerContext?.canManage) {
        return null;
      }

      return {
        project,
        managerContext,
        listing
      };
    })
  );

  return sourceEntries
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => {
      const leftTime = new Date(left.project.updatedAt).getTime();
      const rightTime = new Date(right.project.updatedAt).getTime();
      return rightTime - leftTime;
    })
    .map(({ project, managerContext, listing }) => ({
      id: project.id,
      title: project.title,
      description: sanitizeText(project.description, 'Можно создать отдельную публичную карточку поверх этого проекта.'),
      listingId: listing?.id ?? null,
      listingStatus: listing?.state ?? null,
      authorEntityType: managerContext.authorEntity.type,
      authorEntityLabel: managerContext.authorEntity.label,
      managerRole: managerContext.actorRole,
      managerRoleLabel: managerRoleLabel(managerContext.actorRole),
      supportsAuthorPage: managerContext.supportsPersonRoute,
      authorPageHint: authorPageHint(managerContext)
    }));
}

export async function listPublishableTemplateSources(userId: string): Promise<PublishableTemplateSource[]> {
  const templates = await userTemplatesRepository.list(userId);
  return templates
    .map((template) => {
      const publication = marketplaceAuthorPublicationsRepository.findBySourceTemplateId(template.id, userId);
      return {
        id: template.id,
        title: template.title,
        description: sanitizeText(template.summary, 'Шаблон можно вынести в отдельную публикацию каталога.'),
        publicationId: publication?.id ?? null,
        publicationStatus: publication?.state ?? null
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
}

export async function listManagedAuthorPublications(userId: string): Promise<ManagedAuthorPublication[]> {
  const [listings, overlayPublications] = await Promise.all([
    Promise.resolve(marketplaceListingsRepository.list()),
    Promise.resolve(marketplaceAuthorPublicationsRepository.listByOwnerUserId(userId))
  ]);

  const managedListingEntries = await Promise.all(
    listings.map(async (listing) => {
      const managerContext = await resolveMarketplaceListingManagerContext(listing, userId);
      if (!managerContext?.canManage) {
        return null;
      }
      return toManagedListing(listing, managerContext);
    })
  );

  const listingItems = managedListingEntries.filter((item): item is ManagedAuthorPublication => Boolean(item));
  const overlayItems = overlayPublications.map((publication) => toManagedOverlayPublication(publication));

  return [...listingItems, ...overlayItems].sort(compareManagedPublications);
}

export async function listPublicAuthorPublicationsByUserId(userId: string): Promise<CatalogAuthorPublication[]> {
  const [listings, overlayPublications] = await Promise.all([
    Promise.resolve(marketplaceListingsRepository.list()),
    Promise.resolve(marketplaceAuthorPublicationsRepository.listPublishedByOwnerUserId(userId))
  ]);

  const visibleListings = await Promise.all(
    listings
      .filter(
        (listing) =>
          listing.state === 'published' &&
          listing.showOnAuthorPage &&
          listing.authorEntityType === 'user' &&
          listing.authorEntityId === userId
      )
      .map(async (listing) => {
        const project = await projectsRepository.findById(listing.projectId);
        return toAuthorListing(listing, project);
      })
  );

  const visibleOverlays = overlayPublications
    .filter((publication) => publication.showOnAuthorPage)
    .map((publication) => toAuthorOverlayPublication(publication));

  return [...visibleListings.filter((item): item is SortableAuthorPublication => Boolean(item)), ...visibleOverlays]
    .sort(compareManagedPublications)
    .map((entry) => entry.item);
}

export async function getTemplatePublicationSource(
  sourceTemplateId: string,
  userId: string
): Promise<UserProjectTemplate | null> {
  return userTemplatesRepository.findById(sourceTemplateId, userId);
}
