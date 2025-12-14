import type { Organization, OrganizationMember } from '../types';

export type NewOrganization = Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type NewOrganizationMember = Omit<OrganizationMember, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export type OrganizationMembership = {
    organization: Organization;
    member: OrganizationMember;
};

export interface OrganizationsRepository {
    // --- Organizations ---
    create(org: NewOrganization): Promise<Organization>;
    findById(id: string): Promise<Organization | null>;
    listForUser(userId: string): Promise<Organization[]>;
    listMembershipsForUser(userId: string): Promise<OrganizationMembership[]>;
    update(id: string, data: Partial<Organization>): Promise<Organization | null>;

    // --- Members ---
    addMember(member: NewOrganizationMember): Promise<OrganizationMember>;
    findMember(organizationId: string, userId: string): Promise<OrganizationMember | null>;
    findMemberById(organizationId: string, memberId: string): Promise<OrganizationMember | null>;
    listMembers(organizationId: string): Promise<OrganizationMember[]>;
    updateMemberRole(
        organizationId: string,
        memberId: string,
        role: OrganizationMember['role']
    ): Promise<OrganizationMember | null>;
    updateMemberStatus(
        organizationId: string,
        memberId: string,
        status: OrganizationMember['status']
    ): Promise<OrganizationMember | null>;
    removeMember(organizationId: string, memberId: string): Promise<void>;
}
