import { NextRequest, NextResponse } from 'next/server';
import { templateTasksRepository, templatesRepository, TemplateTaskValidationError } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { createTemplateTaskSchema, reorderTasksSchema } from '@/lib/schemas/template-tasks';

export const dynamic = 'force-dynamic';

// GET /api/admin/templates/[id]/tasks - Get all tasks for a template
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

    // Get tasks as tree
    const tasks = await templateTasksRepository.getTaskTree(params.id);

    return NextResponse.json({ items: tasks });
  } catch (error) {
    console.error('[AdminTemplateTasks] Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/templates/[id]/tasks - Create a new task
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await req.json().catch(() => ({}));
    const parsed = createTemplateTaskSchema.safeParse({ ...body, templateId: params.id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Remove undefined values to satisfy exactOptionalPropertyTypes
    const input = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined)
    );
    // @ts-expect-error - TypeScript can't infer that filtered object matches CreateTemplateTaskInput
    // but we know it's valid because Zod schema validates the input
    const task = await templateTasksRepository.create(input);

    return NextResponse.json({ item: task }, { status: 201 });
  } catch (error) {
    console.error('[AdminTemplateTasks] Error creating task:', error);
    if (error instanceof TemplateTaskValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/templates/[id]/tasks - Reorder tasks
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await req.json().catch(() => ({}));
    const parsed = reorderTasksSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await templateTasksRepository.reorderTasks(params.id, parsed.data.taskIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminTemplateTasks] Error reordering tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to reorder tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
