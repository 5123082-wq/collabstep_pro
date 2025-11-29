import { projectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projects = projectsRepository.list();
  const items = [];
  for (const project of projects) {
    // Filter out private projects the user doesn't have access to
    const hasAccess = await projectsRepository.hasAccess(project.id, auth.userId);
    if (!hasAccess) {
      continue;
    }
    // Передаём email для обратной совместимости со старыми проектами
    // Для новых пользователей userId всегда UUID, email используется только для fallback
    const role = await getProjectRole(project.id, auth.userId, auth.email);
    items.push({
      id: project.id,
      name: project.title,
      role
    });
  }

  return jsonOk({ items });
}
