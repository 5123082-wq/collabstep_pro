import { redirect } from 'next/navigation';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { flags } from '@/lib/flags';
import ProjectCreateWizardClient from './ProjectCreateWizardClient';

export const dynamic = 'force-dynamic';

export default async function ProjectCreatePage() {
  if (!flags.PROJECT_CREATE_WIZARD) {
    redirect('/projects');
  }

  const session = getDemoSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  return <ProjectCreateWizardClient currentUserId={session.userId} />;
}

