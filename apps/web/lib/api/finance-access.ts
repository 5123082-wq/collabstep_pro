import { decodeDemoSession, DEMO_SESSION_COOKIE, isDemoAdminEmail } from '@/lib/auth/demo-session';
import { projectsRepository, isAdminUserId } from '@collabverse/api';

export type FinanceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AuthContext {
  userId: string;
  email: string;
  role: FinanceRole;
}

export function getAuthFromRequest(request: Request): AuthContext | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key, rest.join('=')];
      })
  );

  const sessionCookie = cookies[DEMO_SESSION_COOKIE];
  if (!sessionCookie) {
    return null;
  }

  const session = decodeDemoSession(sessionCookie);
  if (!session) {
    return null;
  }

  const isAdmin = session.role === 'admin' || isDemoAdminEmail(session.email);

  return {
    userId: session.userId,
    email: session.email,
    role: isAdmin ? 'owner' : 'member'
  };
}

export function getProjectRole(projectId: string, userId: string, email?: string): FinanceRole {
  // Проверяем, является ли пользователь администратором по userId (UUID) - основной путь для новых пользователей
  if (isAdminUserId(userId)) {
    return 'owner';
  }

  // Если передан email отдельно, проверяем админа по email (для обратной совместимости)
  // Это важно для случаев, когда userId это UUID, но нужно проверить админа по email
  // Админ должен иметь роль 'owner' для всех проектов
  if (email && isDemoAdminEmail(email)) {
    return 'owner';
  }
  
  // Дополнительная проверка: если userId это email админа (старая сессия)
  // Это нужно для обратной совместимости со старыми сессиями
  if (isDemoAdminEmail(userId)) {
    return 'owner';
  }

  // Обратная совместимость: проверяем админа по email только если userId не UUID (старая сессия)
  // Для новых пользователей userId всегда UUID, поэтому эта проверка не сработает
  const isLegacyEmailUserId = !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (isLegacyEmailUserId && isDemoAdminEmail(userId)) {
    return 'owner';
  }

  // Проверяем, является ли пользователь владельцем проекта
  const project = projectsRepository.findById(projectId);
  if (!project) {
    return 'viewer';
  }

  // Основная проверка: ownerId === userId (работает для новых пользователей с UUID)
  // Также работает для старых сессий, где userId может быть email
  if (project.ownerId === userId) {
    return 'owner';
  }

  // Обратная совместимость: если передан email и ownerId это email админа
  if (email && project.ownerId === email && isDemoAdminEmail(email)) {
    return 'owner';
  }

  // Обратная совместимость: если ownerId это email админа, а userId это UUID админа
  // (эта проверка должна быть после проверки isAdminUserId выше, но на всякий случай оставляем)
  if (isAdminUserId(userId) && isDemoAdminEmail(project.ownerId)) {
    return 'owner';
  }

  // Обратная совместимость: если ownerId это UUID админа, а userId это email админа
  if (isLegacyEmailUserId && isDemoAdminEmail(userId) && isAdminUserId(project.ownerId)) {
    return 'owner';
  }

  // Проверяем членство в проекте (используется userId, который для новых пользователей всегда UUID)
  const member = projectsRepository.getMember(projectId, userId);
  if (!member) {
    return 'viewer';
  }
  if (member.role === 'owner' || member.role === 'admin' || member.role === 'member') {
    return member.role;
  }
  return 'viewer';
}

export function assertProjectAccess(role: FinanceRole, allowed: FinanceRole[]): void {
  if (!allowed.includes(role)) {
    throw new Error('ACCESS_DENIED');
  }
}
