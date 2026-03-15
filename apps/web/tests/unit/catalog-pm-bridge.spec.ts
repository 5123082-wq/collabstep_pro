import {
  memory,
  organizationsRepository,
  type Organization,
  type OrganizationMember,
  type Workspace
} from '@collabverse/api';
import {
  ensureCatalogTargetPmContext,
  getCatalogBridgeWorkspaceId
} from '@/lib/marketplace/catalog-pm-bridge';

type MemorySnapshot = {
  WORKSPACES: Workspace[];
  WORKSPACE_MEMBERS: typeof memory.WORKSPACE_MEMBERS;
  ORGANIZATIONS: Organization[];
  ORGANIZATION_MEMBERS: OrganizationMember[];
};

function snapshotMemory(): MemorySnapshot {
  return {
    WORKSPACES: structuredClone(memory.WORKSPACES),
    WORKSPACE_MEMBERS: structuredClone(memory.WORKSPACE_MEMBERS),
    ORGANIZATIONS: structuredClone(memory.ORGANIZATIONS),
    ORGANIZATION_MEMBERS: structuredClone(memory.ORGANIZATION_MEMBERS)
  };
}

function restoreMemory(snapshot: MemorySnapshot): void {
  memory.WORKSPACES = structuredClone(snapshot.WORKSPACES);
  memory.WORKSPACE_MEMBERS = structuredClone(snapshot.WORKSPACE_MEMBERS);
  memory.ORGANIZATIONS = structuredClone(snapshot.ORGANIZATIONS);
  memory.ORGANIZATION_MEMBERS = structuredClone(snapshot.ORGANIZATION_MEMBERS);
}

describe('Catalog -> PM bridge context', () => {
  let originalMemory: MemorySnapshot;

  beforeAll(() => {
    originalMemory = snapshotMemory();
  });

  afterAll(() => {
    restoreMemory(originalMemory);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(organizationsRepository, 'findById').mockImplementation(async (id: string) => {
      const organization = memory.ORGANIZATIONS.find((item) => item.id === id);
      return organization ? { ...organization } : null;
    });
    jest.spyOn(organizationsRepository, 'listMembers').mockImplementation(async (organizationId: string) => {
      return memory.ORGANIZATION_MEMBERS
        .filter((item) => item.organizationId === organizationId)
        .map((item) => ({ ...item }));
    });
    memory.WORKSPACES = [];
    memory.WORKSPACE_MEMBERS = {};
    memory.ORGANIZATIONS = [];
    memory.ORGANIZATION_MEMBERS = [];
  });

  it('creates deterministic team context from selected organization and mirrors active members', async () => {
    memory.ORGANIZATIONS = [
      {
        id: 'org-team',
        ownerId: 'user-owner',
        name: 'Team Org',
        type: 'closed',
        kind: 'business',
        isPublicInDirectory: false,
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      }
    ];
    memory.ORGANIZATION_MEMBERS = [
      {
        id: 'member-owner',
        organizationId: 'org-team',
        userId: 'user-owner',
        role: 'owner',
        status: 'active',
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      },
      {
        id: 'member-admin',
        organizationId: 'org-team',
        userId: 'user-admin',
        role: 'admin',
        status: 'active',
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      },
      {
        id: 'member-viewer',
        organizationId: 'org-team',
        userId: 'user-viewer',
        role: 'viewer',
        status: 'active',
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      },
      {
        id: 'member-inactive',
        organizationId: 'org-team',
        userId: 'user-inactive',
        role: 'member',
        status: 'inactive',
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      }
    ];

    const context = await ensureCatalogTargetPmContext('org-team', 'user-admin');

    expect(context).not.toBeNull();
    expect(context).toMatchObject({
      contextType: 'team',
      workspace: {
        id: getCatalogBridgeWorkspaceId('org-team'),
        accountId: 'org-team',
        name: 'Team Org'
      }
    });
    expect(context?.workspaceMembers).toEqual([
      { workspaceId: getCatalogBridgeWorkspaceId('org-team'), userId: 'user-owner', role: 'owner' },
      { workspaceId: getCatalogBridgeWorkspaceId('org-team'), userId: 'user-admin', role: 'admin' },
      { workspaceId: getCatalogBridgeWorkspaceId('org-team'), userId: 'user-viewer', role: 'viewer' }
    ]);
    expect(context?.projectMembers).toEqual([
      { userId: 'user-admin', role: 'owner' },
      { userId: 'user-owner', role: 'owner' },
      { userId: 'user-viewer', role: 'viewer' }
    ]);
  });

  it('keeps personal selection on personal path and reuses existing workspace', async () => {
    memory.ORGANIZATIONS = [
      {
        id: 'org-personal',
        ownerId: 'user-personal',
        name: 'Personal Org',
        type: 'closed',
        kind: 'personal',
        isPublicInDirectory: false,
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      }
    ];
    memory.ORGANIZATION_MEMBERS = [
      {
        id: 'member-personal',
        organizationId: 'org-personal',
        userId: 'user-personal',
        role: 'owner',
        status: 'active',
        createdAt: new Date('2026-03-09T12:00:00.000Z'),
        updatedAt: new Date('2026-03-09T12:00:00.000Z')
      }
    ];
    memory.WORKSPACES = [
      {
        id: 'ws-existing-personal',
        accountId: 'org-personal',
        name: 'Personal Org',
        visibility: 'private',
        archived: false,
        createdAt: '2026-03-09T12:00:00.000Z',
        updatedAt: '2026-03-09T12:00:00.000Z'
      }
    ];

    const context = await ensureCatalogTargetPmContext('org-personal', 'user-personal');

    expect(context).not.toBeNull();
    expect(context).toMatchObject({
      contextType: 'personal',
      workspace: {
        id: 'ws-existing-personal',
        accountId: 'org-personal'
      }
    });
    expect(context?.workspaceMembers).toEqual([
      { workspaceId: 'ws-existing-personal', userId: 'user-personal', role: 'owner' }
    ]);
    expect(context?.projectMembers).toEqual([{ userId: 'user-personal', role: 'owner' }]);
  });
});
