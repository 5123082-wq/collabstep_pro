import { redirect } from 'next/navigation';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

export const dynamic = 'force-dynamic';

export default async function PMProjectCreatePage() {
  const session = getDemoSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  // Редиректим на страницу проектов - создание теперь происходит через модальное окно
  redirect('/pm/projects');
}

