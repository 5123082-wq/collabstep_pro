import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { getCurrentSession } from '@/lib/auth/session';
import { aiAgentConfigsDbRepository } from '@collabverse/api';

/**
 * GET /api/ai/hub/debug
 * Diagnostic: auth, session, agents count. Remove or restrict in production.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authSync = getAuthFromRequest(req);
  const authWithSession = await getAuthFromRequestWithSession(req);
  const session = await getCurrentSession();
  // NOTE: AI_AGENTS_DATABASE_URL removed - all data now uses main database
  const hasAiAgentsUrl = true; // Always true since consolidated to main DB

  let agentsCount = 0;
  let agentsSample: { id: string; slug: string; name: string }[] = [];
  let listError: string | null = null;

  try {
    const allAgents = await aiAgentConfigsDbRepository.listAll({ enabledOnly: true });
    agentsCount = allAgents.length;
    agentsSample = allAgents.slice(0, 5).map((a) => ({ id: a.id, slug: a.slug, name: a.name }));
  } catch (e) {
    listError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    ok: true,
    aiV1: flags.AI_V1,
    hasAiAgentsDatabaseUrl: hasAiAgentsUrl,
    auth: {
      fromDemoCookie: authSync ? { userId: authSync.userId, email: authSync.email } : null,
      fromSessionOrDemo: authWithSession ? { userId: authWithSession.userId, email: authWithSession.email } : null,
    },
    session: session
      ? { userId: session.user?.id, email: session.user?.email, role: session.user?.role }
      : null,
    agents: { count: agentsCount, sample: agentsSample, listError },
  });
}
