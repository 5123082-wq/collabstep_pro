import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  brandbookAgentMessagesRepository,
  brandbookAgentRunsRepository,
  organizationsRepository
} from '@collabverse/api';

const CreateMessageSchema = z.object({
  role: z.enum(['assistant', 'user', 'system']),
  content: z.string().min(1)
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
  const parsed = CreateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const run = await brandbookAgentRunsRepository.findById(runId);
  if (!run) {
    return jsonError('RUN_NOT_FOUND', { status: 404 });
  }

  if (run.projectId) {
    const role = await getProjectRole(run.projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    const member = await organizationsRepository.findMember(run.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  }

  const message = await brandbookAgentMessagesRepository.create({
    runId,
    role: parsed.data.role,
    content: parsed.data.content
  });

  return jsonOk({
    messageId: message.id
  });
}
