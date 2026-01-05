import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { templatesRepository, type CreateTemplateInput } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

const CreateTemplateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  kind: z.string().trim().min(1).max(50),
  summary: z.string().trim().max(500).optional(),
  projectType: z.enum(['product', 'marketing', 'operations', 'service', 'internal']).optional(),
  projectStage: z.enum(['discovery', 'design', 'build', 'launch', 'support']).optional(),
  projectVisibility: z.enum(['private', 'public']).optional()
});

export async function GET() {
  try {
    const session = getDemoSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const templates = templatesRepository.list();
    return NextResponse.json({ items: templates });
  } catch (error) {
    console.error('[API /admin/templates] Ошибка при получении шаблонов:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getDemoSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const parsed = CreateTemplateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const createInput: CreateTemplateInput = {
      title: parsed.data.title,
      kind: parsed.data.kind,
      summary: parsed.data.summary ?? ''
    };
    if (parsed.data.projectType !== undefined) {
      createInput.projectType = parsed.data.projectType;
    }
    if (parsed.data.projectStage !== undefined) {
      createInput.projectStage = parsed.data.projectStage;
    }
    if (parsed.data.projectVisibility !== undefined) {
      createInput.projectVisibility = parsed.data.projectVisibility;
    }
    
    const template = templatesRepository.create(createInput);
    return NextResponse.json({ item: template }, { status: 201 });
  } catch (error) {
    console.error('[API /admin/templates] Ошибка при создании шаблона:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

