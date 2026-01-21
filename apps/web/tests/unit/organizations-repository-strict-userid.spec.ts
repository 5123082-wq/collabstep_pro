import { memory, resetFinanceMemory, usersRepository } from '@collabverse/api';
import { OrganizationsMemoryRepository } from '@collabverse/api/repositories/organizations-repository';

describe('OrganizationsRepository: strict canonical userId matching', () => {
  const repo = new OrganizationsMemoryRepository();

  const canonicalUserId = 'user-canonical-id-1';
  const userEmail = 'user-canonical-id-1@collabverse.test';

  beforeEach(async () => {
    resetFinanceMemory();
    memory.WORKSPACE_USERS = [];

    await usersRepository.create({
      id: canonicalUserId,
      name: 'User 1',
      email: userEmail,
    });
  });

  it('findMember/listForUser/listMembershipsForUser work only with canonical userId (no email fallback)', async () => {
    const org = await repo.create({
      name: 'Org 1',
      ownerId: canonicalUserId,
      type: 'closed',
      kind: 'business',
      isPublicInDirectory: false,
    });

    const memberById = await repo.findMember(org.id, canonicalUserId);
    expect(memberById).toBeTruthy();
    expect(memberById?.userId).toBe(canonicalUserId);

    const memberByEmail = await repo.findMember(org.id, userEmail);
    expect(memberByEmail).toBeNull();

    const membershipsById = await repo.listMembershipsForUser(canonicalUserId);
    expect(membershipsById).toHaveLength(1);
    expect(membershipsById[0]?.member.userId).toBe(canonicalUserId);

    const membershipsByEmail = await repo.listMembershipsForUser(userEmail);
    expect(membershipsByEmail).toHaveLength(0);

    const orgsById = await repo.listForUser(canonicalUserId);
    expect(orgsById.map((o) => o.id)).toEqual([org.id]);

    const orgsByEmail = await repo.listForUser(userEmail);
    expect(orgsByEmail).toHaveLength(0);
  });
});

