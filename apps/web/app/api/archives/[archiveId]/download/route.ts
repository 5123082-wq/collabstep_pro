import { NextRequest } from 'next/server';
import archiver from 'archiver';
import { getCurrentUser } from '@/lib/auth/session';
import {
  organizationArchivesRepository,
  archivedDocumentsRepository,
} from '@collabverse/api';
import { jsonError } from '@/lib/api/http';

/**
 * GET /api/archives/[archiveId]/download
 * Скачать все документы архива одним ZIP-файлом
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { archiveId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { archiveId } = params;

  try {
    // Найти архив
    const archive = await organizationArchivesRepository.findById(archiveId);
    if (!archive) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'Archive not found',
      });
    }

    // Проверить права доступа (только владелец может скачивать архив)
    if (archive.ownerId !== user.id) {
      return jsonError('FORBIDDEN', {
        status: 403,
        details: "You don't have access to this archive",
      });
    }

    // Проверить, что архив не истёк и не удалён
    const now = new Date();
    const expiresAt = new Date(archive.expiresAt);
    if (archive.status !== 'active' || expiresAt < now) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'Archive not found or expired',
      });
    }

    // Получить документы архива
    const documents = await archivedDocumentsRepository.findByArchive(archiveId);

    if (documents.length === 0) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'Archive has no documents to download',
      });
    }

    // Создать ZIP архив
    const archiveStream = archiver('zip', {
      zlib: { level: 9 }, // Максимальное сжатие
    });

    // Создать поток для ответа
    const stream = new ReadableStream({
      async start(controller) {
        // Обработка ошибок архива
        archiveStream.on('error', (err) => {
          console.error('[Archive Download] Archiver error:', err);
          controller.error(err);
        });

        // Когда архив завершён, закрываем stream
        archiveStream.on('end', () => {
          controller.close();
        });

        // Пайпим данные архива в response stream
        archiveStream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });

        // Добавляем файлы в архив
        for (const doc of documents) {
          try {
            // Скачиваем файл по URL
            const fileResponse = await fetch(doc.fileUrl);
            if (!fileResponse.ok) {
              console.warn(
                `[Archive Download] Failed to fetch file ${doc.fileId}: ${fileResponse.statusText}`
              );
              // Пропускаем файл, который не удалось скачать
              continue;
            }

            const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

            // Добавляем файл в архив с путём: projectName/filename
            const safeProjectName = doc.projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
            const safeFileName = doc.title.replace(/[^a-zA-Z0-9-_.]/g, '_');
            const archivePath = `${safeProjectName}/${safeFileName}`;

            archiveStream.append(fileBuffer, { name: archivePath });
          } catch (fileError) {
            console.error(
              `[Archive Download] Error processing file ${doc.fileId}:`,
              fileError
            );
            // Продолжаем обработку других файлов
          }
        }

        // Завершаем архив
        void archiveStream.finalize();
      },
    });

    // Настроить response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="archive-${archiveId}-documents.zip"`
    );

    return new Response(stream, { headers });
  } catch (error) {
    console.error('[Archive Download] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
