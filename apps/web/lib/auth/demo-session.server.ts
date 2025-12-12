import { cookies } from 'next/headers';

import { decodeDemoSession, DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';

export function getDemoSessionFromCookies() {
  try {
    const store = cookies();
    const cookie = store.get(DEMO_SESSION_COOKIE);

    return decodeDemoSession(cookie?.value ?? null);
  } catch {
    // In unit tests or other non-request contexts, Next.js request storage is unavailable.
    return null;
  }
}
