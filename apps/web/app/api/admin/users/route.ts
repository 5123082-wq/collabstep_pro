import { NextResponse } from 'next/server';
import { adminService } from '@collabverse/api';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
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

