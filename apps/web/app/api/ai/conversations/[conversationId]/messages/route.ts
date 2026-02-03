import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { trackEvent } from '@/lib/telemetry';
import {
  aiConversationsRepository,
  aiAgentConfigsDbRepository,
  createBrandbookRunMock,
  brandbookAgentMessagesRepository,
  organizationsRepository,
} from '@collabverse/api';

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  // Optional: for Brandbook Agent, can start a run
  organizationId: z.string().optional(),
  productBundle: z.enum(['merch_basic', 'office_basic']).optional(),
});

/**
 * GET /api/ai/conversations/[conversationId]/messages
 * Get messages in a conversation
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

  // Check ownership
  const isOwner = await aiConversationsRepository.isOwner(conversationId, auth.userId);
  if (!isOwner) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const messages = await aiConversationsRepository.listMessages(conversationId, { limit, offset });

  return jsonOk({
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt?.toISOString() ?? null,
    })),
  });
}

/**
 * POST /api/ai/conversations/[conversationId]/messages
 * Send a message in a conversation
 */
export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

  const body = await req.json().catch(() => null);
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const { content, organizationId, productBundle } = parsed.data;

  // Get conversation with agent info
  const conversation = await aiConversationsRepository.findById(conversationId);
  if (!conversation) {
    return jsonError('CONVERSATION_NOT_FOUND', { status: 404 });
  }

  // Add user message
  const userMessage = await aiConversationsRepository.addMessage({
    conversationId,
    role: 'user',
    content,
  });

  // Track event
  trackEvent('ai_agent_invoked', {
    agent_type: conversation.agent.slug,
    context: 'ai_hub',
    conversation_id: conversationId,
  });

  // Get agent config to check pipeline type
  const agentConfig = await aiAgentConfigsDbRepository.findById(conversation.agentConfigId);
  if (!agentConfig) {
    return jsonError('AGENT_NOT_FOUND', { status: 404 });
  }

  // Handle based on agent type
  let assistantMessage;

  if (agentConfig.slug === 'brandbook' && productBundle && organizationId) {
    // Brandbook Agent: create a run
    try {
      // Check organization membership
      const member = await organizationsRepository.findMember(organizationId, auth.userId);
      if (!member || member.status !== 'active') {
        assistantMessage = await aiConversationsRepository.addMessage({
          conversationId,
          role: 'assistant',
          content: 'У вас нет доступа к этой организации. Пожалуйста, выберите организацию, в которой вы являетесь участником.',
        });

        return jsonOk({
          userMessage: {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            createdAt: userMessage.createdAt?.toISOString() ?? null,
          },
          assistantMessage: {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt?.toISOString() ?? null,
          },
        });
      }

      const run = await createBrandbookRunMock({
        organizationId,
        productBundle,
        createdBy: auth.userId,
      });

      // Add starter messages to Brandbook run
      const starterMessages = [
        'Запуск создан. Я помогу собрать логотип и уточнения для брендбука.',
        'Лучше всего подходят PNG с прозрачностью и минимум 800px по короткой стороне.',
        'Вы можете загрузить файл или попросить демо-мокап без логотипа.',
      ];

      await Promise.all(
        starterMessages.map((msg) =>
          brandbookAgentMessagesRepository.create({
            runId: run.runId,
            role: 'assistant',
            content: msg,
          })
        )
      );

      // Track run creation
      trackEvent('ai_agent_run_created', {
        run_id: run.runId,
        agent_type: 'brandbook',
        organization_id: organizationId,
        product_bundle: productBundle,
        context: 'ai_hub',
      });

      assistantMessage = await aiConversationsRepository.addMessage({
        conversationId,
        role: 'assistant',
        content: `Отлично! Я создал запуск на генерацию брендбука (${productBundle === 'merch_basic' ? 'Мерч' : 'Офис'}). Теперь загрузите логотип, чтобы я начал работу.\n\nID запуска: ${run.runId}`,
        metadata: {
          runId: run.runId,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      assistantMessage = await aiConversationsRepository.addMessage({
        conversationId,
        role: 'assistant',
        content: `Не удалось создать запуск: ${errorMessage}`,
        metadata: {
          error: errorMessage,
        },
      });
    }
  } else if (agentConfig.slug === 'brandbook') {
    // Brandbook Agent without run params - give instructions
    assistantMessage = await aiConversationsRepository.addMessage({
      conversationId,
      role: 'assistant',
      content: `Привет! Я Brandbook Agent — помогу создать брендбук для вашего проекта.\n\nЧтобы начать, укажите:\n1. **Организацию** — выберите из списка ваших организаций\n2. **Тип брендбука** — "Мерч" (merch_basic) или "Офис" (office_basic)\n\nПосле этого загрузите логотип, и я создам для вас готовые материалы.`,
    });
  } else {
    // Generic agent response (placeholder for future agents)
    assistantMessage = await aiConversationsRepository.addMessage({
      conversationId,
      role: 'assistant',
      content: `Спасибо за сообщение! Агент "${agentConfig.name}" пока находится в разработке. Скоро он сможет помочь вам с вашими задачами.`,
    });
  }

  return jsonOk({
    userMessage: {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      createdAt: userMessage.createdAt?.toISOString() ?? null,
    },
    assistantMessage: assistantMessage ? {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      metadata: assistantMessage.metadata,
      createdAt: assistantMessage.createdAt?.toISOString() ?? null,
    } : null,
  });
}
