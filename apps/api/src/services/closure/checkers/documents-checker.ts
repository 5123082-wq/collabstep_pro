import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ArchivableData,
} from '../types';
import { dbProjectsRepository } from '../../../repositories/db-projects-repository';
import { documentsRepository } from '../../../repositories/documents-repository';
import { archivedDocumentsRepository } from '../../../repositories/archived-documents-repository';
import { organizationArchivesRepository } from '../../../repositories/organization-archives-repository';
import { filesRepository } from '../../../repositories/files-repository';

/**
 * Checker для модуля документов
 * Архивирует все документы организации при закрытии
 */
export class DocumentsClosureChecker implements OrganizationClosureChecker {
  moduleId = 'documents';
  moduleName = 'Документы';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const archivableData: ArchivableData[] = [];

    // Найти все проекты организации
    const projects = await dbProjectsRepository.findByOrganization(
      organizationId
    );

    // Для каждого проекта найти документы
    for (const project of projects) {
      const docs = documentsRepository.listByProject(project.id);

      for (const doc of docs) {
        // Получить последнюю версию документа (самая новая версия)
        const latestVersion = doc.versions.length > 0
          ? doc.versions[doc.versions.length - 1]
          : null;

        if (latestVersion && latestVersion.file) {
          archivableData.push({
            moduleId: this.moduleId,
            type: 'document',
            id: doc.id,
            title: doc.title,
            sizeBytes: latestVersion.file.sizeBytes,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              documentType: doc.type,
              version: latestVersion.version,
            },
          });
        } else if (latestVersion) {
          // Если есть версия, но нет файла, всё равно архивируем
          archivableData.push({
            moduleId: this.moduleId,
            type: 'document',
            id: doc.id,
            title: doc.title,
            sizeBytes: 0,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              documentType: doc.type,
              version: latestVersion.version,
            },
          });
        }
      }
    }

    // Документы не блокируют закрытие
    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers: [],
      archivableData,
    };
  }

  async archive(
    organizationId: string,
    archiveId: string
  ): Promise<void> {
    // Получить архив для вычисления expiresAt
    const archive = await organizationArchivesRepository.findById(archiveId);
    if (!archive) {
      throw new Error(`Archive not found: ${archiveId}`);
    }

    const projects = await dbProjectsRepository.findByOrganization(
      organizationId
    );

    for (const project of projects) {
      const docs = documentsRepository.listByProject(project.id);

      for (const doc of docs) {
        // Получить последнюю версию документа
        const latestVersion = doc.versions.length > 0
          ? doc.versions[doc.versions.length - 1]
          : null;

        if (!latestVersion) {
          // Пропускаем документы без версий
          continue;
        }

        // Получить файл из версии
        const file = latestVersion.file || filesRepository.findById(latestVersion.fileId);

        if (!file) {
          // Если файл не найден, создаём запись без файла
          await archivedDocumentsRepository.create({
            archiveId,
            originalDocumentId: doc.id,
            originalProjectId: project.id,
            projectName: project.name,
            title: doc.title,
            ...(doc.type ? { type: doc.type } : {}),
            fileId: latestVersion.fileId,
            fileUrl: '',
            fileSizeBytes: 0,
            expiresAt: archive.expiresAt,
            metadata: {
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
              version: latestVersion.version,
            },
          });
          continue;
        }

        // Создать запись в архиве
        await archivedDocumentsRepository.create({
          archiveId,
          originalDocumentId: doc.id,
          originalProjectId: project.id,
          projectName: project.name,
          title: doc.title,
          ...(doc.type ? { type: doc.type } : {}),
          fileId: file.id,
          fileUrl: file.storageUrl,
          fileSizeBytes: file.sizeBytes,
          expiresAt: archive.expiresAt,
          metadata: {
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            version: latestVersion.version,
            filename: file.filename,
            mimeType: file.mimeType,
          },
        });
      }
    }
  }

  async deleteArchived(archiveId: string): Promise<void> {
    // Получить все документы архива
    // В будущем здесь нужно будет удалить файлы из storage перед удалением записей
    // const archivedDocs = await archivedDocumentsRepository.findByArchive(archiveId);
    // for (const doc of archivedDocs) {
    //   await storageService.deleteFile(doc.fileId);
    // }

    // Удалить записи из БД
    // В текущей реализации файлы хранятся в memory, поэтому они удаляются автоматически
    await archivedDocumentsRepository.deleteByArchive(archiveId);
  }
}






