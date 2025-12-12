import { NextRequest } from 'next/server';

import { POST as register } from '@/app/api/auth/register/route';

jest.mock('@collabverse/api', () => {
  const actual = jest.requireActual('@collabverse/api');
  return {
    ...actual,
    invitationsRepository: {
      findOrganizationInviteByToken: jest.fn(),
      updateOrganizationInviteStatus: jest.fn(),
    },
  };
});

import { invitationsRepository, memory, resetFinanceMemory, usersRepository } from '@collabverse/api';

describe('Register by inviteToken', () => {
  beforeEach(() => {
    resetFinanceMemory();
    memory.WORKSPACE_USERS = [];
    jest.clearAllMocks();
  });

  it('uses invite email (ignores payload email) and links invite to created user', async () => {
    (invitationsRepository.findOrganizationInviteByToken as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      inviterId: 'user-1',
      inviteeEmail: 'invited@example.com',
      inviteeUserId: null,
      token: 'tok',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (invitationsRepository.updateOrganizationInviteStatus as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      inviterId: 'user-1',
      inviteeEmail: 'invited@example.com',
      inviteeUserId: 'user-created',
      token: 'tok',
      source: 'email',
      status: 'pending',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'New User',
        email: 'attacker@example.com',
        password: 'Password123!',
        inviteToken: 'tok',
      }),
    });

    const response = await register(req);
    expect(response.status).toBe(200);

    const created = await usersRepository.findByEmail('invited@example.com');
    expect(created).toBeTruthy();

    const attacker = await usersRepository.findByEmail('attacker@example.com');
    expect(attacker).toBeNull();

    expect(invitationsRepository.updateOrganizationInviteStatus).toHaveBeenCalledWith('inv-1', 'pending', created!.id);
  });
});


