import { NextRequest } from 'next/server';

import { POST as leaveOrg } from '@/app/api/organizations/[orgId]/leave/route';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from '@/lib/auth/session';

jest.mock('@collabverse/api', () => {
  const actual = jest.requireActual('@collabverse/api');
  return {
    ...actual,
    organizationsRepository: {
      findMember: jest.fn(),
      updateMemberStatus: jest.fn(),
    },
    dbProjectsRepository: {
      removeUserFromOrganizationProjects: jest.fn(),
    },
  };
});

import { dbProjectsRepository, organizationsRepository } from '@collabverse/api';

describe('Organization leave API', () => {
  const currentUser = { id: 'user-1', email: 'user1@example.com', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(currentUser);
  });

  it('returns 401 when not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    const res = await leaveOrg(new NextRequest('http://localhost/api/organizations/org-1/leave', { method: 'POST' }), {
      params: { orgId: 'org-1' },
    });
    expect(res.status).toBe(401);
  });

  it('is idempotent when user is not a member', async () => {
    (organizationsRepository.findMember as jest.Mock).mockResolvedValue(null);
    const res = await leaveOrg(new NextRequest('http://localhost/api/organizations/org-1/leave', { method: 'POST' }), {
      params: { orgId: 'org-1' },
    });
    expect(res.status).toBe(200);
    expect(organizationsRepository.updateMemberStatus).not.toHaveBeenCalled();
  });

  it('forbids owner leaving', async () => {
    (organizationsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      organizationId: 'org-1',
      userId: currentUser.id,
      role: 'owner',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await leaveOrg(new NextRequest('http://localhost/api/organizations/org-1/leave', { method: 'POST' }), {
      params: { orgId: 'org-1' },
    });
    expect(res.status).toBe(403);
    expect(organizationsRepository.updateMemberStatus).not.toHaveBeenCalled();
  });

  it('marks member inactive and removes access to org projects', async () => {
    (organizationsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'mem-2',
      organizationId: 'org-1',
      userId: currentUser.id,
      role: 'member',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await leaveOrg(new NextRequest('http://localhost/api/organizations/org-1/leave', { method: 'POST' }), {
      params: { orgId: 'org-1' },
    });
    expect(res.status).toBe(200);
    expect(organizationsRepository.updateMemberStatus).toHaveBeenCalledWith('org-1', 'mem-2', 'inactive');
    expect(dbProjectsRepository.removeUserFromOrganizationProjects).toHaveBeenCalledWith('org-1', currentUser.id);
  });
});


