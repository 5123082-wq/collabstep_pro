import { NextResponse } from 'next/server';
import { projectsRepository, tasksRepository, memory } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/data/stats
 * Returns statistics about projects and tasks by user
 */
export async function GET() {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Get all projects and tasks
  const allProjects = projectsRepository.list();
  const allTasks = tasksRepository.list();

  // Group projects by owner
  const projectsByOwner = new Map<string, { count: number; projects: any[] }>();
  const tasksByProject = new Map<string, number>();

  // Count tasks per project
  for (const task of allTasks) {
    const count = tasksByProject.get(task.projectId) || 0;
    tasksByProject.set(task.projectId, count + 1);
  }

  // Group projects by owner
  for (const project of allProjects) {
    const owner = project.ownerId;
    if (!projectsByOwner.has(owner)) {
      projectsByOwner.set(owner, { count: 0, projects: [] });
    }
    const ownerData = projectsByOwner.get(owner)!;
    ownerData.count++;
    ownerData.projects.push({
      id: project.id,
      key: project.key,
      title: project.title,
      status: project.status,
      tasksCount: tasksByProject.get(project.id) || 0,
      createdAt: project.createdAt,
    });
  }

  // Get user information
  const usersData = Array.from(projectsByOwner.entries()).map(([userId, data]) => {
    const user = memory.WORKSPACE_USERS.find(u => u.id === userId || u.email === userId);
    const totalTasks = data.projects.reduce((sum, p) => sum + p.tasksCount, 0);
    
    return {
      userId,
      userName: user?.name || userId,
      userEmail: user?.email || userId,
      projectsCount: data.count,
      tasksCount: totalTasks,
      projects: data.projects,
    };
  });

  // Sort by projects count (descending)
  usersData.sort((a, b) => b.projectsCount - a.projectsCount);

  return NextResponse.json({
    summary: {
      totalProjects: allProjects.length,
      totalTasks: allTasks.length,
      totalUsers: usersData.length,
    },
    users: usersData,
  });
}

