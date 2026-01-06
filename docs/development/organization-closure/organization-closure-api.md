# API документация: Закрытие организации

> **Версия**: 1.0  
> **Дата**: 2025-01-15  
> **Статус**: Требует реализации

> ⚠️ **Важно**: Этот документ является частью комплекта документации.  
> Для начала разработки используйте **[План реализации](../plans/organization-closure-implementation-plan.md)** как основной документ.

## 📋 Содержание

1. [Обзор](#обзор)
2. [Аутентификация](#аутентификация)
3. [Эндпоинты](#эндпоинты)
4. [Примеры запросов](#примеры-запросов)
5. [Коды ошибок](#коды-ошибок)

---

## Обзор

API для управления закрытием и архивацией организаций. Все эндпоинты требуют аутентификации и прав владельца организации.

**Base URL**: `/api/organizations/[orgId]/closure`

---

## Аутентификация

Все запросы требуют:

- **Authorization header** с токеном сессии
- **Права владельца** организации (только `owner` может закрывать)

---

## Эндпоинты

### 1. Получить preview закрытия

**GET** `/api/organizations/[orgId]/closure/preview`

Получить информацию о возможности закрытия организации, список блокеров и данных для архивации.

**Параметры пути:**

- `orgId` (string, required) — ID организации

**Response 200 OK:**

```json
{
  "canClose": false,
  "blockers": [
    {
      "moduleId": "contracts",
      "moduleName": "Контракты",
      "type": "financial",
      "severity": "blocking",
      "id": "contract-123",
      "title": "Активный контракт",
      "description": "Контракт на 50 000 ₽ с Иван Петров",
      "actionRequired": "Завершите контракт или верните средства",
      "actionUrl": "/contracts/contract-123"
    },
    {
      "moduleId": "wallet",
      "moduleName": "Кошелёк",
      "type": "financial",
      "severity": "blocking",
      "id": "wallet-org-123",
      "title": "Баланс кошелька",
      "description": "На счету: 15 000 ₽",
      "actionRequired": "Выведите средства перед закрытием",
      "actionUrl": "/wallet"
    }
  ],
  "warnings": [
    {
      "moduleId": "expenses",
      "moduleName": "Расходы",
      "type": "financial",
      "severity": "warning",
      "id": "expense-456",
      "title": "Незакрытый расход",
      "description": "Расход на 5 000 ₽ в статусе 'pending'",
      "actionRequired": "Рекомендуется закрыть расход",
      "actionUrl": "/expenses/expense-456"
    }
  ],
  "archivableData": [
    {
      "moduleId": "documents",
      "moduleName": "Документы",
      "type": "document",
      "id": "doc-789",
      "title": "Отчёт по проекту.pdf",
      "sizeBytes": 5242880,
      "metadata": {
        "projectId": "project-123",
        "projectName": "Веб-сайт компании"
      }
    }
  ],
  "impact": {
    "projects": 3,
    "tasks": 45,
    "members": 8,
    "invites": 2,
    "documents": 15,
    "expenses": 5
  }
}
```

**Response 403 Forbidden:**

```json
{
  "error": "FORBIDDEN",
  "message": "Only organization owner can close organization",
  "details": "User is not the owner of this organization"
}
```

**Response 404 Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Organization not found",
  "details": "Organization with id 'org-123' does not exist"
}
```

---

### 2. Инициировать закрытие

**POST** `/api/organizations/[orgId]/closure/initiate`

Начать процесс закрытия организации. Архивирует данные и удаляет организацию.

**Параметры пути:**

- `orgId` (string, required) — ID организации

**Request Body:**

```json
{
  "reason": "Организация больше не нужна" // optional
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "organizationId": "org-123",
  "archiveId": "archive-456",
  "closedAt": "2025-01-15T10:30:00Z",
  "deleted": {
    "projects": 3,
    "tasks": 45,
    "members": 8,
    "invites": 2,
    "documents": 15
  }
}
```

**Response 400 Bad Request** (есть блокеры):

```json
{
  "error": "CANNOT_CLOSE",
  "message": "Organization cannot be closed due to active blockers",
  "details": {
    "blockers": [
      {
        "moduleId": "contracts",
        "title": "Активный контракт",
        "actionRequired": "Завершите контракт"
      }
    ]
  }
}
```

**Response 403 Forbidden:**

```json
{
  "error": "FORBIDDEN",
  "message": "Only organization owner can close organization"
}
```

---

### 3. Удалить организацию

**DELETE** `/api/organizations/[orgId]`

Удалить организацию (только если нет блокеров). Алиас для `POST /closure/initiate`.

**Параметры пути:**

- `orgId` (string, required) — ID организации

**Response 200 OK:**

```json
{
  "success": true,
  "organizationId": "org-123",
  "archiveId": "archive-456",
  "closedAt": "2025-01-15T10:30:00Z"
}
```

**Response 400 Bad Request** (есть блокеры):

```json
{
  "error": "CANNOT_CLOSE",
  "message": "Organization cannot be closed due to active blockers",
  "details": {
    "blockers": [...]
  }
}
```

---

## Эндпоинты для работы с архивами

### 4. Получить список архивов

**GET** `/api/archives`

Получить список всех архивов текущего пользователя.

**Response 200 OK:**

```json
{
  "archives": [
    {
      "id": "archive-456",
      "organizationId": "org-123",
      "organizationName": "Тестовая организация",
      "ownerId": "user-789",
      "closedAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2025-02-14T10:30:00Z",
      "status": "active",
      "retentionDays": 30,
      "snapshot": {
        "membersCount": 8,
        "projectsCount": 3,
        "documentsCount": 15,
        "totalStorageBytes": 52428800
      },
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 5. Получить детали архива

**GET** `/api/archives/[archiveId]`

Получить детальную информацию об архиве и список документов.

**Параметры пути:**

- `archiveId` (string, required) — ID архива

**Response 200 OK:**

```json
{
  "archive": {
    "id": "archive-456",
    "organizationId": "org-123",
    "organizationName": "Тестовая организация",
    "ownerId": "user-789",
    "closedAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2025-02-14T10:30:00Z",
    "status": "active",
    "retentionDays": 30,
    "snapshot": {
      "membersCount": 8,
      "projectsCount": 3,
      "documentsCount": 15,
      "totalStorageBytes": 52428800
    }
  },
  "documents": [
    {
      "id": "arch-doc-123",
      "archiveId": "archive-456",
      "originalDocumentId": "doc-789",
      "originalProjectId": "project-123",
      "projectName": "Веб-сайт компании",
      "title": "Отчёт по проекту.pdf",
      "type": "pdf",
      "fileId": "file-456",
      "fileUrl": "https://storage.example.com/files/file-456",
      "fileSizeBytes": 5242880,
      "archivedAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2025-02-14T10:30:00Z"
    }
  ]
}
```

**Response 403 Forbidden:**

```json
{
  "error": "FORBIDDEN",
  "message": "You don't have access to this archive"
}
```

**Response 404 Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Archive not found"
}
```

---

### 6. Скачать документы архива

**GET** `/api/archives/[archiveId]/download`

Скачать все документы архива одним ZIP-файлом.

**Параметры пути:**

- `archiveId` (string, required) — ID архива

**Response 200 OK:**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="archive-456-documents.zip"

[Binary ZIP file]
```

**Response 403 Forbidden:**

```json
{
  "error": "FORBIDDEN",
  "message": "You don't have access to this archive"
}
```

**Response 404 Not Found:**

```json
{
  "error": "NOT_FOUND",
  "message": "Archive not found or expired"
}
```

---

## Примеры запросов

### Пример 1: Проверка возможности закрытия

```bash
curl -X GET \
  'https://api.example.com/api/organizations/org-123/closure/preview' \
  -H 'Authorization: Bearer <token>'
```

### Пример 2: Закрытие организации

```bash
curl -X POST \
  'https://api.example.com/api/organizations/org-123/closure/initiate' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Организация больше не нужна"
  }'
```

### Пример 3: Получение списка архивов

```bash
curl -X GET \
  'https://api.example.com/api/archives' \
  -H 'Authorization: Bearer <token>'
```

### Пример 4: Скачивание документов архива

```bash
curl -X GET \
  'https://api.example.com/api/archives/archive-456/download' \
  -H 'Authorization: Bearer <token>' \
  -o archive-documents.zip
```

---

## Коды ошибок

| Код   | Название          | Описание                                         |
| ----- | ----------------- | ------------------------------------------------ |
| `400` | `CANNOT_CLOSE`    | Организация не может быть закрыта из-за блокеров |
| `400` | `INVALID_REQUEST` | Неверный формат запроса                          |
| `401` | `UNAUTHORIZED`    | Пользователь не авторизован                      |
| `403` | `FORBIDDEN`       | Пользователь не имеет прав (не владелец)         |
| `404` | `NOT_FOUND`       | Организация или архив не найдены                 |
| `409` | `ALREADY_CLOSED`  | Организация уже закрыта                          |
| `500` | `INTERNAL_ERROR`  | Внутренняя ошибка сервера                        |

### Формат ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": "Additional details or object"
}
```

---

## Rate Limiting

- **Preview**: 10 запросов в минуту
- **Initiate**: 1 запрос в минуту (на организацию)
- **Archives**: 30 запросов в минуту

---

## Связанные документы

- [Техническая спецификация](./organization-closure-specification.md)
- [Политика закрытия организации](./organization-closure-policy.md)
- [Примеры реализации](./organization-closure-examples.md)

---

**Последнее обновление**: 2025-01-15  
**Автор**: AI Assistant  
**Статус**: Требует реализации
