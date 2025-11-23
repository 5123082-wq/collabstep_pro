import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/config';
import {
    organizationInvites,
    projectInvites,
    organizationMembers,
    projectMembers,
    users
} from '../db/schema';

// Exporting types inferred from schema for external use
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type NewOrganizationInvite = typeof organizationInvites.$inferInsert;

export type ProjectInvite = typeof projectInvites.$inferSelect;
export type NewProjectInvite = typeof projectInvites.$inferInsert;

export class InvitationsRepository {

    // --- Organization Invites ---

    async createOrganizationInvite(invite: NewOrganizationInvite): Promise<OrganizationInvite> {
        const [created] = await db.insert(organizationInvites).values(invite).returning();
        if (!created) throw new Error('Failed to create organization invite');
        return created;
    }

    async findOrganizationInviteByToken(token: string): Promise<OrganizationInvite | null> {
        const [invite] = await db
            .select()
            .from(organizationInvites)
            .where(eq(organizationInvites.token, token));
        return invite || null;
    }

    async listPendingOrganizationInvites(organizationId: string): Promise<OrganizationInvite[]> {
        return db
            .select()
            .from(organizationInvites)
            .where(and(
                eq(organizationInvites.organizationId, organizationId),
                eq(organizationInvites.status, 'pending')
            ));
    }

    async updateOrganizationInviteStatus(
        id: string,
        status: OrganizationInvite['status'],
        inviteeUserId?: string // Optional: link user when accepting
    ): Promise<OrganizationInvite | null> {
        const updateData: Partial<OrganizationInvite> = {
            status,
            updatedAt: new Date()
        };

        if (inviteeUserId) {
            updateData.inviteeUserId = inviteeUserId;
        }

        const [updated] = await db
            .update(organizationInvites)
            .set(updateData)
            .where(eq(organizationInvites.id, id))
            .returning();

        return updated || null;
    }

    // --- Project Invites ---

    async createProjectInvite(invite: NewProjectInvite): Promise<ProjectInvite> {
        // Ensure default status is set if not provided, though DB default handles it
        const [created] = await db.insert(projectInvites).values(invite).returning();
        if (!created) throw new Error('Failed to create project invite');
        return created;
    }

    async findProjectInviteByToken(token: string): Promise<ProjectInvite | null> {
        const [invite] = await db
            .select()
            .from(projectInvites)
            .where(eq(projectInvites.token, token));
        return invite || null;
    }

    async findProjectInviteById(id: string): Promise<ProjectInvite | null> {
        const [invite] = await db
            .select()
            .from(projectInvites)
            .where(eq(projectInvites.id, id));
        return invite || null;
    }

    /**
     * Finds an active (non-expired, non-revoked) invite for a specific user to a project.
     * Useful for checking access rights (preview vs full).
     */
    async findActiveProjectInviteForUser(projectId: string, userId: string): Promise<ProjectInvite | null> {
        // statuses that grant at least preview access
        const activeStatuses: ProjectInvite['status'][] = [
            'invited',
            'previewing',
            'accepted_by_user',
            'pending_owner_approval',
            'approved'
        ];

        // Note: Drizzle inArray requires non-empty array
        const [invite] = await db
            .select()
            .from(projectInvites)
            .where(and(
                eq(projectInvites.projectId, projectId),
                eq(projectInvites.inviteeUserId, userId),
                // We could filter by status here, but logic might be complex with array
                // Let's filter in JS or simpler query
            ));

        if (invite && activeStatuses.includes(invite.status)) {
            return invite;
        }
        return null;
    }

    async listPendingProjectInvites(projectId: string): Promise<ProjectInvite[]> {
        // Returns invites waiting for owner approval
        const pendingStatuses: ProjectInvite['status'][] = ['accepted_by_user', 'pending_owner_approval'];

        const invites = await db
            .select()
            .from(projectInvites)
            .where(eq(projectInvites.projectId, projectId));

        return invites.filter(i => pendingStatuses.includes(i.status));
    }

    async listProjectInvites(projectId: string, status?: string): Promise<ProjectInvite[]> {
        const conditions = [eq(projectInvites.projectId, projectId)];

        if (status) {
            conditions.push(eq(projectInvites.status, status as any));
        }

        return await db
            .select()
            .from(projectInvites)
            .where(and(...conditions));
    }

    async updateProjectInviteStatus(
        id: string,
        status: ProjectInvite['status'],
        inviteeUserId?: string
    ): Promise<ProjectInvite | null> {
        const updateData: Partial<ProjectInvite> = {
            status,
            updatedAt: new Date()
        };

        if (inviteeUserId) {
            updateData.inviteeUserId = inviteeUserId;
        }

        const [updated] = await db
            .update(projectInvites)
            .set(updateData)
            .where(eq(projectInvites.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Transactional helper: Approve project invite -> Create Project Member
     */
    async approveProjectInviteAndAddMember(
        inviteId: string,
        role: 'owner' | 'manager' | 'contributor' | 'viewer' = 'contributor'
    ): Promise<{ invite: ProjectInvite; member: any }> {
        return await db.transaction(async (tx) => {
            // 1. Update invite status
            const [updatedInvite] = await tx
                .update(projectInvites)
                .set({ status: 'approved', updatedAt: new Date() })
                .where(eq(projectInvites.id, inviteId))
                .returning();

            if (!updatedInvite) {
                throw new Error('Invite not found');
            }

            if (!updatedInvite.inviteeUserId) {
                throw new Error('Invite must have an associated user ID to approve');
            }

            // 2. Create Project Member
            const [newMember] = await tx
                .insert(projectMembers)
                .values({
                    projectId: updatedInvite.projectId,
                    userId: updatedInvite.inviteeUserId,
                    role: role,
                    status: 'active'
                })
                .returning();

            return { invite: updatedInvite, member: newMember };
        });
    }
}

export const invitationsRepository = new InvitationsRepository();

