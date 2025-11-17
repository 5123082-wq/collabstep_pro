import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminService } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

const ModuleUpdateSchema = z
  .object({
    status: z.enum(['enabled', 'disabled']).optional(),
    defaultAudience: z.enum(['everyone', 'admins', 'beta']).optional(),
    label: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().max(400).optional(),
    path: z.string().trim().max(200).optional(),
    tags: z.array(z.string().trim().min(1)).max(16).optional(),
    testers: z.array(z.string().trim().min(1)).max(64).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Не переданы поля для обновления'
  });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const moduleData = adminService.getModuleById(params.id);
  if (!moduleData) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ item: moduleData });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = ModuleUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  // Filter out undefined values for exactOptionalPropertyTypes
  const cleanData: Parameters<typeof adminService.updateModule>[1] = {} as Parameters<typeof adminService.updateModule>[1];
  if (parsed.data.status !== undefined) {
    cleanData.status = parsed.data.status;
  }
  if (parsed.data.defaultAudience !== undefined) {
    cleanData.defaultAudience = parsed.data.defaultAudience;
  }
  if (parsed.data.label !== undefined) {
    cleanData.label = parsed.data.label;
  }
  if (parsed.data.summary !== undefined) {
    cleanData.summary = parsed.data.summary;
  }
  if (parsed.data.path !== undefined) {
    cleanData.path = parsed.data.path;
  }
  if (parsed.data.tags !== undefined) {
    cleanData.tags = parsed.data.tags;
  }
  if (parsed.data.testers !== undefined) {
    cleanData.testers = parsed.data.testers;
  }

  const updated = adminService.updateModule(params.id, cleanData, session.userId);
  if (!updated) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

