import { NextRequest, NextResponse } from 'next/server';
import { projectsRepository, tasksRepository, memory } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/data/clear
 * Deletes all projects and tasks from memory
 * Body: { confirm: true, userId?: string } - if userId provided, delete only that user's data
 */
export async function POST(req: NextRequest) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { confirm?: boolean; userId?: string } = {};
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.confirm !== true) {
    return NextResponse.json({ error: 'confirmation_required' }, { status: 400 });
  }

  const beforeStats = {
    projects: projectsRepository.list().length,
    tasks: tasksRepository.list().length,
  };

  let deletedProjects = 0;
  let deletedTasks = 0;

  // If userId is provided, delete only that user's data
  if (body.userId) {
    const userProjects = projectsRepository.list().filter(p => p.ownerId === body.userId);
    const projectIds = userProjects.map(p => p.id);

    // Get all task IDs BEFORE deleting projects
    const deletedTaskIds = new Set<string>();
    for (const project of userProjects) {
      const projectTasks = tasksRepository.list({ projectId: project.id });
      deletedTasks += projectTasks.length;
      projectTasks.forEach(t => deletedTaskIds.add(t.id));
    }

    // Now delete projects (will cascade delete tasks)
    for (const project of userProjects) {
      const deleted = projectsRepository.delete(project.id);
      if (deleted) {
        deletedProjects++;
      }
    }

    // Clean up related data for deleted projects
    if (projectIds.length > 0) {

      // Clean up task dependencies
      memory.TASK_DEPENDENCIES = memory.TASK_DEPENDENCIES.filter(
        dep => !deletedTaskIds.has(dep.dependentTaskId) && !deletedTaskIds.has(dep.blockerTaskId)
      );

      // Clean up project members
      for (const projectId of projectIds) {
        delete memory.PROJECT_MEMBERS[projectId];
      }

      // Clean up expenses
      memory.EXPENSES = memory.EXPENSES.filter(
        exp => !projectIds.includes(exp.projectId)
      );

      // Clean up expense attachments
      const remainingExpenseIds = new Set(memory.EXPENSES.map(e => e.id));
      memory.EXPENSE_ATTACHMENTS = memory.EXPENSE_ATTACHMENTS.filter(
        att => remainingExpenseIds.has(att.expenseId)
      );

      // Clean up project budgets
      memory.PROJECT_BUDGETS = memory.PROJECT_BUDGETS.filter(
        budget => !projectIds.includes(budget.projectId)
      );

      // Clean up notifications related to deleted projects
      memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter(
        n => !n.projectId || !projectIds.includes(n.projectId)
      );

      // Clean up chat messages
      memory.PROJECT_CHAT_MESSAGES = memory.PROJECT_CHAT_MESSAGES.filter(
        msg => !projectIds.includes(msg.projectId)
      );
    }
  } else {
    // Delete all projects and tasks
    const allProjects = projectsRepository.list();

    for (const project of allProjects) {
      // Count tasks for this project
      const projectTasks = tasksRepository.list({ projectId: project.id });
      deletedTasks += projectTasks.length;

      // Delete project (will cascade delete tasks)
      const deleted = projectsRepository.delete(project.id);
      if (deleted) {
        deletedProjects++;
      }
    }

    // Clean up any orphaned tasks (shouldn't happen, but just in case)
    const remainingTasks = tasksRepository.list();
    for (const task of remainingTasks) {
      tasksRepository.delete(task.id);
      deletedTasks++;
    }

    // Clean up related data
    memory.TASK_DEPENDENCIES = [];
    memory.PROJECT_MEMBERS = {};
    memory.EXPENSES = [];
    memory.EXPENSE_ATTACHMENTS = [];
    memory.PROJECT_BUDGETS = [];
    memory.NOTIFICATIONS = memory.NOTIFICATIONS.filter(n => n.type !== 'task_assigned');
    memory.PROJECT_CHAT_MESSAGES = [];
  }

  const afterStats = {
    projects: projectsRepository.list().length,
    tasks: tasksRepository.list().length,
  };

  return NextResponse.json({
    success: true,
    deleted: {
      projects: deletedProjects,
      tasks: deletedTasks,
    },
    before: beforeStats,
    after: afterStats,
    scope: body.userId ? `user:${body.userId}` : 'all',
  });
}

