import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { contractService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const auth = getAuthFromRequest(request);
    if (!auth) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const contractId = params.id;
        // userId should match performerId in contract, service checks this.
        await contractService.acceptOffer(contractId, auth.userId);
        
        return jsonOk({ success: true });
    } catch (error: any) {
        console.error('Accept offer failed:', error);
        return jsonError('INTERNAL_ERROR', { status: 500, details: error.message });
    }
}

