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
        // Verify user is org admin/owner who accepts the work
        
        await contractService.completeContract(contractId, auth.userId);
        
        return jsonOk({ success: true });
    } catch (error: unknown) {
        console.error('Complete contract failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}
