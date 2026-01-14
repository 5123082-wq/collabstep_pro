import { NextResponse } from 'next/server';
import { projectsRepository, tasksRepository, memory } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';
type OwnerProjectStats = {
  id: string;
  key: string;
  title: string;
  status: string;
  tasksCount: number;
  createdAt: string;
};

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
  const allProjects = await projectsRepository.list();
  const allTasks = await tasksRepository.list();

  // Group projects by owner
  const projectsByOwner = new Map<string, { count: number; projects: OwnerProjectStats[] }>();
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

  // Find orphaned tasks (tasks without existing projects)
  const projectIds = new Set(allProjects.map(p => p.id));
  const orphanedTasks = allTasks.filter(task => !projectIds.has(task.projectId));
  
  // Group orphaned tasks by projectId to show which projectIds are missing
  const orphanedTasksByProjectId = new Map<string, Array<{ id: string; title: string; number: number }>>();
  for (const task of orphanedTasks) {
    if (!orphanedTasksByProjectId.has(task.projectId)) {
      orphanedTasksByProjectId.set(task.projectId, []);
    }
    orphanedTasksByProjectId.get(task.projectId)!.push({
      id: task.id,
      title: task.title,
      number: task.number
    });
  }

  // Find orphaned projects (projects without owner in workspace users)
  // This is less common, but we check for projects with invalid ownerIds
  const userIds = new Set(memory.WORKSPACE_USERS.map(u => u.id).concat(memory.WORKSPACE_USERS.map(u => u.email)));
  const orphanedProjects = allProjects.filter(project => !userIds.has(project.ownerId));

  return NextResponse.json({
    summary: {
      totalProjects: allProjects.length,
      totalTasks: allTasks.length,
      totalUsers: usersData.length,
      orphanedTasks: orphanedTasks.length,
      orphanedProjects: orphanedProjects.length,
    },
    users: usersData,
    orphaned: {
      tasks: {
        count: orphanedTasks.length,
        byProjectId: Array.from(orphanedTasksByProjectId.entries()).map(([projectId, tasks]) => ({
          projectId,
          tasksCount: tasks.length,
          tasks: tasks.slice(0, 10), // Show first 10 tasks per projectId
          hasMore: tasks.length > 10
        }))
      },
      projects: orphanedProjects.map(p => ({
        id: p.id,
        key: p.key,
        title: p.title,
        ownerId: p.ownerId,
        status: p.status,
        createdAt: p.createdAt
      }))
    }
  });
}
