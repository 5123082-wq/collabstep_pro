import { NextRequest, NextResponse } from 'next/server';
import { projectsRepository, tasksRepository, memory } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/data/cleanup-orphaned
 * Deletes orphaned tasks and/or projects
 * Body: { tasks?: boolean, projects?: boolean, projectId?: string }
 * - If tasks=true: delete all orphaned tasks
 * - If projects=true: delete all orphaned projects
 * - If projectId provided: delete only tasks with that projectId
 */
export async function POST(req: NextRequest) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { tasks?: boolean; projects?: boolean; projectId?: string } = {};
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const allProjects = await projectsRepository.list();
  const allTasks = await tasksRepository.list();
  const projectIds = new Set(allProjects.map(p => p.id));
  const userIds = new Set(memory.WORKSPACE_USERS.map(u => u.id).concat(memory.WORKSPACE_USERS.map(u => u.email)));

  let deletedTasks = 0;
  let deletedProjects = 0;
  const deletedTaskIds = new Set<string>();

  // Delete orphaned tasks
  if (body.tasks) {
    let tasksToDelete: typeof allTasks;
    
    if (body.projectId) {
      // Delete tasks with specific projectId
      tasksToDelete = allTasks.filter(task => task.projectId === body.projectId);
    } else {
      // Delete all orphaned tasks (tasks without existing projects)
      tasksToDelete = allTasks.filter(task => !projectIds.has(task.projectId));
    }

    for (const task of tasksToDelete) {
      const deleted = tasksRepository.delete(task.id);
      if (deleted) {
        deletedTasks++;
        deletedTaskIds.add(task.id);
      }
    }

    // Clean up task dependencies
    memory.TASK_DEPENDENCIES = memory.TASK_DEPENDENCIES.filter(
      dep => !deletedTaskIds.has(dep.dependentTaskId) && !deletedTaskIds.has(dep.blockerTaskId)
    );

    // Clean up task comments
    memory.TASK_COMMENTS = memory.TASK_COMMENTS.filter(
      comment => !deletedTaskIds.has(comment.taskId)
    );

    // Clean up notifications related to deleted tasks
    memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter(
      n => !n.taskId || !deletedTaskIds.has(n.taskId)
    );
  }

  // Delete orphaned projects (projects without valid owner)
  if (body.projects) {
    const orphanedProjects = allProjects.filter(project => !userIds.has(project.ownerId));
    
    for (const project of orphanedProjects) {
      // Get tasks for this project before deleting
      const projectTasks = await tasksRepository.list({ projectId: project.id });
      projectTasks.forEach(t => deletedTaskIds.add(t.id));
      
      const deleted = projectsRepository.delete(project.id);
      if (deleted) {
        deletedProjects++;
      }
    }

    // Clean up related data for deleted projects
    const deletedProjectIds = orphanedProjects.map(p => p.id);
    
    if (deletedProjectIds.length > 0) {
      // Clean up project members
      for (const projectId of deletedProjectIds) {
        delete memory.PROJECT_MEMBERS[projectId];
      }

      // Clean up expenses
      memory.EXPENSES = memory.EXPENSES.filter(
        exp => !deletedProjectIds.includes(exp.projectId)
      );

      // Clean up expense attachments
      const remainingExpenseIds = new Set(memory.EXPENSES.map(e => e.id));
      memory.EXPENSE_ATTACHMENTS = memory.EXPENSE_ATTACHMENTS.filter(
        att => remainingExpenseIds.has(att.expenseId)
      );

      // Clean up project budgets
      memory.PROJECT_BUDGETS = memory.PROJECT_BUDGETS.filter(
        budget => !deletedProjectIds.includes(budget.projectId)
      );

      // Clean up notifications related to deleted projects
      memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter(
        n => !n.projectId || !deletedProjectIds.includes(n.projectId)
      );

      // Clean up chat messages
      memory.PROJECT_CHAT_MESSAGES = memory.PROJECT_CHAT_MESSAGES.filter(
        msg => !deletedProjectIds.includes(msg.projectId)
      );
    }
  }

  return NextResponse.json({
    success: true,
    deleted: {
      tasks: deletedTasks,
      projects: deletedProjects,
    },
    scope: body.projectId ? `projectId:${body.projectId}` : body.tasks && body.projects ? 'all' : body.tasks ? 'tasks' : 'projects',
  });
}
