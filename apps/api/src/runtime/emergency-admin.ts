import type { WorkspaceUser } from '../types';

export const LEGACY_DEMO_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
export const EMERGENCY_ADMIN_USER_ID = 'emergency-admin';
export const EMERGENCY_ADMIN_EMAIL = (process.env.DEMO_ADMIN_EMAIL ?? 'admin.demo@collabverse.test')
  .trim()
  .toLowerCase();

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmergencyAdminEmail(value: unknown): boolean {
  return typeof value === 'string' && normalizeEmail(value) === EMERGENCY_ADMIN_EMAIL;
}

export function isEmergencyAdminUserId(value: unknown): boolean {
  return value === EMERGENCY_ADMIN_USER_ID;
}

export function isLegacyDemoAdminUserId(value: unknown): boolean {
  return value === LEGACY_DEMO_ADMIN_USER_ID;
}

export function isEmergencyOrLegacyDemoAdminIdentity(input: {
  userId?: unknown;
  email?: unknown;
}): boolean {
  return (
    isEmergencyAdminUserId(input.userId) ||
    isLegacyDemoAdminUserId(input.userId) ||
    isEmergencyAdminEmail(input.email)
  );
}

export function buildEmergencyAdminUser(): WorkspaceUser {
  return {
    id: EMERGENCY_ADMIN_USER_ID,
    name: 'Аварийный администратор',
    email: EMERGENCY_ADMIN_EMAIL,
    title: 'Emergency Access',
    department: 'Platform',
    location: 'Isolated auth path'
  };
}
