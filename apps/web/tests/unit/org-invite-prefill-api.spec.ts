import { NextRequest } from 'next/server';

import { GET as getOrgInvitePrefill } from '@/app/api/invites/org/[token]/prefill/route';

jest.mock('@collabverse/api', () => {
  const actual = jest.requireActual('@collabverse/api');
  return {
    ...actual,
    invitationsRepository: {
      findOrganizationInviteByToken: jest.fn(),
    },
    organizationsRepository: {
      findById: jest.fn(),
    },
    usersRepository: {
      findById: jest.fn(),
    },
  };
});

import { invitationsRepository, organizationsRepository, usersRepository } from '@collabverse/api';

describe('Org Invite Prefill API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/invites/org/[token]/prefill returns email + organization + inviter', async () => {
    (invitationsRepository.findOrganizationInviteByToken as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      inviterId: 'user-1',
      inviteeEmail: 'invitee@example.com',
      inviteeUserId: null,
      token: 'tok',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (organizationsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'org-1',
      name: 'Org 1',
    });

    (usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Inviter',
      email: 'inviter@example.com',
      avatarUrl: null,
    });

    const response = await getOrgInvitePrefill(new NextRequest('http://localhost/api/invites/org/tok/prefill'), {
      params: { token: 'tok' },
    });
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.email).toBe('invitee@example.com');
    expect(payload.data.organization.name).toBe('Org 1');
    expect(payload.data.inviter.email).toBe('inviter@example.com');
  });

  it('returns 404 if invite not found', async () => {
    (invitationsRepository.findOrganizationInviteByToken as jest.Mock).mockResolvedValue(null);

    const response = await getOrgInvitePrefill(new NextRequest('http://localhost/api/invites/org/tok/prefill'), {
      params: { token: 'tok' },
    });
    expect(response.status).toBe(404);
  });
});


