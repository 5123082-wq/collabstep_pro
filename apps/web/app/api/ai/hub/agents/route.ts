import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { aiAgentConfigsDbRepository } from '@collabverse/api';

/**
 * GET /api/ai/hub/agents
 * List all AI agents available for direct messaging in AI Hub
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Get all enabled agents that allow direct messages
  const allAgents = await aiAgentConfigsDbRepository.listAll({ enabledOnly: true });
  const availableAgents = allAgents.filter((agent) => agent.allowDirectMessages !== false);

  return jsonOk({
    agents: availableAgents.map((agent) => ({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      pipelineType: agent.pipelineType,
    })),
  });
}
