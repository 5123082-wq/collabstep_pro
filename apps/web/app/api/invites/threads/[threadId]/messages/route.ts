import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { inviteThreadsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

function parsePositiveInt(value: string | null, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

async function ensureThreadAccess(threadId: string, userId: string, email?: string): Promise<boolean> {
  const threads = inviteThreadsRepository.listThreadsForUser(userId, email);
  return threads.some((t) => t.id === threadId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const threadId = params.threadId;
  const allowed = await ensureThreadAccess(threadId, user.id, user.email);
  if (!allowed) {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  const page = parsePositiveInt(request.nextUrl.searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(request.nextUrl.searchParams.get('pageSize'), 50);

  try {
    const result = inviteThreadsRepository.listMessages(threadId, { page, pageSize });
    return jsonOk({ ...result });
  } catch (error) {
    console.error('[Invite Thread Messages] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const threadId = params.threadId;
  const allowed = await ensureThreadAccess(threadId, user.id, user.email);
  if (!allowed) {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  try {
    const body = await request.json();
    const text = typeof body.body === 'string' ? body.body : '';
    if (!text.trim()) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: 'Message body required' });
    }

    const message = inviteThreadsRepository.createMessage({
      threadId,
      authorId: user.id,
      body: text,
    });

    return jsonOk({ message });
  } catch (error) {
    console.error('[Invite Thread Messages] Error creating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


