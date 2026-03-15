import {
  memory,
  organizationsRepository,
  projectsRepository,
  workspacesRepository,
  type MarketplaceListing,
  type Organization,
  type Project,
  type Workspace
} from '@collabverse/api';
import {
  ensureCatalogBridgeWorkspace,
  parseCatalogBridgeWorkspaceId
} from '@/lib/marketplace/catalog-pm-bridge';

export type MarketplaceListingAuthorEntityType = 'user' | 'organization';
export type MarketplaceListingManagerRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MarketplaceListingManagerPolicy = 'owner_only' | 'owner_or_admin';
export type MarketplaceListingProjectOwnership = 'personal' | 'team';

export type MarketplaceListingAuthorEntity = {
  type: MarketplaceListingAuthorEntityType;
  id: string;
  label: string;
};

export type MarketplaceListingOwnershipSource =
  | 'workspace_account_organization'
  | 'workspace_account_membership'
  | 'project_owner_fallback';

export type ProjectListingAuthorContext = {
  project: Project;
  workspace: Workspace | null;
  organizationId: string | null;
  organization: Organization | null;
  ownershipSource: MarketplaceListingOwnershipSource;
  projectOwnership: MarketplaceListingProjectOwnership;
  authorEntity: MarketplaceListingAuthorEntity;
  managerPolicy: MarketplaceListingManagerPolicy;
  supportsPersonRoute: boolean;
};

export type ProjectListingManagerContext = ProjectListingAuthorContext & {
  actorUserId: string;
  actorRole: MarketplaceListingManagerRole;
  canManage: boolean;
};

export type MarketplaceListingAuthorshipContext = {
  listing: MarketplaceListing;
  authorEntity: MarketplaceListingAuthorEntity;
  supportsPersonRoute: boolean;
  publishedByUserId: string;
  lastEditedByUserId: string;
};

export type MarketplaceListingManagerContext = Omit<ProjectListingManagerContext, 'authorEntity' | 'supportsPersonRoute'> & {
  listing: MarketplaceListing;
  authorEntity: MarketplaceListingAuthorEntity;
  supportsPersonRoute: boolean;
  projectAuthorEntity: MarketplaceListingAuthorEntity;
  projectSupportsPersonRoute: boolean;
  publishedByUserId: string;
  lastEditedByUserId: string;
};

async function resolveProject(projectOrId: Project | string): Promise<Project | null> {
  if (typeof projectOrId !== 'string') {
    return projectOrId;
  }
  return projectsRepository.findById(projectOrId);
}

function resolveWorkspaceAccountRole(accountId: string, actorUserId: string): MarketplaceListingManagerRole {
  const membership = memory.ACCOUNT_MEMBERS.find(
    (member) => member.accountId === accountId && member.userId === actorUserId
  );

  return membership?.role ?? 'viewer';
}

function rolePriority(role: MarketplaceListingManagerRole): number {
  if (role === 'owner') {
    return 4;
  }
  if (role === 'admin') {
    return 3;
  }
  if (role === 'member') {
    return 2;
  }
  return 1;
}

function pickStrongerRole(
  left: MarketplaceListingManagerRole,
  right: MarketplaceListingManagerRole
): MarketplaceListingManagerRole {
  return rolePriority(left) >= rolePriority(right) ? left : right;
}

async function resolveProjectOwnershipBinding(project: Project): Promise<{
  workspace: Workspace | null;
  organizationId: string | null;
  organization: Organization | null;
  ownershipSource: MarketplaceListingOwnershipSource;
}> {
  let workspace = workspacesRepository.findById(project.workspaceId);
  if (!workspace) {
    const catalogBridgeOrganizationId = parseCatalogBridgeWorkspaceId(project.workspaceId);
    if (catalogBridgeOrganizationId) {
      const organization = await organizationsRepository.findById(catalogBridgeOrganizationId);
      if (organization) {
        workspace = ensureCatalogBridgeWorkspace(organization);
      }
    }
  }

  if (!workspace) {
    return {
      workspace: null,
      organizationId: null,
      organization: null,
      ownershipSource: 'project_owner_fallback'
    };
  }

  const accountId = workspace.accountId.trim();
  if (!accountId) {
    return {
      workspace,
      organizationId: null,
      organization: null,
      ownershipSource: 'project_owner_fallback'
    };
  }

  const organization = await organizationsRepository.findById(accountId);
  if (organization) {
    return {
      workspace,
      organizationId: accountId,
      organization,
      ownershipSource: 'workspace_account_organization'
    };
  }

  return {
    workspace,
    organizationId: accountId,
    organization: null,
    ownershipSource: 'workspace_account_membership'
  };
}

async function resolveActorRole(project: Project, actorUserId: string): Promise<MarketplaceListingManagerRole> {
  if (project.ownerId === actorUserId) {
    return 'owner';
  }

  const members = await projectsRepository.listMembers(project.id);
  const member = members.find((item) => item.userId === actorUserId) ?? null;
  return member?.role ?? 'viewer';
}

async function resolveTeamManagerRole(
  authorContext: ProjectListingAuthorContext,
  actorRole: MarketplaceListingManagerRole,
  actorUserId: string
): Promise<MarketplaceListingManagerRole> {
  if (authorContext.projectOwnership !== 'team' || !authorContext.organizationId) {
    return actorRole;
  }

  let teamRole = actorRole;
  if (authorContext.organization) {
    const organizationMember = await organizationsRepository.findMember(authorContext.organizationId, actorUserId);
    if (organizationMember?.status === 'active') {
      teamRole = pickStrongerRole(teamRole, organizationMember.role);
    }
  } else {
    teamRole = pickStrongerRole(teamRole, resolveWorkspaceAccountRole(authorContext.organizationId, actorUserId));
  }

  return teamRole;
}

function buildAuthorEntity(
  project: Project,
  workspace: Workspace | null,
  organizationId: string | null,
  organization: Organization | null,
  ownershipSource: MarketplaceListingOwnershipSource
): Pick<ProjectListingAuthorContext, 'projectOwnership' | 'authorEntity' | 'managerPolicy' | 'supportsPersonRoute'> {
  const hasSharedAccountMembers =
    organizationId !== null &&
    memory.ACCOUNT_MEMBERS.some(
      (member) => member.accountId === organizationId && member.userId !== project.ownerId
    );
  const accountOwnerId =
    organizationId !== null ? (memory.ACCOUNTS.find((account) => account.id === organizationId)?.ownerId ?? null) : null;
  const isTeamOwned =
    organization?.kind === 'business' ||
    (organization === null &&
      ownershipSource === 'workspace_account_membership' &&
      (hasSharedAccountMembers || (typeof accountOwnerId === 'string' && accountOwnerId !== project.ownerId)));

  if (isTeamOwned) {
    return {
      projectOwnership: 'team',
      authorEntity: {
        type: 'organization',
        id: organizationId ?? workspace?.accountId ?? project.workspaceId,
        label: organization?.name ?? workspace?.name ?? 'Команда проекта'
      },
      managerPolicy: 'owner_or_admin',
      supportsPersonRoute: false
    };
  }

  return {
    projectOwnership: 'personal',
    authorEntity: {
      type: 'user',
      id: project.ownerId,
      label: 'Личный профиль'
    },
    managerPolicy: 'owner_only',
    supportsPersonRoute: true
  };
}

export async function resolveProjectListingAuthorContext(projectOrId: Project | string): Promise<ProjectListingAuthorContext | null> {
  const project = await resolveProject(projectOrId);
  if (!project) {
    return null;
  }

  const ownershipBinding = await resolveProjectOwnershipBinding(project);
  const authorContext = buildAuthorEntity(
    project,
    ownershipBinding.workspace,
    ownershipBinding.organizationId,
    ownershipBinding.organization,
    ownershipBinding.ownershipSource
  );

  return {
    project,
    workspace: ownershipBinding.workspace,
    organizationId: ownershipBinding.organizationId,
    organization: ownershipBinding.organization,
    ownershipSource: ownershipBinding.ownershipSource,
    ...authorContext
  };
}

export async function resolveProjectListingManagerContext(
  projectOrId: Project | string,
  actorUserId: string
): Promise<ProjectListingManagerContext | null> {
  const authorContext = await resolveProjectListingAuthorContext(projectOrId);
  if (!authorContext) {
    return null;
  }

  const projectActorRole = await resolveActorRole(authorContext.project, actorUserId);
  const actorRole = await resolveTeamManagerRole(authorContext, projectActorRole, actorUserId);
  const canManage =
    authorContext.managerPolicy === 'owner_only'
      ? actorRole === 'owner'
      : actorRole === 'owner' || actorRole === 'admin';

  return {
    ...authorContext,
    actorUserId,
    actorRole,
    canManage
  };
}

export async function resolveMarketplaceListingAuthorshipContext(
  listing: MarketplaceListing
): Promise<MarketplaceListingAuthorshipContext> {
  if (listing.authorEntityType === 'organization') {
    const organization = await organizationsRepository.findById(listing.authorEntityId);

    return {
      listing,
      authorEntity: {
        type: 'organization',
        id: listing.authorEntityId,
        label: organization?.name ?? 'Команда публикации'
      },
      supportsPersonRoute: false,
      publishedByUserId: listing.publishedByUserId,
      lastEditedByUserId: listing.lastEditedByUserId
    };
  }

  return {
    listing,
    authorEntity: {
      type: 'user',
      id: listing.authorEntityId,
      label: 'Личный профиль'
    },
    supportsPersonRoute: true,
    publishedByUserId: listing.publishedByUserId,
    lastEditedByUserId: listing.lastEditedByUserId
  };
}

export async function resolveMarketplaceListingManagerContext(
  listing: MarketplaceListing,
  actorUserId: string
): Promise<MarketplaceListingManagerContext | null> {
  const projectContext = await resolveProjectListingManagerContext(listing.projectId, actorUserId);
  if (!projectContext) {
    return null;
  }

  const listingAuthorship = await resolveMarketplaceListingAuthorshipContext(listing);

  return {
    ...projectContext,
    listing,
    projectAuthorEntity: projectContext.authorEntity,
    projectSupportsPersonRoute: projectContext.supportsPersonRoute,
    authorEntity: listingAuthorship.authorEntity,
    supportsPersonRoute: listingAuthorship.supportsPersonRoute,
    publishedByUserId: listingAuthorship.publishedByUserId,
    lastEditedByUserId: listingAuthorship.lastEditedByUserId
  };
}
