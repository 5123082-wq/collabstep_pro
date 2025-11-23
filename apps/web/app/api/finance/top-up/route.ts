import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { walletService, type WalletType } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(request: NextRequest) {
    const auth = getAuthFromRequest(request);
    if (!auth) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        const { entityId, entityType, amount, sourceRef } = body;

        if (!entityId || !entityType || !amount) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Missing required fields' });
        }

        // Security check
        if (entityType === 'user' && entityId !== auth.userId) {
             return jsonError('FORBIDDEN', { status: 403 });
        }
        // TODO: Organization check

        const result = await walletService.topUp(entityId, entityType as WalletType, amount, sourceRef);
        return jsonOk(result);

    } catch (error) {
        console.error('Top-up failed:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

