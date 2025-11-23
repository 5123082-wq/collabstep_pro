import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { walletService, type WalletType } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(request: NextRequest) {
    const auth = getAuthFromRequest(request);
    if (!auth) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType') as WalletType;

    if (!entityId || !entityType) {
        return jsonError('INVALID_REQUEST', { status: 400, details: 'Missing entityId or entityType' });
    }

    // Security check: User can only access their own wallet or organization wallet where they are admin
    // For now, simple check:
    if (entityType === 'user' && entityId !== auth.userId) {
         return jsonError('FORBIDDEN', { status: 403 });
    }
    // TODO: Implement organization access check (is admin/owner of org)

    try {
        const balance = await walletService.getBalance(entityId, entityType);
        return jsonOk(balance);
    } catch (error) {
        console.error('Failed to get balance:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

