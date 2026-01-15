import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';
import { files, vacancyAttachments } from '@collabverse/api/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { organizationsRepository, vacanciesRepository } from '@collabverse/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  void _request;
  try {
    const vacancy = await vacanciesRepository.findById(params.id);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    if (vacancy.status !== 'published') {
      const user = await getCurrentUser();
      if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
      }

      const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
      if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
        return jsonError('FORBIDDEN', { status: 403 });
      }
    }

    const rows = await db
      .select({ attachment: vacancyAttachments, file: files })
      .from(vacancyAttachments)
      .innerJoin(files, eq(vacancyAttachments.fileId, files.id))
      .where(eq(vacancyAttachments.vacancyId, vacancy.id))
      .orderBy(desc(vacancyAttachments.createdAt));

    const attachments = rows.map((row) => ({
      id: row.attachment.id,
      fileId: row.file.id,
      filename: row.file.filename,
      url: row.file.storageUrl,
      sizeBytes: Number(row.file.sizeBytes),
      uploadedAt: row.attachment.createdAt?.toISOString() ?? new Date().toISOString()
    }));

    return jsonOk({ attachments });
  } catch (error) {
    console.error('[Vacancy Attachments] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
