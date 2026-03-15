import { NextRequest } from 'next/server';

import { GET as getMemberCandidates } from '@/app/api/pm/projects/[id]/member-candidates/route';
import { POST as addProjectMember } from '@/app/api/pm/projects/[id]/members/route';

jest.mock('@/lib/flags', () => ({
  flags: {
    PM_NAV_PROJECTS_AND_TASKS: true,
    PM_PROJECT_CARD: true,
  },
}));

jest.mock('@/lib/api/finance-access', () => ({
  getAuthFromRequestWithSession: jest.fn(),
  getProjectRole: jest.fn(),
}));

jest.mock('@/lib/notifications/event-generator', () => ({
  notifyProjectAccessGranted: jest.fn(),
}));

jest.mock('@collabverse/api', () => ({
  projectsRepository: {
    findById: jest.fn(),
    listMembers: jest.fn(),
    getMember: jest.fn(),
    upsertMember: jest.fn(),
  },
  usersRepository: {
    findById: jest.fn(),
    findMany: jest.fn(),
    list: jest.fn(),
  },
  dbProjectsRepository: {
    findById: jest.fn(),
  },
  organizationsRepository: {
    listMembers: jest.fn(),
  },
}));

import { getAuthFromRequestWithSession, getProjectRole } from '@/lib/api/finance-access';
import { notifyProjectAccessGranted } from '@/lib/notifications/event-generator';
import { dbProjectsRepository, organizationsRepository, projectsRepository, usersRepository } from '@collabverse/api';

describe('Project people picker API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthFromRequestWithSession as jest.Mock).mockResolvedValue({
      userId: 'manager-1',
      email: 'manager@example.com',
      role: 'owner',
    });
    (getProjectRole as jest.Mock).mockResolvedValue('owner');
  });

  it('POST /api/pm/projects/[id]/members adds an existing platform user to the project', async () => {
    (projectsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      ownerId: 'owner-1',
      title: 'Project One',
    });
    (usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user-2',
      name: 'Anna Petrova',
      email: 'anna@example.com',
      avatarUrl: null,
    });
    (projectsRepository.getMember as jest.Mock).mockReturnValue(null);
    (projectsRepository.upsertMember as jest.Mock).mockReturnValue({
      userId: 'user-2',
      role: 'member',
    });

    const response = await addProjectMember(
      new NextRequest('http://localhost/api/pm/projects/proj-1/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-2',
          role: 'MEMBER',
        }),
      }),
      { params: { id: 'proj-1' } }
    );

    expect(response.status).toBe(200);
    expect(projectsRepository.upsertMember).toHaveBeenCalledWith('proj-1', 'user-2', 'member');
    expect(notifyProjectAccessGranted).toHaveBeenCalledWith('proj-1', 'user-2');

    const payload = await response.json();
    expect(payload.data.alreadyMember).toBe(false);
    expect(payload.data.member).toMatchObject({
      userId: 'user-2',
      role: 'member',
    });
  });

  it('GET /api/pm/projects/[id]/member-candidates marks organization and existing project members separately', async () => {
    (projectsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      ownerId: 'owner-1',
      title: 'Project One',
    });
    (projectsRepository.listMembers as jest.Mock).mockResolvedValue([
      { userId: 'member-project', role: 'member' },
    ]);
    (dbProjectsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      organizationId: 'org-1',
    });
    (organizationsRepository.listMembers as jest.Mock).mockResolvedValue([
      { id: 'org-m1', organizationId: 'org-1', userId: 'org-user', role: 'member', status: 'active' },
      { id: 'org-m2', organizationId: 'org-1', userId: 'member-project', role: 'member', status: 'active' },
    ]);
    (usersRepository.list as jest.Mock).mockResolvedValue([
      { id: 'manager-1', name: 'Manager', email: 'manager@example.com' },
      { id: 'org-user', name: 'Org User', email: 'org@example.com' },
      { id: 'member-project', name: 'Project User', email: 'project@example.com' },
      { id: 'platform-user', name: 'Platform User', email: 'platform@example.com' },
    ]);

    const response = await getMemberCandidates(
      new NextRequest('http://localhost/api/pm/projects/proj-1/member-candidates?q=user'),
      { params: { id: 'proj-1' } }
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    const items = payload.data.items as Array<Record<string, unknown>>;

    const orgUser = items.find((item) => item.id === 'org-user');
    const projectUser = items.find((item) => item.id === 'member-project');
    const platformUser = items.find((item) => item.id === 'platform-user');

    expect(orgUser).toMatchObject({
      relationship: 'organization_member',
      inProject: false,
      inOrganization: true,
    });
    expect(projectUser).toMatchObject({
      relationship: 'project_member',
      inProject: true,
      inOrganization: true,
    });
    expect(platformUser).toMatchObject({
      relationship: 'platform_user',
      inProject: false,
      inOrganization: false,
    });
    expect(items[0]?.id).toBe('org-user');
  });
});
