import {
  organizationsRepository,
  workspacesRepository,
  type Organization,
  type OrganizationMember,
  type ProjectMember,
  type Workspace,
  type WorkspaceMember
} from '@collabverse/api';

export const CATALOG_PM_BRIDGE_WORKSPACE_PREFIX = 'ws-catalog-org-';

export type CatalogPmContextType = 'personal' | 'team';

export type CatalogTargetPmContext = {
  contextType: CatalogPmContextType;
  organization: Organization;
  workspace: Workspace;
  workspaceMembers: WorkspaceMember[];
  projectMembers: ProjectMember[];
};

function mapOrganizationRole(role: OrganizationMember['role']): ProjectMember['role'] {
  if (role === 'owner' || role === 'admin' || role === 'member') {
    return role;
  }
  return 'viewer';
}

export function getCatalogBridgeWorkspaceId(organizationId: string): string {
  return `${CATALOG_PM_BRIDGE_WORKSPACE_PREFIX}${organizationId}`;
}

export function parseCatalogBridgeWorkspaceId(workspaceId: string): string | null {
  if (!workspaceId.startsWith(CATALOG_PM_BRIDGE_WORKSPACE_PREFIX)) {
    return null;
  }

  const organizationId = workspaceId.slice(CATALOG_PM_BRIDGE_WORKSPACE_PREFIX.length).trim();
  return organizationId.length > 0 ? organizationId : null;
}

function findExistingWorkspaceForOrganization(organization: Organization): Workspace | null {
  const preferredWorkspaceId = getCatalogBridgeWorkspaceId(organization.id);
  const workspaces = workspacesRepository
    .list()
    .filter((workspace) => workspace.accountId === organization.id && !workspace.archived);

  const preferredWorkspace = workspaces.find((workspace) => workspace.id === preferredWorkspaceId);
  if (preferredWorkspace) {
    return preferredWorkspace;
  }

  if (workspaces.length === 1) {
    return workspaces[0] ?? null;
  }

  const namedWorkspace = workspaces.find((workspace) => workspace.name.trim() === organization.name.trim());
  return namedWorkspace ?? null;
}

export function ensureCatalogBridgeWorkspace(organization: Organization): Workspace {
  const existingWorkspace = findExistingWorkspaceForOrganization(organization);
  if (existingWorkspace) {
    return existingWorkspace;
  }

  return workspacesRepository.create({
    id: getCatalogBridgeWorkspaceId(organization.id),
    accountId: organization.id,
    name: organization.name,
    visibility: 'private'
  });
}

function buildWorkspaceMembers(
  actorUserId: string,
  contextType: CatalogPmContextType,
  organizationMembers: OrganizationMember[],
  workspaceId: string
): WorkspaceMember[] {
  if (contextType === 'personal') {
    return [{ workspaceId, userId: actorUserId, role: 'owner' }];
  }

  return organizationMembers.map((member) => ({
    workspaceId,
    userId: member.userId,
    role: mapOrganizationRole(member.role)
  }));
}

function buildProjectMembers(
  actorUserId: string,
  contextType: CatalogPmContextType,
  organizationMembers: OrganizationMember[]
): ProjectMember[] {
  const projectMembers = new Map<string, ProjectMember>();
  projectMembers.set(actorUserId, {
    userId: actorUserId,
    role: 'owner'
  });

  if (contextType === 'personal') {
    return Array.from(projectMembers.values());
  }

  for (const member of organizationMembers) {
    const role = member.userId === actorUserId ? 'owner' : mapOrganizationRole(member.role);
    projectMembers.set(member.userId, {
      userId: member.userId,
      role
    });
  }

  return Array.from(projectMembers.values());
}

export async function ensureCatalogTargetPmContext(
  organizationId: string,
  actorUserId: string
): Promise<CatalogTargetPmContext | null> {
  const organization = await organizationsRepository.findById(organizationId);
  if (!organization) {
    return null;
  }

  const activeOrganizationMembers = (await organizationsRepository.listMembers(organization.id)).filter(
    (member) => member.status === 'active'
  );
  const contextType: CatalogPmContextType = organization.kind === 'personal' ? 'personal' : 'team';
  const workspace = ensureCatalogBridgeWorkspace(organization);

  return {
    contextType,
    organization,
    workspace,
    workspaceMembers: buildWorkspaceMembers(actorUserId, contextType, activeOrganizationMembers, workspace.id),
    projectMembers: buildProjectMembers(actorUserId, contextType, activeOrganizationMembers)
  };
}
