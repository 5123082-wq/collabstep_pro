import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbProjectsRepository, organizationsRepository, invitationsRepository, inviteThreadsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { sendOrganizationInviteEmail } from '@/lib/email/mailer';
import { nanoid } from 'nanoid';

const ORG_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
type OrgRole = (typeof ORG_ROLES)[number];

function parseOrgRole(input: unknown): { ok: true; role: OrgRole } | { ok: false } {
    if (typeof input !== 'string') return { ok: false };
    if ((ORG_ROLES as readonly string[]).includes(input)) {
        return { ok: true, role: input as OrgRole };
    }
    return { ok: false };
}

export async function POST(
    request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    const userId = user?.id;
    if (!userId) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        // Check access (Owner or Admin can invite)
        const member = await organizationsRepository.findMember(orgId, userId);
        if (!member || !['owner', 'admin'].includes(member.role) || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can invite' });
        }

        const body = await request.json();
        const source = body.source; // 'email' | 'link'
        const inviteeUserId =
            typeof body.inviteeUserId === 'string' && body.inviteeUserId.trim()
                ? body.inviteeUserId.trim()
                : null;
        const previewProjectIdsRaw = body.previewProjectIds;
        const previewProjectIds =
            previewProjectIdsRaw === undefined
                ? null
                : Array.isArray(previewProjectIdsRaw)
                  ? Array.from(
                        new Set(
                            previewProjectIdsRaw
                                .filter((value: unknown): value is string => typeof value === 'string')
                                .map((value) => value.trim())
                                .filter(Boolean)
                        )
                    ).slice(0, 50)
                  : null;
        const roleResult =
            body.role === undefined ? null : parseOrgRole(body.role);

        if (roleResult && !roleResult.ok) {
            return jsonError('INVALID_REQUEST', {
                status: 400,
                details: `Invalid role. Allowed: ${ORG_ROLES.join(', ')}`,
            });
        }
        if (previewProjectIdsRaw !== undefined && !Array.isArray(previewProjectIdsRaw)) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'previewProjectIds must be an array of strings' });
        }

        // 1. Create Invite
        if (source === 'email') {
            const email =
                typeof body.email === 'string' && body.email.trim()
                    ? body.email.trim().toLowerCase()
                    : null;

            if (!email && !inviteeUserId) {
                return jsonError('INVALID_REQUEST', {
                    status: 400,
                    details: 'Email or inviteeUserId required',
                });
            }

            const invite = await invitationsRepository.createOrganizationInvite({
                organizationId: orgId,
                inviterId: userId,
                inviteeEmail: email ?? undefined,
                inviteeUserId: inviteeUserId ?? undefined,
                source: 'email',
                token: nanoid(32), // Generate token for email link as well
                status: 'pending',
                role: roleResult?.ok ? roleResult.role : undefined,
            });

            const thread = inviteThreadsRepository.ensureThreadForInvite({
                orgInviteId: invite.id,
                organizationId: orgId,
                createdByUserId: userId,
                ...(invite.inviteeUserId ? { inviteeUserId: invite.inviteeUserId } : {}),
                ...(invite.inviteeEmail ? { inviteeEmail: invite.inviteeEmail } : {}),
                ...(previewProjectIds && previewProjectIds.length ? { previewProjectIds } : {}),
            });

            // Stage 7: create preview project invites (iterative, DB-backed).
            // We can create preview invites either for known userId (registered) OR by email (pre-registration).
            if (previewProjectIds && previewProjectIds.length && (invite.inviteeUserId || invite.inviteeEmail)) {
                const inviteeEmail = invite.inviteeEmail ?? null;
                const inviteeUserIdValue = invite.inviteeUserId ?? null;

                // Validate all projectIds belong to org and inviter has access to them (member).
                const projects = await Promise.all(previewProjectIds.map((projectId) => dbProjectsRepository.findById(projectId)));
                const invalid = projects.findIndex((project) => !project || project.organizationId !== orgId);
                if (invalid !== -1) {
                    return jsonError('INVALID_REQUEST', {
                        status: 400,
                        details: 'One or more previewProjectIds are invalid for this organization',
                    });
                }

                const members = await Promise.all(previewProjectIds.map((projectId) => dbProjectsRepository.findMember(projectId, userId)));
                const hasInvalidMember = members.some((memberRow) => !memberRow || memberRow.status !== 'active');
                if (hasInvalidMember) {
                    return jsonError('FORBIDDEN', {
                        status: 403,
                        details: 'You do not have access to one or more preview projects',
                    });
                }

                await Promise.all(
                    previewProjectIds.map((projectId) =>
                        invitationsRepository.createProjectInvite({
                            projectId,
                            organizationId: orgId,
                            inviterId: userId,
                            ...(inviteeUserIdValue ? { inviteeUserId: inviteeUserIdValue } : {}),
                            ...(inviteeEmail ? { inviteeEmail } : {}),
                            source: 'email',
                            token: nanoid(32),
                            status: 'previewing',
                        })
                    )
                );
            }

            // TODO: Send email here (mock for now)
            if (invite.inviteeEmail) {
                await sendOrganizationInviteEmail({
                    toEmail: invite.inviteeEmail,
                    inviteToken: invite.token,
                    baseUrl: request.nextUrl.origin,
                });
            }

            return jsonOk({ invite, threadId: thread.id });

        } else if (source === 'link') {
            const invite = await invitationsRepository.createOrganizationInvite({
                organizationId: orgId,
                inviterId: userId,
                source: 'link',
                token: nanoid(32),
                status: 'pending',
                role: roleResult?.ok ? roleResult.role : undefined,
            });

            const thread = inviteThreadsRepository.ensureThreadForInvite({
                orgInviteId: invite.id,
                organizationId: orgId,
                createdByUserId: userId,
            });

            return jsonOk({ invite, threadId: thread.id, link: `/invite/org/${invite.token}` }); // client constructs full URL
        }

        return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid source' });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const causeMessage =
            typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { message?: unknown } }).cause
                ? String((error as { cause?: { message?: unknown } }).cause?.message ?? '')
                : '';
        const causeCode =
            typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { code?: unknown } }).cause
                ? String((error as { cause?: { code?: unknown } }).cause?.code ?? '')
                : '';
        
        // Graceful degradation: if database schema is missing the `role` column (migration not applied),
        // return a clear error message instead of 500.
        const isMissingRoleColumn =
            message.includes('column "role" does not exist') ||
            causeMessage.includes('column "role" does not exist') ||
            (causeCode === '42703' && (message.toLowerCase().includes('role') || causeMessage.toLowerCase().includes('role')));
        
        if (isMissingRoleColumn) {
            console.error('[Organization Invites] Database schema missing `role` column. Migration required.');
            return jsonError('DATABASE_SCHEMA_OUTDATED', {
                status: 503,
                details: 'Database migration required: the `organization_invite.role` column is missing. Please run database migrations.',
            });
        }
        
        console.error('[Organization Invites] Error creating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        // Check access
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const invites = await invitationsRepository.listPendingOrganizationInvites(orgId);
        return jsonOk({ invites });

    } catch (error) {
        console.error('[Organization Invites] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

