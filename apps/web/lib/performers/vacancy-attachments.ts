import { put } from '@vercel/blob/client';

export type VacancyAttachment = {
  id: string;
  fileId: string;
  filename: string;
  url: string;
  sizeBytes: number;
  uploadedAt: string;
};

type UploadUrlPayload = {
  token: string;
  pathname: string;
};

function getPayload<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const candidate = data as { data?: T };
  return candidate.data ?? (data as T);
}

export async function requestVacancyAttachmentUploadUrl(vacancyId: string, file: File): Promise<UploadUrlPayload> {
  const response = await fetch(`/api/vacancies/${vacancyId}/attachments/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? 'Не удалось получить ссылку загрузки';
    throw new Error(message);
  }

  const data = await response.json().catch(() => null);
  const payload = getPayload<UploadUrlPayload>(data);
  if (!payload?.token || !payload?.pathname) {
    throw new Error('Некорректный ответ загрузки');
  }

  return payload;
}

export async function completeVacancyAttachmentUpload(
  vacancyId: string,
  file: File,
  upload: { pathname: string; url: string }
): Promise<VacancyAttachment> {
  const response = await fetch(`/api/vacancies/${vacancyId}/attachments/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageKey: upload.pathname,
      url: upload.url,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? 'Не удалось сохранить вложение';
    throw new Error(message);
  }

  const data = await response.json().catch(() => null);
  const payload = getPayload<{ attachment: VacancyAttachment }>(data);
  const attachment = payload?.attachment;
  if (!attachment) {
    throw new Error('Некорректный ответ сохранения');
  }

  return attachment;
}

export async function uploadVacancyAttachment(vacancyId: string, file: File): Promise<VacancyAttachment> {
  const { token, pathname } = await requestVacancyAttachmentUploadUrl(vacancyId, file);
  const result = await put(pathname, file, {
    token,
    contentType: file.type || 'application/octet-stream',
    access: 'public'
  });
  return completeVacancyAttachmentUpload(vacancyId, file, { pathname, url: result.url });
}

export async function fetchVacancyAttachments(vacancyId: string): Promise<VacancyAttachment[]> {
  const response = await fetch(`/api/vacancies/${vacancyId}/attachments`);
  if (!response.ok) {
    return [];
  }

  const data = await response.json().catch(() => null);
  const payload = getPayload<{ attachments: VacancyAttachment[] }>(data);
  return Array.isArray(payload?.attachments) ? payload.attachments : [];
}
