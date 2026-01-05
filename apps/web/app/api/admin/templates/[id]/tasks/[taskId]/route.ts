import { NextRequest, NextResponse } from 'next/server';
import { templateTasksRepository, templatesRepository, TemplateTaskValidationError, type ProjectTemplateTask } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { updateTemplateTaskSchema } from '@/lib/schemas/template-tasks';

export const dynamic = 'force-dynamic';

// PUT /api/admin/templates/[id]/tasks/[taskId] - Update a task
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    // Verify template exists
    const template = templatesRepository.findById(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Verify task exists and belongs to template
    const existingTask = await templateTasksRepository.findById(params.taskId);
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (existingTask.templateId !== params.id) {
      return NextResponse.json({ error: 'Task does not belong to this template' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = updateTemplateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Remove undefined values to satisfy exactOptionalPropertyTypes
    const patch: Partial<ProjectTemplateTask> = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined)
    ) as Partial<ProjectTemplateTask>;

    const updated = await templateTasksRepository.update(params.taskId, patch);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('[AdminTemplateTasks] Error updating task:', error);
    if (error instanceof TemplateTaskValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id]/tasks/[taskId] - Delete a task
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    // Verify template exists
    const template = templatesRepository.findById(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Verify task exists and belongs to template
    const existingTask = await templateTasksRepository.findById(params.taskId);
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (existingTask.templateId !== params.id) {
      return NextResponse.json({ error: 'Task does not belong to this template' }, { status: 400 });
    }

    const deleted = await templateTasksRepository.delete(params.taskId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminTemplateTasks] Error deleting task:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
