import { NextResponse } from 'next/server';
import { adminService } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['enabled', 'disabled'] as const;
const ALLOWED_AUDIENCES = ['everyone', 'admins', 'beta'] as const;

export async function GET() {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const items = adminService.getModuleTree();
  return NextResponse.json({
    items,
    meta: {
      statuses: ALLOWED_STATUSES,
      audiences: ALLOWED_AUDIENCES
    }
  });
}

