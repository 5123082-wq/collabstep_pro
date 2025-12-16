import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, organizationClosureService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

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
        // Check membership
        const member = await organizationsRepository.findMember(orgId, user.id);
            if (!member || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const organization = await organizationsRepository.findById(orgId);
        if (!organization) {
            return jsonError('NOT_FOUND', { status: 404 });
        }
        
        return jsonOk({ organization });

    } catch (error) {
        console.error('[Organization] Error fetching:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        const body = await request.json();

        // Check permissions (only owner or admin can update)
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const updatedOrg = await organizationsRepository.update(orgId, {
            name: body.name,
            description: body.description,
            isPublicInDirectory: body.isPublicInDirectory
        });

        return jsonOk({ organization: updatedOrg });

    } catch (error) {
        console.error('[Organization] Error updating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

/**
 * DELETE /api/organizations/[orgId]
 * Удалить организацию (только если нет блокеров)
 * Алиас для POST /closure/initiate
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        const result = await organizationClosureService.initiateClosing(orgId, user.id);
        return jsonOk({
            success: result.success,
            organizationId: result.organizationId,
            archiveId: result.archiveId,
            closedAt: result.closedAt,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Обработка специфичных ошибок
        if (errorMessage.includes('not found')) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: `Organization with id '${orgId}' does not exist`,
            });
        }
        
        if (errorMessage.includes('Only organization owner')) {
            return jsonError('FORBIDDEN', {
                status: 403,
                details: 'Only organization owner can close organization',
            });
        }
        
        if (errorMessage.includes('already closed')) {
            return jsonError('ALREADY_CLOSED', {
                status: 409,
                details: 'Organization is already closed',
            });
        }
        
        if (errorMessage.includes('cannot be closed due to active blockers')) {
            // Получаем preview для извлечения списка блокеров
            try {
                const preview = await organizationClosureService.getClosurePreview(orgId, user.id);
                const blockersInfo = preview.blockers.map((b) => `${b.moduleId}: ${b.title}`).join(', ');
                return jsonError('CANNOT_CLOSE', {
                    status: 400,
                    details: `Organization cannot be closed due to active blockers: ${blockersInfo}`,
                });
            } catch {
                // Если не удалось получить preview, возвращаем общую ошибку
                return jsonError('CANNOT_CLOSE', {
                    status: 400,
                    details: 'Organization cannot be closed due to active blockers',
                });
            }
        }

        console.error('[Organization Delete] Error:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: errorMessage,
        });
    }
}

