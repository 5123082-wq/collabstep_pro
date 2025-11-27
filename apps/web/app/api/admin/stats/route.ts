import { NextResponse } from 'next/server';
import { adminService, auditLogRepository } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns overview statistics for admin dashboard
 */
export async function GET() {
  try {
    console.log('[API /admin/stats] Request received');
    const session = getDemoSessionFromCookies();
    
    if (!session) {
      console.log('[API /admin/stats] No session found');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    console.log('[API /admin/stats] Session:', { email: session.email, role: session.role });
    
    if (session.role !== 'admin') {
      console.log('[API /admin/stats] Forbidden: not admin role');
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // 1. Подсчет активных пользователей
    console.log('[API /admin/stats] Fetching users...');
    const users = await adminService.listUsers();
    const activeUsersCount = users.filter((user) => user.status === 'active').length;
    console.log('[API /admin/stats] Active users:', activeUsersCount, 'of', users.length);

    // 2. Подсчет включенных разделов (модули первого уровня с effectiveStatus === 'enabled')
    console.log('[API /admin/stats] Fetching modules...');
    const modules = await adminService.getModuleTree();
    const enabledSectionsCount = modules.filter(
      (module) => module.parentId === null && module.effectiveStatus === 'enabled'
    ).length;
    console.log('[API /admin/stats] Enabled sections:', enabledSectionsCount, 'of', modules.length);

    // 3. Сегменты - пока нет API, возвращаем 0
    const segmentsCount = 0;

    // 4. Подсчет записей аудита
    console.log('[API /admin/stats] Fetching audit entries...');
    const auditEntries = auditLogRepository.list();
    const auditEntriesCount = auditEntries.length;
    console.log('[API /admin/stats] Audit entries:', auditEntriesCount);

    const result = {
      activeUsers: activeUsersCount,
      enabledSections: enabledSectionsCount,
      segments: segmentsCount,
      auditEntries: auditEntriesCount
    };
    
    console.log('[API /admin/stats] Returning result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /admin/stats] Error:', error);
    if (error instanceof Error) {
      console.error('[API /admin/stats] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

