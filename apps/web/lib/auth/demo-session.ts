export type DemoRole = 'admin' | 'user';

export type DemoSession = {
  email: string;
  userId: string; // Уникальный ID пользователя (UUID)
  role: DemoRole;
  issuedAt: number;
};

export const DEMO_SESSION_COOKIE = 'cv_session';
export const DEMO_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? 'admin.demo@collabverse.test';

export function encodeDemoSession(session: DemoSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64url');
}

export function decodeDemoSession(value: string | undefined | null): DemoSession | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<DemoSession>;

    if (!parsed || typeof parsed.email !== 'string' || !isDemoRole(parsed.role)) {
      return null;
    }

    // Обратная совместимость: если userId отсутствует, используем email как userId
    // Это нужно для старых сессий, которые были созданы до введения userId
    const userId = parsed.userId || parsed.email;

    return {
      email: parsed.email,
      userId,
      role: parsed.role,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : Date.now()
    };
  } catch (error) {
    return null;
  }
}

export function isDemoRole(value: unknown): value is DemoRole {
  return value === 'admin' || value === 'user';
}

export function parseDemoRole(value: unknown): DemoRole | null {
  return isDemoRole(value) ? value : null;
}

export function getDemoAccount(role: DemoRole): { email: string; password: string } {
  const prefix = role === 'admin' ? 'DEMO_ADMIN' : 'DEMO_USER';
  const fallbackEmail = role === 'admin' ? DEMO_ADMIN_EMAIL : 'user.demo@collabverse.test';
  const fallbackPassword = role === 'admin' ? 'demo-admin' : 'demo-user';
  const email = process.env[`${prefix}_EMAIL`] ?? fallbackEmail;
  const password = process.env[`${prefix}_PASSWORD`] ?? fallbackPassword;

  return { email, password };
}

export function isDemoAdminEmail(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === DEMO_ADMIN_EMAIL.toLowerCase();
}

export function isDemoAuthEnabled(): boolean {
  const flag = (process.env.AUTH_DEV ?? 'on').toLowerCase();
  return flag !== 'off' && flag !== 'false' && flag !== '0';
}

export function isDemoAdminSession(session: DemoSession | null | undefined): session is DemoSession {
  return Boolean(session && isDemoAdminEmail(session.email));
}
