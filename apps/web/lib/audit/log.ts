import { randomUUID } from 'crypto';
import { DEFAULT_WORKSPACE_USER_ID, auditLogRepository } from '@collabverse/api';
import type { AuditLogEntry } from '@collabverse/api';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

type RecordAuditParams = {
  action: string;
  entity: AuditLogEntry['entity'];
  projectId?: string;
  workspaceId?: string;
  before?: unknown;
  after?: unknown;
};

export function recordAudit(params: RecordAuditParams): AuditLogEntry {
  const session = getDemoSessionFromCookies();
  const actorId = session?.userId ?? DEFAULT_WORKSPACE_USER_ID;

  return auditLogRepository.record({
    id: randomUUID(),
    actorId,
    action: params.action,
    entity: params.entity,
    createdAt: new Date().toISOString(),
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
    ...(params.before !== undefined ? { before: params.before } : {}),
    ...(params.after !== undefined ? { after: params.after } : {})
  });
}
