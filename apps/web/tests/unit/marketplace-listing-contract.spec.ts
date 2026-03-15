import {
  marketplaceListingsRepository,
  memory,
  organizationsRepository,
  projectsRepository,
  type Account,
  type AccountMember,
  type Organization,
  type OrganizationMember,
  type Project,
  type Workspace
} from '@collabverse/api';
import {
  listManagedAuthorPublications,
  listPublicAuthorPublicationsByUserId
} from '@/lib/marketplace/author-publications';
import {
  resolveProjectListingAuthorContext,
  resolveProjectListingManagerContext
} from '@/lib/marketplace/pm-listing-authorship';

type MemorySnapshot = {
  ACCOUNTS: Account[];
  ACCOUNT_MEMBERS: AccountMember[];
  WORKSPACES: Workspace[];
  PROJECTS: Project[];
  PROJECT_MEMBERS: typeof memory.PROJECT_MEMBERS;
  ORGANIZATIONS: Organization[];
  ORGANIZATION_MEMBERS: OrganizationMember[];
  MARKETPLACE_LISTINGS: typeof memory.MARKETPLACE_LISTINGS;
};

function snapshotMemory(): MemorySnapshot {
  return {
    ACCOUNTS: structuredClone(memory.ACCOUNTS),
    ACCOUNT_MEMBERS: structuredClone(memory.ACCOUNT_MEMBERS),
    WORKSPACES: structuredClone(memory.WORKSPACES),
    PROJECTS: structuredClone(memory.PROJECTS),
    PROJECT_MEMBERS: structuredClone(memory.PROJECT_MEMBERS),
    ORGANIZATIONS: structuredClone(memory.ORGANIZATIONS),
    ORGANIZATION_MEMBERS: structuredClone(memory.ORGANIZATION_MEMBERS),
    MARKETPLACE_LISTINGS: structuredClone(memory.MARKETPLACE_LISTINGS)
  };
}

function restoreMemory(snapshot: MemorySnapshot): void {
  memory.ACCOUNTS = structuredClone(snapshot.ACCOUNTS);
  memory.ACCOUNT_MEMBERS = structuredClone(snapshot.ACCOUNT_MEMBERS);
  memory.WORKSPACES = structuredClone(snapshot.WORKSPACES);
  memory.PROJECTS = structuredClone(snapshot.PROJECTS);
  memory.PROJECT_MEMBERS = structuredClone(snapshot.PROJECT_MEMBERS);
  memory.ORGANIZATIONS = structuredClone(snapshot.ORGANIZATIONS);
  memory.ORGANIZATION_MEMBERS = structuredClone(snapshot.ORGANIZATION_MEMBERS);
  memory.MARKETPLACE_LISTINGS = structuredClone(snapshot.MARKETPLACE_LISTINGS);
}

function makeProject(input: {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description?: string;
}): Project {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    key: input.title.toUpperCase().replace(/\s+/g, '-'),
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    ownerId: input.ownerId,
    status: 'active',
    visibility: 'private',
    budgetPlanned: null,
    budgetSpent: null,
    archived: false,
    createdAt: '2026-03-09T10:00:00.000Z',
    updatedAt: '2026-03-09T10:00:00.000Z'
  };
}

describe('Marketplace PM listing contract', () => {
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
    jest.spyOn(organizationsRepository, 'findMember').mockImplementation(async (organizationId: string, userId: string) => {
      const member = memory.ORGANIZATION_MEMBERS.find(
        (item) => item.organizationId === organizationId && item.userId === userId
      );
      return member ? { ...member } : null;
    });
    jest.spyOn(projectsRepository, 'listMembers').mockImplementation(async (projectId: string) => {
      return (memory.PROJECT_MEMBERS[projectId] ?? []).map((member) => ({ ...member }));
    });
    memory.ACCOUNTS = [];
    memory.ACCOUNT_MEMBERS = [];
    memory.WORKSPACES = [];
    memory.PROJECTS = [];
    memory.PROJECT_MEMBERS = {};
    memory.ORGANIZATIONS = [];
    memory.ORGANIZATION_MEMBERS = [];
    memory.MARKETPLACE_LISTINGS = [];
  });

  it('resolves team ownership from workspace/account mapping without deprecated project table', async () => {
    memory.ACCOUNTS = [
      {
        id: 'acct-team',
        name: 'Team Account',
        ownerId: 'user-owner',
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ACCOUNT_MEMBERS = [
      { accountId: 'acct-team', userId: 'user-owner', role: 'owner' },
      { accountId: 'acct-team', userId: 'user-admin', role: 'admin' }
    ];
    memory.WORKSPACES = [
      {
        id: 'ws-team',
        accountId: 'acct-team',
        name: 'Core Product Team',
        visibility: 'private',
        archived: false,
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ORGANIZATIONS = [
      {
        id: 'acct-team',
        ownerId: 'user-owner',
        name: 'Core Product Team',
        type: 'closed',
        kind: 'business',
        isPublicInDirectory: false,
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z')
      }
    ];
    memory.ORGANIZATION_MEMBERS = [
      {
        id: 'org-owner',
        organizationId: 'acct-team',
        userId: 'user-owner',
        role: 'owner',
        status: 'active',
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z')
      },
      {
        id: 'org-admin',
        organizationId: 'acct-team',
        userId: 'user-admin',
        role: 'admin',
        status: 'active',
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z')
      }
    ];
    memory.PROJECTS = [
      makeProject({
        id: 'project-team',
        workspaceId: 'ws-team',
        ownerId: 'user-owner',
        title: 'Team Launch System'
      })
    ];

    const authorContext = await resolveProjectListingAuthorContext('project-team');
    const managerContext = await resolveProjectListingManagerContext('project-team', 'user-admin');

    expect(authorContext).toMatchObject({
      projectOwnership: 'team',
      ownershipSource: 'workspace_account_organization',
      organizationId: 'acct-team',
      authorEntity: {
        type: 'organization',
        id: 'acct-team',
        label: 'Core Product Team'
      }
    });
    expect(managerContext).toMatchObject({
      actorRole: 'admin',
      canManage: true
    });
  });

  it('keeps person-route visibility on persisted user listing even if current project ownership resolves to team', async () => {
    memory.ACCOUNTS = [
      {
        id: 'acct-team',
        name: 'Team Account',
        ownerId: 'user-owner',
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ACCOUNT_MEMBERS = [{ accountId: 'acct-team', userId: 'user-owner', role: 'owner' }];
    memory.WORKSPACES = [
      {
        id: 'ws-team',
        accountId: 'acct-team',
        name: 'Core Product Team',
        visibility: 'private',
        archived: false,
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ORGANIZATIONS = [
      {
        id: 'acct-team',
        ownerId: 'user-owner',
        name: 'Core Product Team',
        type: 'closed',
        kind: 'business',
        isPublicInDirectory: false,
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z')
      }
    ];
    memory.PROJECTS = [
      makeProject({
        id: 'project-mismatch-person',
        workspaceId: 'ws-team',
        ownerId: 'user-owner',
        title: 'Legacy Person Publication',
        description: 'Persisted person authorship should remain visible.'
      })
    ];

    marketplaceListingsRepository.create({
      projectId: 'project-mismatch-person',
      workspaceId: 'ws-team',
      authorEntityType: 'user',
      authorEntityId: 'user-owner',
      publishedByUserId: 'user-owner',
      title: 'Legacy Person Publication',
      description: 'Persisted person authorship should remain visible.',
      state: 'published',
      showOnAuthorPage: true
    });

    const publications = await listPublicAuthorPublicationsByUserId('user-owner');

    expect(publications).toHaveLength(1);
    expect(publications[0]).toMatchObject({
      id: expect.stringMatching(/^solution:/),
      title: 'Legacy Person Publication'
    });
  });

  it('keeps seller authorship from persisted listing contract even if current project ownership resolves to personal', async () => {
    memory.ACCOUNTS = [
      {
        id: 'acct-solo',
        name: 'Solo Account',
        ownerId: 'user-owner',
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      },
      {
        id: 'acct-team',
        name: 'Team Account',
        ownerId: 'user-owner',
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ACCOUNT_MEMBERS = [{ accountId: 'acct-solo', userId: 'user-owner', role: 'owner' }];
    memory.WORKSPACES = [
      {
        id: 'ws-solo',
        accountId: 'acct-solo',
        name: 'Solo Workspace',
        visibility: 'private',
        archived: false,
        createdAt: '2026-03-09T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z'
      }
    ];
    memory.ORGANIZATIONS = [
      {
        id: 'acct-team',
        ownerId: 'user-owner',
        name: 'Core Product Team',
        type: 'closed',
        kind: 'business',
        isPublicInDirectory: false,
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T10:00:00.000Z')
      }
    ];
    memory.PROJECTS = [
      makeProject({
        id: 'project-mismatch-team',
        workspaceId: 'ws-solo',
        ownerId: 'user-owner',
        title: 'Stable Team Publication',
        description: 'Seller cabinet should keep team attribution from the listing contract.'
      })
    ];

    const listing = marketplaceListingsRepository.create({
      projectId: 'project-mismatch-team',
      workspaceId: 'ws-solo',
      authorEntityType: 'organization',
      authorEntityId: 'acct-team',
      publishedByUserId: 'user-owner',
      title: 'Stable Team Publication',
      description: 'Seller cabinet should keep team attribution from the listing contract.',
      state: 'draft'
    });

    const publications = await listManagedAuthorPublications('user-owner');
    const managedListing = publications.find((publication) => publication.id === listing.id);

    expect(managedListing).toMatchObject({
      id: listing.id,
      authorEntityType: 'organization',
      authorEntityLabel: 'Core Product Team',
      sourceLabel: 'PM-публикация команды'
    });
  });
});
