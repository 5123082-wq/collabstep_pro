import { inviteThreadsRepository, resetFinanceMemory, resetInvitesMemory } from '@collabverse/api';

describe('InviteThreadsRepository (memory-first)', () => {
  beforeEach(() => {
    resetFinanceMemory();
    resetInvitesMemory();
  });

  it('ensureThreadForInvite is idempotent', () => {
    const first = inviteThreadsRepository.ensureThreadForInvite({
      orgInviteId: 'org-invite-1',
      organizationId: 'org-1',
      createdByUserId: 'user-inviter',
      inviteeUserId: 'user-invitee'
    });

    const second = inviteThreadsRepository.ensureThreadForInvite({
      orgInviteId: 'org-invite-1',
      organizationId: 'org-1',
      createdByUserId: 'user-inviter',
      inviteeUserId: 'user-invitee'
    });

    expect(first.id).toBe(second.id);
    expect(first.orgInviteId).toBe('org-invite-1');
  });

  it('listThreadsForUser returns threads for invitee userId and for email fallback', () => {
    const t1 = inviteThreadsRepository.createThread({
      orgInviteId: 'org-invite-2',
      organizationId: 'org-1',
      createdByUserId: 'user-inviter',
      inviteeUserId: 'user-invitee'
    });

    const t2 = inviteThreadsRepository.createThread({
      orgInviteId: 'org-invite-3',
      organizationId: 'org-1',
      createdByUserId: 'user-inviter',
      inviteeEmail: 'invitee@example.com'
    });

    const byUserId = inviteThreadsRepository.listThreadsForUser('user-invitee');
    expect(byUserId.map((t) => t.id)).toContain(t1.id);
    expect(byUserId.map((t) => t.id)).not.toContain(t2.id);

    const byEmail = inviteThreadsRepository.listThreadsForUser('some-other-user', 'invitee@example.com');
    expect(byEmail.map((t) => t.id)).toContain(t2.id);
  });

  it('createMessage stores and listMessages returns messages with pagination', () => {
    const thread = inviteThreadsRepository.createThread({
      orgInviteId: 'org-invite-4',
      organizationId: 'org-1',
      createdByUserId: 'user-inviter',
      inviteeUserId: 'user-invitee'
    });

    for (let i = 0; i < 5; i++) {
      inviteThreadsRepository.createMessage({
        threadId: thread.id,
        authorId: 'user-inviter',
        body: `Message ${i}`
      });
    }

    const page1 = inviteThreadsRepository.listMessages(thread.id, { page: 1, pageSize: 2 });
    expect(page1.messages).toHaveLength(2);
    expect(page1.pagination.total).toBe(5);
    expect(page1.pagination.totalPages).toBe(3);
  });
});


