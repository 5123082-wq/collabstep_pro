import { inviteThreadsRepository, resetFinanceMemory, resetInvitesMemory } from '@collabverse/api';
import { NextRequest } from 'next/server';

import { GET as listInvites } from '@/app/api/invites/route';
import { POST as acceptInvite } from '@/app/api/invites/[inviteId]/accept/route';
import { POST as rejectInvite } from '@/app/api/invites/[inviteId]/reject/route';
import { GET as listThreadMessages, POST as createThreadMessage } from '@/app/api/invites/threads/[threadId]/messages/route';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from '@/lib/auth/session';

jest.mock('@collabverse/api', () => {
  const actual = jest.requireActual('@collabverse/api');
  return {
    ...actual,
    invitationsRepository: {
      listOrganizationInvitesForInvitee: jest.fn(),
      findOrganizationInviteById: jest.fn(),
      updateOrganizationInviteStatus: jest.fn(),
      findActiveProjectInviteForUser: jest.fn(),
      findActiveProjectInviteForEmail: jest.fn(),
    },
    organizationsRepository: {
      findById: jest.fn(),
      findMember: jest.fn(),
      addMember: jest.fn(),
      updateMemberStatus: jest.fn(),
    },
    usersRepository: {
      findById: jest.fn(),
    },
    dbProjectsRepository: {
      findById: jest.fn(),
      findMember: jest.fn(),
      listForUser: jest.fn(),
    },
  };
});

import { invitationsRepository, organizationsRepository, usersRepository } from '@collabverse/api';

describe('Invites API (org invites via messaging)', () => {
  const currentUser = { id: 'user-1', email: 'user1@example.com', role: 'user' };

  beforeEach(() => {
    resetFinanceMemory();
    resetInvitesMemory();
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(currentUser);
  });

  it('GET /api/invites returns invites with inviter/org and creates thread', async () => {
    (invitationsRepository.listOrganizationInvitesForInvitee as jest.Mock).mockResolvedValue([
      {
        id: 'inv-1',
        organizationId: 'org-1',
        inviterId: 'inviter-1',
        inviteeEmail: currentUser.email,
        inviteeUserId: null,
        token: 'tok',
        source: 'email',
        status: 'pending',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (organizationsRepository.findById as jest.Mock).mockResolvedValue({ id: 'org-1', name: 'Org 1' });
    (usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inviter-1',
      name: 'Inviter',
      email: 'inviter@example.com',
    });

    const response = await listInvites();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.invites).toHaveLength(1);
    expect(payload.data.invites[0].threadId).toBeTruthy();
  });

  it('POST /api/invites/[id]/accept accepts pending invite and adds member if missing', async () => {
    (invitationsRepository.findOrganizationInviteById as jest.Mock).mockResolvedValue({
      id: 'inv-2',
      organizationId: 'org-2',
      inviterId: 'inviter-2',
      inviteeEmail: currentUser.email,
      inviteeUserId: null,
      token: 'tok2',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (invitationsRepository.updateOrganizationInviteStatus as jest.Mock).mockResolvedValue({
      id: 'inv-2',
      organizationId: 'org-2',
      inviterId: 'inviter-2',
      inviteeEmail: currentUser.email,
      inviteeUserId: currentUser.id,
      token: 'tok2',
      source: 'email',
      status: 'accepted',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (organizationsRepository.findMember as jest.Mock).mockResolvedValue(null);
    (organizationsRepository.addMember as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      organizationId: 'org-2',
      userId: currentUser.id,
      role: 'member',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await acceptInvite(new NextRequest('http://localhost/api/invites/inv-2/accept', { method: 'POST' }), {
      params: { inviteId: 'inv-2' },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.success).toBe(true);
  });

  it('POST /api/invites/[id]/accept reactivates inactive member (role preserved)', async () => {
    (invitationsRepository.findOrganizationInviteById as jest.Mock).mockResolvedValue({
      id: 'inv-5',
      organizationId: 'org-5',
      inviterId: 'inviter-5',
      inviteeEmail: currentUser.email,
      inviteeUserId: currentUser.id,
      token: 'tok5',
      source: 'email',
      status: 'pending',
      role: 'viewer', // should NOT override existing role on reactivate
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (invitationsRepository.updateOrganizationInviteStatus as jest.Mock).mockResolvedValue({
      id: 'inv-5',
      organizationId: 'org-5',
      inviterId: 'inviter-5',
      inviteeEmail: currentUser.email,
      inviteeUserId: currentUser.id,
      token: 'tok5',
      source: 'email',
      status: 'accepted',
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (organizationsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'mem-5',
      organizationId: 'org-5',
      userId: currentUser.id,
      role: 'admin',
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await acceptInvite(new NextRequest('http://localhost/api/invites/inv-5/accept', { method: 'POST' }), {
      params: { inviteId: 'inv-5' },
    });

    expect(response.status).toBe(200);
    expect(organizationsRepository.updateMemberStatus).toHaveBeenCalledWith('org-5', 'mem-5', 'active');
    expect(organizationsRepository.addMember).not.toHaveBeenCalled();
  });

  it('POST /api/invites/[id]/accept does not reactivate blocked member', async () => {
    (invitationsRepository.findOrganizationInviteById as jest.Mock).mockResolvedValue({
      id: 'inv-6',
      organizationId: 'org-6',
      inviterId: 'inviter-6',
      inviteeEmail: currentUser.email,
      inviteeUserId: currentUser.id,
      token: 'tok6',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (organizationsRepository.findMember as jest.Mock).mockResolvedValue({
      id: 'mem-6',
      organizationId: 'org-6',
      userId: currentUser.id,
      role: 'member',
      status: 'blocked',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await acceptInvite(new NextRequest('http://localhost/api/invites/inv-6/accept', { method: 'POST' }), {
      params: { inviteId: 'inv-6' },
    });

    expect(response.status).toBe(403);
    expect(organizationsRepository.updateMemberStatus).not.toHaveBeenCalled();
    expect(organizationsRepository.addMember).not.toHaveBeenCalled();
  });

  it('POST /api/invites/threads/[threadId]/messages can list and create messages for participant', async () => {
    const thread = inviteThreadsRepository.createThread({
      orgInviteId: 'inv-3',
      organizationId: 'org-3',
      createdByUserId: currentUser.id,
      inviteeEmail: currentUser.email,
    });

    const createResp = await createThreadMessage(
      new NextRequest('http://localhost/api/invites/threads/' + thread.id + '/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'Hello' }),
      }),
      { params: { threadId: thread.id } }
    );
    expect(createResp.status).toBe(200);

    const listResp = await listThreadMessages(
      new NextRequest('http://localhost/api/invites/threads/' + thread.id + '/messages?page=1&pageSize=10', {
        method: 'GET',
      }),
      { params: { threadId: thread.id } }
    );
    expect(listResp.status).toBe(200);
    const payload = await listResp.json();
    expect(payload.data.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/invites/[id]/reject rejects pending invite', async () => {
    (invitationsRepository.findOrganizationInviteById as jest.Mock).mockResolvedValue({
      id: 'inv-4',
      organizationId: 'org-4',
      inviterId: 'inviter-4',
      inviteeEmail: currentUser.email,
      inviteeUserId: null,
      token: 'tok4',
      source: 'email',
      status: 'pending',
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (invitationsRepository.updateOrganizationInviteStatus as jest.Mock).mockResolvedValue({
      id: 'inv-4',
      organizationId: 'org-4',
      inviterId: 'inviter-4',
      inviteeEmail: currentUser.email,
      inviteeUserId: null,
      token: 'tok4',
      source: 'email',
      status: 'rejected',
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await rejectInvite(new NextRequest('http://localhost/api/invites/inv-4/reject', { method: 'POST' }), {
      params: { inviteId: 'inv-4' },
    });
    expect(response.status).toBe(200);
  });
});


