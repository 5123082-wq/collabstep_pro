# Руководство по исправлению ошибок TypeScript

## Обзор

В коде обнаружено **47 ошибок TypeScript**, которые необходимо исправить. Ниже приведен детальный список проблем и способы их решения.

---

## 1. Ошибки в API репозиториях (Backend)

### 1.1. `organizations-repository.ts` (строка 123)

**Ошибка:** `Type 'undefined' is not assignable to type 'OrganizationMember'`

**Проблема:** Метод `addMember` возвращает результат `insert().returning()`, который может быть `undefined`, но тип возврата не допускает `undefined`.

**Исправление:**
```typescript
async addMember(member: NewOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db
        .insert(organizationMembers)
        .values(member)
        .returning();
    if (!created) {
        throw new Error('Failed to create organization member');
    }
    return created;
}
```

---

### 1.2. `performer-profiles-repository.ts` (строки 20, 26, 80)

**Ошибки:**
- Строка 20, 26: `Type 'undefined' is not assignable to type 'PerformerProfile'`
- Строка 80: `Property 'where' does not exist on type`

**Проблемы:**
1. Методы `upsert` и `findByUserId` могут возвращать `undefined`, но тип не допускает этого.
2. В методе `listPublic` используется `query.where()` после `innerJoin()`, но тип запроса не поддерживает цепочку `where`.

**Исправления:**

**Для строк 20, 26:**
```typescript
async upsert(profile: NewPerformerProfile): Promise<PerformerProfile> {
    const existing = await this.findByUserId(profile.userId);
    if (existing) {
        const [updated] = await db
            .update(performerProfiles)
            .set({ ...profile, updatedAt: new Date() })
            .where(eq(performerProfiles.id, existing.id))
            .returning();
        if (!updated) {
            throw new Error('Failed to update performer profile');
        }
        return updated;
    } else {
        const [created] = await db
            .insert(performerProfiles)
            .values(profile)
            .returning();
        if (!created) {
            throw new Error('Failed to create performer profile');
        }
        return created;
    }
}

async findByUserId(userId: string): Promise<PerformerProfile | null> {
    const [profile] = await db
        .select()
        .from(performerProfiles)
        .where(eq(performerProfiles.userId, userId));
    return profile || null;
}
```

**Для строки 80:**
```typescript
async listPublic(options?: { specialization?: string; limit?: number; offset?: number }): Promise<PerformerProfile[]> {
    let query = db
        .select()
        .from(performerProfiles)
        .innerJoin(users, eq(performerProfiles.userId, users.id))
        .where(eq(performerProfiles.isPublic, true));

    if (options?.specialization) {
        query = query.where(and(
            eq(performerProfiles.isPublic, true),
            eq(performerProfiles.specialization, options.specialization)
        ));
    }

    const results = await query
        .limit(options?.limit ?? 20)
        .offset(options?.offset ?? 0);
    
    return results.map(r => r.performer_profile);
}
```

---

### 1.3. `wallet-service.ts` (множественные ошибки)

**Ошибки:**
- `Type 'undefined' is not assignable to type 'Wallet | null'` (строки 9, 29, 117)
- `'wallet' is possibly 'null'` (строки 12, 13, 14, 34, 43)
- `Argument of type 'PgTransaction' is not assignable to parameter of type 'VercelPgDatabase'` (множественные строки)
- `'updatedWallet' is possibly 'undefined'` (строки 47, 92)

**Проблемы:**
1. Методы репозитория могут возвращать `undefined`, но ожидается `null`.
2. Транзакции передаются в методы репозитория, но типы не совместимы.
3. Результаты обновления могут быть `undefined`.

**Исправления:**

**1. Исправить типы в `wallet-repository.ts`:**
```typescript
async findByEntity(entityId: string, entityType: WalletType, tx: any = db) {
    const [wallet] = await tx.select().from(wallets).where(
        and(eq(wallets.entityId, entityId), eq(wallets.entityType, entityType))
    );
    return wallet ?? null;
}
```

**2. В `wallet-service.ts` добавить проверки:**
```typescript
async getBalance(entityId: string, entityType: WalletType) {
    let wallet = await walletRepository.findByEntity(entityId, entityType);
    if (!wallet) {
        wallet = await walletRepository.createWallet(entityId, entityType);
        if (!wallet) {
            throw new Error('Failed to create wallet');
        }
    }
    return {
        cents: wallet.balance,
        amount: centsToAmount(BigInt(wallet.balance)),
        currency: wallet.currency
    };
}

async topUp(entityId: string, entityType: WalletType, amount: string | number, sourceRef?: string) {
    const normalizedAmount = normalizeAmount(amount);
    const cents = Number(amountToCents(normalizedAmount));

    if (cents <= 0) {
        throw new Error("Amount must be positive");
    }

    return db.transaction(async (tx) => {
        let wallet = await walletRepository.findByEntity(entityId, entityType, tx);
        if (!wallet) {
            wallet = await walletRepository.createWallet(entityId, entityType, 'RUB', tx);
            if (!wallet) {
                throw new Error('Failed to create wallet');
            }
        }
        
        const transaction = await walletRepository.createTransaction({
            walletId: wallet.id,
            type: 'deposit',
            amount: cents,
            status: 'completed',
            referenceId: sourceRef,
            metadata: { source: 'top_up' }
        }, tx);

        const updatedWallet = await walletRepository.updateBalance(wallet.id, cents, tx);
        if (!updatedWallet) {
            throw new Error('Failed to update wallet balance');
        }

        return {
            transaction,
            newBalance: centsToAmount(BigInt(updatedWallet.balance))
        };
    });
}
```

**3. Исправить типы транзакций в `wallet-repository.ts`:**
```typescript
// Изменить сигнатуры методов, чтобы принимать `any` для транзакций:
async findByEntity(entityId: string, entityType: WalletType, tx: any = db) { ... }
async createWallet(entityId: string, entityType: WalletType, currency: Currency = 'RUB', tx: any = db) { ... }
async updateBalance(walletId: string, amount: number, tx: any = db) { ... }
// и т.д. для всех методов, принимающих транзакции
```

---

## 2. Ошибки в API routes (Frontend)

### 2.1. `jsonError` с параметром `details` (22 ошибки)

**Ошибка:** `Object literal may only specify known properties, and 'details' does not exist in type 'ResponseInit'`

**Проблема:** Функция `jsonError` принимает `ResponseInit`, который не имеет свойства `details`.

**Исправление:** Изменить функцию `jsonError` в `apps/web/lib/api/http.ts`:

```typescript
export interface ApiErrorResponse {
  ok: false;
  error: string;
  details?: string;
}

export function jsonError(message: string, init?: ResponseInit & { details?: string }): NextResponse<ApiErrorResponse> {
  const status = init?.status ?? 400;
  const { details, ...responseInit } = init || {};
  return NextResponse.json(
    { ok: false, error: message, ...(details ? { details } : {}) },
    { ...responseInit, status }
  );
}
```

**Файлы для исправления:**
- `apps/web/app/api/contracts/[id]/accept/route.ts`
- `apps/web/app/api/contracts/[id]/complete/route.ts`
- `apps/web/app/api/contracts/[id]/fund/route.ts`
- `apps/web/app/api/contracts/route.ts`
- `apps/web/app/api/finance/balance/route.ts`
- `apps/web/app/api/finance/top-up/route.ts`
- `apps/web/app/api/me/performer-profile/visibility/route.ts`
- `apps/web/app/api/organizations/[orgId]/invites/route.ts`
- `apps/web/app/api/organizations/route.ts`
- `apps/web/app/api/performers/[userId]/invite-to-organization/route.ts`
- `apps/web/app/api/projects/[projectId]/invites/[inviteId]/approve/route.ts`
- `apps/web/app/api/projects/[projectId]/invites/route.ts`
- `apps/web/app/api/projects/invites/[token]/accept/route.ts`
- `apps/web/app/api/projects/invites/[token]/route.ts`
- `apps/web/app/api/projects/route.ts`

---

### 2.2. `performers/route.ts` (строка 12)

**Ошибка:** `Type 'string | undefined' is not assignable to type 'string'`

**Проблема:** `specialization` может быть `undefined`, но метод `listPublic` ожидает `string | undefined` с `exactOptionalPropertyTypes: true`.

**Исправление:**
```typescript
const performers = await performerProfilesRepository.listPublic({
    ...(specialization ? { specialization } : {}),
    limit,
    offset
});
```

---

### 2.3. `projects/[projectId]/invites/route.ts` (строка 27)

**Ошибка:** `Property 'listProjectInvites' does not exist on type 'InvitationsRepository'`

**Проблема:** Метод `listProjectInvites` не существует в репозитории.

**Исправление:** Добавить метод в `apps/api/src/repositories/invitations-repository.ts`:

```typescript
async listProjectInvites(projectId: string, status?: string): Promise<ProjectInvite[]> {
    let query = db
        .select()
        .from(projectInvites)
        .where(eq(projectInvites.projectId, projectId));
    
    if (status) {
        query = query.where(and(
            eq(projectInvites.projectId, projectId),
            eq(projectInvites.status, status as any)
        ));
    }
    
    return await query;
}
```

---

### 2.4. `pm/projects/route.ts` (строка 249)

**Ошибка:** `Property 'organizationId' does not exist in type`

**Проблема:** Тип проекта не содержит поле `organizationId`.

**Исправление:** Добавить `organizationId` в тип проекта или использовать `as any` временно:

```typescript
const project = projectsRepository.create({
    title,
    description: typeof body.description === 'string' ? body.description : undefined,
    key: body.key,
    ownerId: auth.userId,
    workspaceId,
    organizationId, // Добавить в схему проекта
    status: status as any,
    visibility,
    type: body.type,
    deadline: body.deadline
} as any); // Временное решение до обновления схемы
```

---

## 3. Ошибки в компонентах (Frontend)

### 3.1. `OrganizationFinanceClient.tsx` (строки 5)

**Ошибка:** `Module 'lucide-react' has no exported member 'CreditCard'` и `'History'`

**Проблема:** Иконки `CreditCard` и `History` не существуют в `lucide-react`.

**Исправление:** Заменить на существующие иконки:

```typescript
import { Loader2, TrendingUp, Wallet, Clock } from 'lucide-react';

// Заменить:
// <CreditCard className="h-5 w-5 text-blue-500" />
<Wallet className="h-5 w-5 text-blue-500" />

// Заменить:
// <History className="h-4 w-4 text-gray-500" />
<Clock className="h-4 w-4 text-gray-500" />
```

---

### 3.2. `ProjectCreateWizardClient.tsx` (строка 32)

**Ошибка:** `Cannot find name 'useEffect'`

**Проблема:** Отсутствует импорт `useEffect`.

**Исправление:**
```typescript
import { useState, useEffect } from 'react';
```

---

### 3.3. `CreateOrganizationModal.tsx` и `InvitePerformerModal.tsx`

**Ошибка:** `Type '"outline"' is not assignable to type 'ButtonVariant'`

**Проблема:** Вариант `'outline'` не существует в типе `ButtonVariant` (доступны: `'primary' | 'secondary' | 'ghost' | 'danger' | 'trendy'`).

**Исправление:** Заменить `variant="outline"` на `variant="secondary"`:

```typescript
// В CreateOrganizationModal.tsx (строка 137)
<Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>

// В InvitePerformerModal.tsx (строка 105)
<Button variant="secondary" onClick={() => onOpenChange(false)}>
```

---

## 4. Приоритет исправлений

### Высокий приоритет (критично для работы)

1. ✅ Исправить типы транзакций в `wallet-repository.ts` и `wallet-service.ts`
2. ✅ Добавить проверки на `null/undefined` в репозиториях
3. ✅ Исправить функцию `jsonError` для поддержки `details`
4. ✅ Добавить метод `listProjectInvites` в `InvitationsRepository`

### Средний приоритет (функциональность)

5. ✅ Исправить импорты иконок в `OrganizationFinanceClient.tsx`
6. ✅ Добавить импорт `useEffect` в `ProjectCreateWizardClient.tsx`
7. ✅ Исправить варианты кнопок (`outline` → `secondary`)

### Низкий приоритет (типы)

8. ✅ Исправить типы в `performers/route.ts`
9. ✅ Добавить `organizationId` в схему проекта или использовать временное решение

---

## 5. Рекомендации

1. **Включить строгие проверки TypeScript** в `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true
     }
   }
   ```

2. **Добавить unit-тесты** для критичных методов репозиториев.

3. **Использовать Zod** для валидации данных в API routes вместо ручных проверок.

4. **Создать типы-утилиты** для транзакций базы данных, чтобы избежать проблем с типами.

---

## 6. Следующие шаги

1. Исправить ошибки в порядке приоритета
2. Запустить `pnpm typecheck` для проверки
3. Запустить `pnpm lint` для проверки стиля кода
4. Создать коммит с исправлениями
5. Обновить PR

