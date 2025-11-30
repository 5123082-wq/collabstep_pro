import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/config';
import {
    organizations,
    organizationMembers
} from '../db/schema';
import { usersRepository } from './users-repository';
import type { Organization, OrganizationMember } from '../types';
import type { OrganizationsRepository, NewOrganization, NewOrganizationMember } from './organizations-repository.interface';
import { memory } from '../data/memory';

// Export types from interface for convenience
export type { Organization, OrganizationMember, NewOrganization, NewOrganizationMember };

export class OrganizationsDbRepository implements OrganizationsRepository {

    // --- Organizations ---

    async create(org: NewOrganization): Promise<Organization> {
        return await db.transaction(async (tx) => {
            const [createdOrg] = await tx
                .insert(organizations)
                .values({
                    name: org.name,
                    ownerId: org.ownerId,
                    description: org.description,
                    type: org.type,
                    isPublicInDirectory: org.isPublicInDirectory,
                    // id, createdAt, updatedAt handled by default/db
                })
                .returning();

            if (!createdOrg) throw new Error('Failed to create organization');

            // Owner automatically becomes a member with 'owner' role
            await tx.insert(organizationMembers).values({
                organizationId: createdOrg.id,
                userId: org.ownerId,
                role: 'owner',
                status: 'active'
            });

            // Map DB result to Organization type (date conversion if needed, though Drizzle usually handles it)
            return createdOrg as unknown as Organization;
        });
    }

    async findById(id: string): Promise<Organization | null> {
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, id));
        return (org as unknown as Organization) || null;
    }

    async listForUser(userId: string): Promise<Organization[]> {
        // Handle case where userId might be an email (for backward compatibility with old sessions)
        // Try to resolve to actual user ID if userId looks like an email
        const possibleUserIds = [userId];

        // If userId contains @, it might be an email - try to find the user
        if (userId.includes('@')) {
            const user = await usersRepository.findByEmail(userId);
            if (user) {
                possibleUserIds.push(user.id);
            }
        } else {
            // If userId is an ID, also check if there's a user with this ID that has a different email
            // This handles cases where organization was created with email as ownerId
            const user = await usersRepository.findById(userId);
            if (user) {
                possibleUserIds.push(user.email);
            }
        }

        // Get organizations where user is a member (check all possible userIds)
        const memberOrgs = await db
            .select({ org: organizations })
            .from(organizations)
            .innerJoin(
                organizationMembers,
                eq(organizations.id, organizationMembers.organizationId)
            )
            .where(and(
                or(...possibleUserIds.map(id => eq(organizationMembers.userId, id))),
                eq(organizationMembers.status, 'active')
            ));

        // Also get organizations where user is the owner (check all possible userIds)
        const ownerOrgs = await db
            .select()
            .from(organizations)
            .where(or(...possibleUserIds.map(id => eq(organizations.ownerId, id))));

        // Combine and deduplicate by organization ID
        const orgMap = new Map<string, Organization>();

        for (const { org } of memberOrgs) {
            orgMap.set(org.id, org as unknown as Organization);
        }

        for (const org of ownerOrgs) {
            orgMap.set(org.id, org as unknown as Organization);
        }

        // Sort by creation date (newest first)
        return Array.from(orgMap.values()).sort((a, b) => {
            const dateA = a.createdAt?.getTime() ?? 0;
            const dateB = b.createdAt?.getTime() ?? 0;
            return dateB - dateA;
        });
    }

    async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
        const [updated] = await db
            .update(organizations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(organizations.id, id))
            .returning();
        return (updated as unknown as Organization) || null;
    }

    // --- Members ---

    async addMember(member: NewOrganizationMember): Promise<OrganizationMember> {
        const [created] = await db
            .insert(organizationMembers)
            .values({
                organizationId: member.organizationId,
                userId: member.userId,
                role: member.role,
                status: member.status,
                // id, createdAt, updatedAt handled by default/db
            })
            .returning();
        if (!created) {
            throw new Error('Failed to create organization member');
        }
        return created as unknown as OrganizationMember;
    }

    async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
        const [member] = await db
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.userId, userId)
            ));
        return (member as unknown as OrganizationMember) || null;
    }

    async findMemberById(organizationId: string, memberId: string): Promise<OrganizationMember | null> {
        const [member] = await db
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.id, memberId)
            ));
        return (member as unknown as OrganizationMember) || null;
    }

    async listMembers(organizationId: string): Promise<OrganizationMember[]> {
        const members = await db
            .select()
            .from(organizationMembers)
            .where(eq(organizationMembers.organizationId, organizationId));
        return members as unknown as OrganizationMember[];
    }

    async updateMemberRole(
        organizationId: string,
        memberId: string,
        role: OrganizationMember['role']
    ): Promise<OrganizationMember | null> {
        const [updated] = await db
            .update(organizationMembers)
            .set({ role, updatedAt: new Date() })
            .where(and(
                eq(organizationMembers.id, memberId),
                eq(organizationMembers.organizationId, organizationId)
            ))
            .returning();
        return (updated as unknown as OrganizationMember) || null;
    }

    async removeMember(organizationId: string, memberId: string): Promise<void> {
        await db
            .delete(organizationMembers)
            .where(and(
                eq(organizationMembers.id, memberId),
                eq(organizationMembers.organizationId, organizationId)
            ));
    }
}

export class OrganizationsMemoryRepository implements OrganizationsRepository {

    // --- Organizations ---

    async create(org: NewOrganization): Promise<Organization> {
        const newOrg: Organization = {
            id: org.id || crypto.randomUUID(),
            ownerId: org.ownerId,
            name: org.name,
            ...(org.description ? { description: org.description } : {}),
            type: org.type,
            isPublicInDirectory: org.isPublicInDirectory,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        memory.ORGANIZATIONS.push(newOrg);

        // Owner automatically becomes a member with 'owner' role
        const newMember: OrganizationMember = {
            id: crypto.randomUUID(),
            organizationId: newOrg.id,
            userId: org.ownerId,
            role: 'owner',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        memory.ORGANIZATION_MEMBERS.push(newMember);

        return { ...newOrg };
    }

    async findById(id: string): Promise<Organization | null> {
        const org = memory.ORGANIZATIONS.find(o => o.id === id);
        return org ? { ...org } : null;
    }

    async listForUser(userId: string): Promise<Organization[]> {
        const possibleUserIds = [userId];

        if (userId.includes('@')) {
            const user = await usersRepository.findByEmail(userId);
            if (user) {
                possibleUserIds.push(user.id);
            }
        } else {
            const user = await usersRepository.findById(userId);
            if (user) {
                possibleUserIds.push(user.email);
            }
        }

        // Find organizations where user is a member
        const memberOrgs = memory.ORGANIZATIONS.filter(org => {
            const isMember = memory.ORGANIZATION_MEMBERS.some(m =>
                m.organizationId === org.id &&
                possibleUserIds.includes(m.userId) &&
                m.status === 'active'
            );
            const isOwner = possibleUserIds.includes(org.ownerId);
            return isMember || isOwner;
        });

        // Deduplicate and sort
        const orgMap = new Map<string, Organization>();
        for (const org of memberOrgs) {
            orgMap.set(org.id, org);
        }

        return Array.from(orgMap.values()).sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
        const index = memory.ORGANIZATIONS.findIndex(o => o.id === id);
        if (index === -1) return null;

        const updatedOrg = {
            ...memory.ORGANIZATIONS[index],
            ...data,
            updatedAt: new Date()
        };

        memory.ORGANIZATIONS[index] = updatedOrg as Organization;
        return { ...updatedOrg } as Organization;
    }

    // --- Members ---

    async addMember(member: NewOrganizationMember): Promise<OrganizationMember> {
        const newMember: OrganizationMember = {
            id: member.id || crypto.randomUUID(),
            organizationId: member.organizationId,
            userId: member.userId,
            role: member.role,
            status: member.status,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        memory.ORGANIZATION_MEMBERS.push(newMember);
        return { ...newMember };
    }

    async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
        const member = memory.ORGANIZATION_MEMBERS.find(m =>
            m.organizationId === organizationId && m.userId === userId
        );
        return member ? { ...member } : null;
    }

    async findMemberById(organizationId: string, memberId: string): Promise<OrganizationMember | null> {
        const member = memory.ORGANIZATION_MEMBERS.find(m =>
            m.organizationId === organizationId && m.id === memberId
        );
        return member ? { ...member } : null;
    }

    async listMembers(organizationId: string): Promise<OrganizationMember[]> {
        return memory.ORGANIZATION_MEMBERS
            .filter(m => m.organizationId === organizationId)
            .map(m => ({ ...m }));
    }

    async updateMemberRole(
        organizationId: string,
        memberId: string,
        role: OrganizationMember['role']
    ): Promise<OrganizationMember | null> {
        const index = memory.ORGANIZATION_MEMBERS.findIndex(m =>
            m.organizationId === organizationId && m.id === memberId
        );
        if (index === -1) return null;

        const updatedMember = {
            ...memory.ORGANIZATION_MEMBERS[index],
            role,
            updatedAt: new Date()
        };

        memory.ORGANIZATION_MEMBERS[index] = updatedMember as OrganizationMember;
        return { ...updatedMember } as OrganizationMember;
    }

    async removeMember(organizationId: string, memberId: string): Promise<void> {
        const index = memory.ORGANIZATION_MEMBERS.findIndex(m =>
            m.organizationId === organizationId && m.id === memberId
        );
        if (index !== -1) {
            memory.ORGANIZATION_MEMBERS.splice(index, 1);
        }
    }
}

// Factory logic
const hasDbConnection = !!process.env.POSTGRES_URL;
const isDbStorage = process.env.AUTH_STORAGE === 'db' && hasDbConnection;

// If no DB connection, default to memory repository to prevent 500 errors in dev
export const organizationsRepository: OrganizationsRepository = isDbStorage
    ? new OrganizationsDbRepository()
    : new OrganizationsMemoryRepository();
