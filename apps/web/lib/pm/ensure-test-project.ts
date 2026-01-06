import {
  DEFAULT_WORKSPACE_USER_ID,
  memory,
  pmPgHydration,
  projectsRepository,
  tasksRepository
} from '@collabverse/api';

/**
 * Legacy cleanup hook: removes demo seed projects/tasks and stops auto-seeding.
 * We keep the existing name to avoid changing call sites, but it now only deletes
 * previously seeded demo data and never creates new content.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function ensureTestProject(_userId: string, _email: string): Promise<void> {
  try {
    await pmPgHydration;
  } catch (error) {
    console.error('[ensureTestProject] Failed to hydrate projects before cleanup', error);
  }

  const SEED_PROJECT_TITLES = ['Тестовый проект с задачами и тратами'];
  const SEED_TASK_TITLES = [
    'Проектирование архитектуры системы',
    'Разработка API для пользователей',
    'Создание дизайн-макетов',
    'Настройка CI/CD',
    'Интеграция с платежной системой'
  ];

  const projects = await projectsRepository.list();
  const seedProjects = projects.filter(
    (project) =>
      project.ownerId === DEFAULT_WORKSPACE_USER_ID &&
      SEED_PROJECT_TITLES.includes(project.title)
  );

  for (const project of seedProjects) {
    // Remove tasks for the seeded project
    const projectTasks = await tasksRepository.list({ projectId: project.id });
    for (const task of projectTasks) {
      tasksRepository.delete(task.id);
    }

    // Remove finance artifacts tied to the seeded project
    const expenseIdsToRemove = new Set(
      memory.EXPENSES.filter((expense) => expense.projectId === project.id).map(
        (expense) => expense.id
      )
    );

    memory.EXPENSES = memory.EXPENSES.filter((expense) => !expenseIdsToRemove.has(expense.id));
    memory.EXPENSE_ATTACHMENTS = memory.EXPENSE_ATTACHMENTS.filter(
      (attachment) => !expenseIdsToRemove.has(attachment.expenseId)
    );
    memory.PROJECT_BUDGETS = memory.PROJECT_BUDGETS.filter(
      (budget) => budget.projectId !== project.id
    );

    // Finally remove the project itself
    projectsRepository.delete(project.id);
    console.log('[ensureTestProject] Removed demo project:', project.id);
  }

  // Clean up any stray seeded tasks that might remain without the project
  const allTasks = await tasksRepository.list();
  const strayTasks = allTasks.filter((task) => SEED_TASK_TITLES.includes(task.title));

  for (const task of strayTasks) {
    tasksRepository.delete(task.id);
  }
}