import type {
  Organization,
  OrganizationClosurePreview,
  OrganizationClosureResult,
  OrganizationStatus,
} from '../../types';
import { organizationsRepository } from '../../repositories/organizations-repository';
import { organizationArchivesRepository } from '../../repositories/organization-archives-repository';
import { closureCheckerRegistry } from './index';
import { deletionService } from '../deletion-service';
import { dbProjectsRepository } from '../../repositories/db-projects-repository';
import { tasksRepository } from '../../repositories/tasks-repository';
import { documentsRepository } from '../../repositories/documents-repository';
import { invitationsRepository } from '../../repositories/invitations-repository';
import { getFinanceService } from '../finance-service';
import type { ExpenseFilters } from '../../repositories/expense-store';

/**
 * Сервис для управления закрытием организации
 * Координирует проверки блокеров, архивацию данных и удаление организации
 */
export class OrganizationClosureService {
  /**
   * Получить preview закрытия организации
   * Проверяет права, запускает все checkers, собирает блокеры и данные для архивации
   */
  async getClosurePreview(
    organizationId: string,
    userId: string
  ): Promise<OrganizationClosurePreview> {
    // 1. Проверить права (только owner)
    const organization = await organizationsRepository.findById(organizationId);
    if (!organization) {
      throw new Error(`Organization with id '${organizationId}' not found`);
    }

    if (organization.ownerId !== userId) {
      throw new Error('Only organization owner can close organization');
    }

    // Проверить, что организация не уже закрыта
    if (organization.status === 'archived' || organization.status === 'deleted') {
      throw new Error('Organization is already closed');
    }

    // 2. Запустить все checkers
    const checkResults = await closureCheckerRegistry.runAllChecks(organizationId);

    // 3. Собрать блокеры и данные для архивации
    const blockers: Array<{
      moduleId: string;
      type: 'financial' | 'data';
      severity: 'blocking' | 'warning' | 'info';
      id: string;
      title: string;
      description: string;
      actionRequired?: string;
      actionUrl?: string;
    }> = [];
    const warnings: typeof blockers = [];
    const archivableData: Array<{
      moduleId: string;
      type: string;
      id: string;
      title: string;
      sizeBytes?: number;
      metadata?: Record<string, unknown>;
    }> = [];

    for (const result of checkResults) {
      // Разделяем блокеры по severity
      for (const blocker of result.blockers) {
        if (blocker.severity === 'blocking') {
          blockers.push(blocker);
        } else {
          warnings.push(blocker);
        }
      }
      // Собираем данные для архивации
      archivableData.push(...result.archivableData);
    }

    // 4. Подсчитать impact
    const impact = await this.calculateImpact(organizationId);

    // 5. Вернуть preview
    return {
      canClose: blockers.length === 0,
      blockers,
      warnings,
      archivableData,
      impact,
    };
  }

  /**
   * Инициировать закрытие организации
   * Архивирует данные и удаляет организацию
   */
  async initiateClosing(
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<OrganizationClosureResult> {
    // 1. Проверить права
    const organization = await organizationsRepository.findById(organizationId);
    if (!organization) {
      throw new Error(`Organization with id '${organizationId}' not found`);
    }

    if (organization.ownerId !== userId) {
      throw new Error('Only organization owner can close organization');
    }

    // Проверить, что организация не уже закрыта
    if (organization.status === 'archived' || organization.status === 'deleted') {
      throw new Error('Organization is already closed');
    }

    // 2. Проверить что нет блокеров
    const preview = await this.getClosurePreview(organizationId, userId);
    if (!preview.canClose) {
      throw new Error(
        `Organization cannot be closed due to active blockers: ${preview.blockers.map((b) => b.title).join(', ')}`
      );
    }

    // 3. Создать OrganizationArchive
    const impact = await this.calculateImpact(organizationId);
    const archive = await organizationArchivesRepository.create({
      organizationId,
      organizationName: organization.name,
      ownerId: organization.ownerId,
      retentionDays: 30,
      snapshot: {
        membersCount: impact.members,
        projectsCount: impact.projects,
        documentsCount: impact.documents,
        totalStorageBytes: preview.archivableData.reduce(
          (sum, item) => sum + (item.sizeBytes ?? 0),
          0
        ),
      },
    });

    // 4. Архивировать данные через все checkers
    await closureCheckerRegistry.archiveAll(organizationId, archive.id);

    // 5. Удалить проекты, задачи, участников
    const deletionStats = await this.deleteOrganizationData(organizationId);

    // 6. Установить org.status = 'archived'
    const closedAt = new Date();
    const updateData: Partial<Organization> = {
      status: 'archived' as OrganizationStatus,
      closedAt,
    };
    if (reason) {
      updateData.closureReason = reason;
    }
    await organizationsRepository.update(organizationId, updateData);

    // 7. Отправить уведомления (TODO: будет реализовано в будущем)
    // await notificationService.send(...)

    return {
      success: true,
      organizationId,
      archiveId: archive.id,
      closedAt: closedAt.toISOString(),
      deleted: {
        projects: deletionStats.projects,
        tasks: deletionStats.tasks,
        members: deletionStats.members,
        invites: deletionStats.invites,
        documents: deletionStats.documents,
      },
    };
  }

  /**
   * Принудительное удаление пустой организации
   * Только если нет блокеров и нет данных для архивации
   */
  async forceClose(
    organizationId: string,
    userId: string
  ): Promise<OrganizationClosureResult> {
    const preview = await this.getClosurePreview(organizationId, userId);

    // Проверяем что нет блокеров и нет данных для архивации
    if (preview.blockers.length > 0) {
      throw new Error('Cannot force close: organization has blockers');
    }

    if (preview.archivableData.length > 0) {
      throw new Error('Cannot force close: organization has data to archive');
    }

    // Если всё пусто, можно удалить без архива
    const deletionStats = await this.deleteOrganizationData(organizationId);

    const closedAt = new Date();
    await organizationsRepository.update(organizationId, {
      status: 'deleted' as OrganizationStatus,
      closedAt,
    });

    return {
      success: true,
      organizationId,
      archiveId: '', // Нет архива для force close
      closedAt: closedAt.toISOString(),
      deleted: {
        projects: deletionStats.projects,
        tasks: deletionStats.tasks,
        members: deletionStats.members,
        invites: deletionStats.invites,
        documents: deletionStats.documents,
      },
    };
  }

  /**
   * Подсчитать impact закрытия организации
   */
  private async calculateImpact(organizationId: string): Promise<{
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
    expenses: number;
  }> {
    // Подсчитать проекты
    const projects = await dbProjectsRepository.findByOrganization(organizationId);
    const projectIds = projects.map((p) => p.id);

    // Подсчитать задачи
    let tasksCount = 0;
    for (const projectId of projectIds) {
      const projectTasks = await tasksRepository.list({ projectId });
      tasksCount += projectTasks.length;
    }

    // Подсчитать участников
    const members = await organizationsRepository.listMembers(organizationId);
    const membersCount = members.length;

    // Подсчитать приглашения
    const orgInvites = await invitationsRepository.listPendingOrganizationInvites(
      organizationId
    );
    const invitesCount = orgInvites.length;

    // Подсчитать документы
    let documentsCount = 0;
    for (const projectId of projectIds) {
      const projectDocuments = documentsRepository.listByProject(projectId);
      documentsCount += projectDocuments.length;
    }

    // Подсчитать расходы
    let expensesCount = 0;
    if (projectIds.length > 0) {
      const financeService = getFinanceService();
      for (const projectId of projectIds) {
        const filters: ExpenseFilters = { projectId };
        const { items } = await financeService.listExpenses(filters);
        expensesCount += items.length;
      }
    }

    return {
      projects: projects.length,
      tasks: tasksCount,
      members: membersCount,
      invites: invitesCount,
      documents: documentsCount,
      expenses: expensesCount,
    };
  }

  /**
   * Удалить данные организации: проекты, задачи, участников, приглашения
   */
  private async deleteOrganizationData(organizationId: string): Promise<{
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
  }> {
    // Найти все проекты организации
    const projects = await dbProjectsRepository.findByOrganization(organizationId);
    const projectIds = projects.map((p) => p.id);

    // Подсчитать задачи и документы перед удалением
    let tasksCount = 0;
    let documentsCount = 0;
    for (const projectId of projectIds) {
      const projectTasks = await tasksRepository.list({ projectId });
      tasksCount += projectTasks.length;

      const projectDocuments = documentsRepository.listByProject(projectId);
      documentsCount += projectDocuments.length;
    }

    // Удалить проекты через DeletionService (каскадно удалит задачи и связанные данные)
    for (const projectId of projectIds) {
      await deletionService.deleteProject(projectId);
    }

    // Удалить участников организации
    const members = await organizationsRepository.listMembers(organizationId);
    const membersCount = members.length;
    for (const member of members) {
      await organizationsRepository.removeMember(organizationId, member.id);
    }

    // Удалить приглашения организации
    const orgInvites = await invitationsRepository.listPendingOrganizationInvites(
      organizationId
    );
    const invitesCount = orgInvites.length;
    // TODO: Добавить метод для удаления приглашений, если нужно
    // Пока приглашения удалятся каскадно через FK при удалении организации

    return {
      projects: projects.length,
      tasks: tasksCount,
      members: membersCount,
      invites: invitesCount,
      documents: documentsCount,
    };
  }
}

export const organizationClosureService = new OrganizationClosureService();
