import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/config';
import {
    organizations,
    organizationMembers
} from '../db/schema';
import { usersRepository } from './users-repository';

// Export types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

export class OrganizationsRepository {

    // --- Organizations ---

    async create(org: NewOrganization): Promise<Organization> {
        return await db.transaction(async (tx) => {
            const [createdOrg] = await tx
                .insert(organizations)
                .values(org)
                .returning();

            if (!createdOrg) throw new Error('Failed to create organization');

            // Owner automatically becomes a member with 'owner' role
            await tx.insert(organizationMembers).values({
                organizationId: createdOrg.id,
                userId: org.ownerId,
                role: 'owner',
                status: 'active'
            });

            return createdOrg;
        });
    }

    async findById(id: string): Promise<Organization | null> {
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, id));
        return org || null;
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
            orgMap.set(org.id, org);
        }

        for (const org of ownerOrgs) {
            orgMap.set(org.id, org);
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
        return updated || null;
    }

    // --- Members ---

    async addMember(member: NewOrganizationMember): Promise<OrganizationMember> {
        const [created] = await db
            .insert(organizationMembers)
            .values(member)
            .returning();
        if (!created) {
            throw new Error('Failed to create organization member');
        }
        return created;
    }

    async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
        const [member] = await db
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.userId, userId)
            ));
        return member || null;
    }

    async findMemberById(organizationId: string, memberId: string): Promise<OrganizationMember | null> {
        const [member] = await db
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.id, memberId)
            ));
        return member || null;
    }

    async listMembers(organizationId: string): Promise<OrganizationMember[]> {
        return await db
            .select()
            .from(organizationMembers)
            .where(eq(organizationMembers.organizationId, organizationId));
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
        return updated || null;
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

export const organizationsRepository = new OrganizationsRepository();
