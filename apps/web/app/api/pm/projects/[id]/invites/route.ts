import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, role: memberRole } = body;

    // TODO: Реализовать создание инвайт-ссылки с TTL/uses
    const inviteLink = {
      id: `invite-${Date.now()}`,
      projectId: params.id,
      token: `token-${Math.random().toString(36).substring(7)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      maxUses: body.maxUses || null,
      uses: 0,
      createdBy: auth.userId,
      createdAt: new Date().toISOString()
    };

    return jsonOk({ inviteLink });
  } catch (error) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}

