import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  aiConversationsRepository,
  aiAgentConfigsDbRepository,
} from '@collabverse/api';

const CreateConversationSchema = z.object({
  agentSlug: z.string().min(1),
});

/**
 * GET /api/ai/conversations
 * List all AI Hub conversations for the current user
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const conversations = await aiConversationsRepository.listByUser(auth.userId);

  return jsonOk({
    conversations: conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      agent: conv.agent,
      lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
      lastMessage: conv.lastMessage ? {
        content: conv.lastMessage.content.slice(0, 100) + (conv.lastMessage.content.length > 100 ? '...' : ''),
        role: conv.lastMessage.role,
        createdAt: conv.lastMessage.createdAt?.toISOString() ?? null,
      } : null,
      createdAt: conv.createdAt?.toISOString() ?? null,
    })),
  });
}

/**
 * POST /api/ai/conversations
 * Create or get existing conversation with an AI agent
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const { agentSlug } = parsed.data;

  // Find agent config by slug
  const agentConfig = await aiAgentConfigsDbRepository.findBySlug(agentSlug);
  if (!agentConfig) {
    return jsonError('AGENT_NOT_FOUND', { status: 404 });
  }

  // Check if agent allows direct messages
  if (agentConfig.allowDirectMessages === false) {
    return jsonError('DIRECT_MESSAGES_NOT_ALLOWED', { status: 403 });
  }

  // Check if agent is enabled
  if (!agentConfig.enabled) {
    return jsonError('AGENT_DISABLED', { status: 403 });
  }

  // Find or create conversation
  const conversation = await aiConversationsRepository.findOrCreate(auth.userId, agentConfig.id);

  return jsonOk({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      agentConfigId: conversation.agentConfigId,
      createdAt: conversation.createdAt?.toISOString() ?? null,
    },
  });
}
