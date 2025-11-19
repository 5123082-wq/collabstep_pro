import { redirect } from 'next/navigation';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { flags } from '@/lib/flags';
import ProjectCreateWizardClient from '@/app/(app)/projects/create/ProjectCreateWizardClient';

export const dynamic = 'force-dynamic';

export default async function PMProjectCreatePage() {
  if (!flags.PROJECT_CREATE_WIZARD) {
    redirect('/pm/projects');
  }

  const session = getDemoSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  return <ProjectCreateWizardClient currentUserId={session.userId} />;
}

