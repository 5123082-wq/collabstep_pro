import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminService } from '@collabverse/api';
import type { PlatformRole } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';

export const dynamic = 'force-dynamic';

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
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userData = await adminService.getUser(params.id);
  if (!userData) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ item: userData });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  console.log('[API /admin/users/[id] PATCH] Request body:', JSON.stringify(body, null, 2));
  console.log('[API /admin/users/[id] PATCH] User ID:', params.id);
  console.log('[API /admin/users/[id] PATCH] Actor ID:', session.userId);

  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[API /admin/users/[id] PATCH] Validation error:', parsed.error.flatten());
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
    console.log('[API /admin/users/[id] PATCH] Roles to update:', rolesArray);
  }
  if (parsed.data.testerAccess !== undefined) {
    cleanData.testerAccess = parsed.data.testerAccess;
  }
  if (parsed.data.notes !== undefined) {
    cleanData.notes = parsed.data.notes;
  }

  console.log('[API /admin/users/[id] PATCH] Clean data to send:', cleanData);
  const updated = await adminService.updateUser(params.id, cleanData, session.userId);
  console.log('[API /admin/users/[id] PATCH] Updated user:', JSON.stringify({ userId: updated.userId, roles: updated.roles }, null, 2));
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  
  const session = getDemoSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Нельзя удалить самого себя
  if (params.id === session.userId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const deleted = await adminService.deleteUser(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
