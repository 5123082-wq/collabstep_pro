import { NextResponse } from 'next/server';
import { adminService } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getDemoSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const items = await adminService.listUsers();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API /admin/users] Ошибка:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

