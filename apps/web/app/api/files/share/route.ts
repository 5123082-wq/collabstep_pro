import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@collabverse/api/db/config';
import { shares, files } from '@collabverse/api/db/schema';
import { organizationsRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const CreateShareSchema = z.object({
  fileId: z.string(),
  scope: z.enum(['view', 'download']).default('view'),
  expiresInHours: z.number().nullable().optional(),
});

function generateShareToken(): string {
  // Generate a secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return jsonError('FILE_ID_REQUIRED', { status: 400 });
    }

    // Get file to check access
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    // Check organization membership
    const member = await organizationsRepository.findMember(file.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get shares for this file
    const shareList = await db
      .select()
      .from(shares)
      .where(eq(shares.fileId, fileId));

    const formattedShares = shareList.map((share) => ({
      id: share.id,
      fileId: share.fileId,
      token: share.token,
      scope: share.scope,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdBy: share.createdBy,
      createdAt: share.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return jsonOk({ shares: formattedShares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateShareSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { fileId, scope, expiresInHours } = parsed.data;

    // Get file to check access
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    // Check organization membership
    const member = await organizationsRepository.findMember(file.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Calculate expiry
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

    // Generate token
    const token = generateShareToken();

    // Create share
    const [created] = await db
      .insert(shares)
      .values({
        fileId,
        token,
        scope,
        expiresAt,
        createdBy: auth.userId,
      })
      .returning();

    if (!created) {
      return jsonError('FAILED_TO_CREATE_SHARE', { status: 500 });
    }

    return jsonOk({
      share: {
        id: created.id,
        fileId: created.fileId,
        token: created.token,
        scope: created.scope,
        expiresAt: created.expiresAt?.toISOString() ?? null,
        createdBy: created.createdBy,
        createdAt: created.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating share:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

