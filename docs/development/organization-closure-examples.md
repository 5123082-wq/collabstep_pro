# Примеры реализации: Закрытие организации

> **Версия**: 1.0  
> **Дата**: 2025-01-15  
> **Статус**: Требует реализации

> ⚠️ **Важно**: Этот документ является частью комплекта документации.  
> Для начала разработки используйте **[План реализации](./organization-closure-implementation-plan.md)** как основной документ.

## 📋 Содержание

1. [Примеры Closure Checkers](#примеры-closure-checkers)
2. [Примеры UI компонентов](#примеры-ui-компонентов)
3. [Примеры тестов](#примеры-тестов)
4. [Примеры интеграции](#примеры-интеграции)

---

## Примеры Closure Checkers

### 1. Contracts Checker (Блокирующий)

**Файл**: `apps/api/src/services/closure/checkers/contracts-checker.ts`

```typescript
import { eq, and, inArray } from 'drizzle-orm';
import { contracts } from '@collabverse/api/db/schema';
import { db } from '@collabverse/api/db/config';
import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ClosureBlocker
} from '../types';
import { contractsRepository } from '@collabverse/api/repositories/contracts-repository';
import { centsToAmount } from '@collabverse/api/utils/money';

export class ContractsClosureChecker implements OrganizationClosureChecker {
  moduleId = 'contracts';
  moduleName = 'Контракты';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const blockers: ClosureBlocker[] = [];

    // Найти активные контракты (блокирующие статусы)
    const activeStatuses: Array<'accepted' | 'funded' | 'completed' | 'disputed'> = [
      'accepted',
      'funded',
      'completed',
      'disputed'
    ];

    const activeContracts = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.organizationId, organizationId),
          inArray(contracts.status, activeStatuses)
        )
      );

    for (const contract of activeContracts) {
      const amount = centsToAmount(BigInt(contract.amount));
      const actionRequired = this.getActionForStatus(contract.status);

      blockers.push({
        moduleId: this.moduleId,
        type: 'financial',
        severity: 'blocking',
        id: contract.id,
        title: 'Активный контракт',
        description: `Контракт на ${amount} ${contract.currency} (статус: ${contract.status})`,
        actionRequired,
        actionUrl: `/contracts/${contract.id}`
      });
    }

    // Контракты не архивируются - они либо блокируют, либо уже закрыты
    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers,
      archivableData: []
    };
  }

  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // Контракты не архивируются
    // Они либо блокируют закрытие, либо уже в финальном статусе (paid)
  }

  async deleteArchived(_archiveId: string): Promise<void> {
    // Нечего удалять
  }

  private getActionForStatus(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Завершите контракт или отмените его';
      case 'funded':
        return 'Завершите работу по контракту или верните средства';
      case 'completed':
        return 'Оплатите контракт';
      case 'disputed':
        return 'Разрешите спор по контракту';
      default:
        return 'Завершите контракт';
    }
  }
}
```

---

### 2. Documents Checker (Архивирующий)

**Файл**: `apps/api/src/services/closure/checkers/documents-checker.ts`

```typescript
import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ArchivableData
} from '../types';
import { dbProjectsRepository } from '@collabverse/api/repositories/db-projects-repository';
import { documentsRepository } from '@collabverse/api/repositories/documents-repository';
import { archivedDocumentsRepository } from '@collabverse/api/repositories/archived-documents-repository';

export class DocumentsClosureChecker implements OrganizationClosureChecker {
  moduleId = 'documents';
  moduleName = 'Документы';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const archivableData: ArchivableData[] = [];

    // Найти все проекты организации
    const projects = await dbProjectsRepository.findByOrganization(organizationId);

    // Для каждого проекта найти документы
    for (const project of projects) {
      const docs = await documentsRepository.findByProject(project.id);

      for (const doc of docs) {
        archivableData.push({
          moduleId: this.moduleId,
          type: 'document',
          id: doc.id,
          title: doc.title,
          sizeBytes: doc.sizeBytes || 0,
          metadata: {
            projectId: project.id,
            projectName: project.title,
            documentType: doc.type
          }
        });
      }
    }

    // Документы не блокируют закрытие
    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers: [],
      archivableData
    };
  }

  async archive(organizationId: string, archiveId: string): Promise<void> {
    const projects = await dbProjectsRepository.findByOrganization(organizationId);

    for (const project of projects) {
      const docs = await documentsRepository.findByProject(project.id);

      for (const doc of docs) {
        // Получить архив для вычисления expiresAt
        const archive = await organizationArchivesRepository.findById(archiveId);
        if (!archive) throw new Error('Archive not found');

        // Создать запись в архиве
        await archivedDocumentsRepository.create({
          archiveId,
          originalDocumentId: doc.id,
          originalProjectId: project.id,
          projectName: project.title,
          title: doc.title,
          type: doc.type,
          fileId: doc.fileId,
          fileUrl: doc.fileUrl,
          fileSizeBytes: doc.sizeBytes || 0,
          expiresAt: archive.expiresAt,
          metadata: {
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          }
        });
      }
    }
  }

  async deleteArchived(archiveId: string): Promise<void> {
    // Получить все документы архива
    const archivedDocs = await archivedDocumentsRepository.findByArchive(archiveId);

    for (const doc of archivedDocs) {
      // Удалить файл из storage
      try {
        await storageService.deleteFile(doc.fileId);
      } catch (error) {
        console.error(`[DocumentsChecker] Failed to delete file ${doc.fileId}:`, error);
        // Продолжаем удаление остальных файлов
      }
    }

    // Удалить записи из БД
    await archivedDocumentsRepository.deleteByArchive(archiveId);
  }
}
```

---

### 3. Wallet Checker (Блокирующий)

**Файл**: `apps/api/src/services/closure/checkers/wallet-checker.ts`

```typescript
import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ClosureBlocker
} from '../types';
import { walletRepository } from '@collabverse/api/repositories/wallet-repository';
import { centsToAmount } from '@collabverse/api/utils/money';

export class WalletClosureChecker implements OrganizationClosureChecker {
  moduleId = 'wallet';
  moduleName = 'Кошелёк';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const blockers: ClosureBlocker[] = [];

    // Найти кошелёк организации
    const wallet = await walletRepository.findByEntity(organizationId, 'organization');

    if (wallet && wallet.balance > 0) {
      const balance = centsToAmount(BigInt(wallet.balance));

      blockers.push({
        moduleId: this.moduleId,
        type: 'financial',
        severity: 'blocking',
        id: wallet.id,
        title: 'Баланс кошелька',
        description: `На счету: ${balance} ${wallet.currency}`,
        actionRequired: 'Выведите все средства перед закрытием организации',
        actionUrl: `/wallet`
      });
    }

    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers,
      archivableData: []
    };
  }

  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // Кошелёк не архивируется
  }

  async deleteArchived(_archiveId: string): Promise<void> {
    // Нечего удалять
  }
}
```

---

### 4. Marketing Checker (Заглушка для будущего модуля)

**Файл**: `apps/api/src/services/closure/checkers/marketing-checker.ts`

```typescript
import {
  OrganizationClosureChecker,
  ClosureCheckResult
} from '../types';

/**
 * Заглушка для модуля маркетинга
 * TODO: Реализовать когда будет модуль маркетинга
 * 
 * Блокеры могут включать:
 * - Активные рекламные кампании с оплатой
 * - Запущенные email-рассылки
 * - Подписки на маркетинговые инструменты
 */
export class MarketingClosureChecker implements OrganizationClosureChecker {
  moduleId = 'marketing';
  moduleName = 'Маркетинг';

  async check(_organizationId: string): Promise<ClosureCheckResult> {
    // TODO: Реализовать проверку активных маркетинговых активностей
    // Пример блокеров:
    // - Активная рекламная кампания в Google Ads (оплачена)
    // - Запущенная email-рассылка (подписка активна)
    // - Интеграция с CRM (платная подписка)

    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers: [],
      archivableData: []
    };
  }

  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // TODO: Архивировать данные маркетинга:
    // - История кампаний
    // - Статистика рассылок
    // - Настройки интеграций
  }

  async deleteArchived(_archiveId: string): Promise<void> {
    // TODO: Удалить архивированные данные маркетинга
  }
}
```

---

## Примеры UI компонентов

### 1. DangerZoneTab

**Файл**: `apps/web/components/organizations/settings/DangerZoneTab.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClosurePreviewModal } from './ClosurePreviewModal';
import { AlertTriangle } from 'lucide-react';

export function DangerZoneTab({ organizationId }: { organizationId: string }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-[color:var(--text-primary)]">
          Опасная зона
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Необратимые действия с организацией.
        </p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">
              Закрыть организацию
            </h4>
            <p className="mt-2 text-sm text-red-700">
              При закрытии организации будут удалены:
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
              <li>Все проекты и задачи</li>
              <li>Все документы (будут заархивированы на 30 дней)</li>
              <li>Все участники потеряют доступ</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-red-900">
              ⚠️ Это действие необратимо!
            </p>
            <div className="mt-4">
              <Button
                variant="destructive"
                onClick={() => setShowPreview(true)}
              >
                Проверить возможность закрытия
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <ClosurePreviewModal
          organizationId={organizationId}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
```

---

### 2. ClosurePreviewModal

**Файл**: `apps/web/components/organizations/settings/ClosurePreviewModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClosureBlockersCard } from './ClosureBlockersCard';
import { ClosureConfirmDialog } from './ClosureConfirmDialog';
import { Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

type ClosurePreview = {
  canClose: boolean;
  blockers: Array<{
    moduleId: string;
    title: string;
    description: string;
    actionRequired?: string;
    actionUrl?: string;
  }>;
  warnings: Array<{
    moduleId: string;
    title: string;
    description: string;
  }>;
  archivableData: Array<{
    moduleId: string;
    moduleName: string;
    count: number;
    totalSizeBytes: number;
  }>;
  impact: {
    projects: number;
    tasks: number;
    members: number;
    documents: number;
  };
};

export function ClosurePreviewModal({
  organizationId,
  onClose
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/closure/preview`);
      if (!res.ok) throw new Error('Failed to fetch preview');
      const data = await res.json();
      setPreview(data);
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open onClose={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!preview) {
    return (
      <Dialog open onClose={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <p className="text-red-600">Ошибка загрузки данных</p>
            <Button onClick={onClose} className="mt-4">Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open onClose={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Закрытие организации</DialogTitle>
          </DialogHeader>

          {preview.canClose ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">
                    Закрытие возможно
                  </h4>
                  <p className="mt-1 text-sm text-green-700">
                    Все финансовые обязательства урегулированы.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Будет удалено:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{preview.impact.projects} проектов</li>
                  <li>{preview.impact.tasks} задач</li>
                  <li>{preview.impact.members} участников</li>
                  <li>{preview.impact.documents} документов (будут заархивированы)</li>
                </ul>
              </div>

              {preview.archivableData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Будет заархивировано:</h4>
                  {preview.archivableData.map((data) => (
                    <div key={data.moduleId} className="text-sm text-gray-600">
                      • {data.moduleName}: {data.count} элементов
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirm(true)}
                >
                  Закрыть организацию
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">
                    Закрытие невозможно
                  </h4>
                  <p className="mt-1 text-sm text-red-700">
                    Обнаружены блокирующие факторы.
                  </p>
                </div>
              </div>

              <ClosureBlockersCard blockers={preview.blockers} warnings={preview.warnings} />

              <div className="flex justify-end pt-4">
                <Button onClick={onClose}>Понятно</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showConfirm && preview.canClose && (
        <ClosureConfirmDialog
          organizationId={organizationId}
          onClose={() => {
            setShowConfirm(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
```

---

## Примеры тестов

### Unit тест для Contracts Checker

**Файл**: `apps/web/tests/unit/closure/contracts-checker.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContractsClosureChecker } from '@collabverse/api/services/closure/checkers/contracts-checker';
import { contractsRepository } from '@collabverse/api/repositories/contracts-repository';

describe('ContractsClosureChecker', () => {
  let checker: ContractsClosureChecker;

  beforeEach(() => {
    checker = new ContractsClosureChecker();
  });

  it('should block closure when active contract exists', async () => {
    // Mock активного контракта
    jest.spyOn(contractsRepository, 'findByOrganization').mockResolvedValue([
      {
        id: 'contract-1',
        organizationId: 'org-1',
        taskId: 'task-1',
        performerId: 'user-1',
        amount: 5000000, // 50 000 ₽ в копейках
        currency: 'RUB',
        status: 'funded',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const result = await checker.check('org-1');

    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].severity).toBe('blocking');
    expect(result.blockers[0].type).toBe('financial');
  });

  it('should not block closure when no active contracts', async () => {
    jest.spyOn(contractsRepository, 'findByOrganization').mockResolvedValue([]);

    const result = await checker.check('org-1');

    expect(result.blockers).toHaveLength(0);
  });

  it('should not block closure when contract is paid', async () => {
    jest.spyOn(contractsRepository, 'findByOrganization').mockResolvedValue([
      {
        id: 'contract-1',
        organizationId: 'org-1',
        taskId: 'task-1',
        performerId: 'user-1',
        amount: 5000000,
        currency: 'RUB',
        status: 'paid', // Оплаченный контракт не блокирует
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const result = await checker.check('org-1');

    expect(result.blockers).toHaveLength(0);
  });
});
```

---

### E2E тест для закрытия организации

**Файл**: `apps/web/tests/e2e/organization-closure.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Organization Closure', () => {
  test('should block closure when active contract exists', async ({ page }) => {
    // 1. Войти как владелец организации
    await page.goto('/login');
    await page.fill('[name="email"]', 'owner@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. Перейти в настройки организации
    await page.goto('/org/org-123/settings');

    // 3. Открыть вкладку "Опасная зона"
    await page.click('text=Опасная зона');

    // 4. Нажать "Проверить возможность закрытия"
    await page.click('text=Проверить возможность закрытия');

    // 5. Проверить что показаны блокеры
    await expect(page.locator('text=Закрытие невозможно')).toBeVisible();
    await expect(page.locator('text=Активный контракт')).toBeVisible();
  });

  test('should allow closure when no blockers', async ({ page }) => {
    // ... аналогично, но без активных контрактов
  });

  test('should archive documents on closure', async ({ page }) => {
    // ... тест архивации документов
  });
});
```

---

## Примеры интеграции

### Регистрация всех checkers

**Файл**: `apps/api/src/services/closure/index.ts`

```typescript
import { ClosureCheckerRegistry } from './checker-registry';
import { ContractsClosureChecker } from './checkers/contracts-checker';
import { DocumentsClosureChecker } from './checkers/documents-checker';
import { WalletClosureChecker } from './checkers/wallet-checker';
import { ExpensesClosureChecker } from './checkers/expenses-checker';
import { MarketingClosureChecker } from './checkers/marketing-checker';

export const closureCheckerRegistry = new ClosureCheckerRegistry();

// Регистрация всех checkers
closureCheckerRegistry.register(new ContractsClosureChecker());
closureCheckerRegistry.register(new DocumentsClosureChecker());
closureCheckerRegistry.register(new WalletClosureChecker());
closureCheckerRegistry.register(new ExpensesClosureChecker());
closureCheckerRegistry.register(new MarketingClosureChecker());

// Экспорт сервиса
export { OrganizationClosureService } from './organization-closure-service';
export * from './types';
```

---

### API Route для preview

**Файл**: `apps/web/app/api/organizations/[orgId]/closure/preview/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, organizationClosureService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  _request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    // Проверить что пользователь - владелец
    const member = await organizationsRepository.findMember(orgId, user.id);
    if (!member || member.role !== 'owner' || member.status !== 'active') {
      return jsonError('FORBIDDEN', { 
        status: 403, 
        details: 'Only organization owner can close organization' 
      });
    }

    // Получить preview
    const preview = await organizationClosureService.getClosurePreview(orgId, user.id);

    return jsonOk(preview);
  } catch (error) {
    console.error('[Organization Closure Preview] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
```

---

## Связанные документы

- [Политика закрытия организации](./organization-closure-policy.md)
- [Техническая спецификация](./organization-closure-specification.md)
- [API документация](./organization-closure-api.md)

---

**Последнее обновление**: 2025-01-15  
**Автор**: AI Assistant  
**Статус**: Требует реализации

