import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  aiAgentConfigsDbRepository,
  aiAgentPromptVersionsDbRepository,
  BrandbookAgentPipeline,
  brandbookAgentMessagesRepository,
  brandbookAgentRunsRepository,
  projectsRepository,
  type BrandbookPipelineConfig
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
    const members = await projectsRepository.listMembers(run.projectId);
    const isMember = members.some((member) => member.userId === auth.userId);
    if (!isMember && role !== 'owner') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    if (run.createdBy !== auth.userId) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  }

  const createdBy = parsed.data.role === 'user' ? auth.userId : undefined;
  const historyMessages = await brandbookAgentMessagesRepository.listByRun(runId);
  const message = await brandbookAgentMessagesRepository.create({
    runId,
    role: parsed.data.role,
    content: parsed.data.content,
    ...(createdBy ? { createdBy } : {})
  });

  if (parsed.data.role !== 'user') {
    return jsonOk({
      messageId: message.id
    });
  }

  const apiKey = process.env.BRANDBOOK_AGENT_OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError('BRANDBOOK_AGENT_API_KEY_MISSING', { status: 500 });
  }

  const config = await aiAgentConfigsDbRepository.findBySlug('brandbook');
  if (!config) {
    return jsonError('BRANDBOOK_AGENT_NOT_CONFIGURED', { status: 500 });
  }

  if (!config.enabled) {
    return jsonError('BRANDBOOK_AGENT_DISABLED', { status: 403 });
  }

  const promptVersion = await aiAgentPromptVersionsDbRepository.findPublished(config.id);
  if (!promptVersion) {
    return jsonError('BRANDBOOK_AGENT_PROMPT_NOT_PUBLISHED', { status: 500 });
  }

  const configuredParameters = (config.parameters as BrandbookPipelineConfig['parameters']) || {};
  const pipelineConfig: BrandbookPipelineConfig = {
    systemPrompt: promptVersion.systemPrompt || '',
    prompts: (promptVersion.prompts as BrandbookPipelineConfig['prompts']) || {},
    parameters: {
      ...configuredParameters,
      model: process.env.BRANDBOOK_AGENT_OPENAI_MODEL || configuredParameters.model || 'gpt-3.5-turbo'
    }
  };

  const pipeline = new BrandbookAgentPipeline(apiKey, pipelineConfig);
  const conversationHistory = historyMessages
    .filter((entry) => entry.role === 'assistant' || entry.role === 'user')
    .map((entry) => ({
      role: entry.role as 'assistant' | 'user',
      content: entry.content
    }));

  try {
    const assistantResponse = await pipeline.processUserMessage(
      parsed.data.content,
      conversationHistory,
      {
        productBundle: run.productBundle,
        step: 'chat'
      }
    );

    const assistantMessage = await brandbookAgentMessagesRepository.create({
      runId,
      role: 'assistant',
      content: assistantResponse
    });

    return jsonOk({
      messageId: message.id,
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt instanceof Date
          ? assistantMessage.createdAt.toISOString()
          : assistantMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Brandbook chat generation error:', error);
    return jsonError('BRANDBOOK_AGENT_CHAT_FAILED', { status: 500 });
  }
}
