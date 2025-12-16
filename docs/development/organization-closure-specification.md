# Техническая спецификация: Закрытие организации

> **Версия**: 1.0  
> **Дата**: 2025-01-15  
> **Статус**: Требует реализации

> ⚠️ **Важно**: Этот документ является частью комплекта документации.  
> Для начала разработки используйте **[План реализации](./organization-closure-implementation-plan.md)** как основной документ.

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Схема базы данных](#схема-базы-данных)
3. [Типы и интерфейсы](#типы-и-интерфейсы)
4. [Сервисы](#сервисы)
5. [Репозитории](#репозитории)
6. [API эндпоинты](#api-эндпоинты)
7. [Cron Jobs](#cron-jobs)

---

## Обзор архитектуры

### Компоненты системы

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Web)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  OrganizationSettingsClient                      │  │
│  │  └─ DangerZoneTab                                │  │
│  │     └─ ClosurePreviewModal                       │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼──────────────────────────────────┐
│                    API Routes                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /api/organizations/[orgId]/closure/preview     │  │
│  │  /api/organizations/[orgId]/closure/initiate    │  │
│  │  DELETE /api/organizations/[orgId]              │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│              OrganizationClosureService                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  getClosurePreview()                             │  │
│  │  initiateClosing()                               │  │
│  │  forceClose()                                    │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│            ClosureCheckerRegistry                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  register(checker)                                │  │
│  │  runAllChecks(orgId)                              │  │
│  │  archiveAll(orgId, archiveId)                    │  │
│  │  deleteAllArchived(archiveId)                     │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ Contracts    │ │ Documents   │ │ Marketing   │
│ Checker      │ │ Checker     │ │ Checker     │
└──────────────┘ └─────────────┘ └─────────────┘
```

---

## Схема базы данных

### Изменения в таблице `organization`

```sql
-- Добавить статус организации
ALTER TABLE "organization" 
ADD COLUMN "status" TEXT DEFAULT 'active' NOT NULL;

-- Добавить дату закрытия
ALTER TABLE "organization"
ADD COLUMN "closed_at" TIMESTAMP;

-- Добавить причину закрытия
ALTER TABLE "organization"
ADD COLUMN "closure_reason" TEXT;

-- Индекс для поиска закрытых организаций
CREATE INDEX "organization_status_idx" ON "organization"("status");
CREATE INDEX "organization_closed_at_idx" ON "organization"("closed_at");
```

**Статусы:**
- `active` — активная организация
- `archived` — закрыта, данные в архиве
- `deleted` — полностью удалена (после 30 дней)

### Новая таблица: `organization_archive`

```sql
CREATE TABLE "organization_archive" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "organization_id" TEXT NOT NULL UNIQUE REFERENCES "organization"("id") ON DELETE CASCADE,
  "organization_name" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "closed_at" TIMESTAMP NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "status" TEXT DEFAULT 'active' NOT NULL, -- 'active' | 'expired' | 'deleted'
  "retention_days" INTEGER DEFAULT 30 NOT NULL,
  "snapshot" JSONB NOT NULL, -- { membersCount, projectsCount, documentsCount, totalStorageBytes }
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX "organization_archive_owner_idx" ON "organization_archive"("owner_id");
CREATE INDEX "organization_archive_expires_idx" ON "organization_archive"("expires_at");
CREATE INDEX "organization_archive_status_idx" ON "organization_archive"("status");
```

### Новая таблица: `archived_document`

```sql
CREATE TABLE "archived_document" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "archive_id" TEXT NOT NULL REFERENCES "organization_archive"("id") ON DELETE CASCADE,
  "original_document_id" TEXT NOT NULL,
  "original_project_id" TEXT NOT NULL,
  "project_name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT,
  "file_id" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_size_bytes" BIGINT NOT NULL,
  "metadata" JSONB,
  "archived_at" TIMESTAMP DEFAULT now(),
  "expires_at" TIMESTAMP NOT NULL
);

CREATE INDEX "archived_document_archive_idx" ON "archived_document"("archive_id");
CREATE INDEX "archived_document_expires_idx" ON "archived_document"("expires_at");
```

### Расширение таблицы `contract`

```sql
-- Убедиться что FK на organization имеет ON DELETE no action
-- (это должно быть уже, но проверить)
ALTER TABLE "contract" 
  DROP CONSTRAINT IF EXISTS "contract_organization_id_organization_id_fk",
  ADD CONSTRAINT "contract_organization_id_organization_id_fk" 
    FOREIGN KEY ("organization_id") 
    REFERENCES "organization"("id") 
    ON DELETE NO ACTION;
```

---

## Типы и интерфейсы

### Основные типы

```typescript
// apps/api/src/types.ts

export type OrganizationStatus = 'active' | 'archived' | 'deleted';

export type ArchiveRetentionPeriod = 30 | 60 | 90; // дней

export interface OrganizationArchive {
  id: ID;
  organizationId: ID;
  organizationName: string;
  ownerId: ID;
  closedAt: string;
  expiresAt: string; // closedAt + retentionDays
  status: 'active' | 'expired' | 'deleted';
  retentionDays: ArchiveRetentionPeriod;
  snapshot: {
    membersCount: number;
    projectsCount: number;
    documentsCount: number;
    totalStorageBytes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedDocument {
  id: ID;
  archiveId: ID;
  originalDocumentId: ID;
  originalProjectId: ID;
  projectName: string;
  title: string;
  type?: string;
  fileId: ID;
  fileUrl: string;
  fileSizeBytes: number;
  metadata?: Record<string, unknown>;
  archivedAt: string;
  expiresAt: string;
}
```

### Типы для Closure Checkers

```typescript
// apps/api/src/services/closure/types.ts

export type ClosureBlockerType = 'financial' | 'data';
export type ClosureBlockerSeverity = 'blocking' | 'warning' | 'info';

export interface ClosureBlocker {
  moduleId: string;           // 'contracts' | 'marketing' | 'subscriptions'
  type: ClosureBlockerType;
  severity: ClosureBlockerSeverity;
  id: string;                 // ID сущности
  title: string;              // "Активный контракт"
  description: string;        // "Контракт с Иван Петров на 50 000 ₽"
  actionRequired?: string;    // "Завершите контракт или верните средства"
  actionUrl?: string;         // "/contracts/123"
}

export interface ArchivableData {
  moduleId: string;
  type: string;               // 'document' | 'file' | 'setting'
  id: string;
  title: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface ClosureCheckResult {
  moduleId: string;
  moduleName: string;
  blockers: ClosureBlocker[];
  archivableData: ArchivableData[];
}

export interface OrganizationClosurePreview {
  canClose: boolean;
  blockers: ClosureBlocker[];
  warnings: ClosureBlocker[];
  archivableData: ArchivableData[];
  impact: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
    expenses: number;
  };
}

export interface OrganizationClosureResult {
  success: boolean;
  organizationId: string;
  archiveId: string;
  closedAt: string;
  deleted: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
  };
}
```

---

## Сервисы

### OrganizationClosureService

**Файл**: `apps/api/src/services/closure/organization-closure-service.ts`

```typescript
export class OrganizationClosureService {
  constructor(
    private organizationsRepository: OrganizationsRepository,
    private organizationArchivesRepository: OrganizationArchivesRepository,
    private closureCheckerRegistry: ClosureCheckerRegistry,
    private deletionService: DeletionService
  ) {}

  /**
   * Получить preview закрытия организации
   */
  async getClosurePreview(
    organizationId: string, 
    userId: string
  ): Promise<OrganizationClosurePreview> {
    // 1. Проверить права (только owner)
    // 2. Запустить все checkers
    // 3. Собрать блокеры и данные для архивации
    // 4. Подсчитать impact
    // 5. Вернуть preview
  }

  /**
   * Инициировать закрытие организации
   */
  async initiateClosing(
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<OrganizationClosureResult> {
    // 1. Проверить права
    // 2. Проверить что нет блокеров
    // 3. Создать OrganizationArchive
    // 4. Архивировать данные через все checkers
    // 5. Удалить проекты, задачи, участников
    // 6. Установить org.status = 'archived'
    // 7. Отправить уведомления
  }

  /**
   * Принудительное удаление пустой организации
   */
  async forceClose(
    organizationId: string,
    userId: string
  ): Promise<OrganizationClosureResult> {
    // Только если нет блокеров и нет данных для архивации
  }
}
```

### ClosureCheckerRegistry

**Файл**: `apps/api/src/services/closure/checker-registry.ts`

```typescript
export class ClosureCheckerRegistry {
  private checkers: Map<string, OrganizationClosureChecker> = new Map();
  
  register(checker: OrganizationClosureChecker): void {
    this.checkers.set(checker.moduleId, checker);
  }
  
  async runAllChecks(organizationId: string): Promise<ClosureCheckResult[]> {
    const results: ClosureCheckResult[] = [];
    for (const checker of this.checkers.values()) {
      try {
        results.push(await checker.check(organizationId));
      } catch (error) {
        console.error(`[ClosureChecker] Error in ${checker.moduleId}:`, error);
        // Продолжаем работу других checkers
      }
    }
    return results;
  }
  
  async archiveAll(organizationId: string, archiveId: string): Promise<void> {
    for (const checker of this.checkers.values()) {
      try {
        await checker.archive(organizationId, archiveId);
      } catch (error) {
        console.error(`[ClosureChecker] Archive error in ${checker.moduleId}:`, error);
      }
    }
  }
  
  async deleteAllArchived(archiveId: string): Promise<void> {
    for (const checker of this.checkers.values()) {
      try {
        await checker.deleteArchived(archiveId);
      } catch (error) {
        console.error(`[ClosureChecker] Delete error in ${checker.moduleId}:`, error);
      }
    }
  }
}
```

---

## Репозитории

### OrganizationArchivesRepository

**Файл**: `apps/api/src/repositories/organization-archives-repository.ts`

```typescript
export class OrganizationArchivesRepository {
  async create(data: {
    organizationId: string;
    organizationName: string;
    ownerId: string;
    retentionDays: number;
    snapshot: OrganizationArchive['snapshot'];
  }): Promise<OrganizationArchive> {
    // Создать запись в БД
  }

  async findById(id: string): Promise<OrganizationArchive | null> {
    // Найти по ID
  }

  async findByOwner(ownerId: string): Promise<OrganizationArchive[]> {
    // Найти все архивы владельца
  }

  async findExpired(): Promise<OrganizationArchive[]> {
    // Найти архивы с expires_at < now()
  }

  async markDeleted(id: string): Promise<void> {
    // Пометить как удалённый
  }
}
```

### ArchivedDocumentsRepository

**Файл**: `apps/api/src/repositories/archived-documents-repository.ts`

```typescript
export class ArchivedDocumentsRepository {
  async create(data: {
    archiveId: string;
    originalDocumentId: string;
    originalProjectId: string;
    projectName: string;
    title: string;
    fileId: string;
    fileUrl: string;
    fileSizeBytes: number;
    expiresAt: string;
    metadata?: Record<string, unknown>;
  }): Promise<ArchivedDocument> {
    // Создать запись
  }

  async findByArchive(archiveId: string): Promise<ArchivedDocument[]> {
    // Найти все документы архива
  }

  async deleteByArchive(archiveId: string): Promise<void> {
    // Удалить все документы архива
  }
}
```

---

## API эндпоинты

### GET /api/organizations/[orgId]/closure/preview

Получить preview закрытия организации.

**Request:**
```typescript
// Query params: нет
// Headers: Authorization required
```

**Response:**
```typescript
{
  canClose: boolean;
  blockers: ClosureBlocker[];
  warnings: ClosureBlocker[];
  archivableData: ArchivableData[];
  impact: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
    expenses: number;
  };
}
```

**Status Codes:**
- `200 OK` — успешно
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — не владелец
- `404 Not Found` — организация не найдена

### POST /api/organizations/[orgId]/closure/initiate

Инициировать закрытие организации.

**Request:**
```typescript
{
  reason?: string; // Опциональная причина закрытия
}
```

**Response:**
```typescript
{
  success: boolean;
  organizationId: string;
  archiveId: string;
  closedAt: string;
  deleted: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
  };
}
```

**Status Codes:**
- `200 OK` — успешно закрыто
- `400 Bad Request` — есть блокеры
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — не владелец
- `404 Not Found` — организация не найдена

### DELETE /api/organizations/[orgId]

Удалить организацию (только если нет блокеров).

**Request:**
```typescript
// Body: нет
// Headers: Authorization required
```

**Response:**
```typescript
{
  success: boolean;
  organizationId: string;
  archiveId: string;
  closedAt: string;
}
```

**Status Codes:**
- `200 OK` — успешно удалено
- `400 Bad Request` — есть блокеры
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — не владелец
- `404 Not Found` — организация не найдена

### GET /api/archives

Получить список архивов текущего пользователя.

**Response:**
```typescript
{
  archives: OrganizationArchive[];
}
```

### GET /api/archives/[archiveId]

Получить детали архива.

**Response:**
```typescript
{
  archive: OrganizationArchive;
  documents: ArchivedDocument[];
}
```

### GET /api/archives/[archiveId]/download

Скачать все документы архива одним ZIP.

**Response:**
```typescript
// Binary: ZIP file
// Content-Type: application/zip
```

---

## Cron Jobs

### Очистка просроченных архивов

**Файл**: `apps/api/src/services/closure/archive-cleanup-job.ts`

```typescript
export async function cleanupExpiredArchives(): Promise<void> {
  const expiredArchives = await organizationArchivesRepository.findExpired();
  
  for (const archive of expiredArchives) {
    try {
      // 1. Уведомить владельца (если ещё не уведомляли)
      await notificationService.send(archive.ownerId, {
        type: 'archive_deleted',
        title: 'Архив организации удалён',
        message: `Архив "${archive.organizationName}" был удалён.`
      });
      
      // 2. Удалить данные через все checkers
      await closureCheckerRegistry.deleteAllArchived(archive.id);
      
      // 3. Пометить архив как удалённый
      await organizationArchivesRepository.markDeleted(archive.id);
      
      // 4. Установить org.status = 'deleted'
      await organizationsRepository.update(archive.organizationId, {
        status: 'deleted'
      });
    } catch (error) {
      console.error(`[ArchiveCleanup] Error deleting archive ${archive.id}:`, error);
      // Продолжаем с другими архивами
    }
  }
}
```

**Расписание**: Ежедневно в 3:00 AM

**Настройка** (через Vercel Cron или отдельный сервис):
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-archives",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Уведомления перед удалением

**Файл**: `apps/api/src/services/closure/archive-expiry-notifications.ts`

```typescript
export async function sendExpiryNotifications(): Promise<void> {
  // Найти архивы, которые удалятся через 7 дней
  const archivesExpiringIn7Days = await organizationArchivesRepository.findExpiringIn(7);
  
  for (const archive of archivesExpiringIn7Days) {
    await notificationService.send(archive.ownerId, {
      type: 'archive_expiring_soon',
      title: 'Архив будет удалён через 7 дней',
      message: `Архив "${archive.organizationName}" будет удалён ${formatDate(archive.expiresAt)}.`
    });
  }
  
  // Найти архивы, которые удалятся через 1 день
  const archivesExpiringIn1Day = await organizationArchivesRepository.findExpiringIn(1);
  
  for (const archive of archivesExpiringIn1Day) {
    await notificationService.send(archive.ownerId, {
      type: 'archive_expiring_tomorrow',
      title: 'Архив будет удалён завтра',
      message: `Архив "${archive.organizationName}" будет удалён завтра.`
    });
  }
}
```

**Расписание**: Ежедневно в 9:00 AM

---

## Связанные документы

- [Политика закрытия организации](./organization-closure-policy.md)
- [API документация](./organization-closure-api.md)
- [Примеры реализации](./organization-closure-examples.md)

---

**Последнее обновление**: 2025-01-15  
**Автор**: AI Assistant  
**Статус**: Требует реализации

