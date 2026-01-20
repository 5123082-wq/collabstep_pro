import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError } from '@/lib/api/http';

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const runId = params.runId;
  if (!runId) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }

  // TODO: Add storage-backed retry, access checks, and analytics hooks.
  return jsonError('NOT_IMPLEMENTED', { status: 501 });
}
