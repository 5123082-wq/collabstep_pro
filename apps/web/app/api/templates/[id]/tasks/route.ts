import { NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { templateTasksRepository, templatesRepository, userTemplatesRepository } from '@collabverse/api';

export const dynamic = 'force-dynamic';

// GET /api/templates/[id]/tasks - Get template tasks (public for admin templates)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!flags.PROJECTS_V1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const templateId = params.id;
  const adminTemplate = templatesRepository.findById(templateId);

  if (!adminTemplate) {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const userTemplate = await userTemplatesRepository.findById(templateId, auth.userId);
    if (!userTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
  }

  try {
    const tasks = await templateTasksRepository.getTaskTree(templateId);
    return NextResponse.json({ items: tasks });
  } catch (error) {
    console.error('[API /templates/[id]/tasks] Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
