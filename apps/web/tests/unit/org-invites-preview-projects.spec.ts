import { NextRequest } from 'next/server';

import { POST as createOrgInvite } from '@/app/api/organizations/[orgId]/invites/route';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from '@/lib/auth/session';

jest.mock('@collabverse/api', () => {
  const actual = jest.requireActual('@collabverse/api');
  return {
    ...actual,
    invitationsRepository: {
      createOrganizationInvite: jest.fn(),
      createProjectInvite: jest.fn(),
    },
    organizationsRepository: {
      findMember: jest.fn(),
    },
    dbProjectsRepository: {
      findById: jest.fn(),
      findMember: jest.fn(),
    },
  };
});

import { dbProjectsRepository, invitationsRepository, organizationsRepository } from '@collabverse/api';

describe('Org invites -> preview project invites (stage 7)', () => {
  const currentUser = { id: 'admin-1', email: 'admin@example.com', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(currentUser);
    (organizationsRepository.findMember as jest.Mock).mockResolvedValue({ role: 'admin', status: 'active' });
  });

  it('creates previewing project_invite for inviteeUserId when previewProjectIds provided', async () => {
    (invitationsRepository.createOrganizationInvite as jest.Mock).mockResolvedValue({
      id: 'org-inv-1',
      organizationId: 'org-1',
      inviterId: currentUser.id,
      inviteeUserId: 'user-2',
      inviteeEmail: null,
      token: 'tok',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (dbProjectsRepository.findById as jest.Mock).mockImplementation(async (projectId: string) => ({
      id: projectId,
      organizationId: 'org-1',
      ownerId: currentUser.id,
      name: `Project ${projectId}`,
      description: null,
      stage: null,
      visibility: 'organization',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    (dbProjectsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'pm-1',
      projectId: 'proj-1',
      userId: currentUser.id,
      role: 'owner',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/organizations/org-1/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'email',
        inviteeUserId: 'user-2',
        previewProjectIds: ['proj-1', 'proj-2'],
      }),
    });

    const res = await createOrgInvite(req, { params: { orgId: 'org-1' } });
    expect(res.status).toBe(200);

    expect(invitationsRepository.createProjectInvite).toHaveBeenCalledTimes(2);
    for (const call of (invitationsRepository.createProjectInvite as jest.Mock).mock.calls) {
      expect(call[0]).toMatchObject({
        organizationId: 'org-1',
        inviterId: currentUser.id,
        inviteeUserId: 'user-2',
        status: 'previewing',
      });
    }
  });

  it('creates previewing project_invite by inviteeEmail when invite is email-based', async () => {
    (invitationsRepository.createOrganizationInvite as jest.Mock).mockResolvedValue({
      id: 'org-inv-2',
      organizationId: 'org-1',
      inviterId: currentUser.id,
      inviteeUserId: null,
      inviteeEmail: 'person@example.com',
      token: 'tok',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (dbProjectsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      organizationId: 'org-1',
      ownerId: currentUser.id,
      name: 'Project 1',
      description: null,
      stage: null,
      visibility: 'organization',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (dbProjectsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'pm-1',
      projectId: 'proj-1',
      userId: currentUser.id,
      role: 'owner',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/organizations/org-1/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'email',
        email: 'person@example.com',
        previewProjectIds: ['proj-1'],
      }),
    });

    const res = await createOrgInvite(req, { params: { orgId: 'org-1' } });
    expect(res.status).toBe(200);

    expect(invitationsRepository.createProjectInvite).toHaveBeenCalledTimes(1);
    expect((invitationsRepository.createProjectInvite as jest.Mock).mock.calls[0]?.[0]).toMatchObject({
      organizationId: 'org-1',
      inviterId: currentUser.id,
      inviteeEmail: 'person@example.com',
      status: 'previewing',
    });
  });
});


