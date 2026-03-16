import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError } from '@/lib/api/http';

export async function GET(
  _request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  void params;
  return jsonError('INVITE_THREADING_UNAVAILABLE', {
    status: 503,
    details: 'Invite thread messages are disabled until the feature is backed by the database.'
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  void request;
  void params;
  return jsonError('INVITE_THREADING_UNAVAILABLE', {
    status: 503,
    details: 'Invite thread messages are disabled until the feature is backed by the database.'
  });
}

