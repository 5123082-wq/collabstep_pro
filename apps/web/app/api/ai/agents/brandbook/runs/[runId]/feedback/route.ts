import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError } from '@/lib/api/http';

const BrandbookFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).optional()
});

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

  const body = await req.json().catch(() => null);
  const parsed = BrandbookFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  // TODO: Persist feedback and add analytics hooks.
  return jsonError('NOT_IMPLEMENTED', { status: 501 });
}
