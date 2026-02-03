import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { aiConversationsRepository } from '@collabverse/api';

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * GET /api/ai/conversations/[conversationId]
 * Get conversation details
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { conversationId } = await params;

  const conversation = await aiConversationsRepository.findById(conversationId);
  if (!conversation) {
    return jsonError('CONVERSATION_NOT_FOUND', { status: 404 });
  }

  // Check ownership
  if (conversation.userId !== auth.userId) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  return jsonOk({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      agent: conversation.agent,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      createdAt: conversation.createdAt?.toISOString() ?? null,
    },
  });
}

/**
 * DELETE /api/ai/conversations/[conversationId]
 * Delete a conversation
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { conversationId } = await params;

  // Check ownership
  const isOwner = await aiConversationsRepository.isOwner(conversationId, auth.userId);
  if (!isOwner) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  await aiConversationsRepository.delete(conversationId);

  return jsonOk({ deleted: true });
}
