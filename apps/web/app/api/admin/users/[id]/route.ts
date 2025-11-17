import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminService } from '@collabverse/api';
import type { PlatformRole } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

const UserUpdateSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'invited']).optional(),
    roles: z
      .array(z.enum(['productAdmin', 'featureAdmin', 'supportAgent', 'financeAdmin', 'betaTester', 'viewer']))
      .max(16)
      .optional(),
    testerAccess: z.array(z.string().trim().min(1)).max(64).optional(),
    notes: z.string().trim().max(500).optional()
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

  const userData = adminService.getUser(params.id);
  if (!userData) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ item: userData });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = UserUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  // Filter out undefined values for exactOptionalPropertyTypes
  const cleanData: Parameters<typeof adminService.updateUser>[1] = {} as Parameters<typeof adminService.updateUser>[1];
  if (parsed.data.status !== undefined) {
    cleanData.status = parsed.data.status;
  }
  if (parsed.data.roles !== undefined) {
    const rolesArray: PlatformRole[] = parsed.data.roles as unknown as PlatformRole[];
    cleanData.roles = rolesArray;
  }
  if (parsed.data.testerAccess !== undefined) {
    cleanData.testerAccess = parsed.data.testerAccess;
  }
  if (parsed.data.notes !== undefined) {
    cleanData.notes = parsed.data.notes;
  }

  const updated = adminService.updateUser(params.id, cleanData, session.userId);
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Нельзя удалить самого себя
  if (params.id === session.userId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const deleted = adminService.deleteUser(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
