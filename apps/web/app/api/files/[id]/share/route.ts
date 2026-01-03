import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { sharesRepository } from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { files } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const CreateShareSchema = z.object({
  scope: z.enum(['view', 'download']),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/files/[id]/share
 * Create a share link for a file
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Check authentication
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    // Validate input
    const body = await req.json().catch(() => null);
    const parsed = CreateShareSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { scope, expiresAt } = parsed.data;
    const fileId = params.id;

    // Check if file exists
    const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    if (!file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    // TODO: Check file access permissions (user must have access to the file)
    // For now, we allow any authenticated user to create share links

    // Generate secure token
    const token = crypto.randomUUID().replace(/-/g, '');

    // Parse expiresAt if provided
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    // Create share
    const share = await sharesRepository.create({
      fileId,
      token,
      scope,
      expiresAt: expiresAtDate,
      createdBy: auth.userId,
    });

    return jsonOk({
      share: {
        id: share.id,
        token: share.token,
        scope: share.scope,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        createdAt: share.createdAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

