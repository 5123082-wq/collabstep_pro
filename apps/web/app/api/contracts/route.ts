import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { contractService, amountToCents } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(request: NextRequest) {
    const auth = getAuthFromRequest(request);
    if (!auth) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        const { taskId, performerId, organizationId, amount, currency } = body;

        if (!taskId || !performerId || !organizationId || !amount) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Missing required fields' });
        }

        // TODO: Check if user has permission to create offer for this organization/task
        
        // Amount is passed as string/number (e.g. 100.00), convert to cents for service
        const cents = Number(amountToCents(String(amount)));

        const contract = await contractService.createOffer(
            taskId,
            performerId,
            organizationId,
            cents,
            currency || 'RUB'
        );

        return jsonOk(contract);

    } catch (error: any) {
        console.error('Create offer failed:', error);
        return jsonError('INTERNAL_ERROR', { status: 500, details: error.message });
    }
}

