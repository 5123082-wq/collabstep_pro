import { eq, and } from 'drizzle-orm';
import {
    organizations,
    organizationMembers
} from '../db/schema';
import type { Organization, OrganizationMember } from '../types';
import type { OrganizationMembership, OrganizationsRepository, NewOrganization, NewOrganizationMember } from './organizations-repository.interface';
import { memory, DEFAULT_ACCOUNT_ID, TEST_ADMIN_USER_ID } from '../data/memory';

// Try to import db - if it fails, we'll use memory repository
type DbType = typeof import('../db/config').db;
let db: DbType | null = null;
let dbAvailable = false;

try {
    // Use require for conditional import to avoid module load errors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbModule = require('../db/config');
    if (dbModule?.db) {
        db = dbModule.db as DbType;
        dbAvailable = true;
    }
} catch (error) {
    console.warn('[OrganizationsRepository] DB not available, will use memory repository:', 
        error instanceof Error ? error.message : String(error));
}

function getDb(): NonNullable<DbType> {
    if (!db) {
        throw new Error('Database connection not available');
    }
    return db;
}

// Export types from interface for convenience
export type { Organization, OrganizationMember, NewOrganization, NewOrganizationMember, OrganizationMembership };

function statusRank(status: OrganizationMember['status']): number {
    if (status === 'active') return 3;
    if (status === 'inactive') return 2;
    return 1; // blocked or unknown
}

export class OrganizationsDbRepository implements OrganizationsRepository {

    // --- Organizations ---

    async create(org: NewOrganization): Promise<Organization> {
        const dbInstance = getDb();
        return await dbInstance.transaction(async (tx) => {
            const [createdOrg] = await tx
                .insert(organizations)
                .values({
                    name: org.name,
                    ownerId: org.ownerId,
                    type: org.type,
                    kind: org.kind,
                    isPublicInDirectory: org.isPublicInDirectory,
                    ...(org.description !== undefined ? { description: org.description } : {}),
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
        const dbInstance = getDb();
        // Use explicit field selection to avoid fields that may not exist in DB
        const [row] = await dbInstance
            .select({
                id: organizations.id,
                ownerId: organizations.ownerId,
                name: organizations.name,
                description: organizations.description,
                type: organizations.type,
                kind: organizations.kind,
                isPublicInDirectory: organizations.isPublicInDirectory,
                createdAt: organizations.createdAt,
                updatedAt: organizations.updatedAt,
            })
            .from(organizations)
            .where(eq(organizations.id, id));
        
        // Auto-sync demo organization if not found and it's the default org ID
        if (!row && id === 'acct-collabverse') {
            console.log('[OrganizationsDbRepository] Demo organization not found in DB, auto-syncing...');
            try {
                await dbInstance.transaction(async (tx) => {
                    // Create organization
                    const [createdOrg] = await tx
                        .insert(organizations)
                        .values({
                            id: DEFAULT_ACCOUNT_ID,
                            ownerId: TEST_ADMIN_USER_ID,
                            name: 'Collabverse Demo Org',
                            description: 'Демонстрационная организация',
                            type: 'closed',
                            kind: 'business',
                            isPublicInDirectory: true,
                            status: 'active',
                        })
                        .returning();

                    if (!createdOrg) {
                        throw new Error('Failed to create demo organization');
                    }

                    // Create owner membership
                    await tx.insert(organizationMembers).values({
                        organizationId: DEFAULT_ACCOUNT_ID,
                        userId: TEST_ADMIN_USER_ID,
                        role: 'owner',
                        status: 'active',
                        isPrimary: true,
                    });

                    console.log('[OrganizationsDbRepository] ✅ Demo organization auto-synced to DB');
                });

                // Retry query after creation
                const [newRow] = await dbInstance
                    .select({
                        id: organizations.id,
                        ownerId: organizations.ownerId,
                        name: organizations.name,
                        description: organizations.description,
                        type: organizations.type,
                        kind: organizations.kind,
                        isPublicInDirectory: organizations.isPublicInDirectory,
                        createdAt: organizations.createdAt,
                        updatedAt: organizations.updatedAt,
                    })
                    .from(organizations)
                    .where(eq(organizations.id, id));

                if (newRow) {
                    return {
                        id: newRow.id,
                        ownerId: newRow.ownerId,
                        name: newRow.name,
                        description: newRow.description ?? undefined,
                        type: newRow.type,
                        kind: newRow.kind ?? 'business',
                        isPublicInDirectory: newRow.isPublicInDirectory,
                        status: 'active' as const,
                        createdAt: newRow.createdAt ?? new Date(),
                        updatedAt: newRow.updatedAt ?? new Date(),
                    } as Organization;
                }
            } catch (error) {
                console.error('[OrganizationsDbRepository] Error auto-syncing demo organization:', error);
                // Continue and return null if sync fails
            }
        }
        
        if (!row) return null;
        
        const org: Organization = {
            id: row.id,
            ownerId: row.ownerId,
            name: row.name,
            description: row.description ?? undefined,
            type: row.type,
            kind: row.kind ?? 'business',
            isPublicInDirectory: row.isPublicInDirectory,
            status: 'active' as const, // Default value if status column doesn't exist in DB
            createdAt: row.createdAt ?? new Date(),
            updatedAt: row.updatedAt ?? new Date(),
        } as Organization;
        
        return org;
    }

    async listForUser(userId: string): Promise<Organization[]> {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return [];

        console.log('[OrganizationsDbRepository] listForUser called with userId:', normalizedUserId);

        try {
            const dbInstance = getDb();
            // Get organizations where user is a member (canonical userId only)
            // Use explicit field selection to avoid fields that may not exist in DB
            console.log('[OrganizationsDbRepository] Querying member organizations...');
            const memberOrgs = await dbInstance
                .select({
                    orgId: organizations.id,
                    orgOwnerId: organizations.ownerId,
                    orgName: organizations.name,
                    orgDescription: organizations.description,
                    orgType: organizations.type,
                    orgKind: organizations.kind,
                    orgIsPublicInDirectory: organizations.isPublicInDirectory,
                    orgCreatedAt: organizations.createdAt,
                    orgUpdatedAt: organizations.updatedAt,
                })
                .from(organizations)
                .innerJoin(
                    organizationMembers,
                    eq(organizations.id, organizationMembers.organizationId)
                )
                .where(and(
                    eq(organizationMembers.userId, normalizedUserId),
                    eq(organizationMembers.status, 'active')
                ));

            // Also get organizations where user is the owner (canonical userId only)
            console.log('[OrganizationsDbRepository] Querying owner organizations...');
            const ownerOrgs = await dbInstance
                .select({
                    id: organizations.id,
                    ownerId: organizations.ownerId,
                    name: organizations.name,
                    description: organizations.description,
                    type: organizations.type,
                    kind: organizations.kind,
                    isPublicInDirectory: organizations.isPublicInDirectory,
                    createdAt: organizations.createdAt,
                    updatedAt: organizations.updatedAt,
                })
                .from(organizations)
                .where(eq(organizations.ownerId, normalizedUserId));

            // Combine and deduplicate by organization ID
            const orgMap = new Map<string, Organization>();

            for (const row of memberOrgs) {
                const org: Organization = {
                    id: row.orgId,
                    ownerId: row.orgOwnerId,
                    name: row.orgName,
                    description: row.orgDescription ?? undefined,
                    type: row.orgType,
                    kind: row.orgKind ?? 'business',
                    isPublicInDirectory: row.orgIsPublicInDirectory,
                    status: 'active' as const, // Default value if status column doesn't exist in DB
                    createdAt: row.orgCreatedAt ?? new Date(),
                    updatedAt: row.orgUpdatedAt ?? new Date(),
                } as Organization;
                orgMap.set(org.id, org);
            }

            for (const row of ownerOrgs) {
                const org: Organization = {
                    id: row.id,
                    ownerId: row.ownerId,
                    name: row.name,
                    description: row.description ?? undefined,
                    type: row.type,
                    kind: row.kind ?? 'business',
                    isPublicInDirectory: row.isPublicInDirectory,
                    status: 'active' as const, // Default value if status column doesn't exist in DB
                    createdAt: row.createdAt ?? new Date(),
                    updatedAt: row.updatedAt ?? new Date(),
                } as Organization;
                orgMap.set(org.id, org);
            }

            // Sort by creation date (newest first)
            return Array.from(orgMap.values()).sort((a, b) => {
                const getTime = (date: Date | string | null | undefined): number => {
                    if (!date) return 0;
                    if (date instanceof Date) return date.getTime();
                    if (typeof date === 'string') return new Date(date).getTime();
                    return 0;
                };
                const dateA = getTime(a.createdAt);
                const dateB = getTime(b.createdAt);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('[OrganizationsDbRepository] Error in listForUser:', error);
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            console.error('[OrganizationsDbRepository] Error details:', { message, stack, userId: normalizedUserId });
            
            // If table doesn't exist or connection failed, return empty array instead of throwing
            // This allows the app to work even if migrations haven't been run
            if (message.includes('does not exist') || message.includes('relation') || message.includes('connection')) {
                console.warn('[OrganizationsDbRepository] Database table or connection issue, returning empty array');
                return [];
            }
            
            throw error;
        }
    }

    async listMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return [];

        try {
            const dbInstance = getDb();
            console.log('[OrganizationsDbRepository] listMembershipsForUser called with userId:', normalizedUserId);
            
            // Use join with explicit field selection to avoid conflicts
            // Note: Some fields may not exist in DB if migrations haven't been run
            const rows = await dbInstance
                .select({
                    // Organization fields
                    orgId: organizations.id,
                    orgOwnerId: organizations.ownerId,
                    orgName: organizations.name,
                    orgDescription: organizations.description,
                    orgType: organizations.type,
                    orgKind: organizations.kind,
                    orgIsPublicInDirectory: organizations.isPublicInDirectory,
                    // orgStatus: organizations.status, // Temporarily removed - may not exist in DB
                    // orgClosedAt: organizations.closedAt, // Temporarily removed - may not exist in DB
                    // orgClosureReason: organizations.closureReason, // Temporarily removed - may not exist in DB
                    orgCreatedAt: organizations.createdAt,
                    orgUpdatedAt: organizations.updatedAt,
                    // Member fields
                    memberId: organizationMembers.id,
                    memberOrganizationId: organizationMembers.organizationId,
                    memberUserId: organizationMembers.userId,
                    memberRole: organizationMembers.role,
                    memberStatus: organizationMembers.status,
                    memberCreatedAt: organizationMembers.createdAt,
                    memberUpdatedAt: organizationMembers.updatedAt,
                })
                .from(organizationMembers)
                .innerJoin(
                    organizations,
                    eq(organizations.id, organizationMembers.organizationId)
                )
                .where(eq(organizationMembers.userId, normalizedUserId));

            console.log('[OrganizationsDbRepository] Found memberships:', rows.length);

            const result: OrganizationMembership[] = rows.map((row) => {
                const org: Organization = {
                    id: row.orgId,
                    ownerId: row.orgOwnerId,
                    name: row.orgName,
                    description: row.orgDescription ?? undefined,
                    type: row.orgType,
                    kind: row.orgKind ?? 'business',
                    isPublicInDirectory: row.orgIsPublicInDirectory,
                    status: 'active' as const, // Default value if status column doesn't exist in DB
                    createdAt: row.orgCreatedAt ?? new Date(),
                    updatedAt: row.orgUpdatedAt ?? new Date(),
                } as Organization;

                const member: OrganizationMember = {
                    id: row.memberId,
                    organizationId: row.memberOrganizationId,
                    userId: row.memberUserId,
                    role: row.memberRole,
                    status: row.memberStatus,
                    createdAt: row.memberCreatedAt ?? new Date(),
                    updatedAt: row.memberUpdatedAt ?? new Date(),
                } as OrganizationMember;

                return { organization: org, member } satisfies OrganizationMembership;
            });

            return result.sort((a: OrganizationMembership, b: OrganizationMembership) => {
                // Active first; then newest orgs first
                const byStatus = statusRank(b.member.status) - statusRank(a.member.status);
                if (byStatus !== 0) return byStatus;
                const dateA = a.organization.createdAt?.getTime?.() ?? 0;
                const dateB = b.organization.createdAt?.getTime?.() ?? 0;
                return dateB - dateA;
            });
        } catch (error) {
            console.error('[OrganizationsDbRepository] Error in listMembershipsForUser:', error);
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            console.error('[OrganizationsDbRepository] Error details:', { message, stack, userId: normalizedUserId });
            
            // If table doesn't exist or connection failed, return empty array instead of throwing
            // This allows the app to work even if migrations haven't been run
            if (message.includes('does not exist') || message.includes('relation') || message.includes('connection')) {
                console.warn('[OrganizationsDbRepository] Database table or connection issue, returning empty array');
                return [];
            }
            
            throw error;
        }
    }

    async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
        const dbInstance = getDb();
        const [updated] = await dbInstance
            .update(organizations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(organizations.id, id))
            .returning();
        return (updated as unknown as Organization) || null;
    }

    // --- Members ---

    async addMember(member: NewOrganizationMember): Promise<OrganizationMember> {
        const dbInstance = getDb();
        const [created] = await dbInstance
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
        const dbInstance = getDb();
        const [member] = await dbInstance
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.userId, userId)
            ));
        return (member as unknown as OrganizationMember) || null;
    }

    async findMemberById(organizationId: string, memberId: string): Promise<OrganizationMember | null> {
        const dbInstance = getDb();
        const [member] = await dbInstance
            .select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.id, memberId)
            ));
        return (member as unknown as OrganizationMember) || null;
    }

    async listMembers(organizationId: string): Promise<OrganizationMember[]> {
        const dbInstance = getDb();
        const members = await dbInstance
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
        const dbInstance = getDb();
        const [updated] = await dbInstance
            .update(organizationMembers)
            .set({ role, updatedAt: new Date() })
            .where(and(
                eq(organizationMembers.id, memberId),
                eq(organizationMembers.organizationId, organizationId)
            ))
            .returning();
        return (updated as unknown as OrganizationMember) || null;
    }

    async updateMemberStatus(
        organizationId: string,
        memberId: string,
        status: OrganizationMember['status']
    ): Promise<OrganizationMember | null> {
        const dbInstance = getDb();
        const [updated] = await dbInstance
            .update(organizationMembers)
            .set({ status, updatedAt: new Date() })
            .where(and(
                eq(organizationMembers.id, memberId),
                eq(organizationMembers.organizationId, organizationId)
            ))
            .returning();
        return (updated as unknown as OrganizationMember) || null;
    }

    async removeMember(organizationId: string, memberId: string): Promise<void> {
        const dbInstance = getDb();
        await dbInstance
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
            type: org.type,
            kind: org.kind ?? 'business',
            isPublicInDirectory: org.isPublicInDirectory,
            ...(org.description !== undefined ? { description: org.description } : {}),
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
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return [];

        // Find organizations where user is a member
        const memberOrgs = memory.ORGANIZATIONS.filter(org => {
            const isMember = memory.ORGANIZATION_MEMBERS.some(m =>
                m.organizationId === org.id &&
                m.userId === normalizedUserId &&
                m.status === 'active'
            );
            const isOwner = org.ownerId === normalizedUserId;
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

    async listMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return [];

        const rows = memory.ORGANIZATION_MEMBERS
            .filter((member) => member.userId === normalizedUserId)
            .map((member) => {
                const org = memory.ORGANIZATIONS.find((o) => o.id === member.organizationId);
                if (!org) return null;
                return {
                    organization: { ...org },
                    member: { ...member }
                } satisfies OrganizationMembership;
            })
            .filter((item): item is OrganizationMembership => Boolean(item));

        return rows.sort((a, b) => {
            const byStatus = statusRank(b.member.status) - statusRank(a.member.status);
            if (byStatus !== 0) return byStatus;
            return b.organization.createdAt.getTime() - a.organization.createdAt.getTime();
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

    async updateMemberStatus(
        organizationId: string,
        memberId: string,
        status: OrganizationMember['status']
    ): Promise<OrganizationMember | null> {
        const index = memory.ORGANIZATION_MEMBERS.findIndex(m =>
            m.organizationId === organizationId && m.id === memberId
        );
        if (index === -1) return null;

        const updatedMember = {
            ...memory.ORGANIZATION_MEMBERS[index],
            status,
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

console.log('[OrganizationsRepository] Initialization:', {
    hasDbConnection,
    isDbStorage,
    dbAvailable,
    AUTH_STORAGE: process.env.AUTH_STORAGE,
    hasPostgresUrl: !!process.env.POSTGRES_URL
});

// If no DB connection or DB is not available, default to memory repository to prevent 500 errors
export const organizationsRepository: OrganizationsRepository = (isDbStorage && dbAvailable)
    ? new OrganizationsDbRepository()
    : new OrganizationsMemoryRepository();
