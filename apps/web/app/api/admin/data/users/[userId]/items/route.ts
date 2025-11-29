import { NextRequest, NextResponse } from 'next/server';
import { projectsRepository, tasksRepository, memory } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

type ItemType = 'project' | 'task';

type ProjectItem = {
  type: 'project';
  id: string;
  title: string;
  key: string;
  status: string;
  createdAt: string;
  tasksCount: number;
};

type TaskItem = {
  type: 'task';
  id: string;
  title: string;
  status: string;
  priority?: string;
  projectId: string;
  projectKey?: string;
  projectTitle?: string;
  assigneeId?: string;
  reason: 'project_owner' | 'assignee';
  createdAt: string;
  updatedAt?: string;
};

type ItemsResponse = {
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  items: Array<ProjectItem | TaskItem>;
  counts: {
    projects: number;
    tasks: number;
  };
};

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type');
  const filterType: ItemType | 'all' =
    typeParam === 'project' || typeParam === 'task' ? typeParam : 'all';

  const userId = params.userId;
  const user = memory.WORKSPACE_USERS.find(
    (u) => u.id === userId || u.email === userId
  );

  const projects = projectsRepository
    .list()
    .filter((project) => project.ownerId === userId || project.ownerId === user?.email);
  const projectIds = new Set(projects.map((p) => p.id));

  const allTasks = tasksRepository.list();
  const tasksAsOwner = allTasks.filter((task) => projectIds.has(task.projectId));
  const tasksAsAssignee = allTasks.filter((task) => task.assigneeId === userId);

  const dedupTasks = new Map<string, TaskItem>();
  for (const task of tasksAsOwner) {
    const project = projects.find((p) => p.id === task.projectId);
    dedupTasks.set(task.id, {
      type: 'task',
      id: task.id,
      title: task.title,
      status: task.status,
      ...(task.priority ? { priority: task.priority } : {}),
      projectId: task.projectId,
      ...(project?.key ? { projectKey: project.key } : {}),
      ...(project?.title ? { projectTitle: project.title } : {}),
      ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
      reason: 'project_owner',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
  }

  for (const task of tasksAsAssignee) {
    if (dedupTasks.has(task.id)) {
      continue;
    }
    const project = await projectsRepository.findById(task.projectId);
    dedupTasks.set(task.id, {
      type: 'task',
      id: task.id,
      title: task.title,
      status: task.status,
      ...(task.priority ? { priority: task.priority } : {}),
      projectId: task.projectId,
      ...(project?.key ? { projectKey: project.key } : {}),
      ...(project?.title ? { projectTitle: project.title } : {}),
      ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
      reason: 'assignee',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
  }

  const projectItems: ProjectItem[] = projects.map((project) => {
    const tasksCount = allTasks.filter((task) => task.projectId === project.id).length;
    return {
      type: 'project',
      id: project.id,
      title: project.title,
      key: project.key,
      status: project.status,
      createdAt: project.createdAt,
      tasksCount
    };
  });

  const taskItems = Array.from(dedupTasks.values());

  let items: ItemsResponse['items'];
  if (filterType === 'project') {
    items = projectItems;
  } else if (filterType === 'task') {
    items = taskItems;
  } else {
    items = [...projectItems, ...taskItems];
  }

  const payload: ItemsResponse = {
    user: {
      id: userId,
      ...(user?.name ? { name: user.name } : {}),
      ...(user?.email ? { email: user.email } : {})
    },
    items,
    counts: {
      projects: projectItems.length,
      tasks: taskItems.length
    }
  };

  return NextResponse.json(payload);
}
