import { memory, projectsRepository, tasksRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

type ActivityItem = {
  id: string;
  type: 'task_created' | 'comment_added';
  title: string;
  description?: string;
  userId?: string;
  timestamp: string;
  taskId?: string;
};

const MAX_TASKS = 40;
const MAX_EVENTS = 200;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;
  const project = await projectsRepository.findById(projectId);
  if (!project) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  if (!(await projectsRepository.hasAccess(projectId, auth.userId))) {
    return jsonError('FORBIDDEN', { status: 403 });
  }

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get('days') ?? '7');
  const daysWindow = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7;
  const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;

  const activities: ActivityItem[] = [];

  // Берем только задачи, которые создавались или обновлялись за период, сортируем и ограничиваем
  const projectTasks = tasksRepository
    .listByProject(projectId)
    .filter((task) => {
      const createdAt = Date.parse(task.createdAt);
      const updatedAt = Date.parse(task.updatedAt || task.createdAt);
      return (
        (!Number.isNaN(createdAt) && createdAt >= cutoff) ||
        (!Number.isNaN(updatedAt) && updatedAt >= cutoff)
      );
    })
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
    .slice(0, MAX_TASKS);

  const taskLookup = new Map(projectTasks.map((t) => [t.id, t]));

  // События по созданию задач
  for (const task of projectTasks) {
    const createdAtTs = Date.parse(task.createdAt);
    if (!Number.isNaN(createdAtTs) && createdAtTs >= cutoff) {
      const activityItem: ActivityItem = {
        id: `task-${task.id}`,
        type: 'task_created',
        title: `Создана задача "${task.title}"`,
        userId: project.ownerId,
        timestamp: task.createdAt,
        taskId: task.id
      };
      if (task.description) {
        activityItem.description = task.description;
      }
      activities.push(activityItem);
    }
  }

  // Комментарии по задачам за период (без построения дерева комментариев)
  const taskIdsSet = new Set(projectTasks.map((t) => t.id));
  const recentComments = memory.TASK_COMMENTS.filter((comment) => {
    if (!taskIdsSet.has(comment.taskId)) return false;
    if (comment.projectId !== projectId) return false;
    const createdAtTs = Date.parse(comment.createdAt);
    return !Number.isNaN(createdAtTs) && createdAtTs >= cutoff;
  });

  for (const comment of recentComments) {
    const task = taskLookup.get(comment.taskId);
    if (!task) continue;
    activities.push({
      id: `comment-${comment.id}`,
      type: 'comment_added',
      title: `Комментарий к задаче “${task.title}”`,
      description: comment.body,
      userId: comment.authorId,
      timestamp: comment.createdAt,
      taskId: task.id
    });
    if (activities.length >= MAX_EVENTS) {
      break;
    }
  }

  // Сортировка по убыванию даты
  activities.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const limited = activities.slice(0, MAX_EVENTS);

  return jsonOk({ items: limited });
}
