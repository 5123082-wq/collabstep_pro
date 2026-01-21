import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getUserSubscription, getOwnedOrganizationsCount } from '@/lib/api/user-subscription';

type NewOrganizationInput = Parameters<typeof organizationsRepository.create>[0];

export async function GET() {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    if (!userId) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        // Get organizations with membership info
        let memberships = await organizationsRepository.listMembershipsForUser(userId);

        if (memberships.length === 0) {
            const fallbackName = user?.name?.trim() || user?.email?.split('@')[0]?.trim() || 'Personal Organization';
            await organizationsRepository.create({
                ownerId: userId,
                name: fallbackName,
                type: 'closed',
                kind: 'personal',
                isPublicInDirectory: false,
            });
            memberships = await organizationsRepository.listMembershipsForUser(userId);
        }
        
        // Transform to include isPrimary, userRole, and memberCount
        const organizationsPromises = memberships.map(async ({ organization, member }) => {
            // Get member count for this org
            const members = await organizationsRepository.listMembers(organization.id);
            const memberCount = members.length;
            
            // Determine if this is the primary organization for this user
            // Primary = first owned organization (oldest by creation date)
            const ownedMemberships = memberships
                .filter(m => m.member.role === 'owner')
                .sort((a, b) => {
                    const dateA = a.organization.createdAt instanceof Date 
                        ? a.organization.createdAt.getTime() 
                        : new Date(a.organization.createdAt).getTime();
                    const dateB = b.organization.createdAt instanceof Date 
                        ? b.organization.createdAt.getTime() 
                        : new Date(b.organization.createdAt).getTime();
                    return dateA - dateB;
                });
            
            const isPrimary = ownedMemberships.length > 0 && 
                              ownedMemberships[0]?.organization.id === organization.id;
            
            return {
                id: organization.id,
                name: organization.name,
                description: organization.description,
                ownerId: organization.ownerId,
                type: organization.type,
                kind: organization.kind ?? 'business',
                status: organization.status ?? 'active',
                isPrimary,
                userRole: member.role,
                memberCount,
                createdAt: organization.createdAt,
            };
        });

        const organizations = await Promise.all(organizationsPromises);

        // Sort: primary first, then owned orgs, then member orgs
        organizations.sort((a, b) => {
            if (a.isPrimary && !b.isPrimary) return -1;
            if (!a.isPrimary && b.isPrimary) return 1;
            if (a.userRole === 'owner' && b.userRole !== 'owner') return -1;
            if (a.userRole !== 'owner' && b.userRole === 'owner') return 1;
            return 0;
        });

        return jsonOk({ organizations });
    } catch (error) {
        console.error('[Organizations] Error listing:', error);
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('[Organizations] Error details:', { message, stack, userId });
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    
    if (!userId) {
        console.error('[Organizations] Unauthorized access attempt');
        return jsonError('UNAUTHORIZED', { status: 401, details: 'No user session found. Please log in first.' });
    }

    console.log('[Organizations] Creating organization for user:', userId);

    try {
        const body = await request.json();
        const rawKind = typeof body.kind === 'string' ? body.kind : undefined;
        if (rawKind && rawKind !== 'personal' && rawKind !== 'business') {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid organization kind' });
        }
        const kind = rawKind === 'personal' ? 'personal' : 'business';
        const nameValue = typeof body.name === 'string' ? body.name.trim() : '';

        if (kind === 'business' && !nameValue) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Business organization name is required' });
        }

        // Check organization limits
        const subscription = await getUserSubscription(userId);
        const ownedCount = await getOwnedOrganizationsCount(userId, kind);

        if (kind === 'personal' && ownedCount >= 1) {
            return jsonError('PLAN_LIMIT_REACHED', {
                status: 403,
                details: 'You already have a personal organization.',
            });
        }
        
        // -1 means unlimited
        if (kind === 'business' && subscription.maxOrganizations !== -1 && ownedCount >= subscription.maxOrganizations) {
            return jsonError('PLAN_LIMIT_REACHED', { 
                status: 403, 
                details: `You have reached the maximum of ${subscription.maxOrganizations} organization(s) for your ${subscription.planCode} plan. Upgrade to create more.`,
            });
        }

        const orgData: NewOrganizationInput = {
            ownerId: userId,
            name: nameValue || user?.name?.trim() || user?.email?.split('@')[0]?.trim() || 'Personal Organization',
            type: body.type === 'open' ? 'open' : 'closed', // default closed if invalid
            kind,
            isPublicInDirectory: body.isPublicInDirectory ?? (body.type === 'open'),
            ...(body.description !== undefined ? { description: body.description } : {}),
        };

        // Note: Repository create method is transactional (creates org + owner member)
        const organization = await organizationsRepository.create(orgData);
        
        // Note: isPrimary will be set correctly if this is the first org
        // The migration handles existing data, new orgs need isPrimary set in the member record
        // TODO: Update member record with isPrimary = true if this is first org
        
        return jsonOk({ organization });

    } catch (error: unknown) {
        console.error('[Organizations] Error creating:', error);
        const message = error instanceof Error ? error.message : String(error);
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}
