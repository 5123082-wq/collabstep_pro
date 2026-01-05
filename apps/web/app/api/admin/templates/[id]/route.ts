import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { templatesRepository, type UpdateTemplateInput } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

const UpdateTemplateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  kind: z.string().trim().min(1).max(50).optional(),
  summary: z.string().trim().max(500).optional(),
  projectType: z.enum(['product', 'marketing', 'operations', 'service', 'internal']).optional(),
  projectStage: z.enum(['discovery', 'design', 'build', 'launch', 'support']).optional(),
  projectVisibility: z.enum(['private', 'public']).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Не переданы поля для обновления'
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getDemoSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const parsed = UpdateTemplateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const updateInput: UpdateTemplateInput = {};
    if (parsed.data.title !== undefined) updateInput.title = parsed.data.title;
    if (parsed.data.kind !== undefined) updateInput.kind = parsed.data.kind;
    if (parsed.data.summary !== undefined) updateInput.summary = parsed.data.summary;
    if (parsed.data.projectType !== undefined) updateInput.projectType = parsed.data.projectType;
    if (parsed.data.projectStage !== undefined) updateInput.projectStage = parsed.data.projectStage;
    if (parsed.data.projectVisibility !== undefined) updateInput.projectVisibility = parsed.data.projectVisibility;
    
    const updated = templatesRepository.update(params.id, updateInput);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('[API /admin/templates/[id]] Ошибка при обновлении шаблона:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getDemoSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const deleted = templatesRepository.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/templates/[id]] Ошибка при удалении шаблона:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

